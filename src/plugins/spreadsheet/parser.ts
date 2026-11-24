import type { CellScalar, SpreadsheetSheet, SpreadsheetWorkbook } from '../../core/types';

function coerceScalar(raw: string): CellScalar {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  if (/^(true|false)$/i.test(trimmed)) return trimmed.toLowerCase() === 'true';
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return trimmed;
}

export function parseDelimitedText(
  text: string,
  sheetName = 'Sheet 1',
  delimiter = ','
): SpreadsheetWorkbook {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let field = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]!;
    const next = text[i + 1];

    if (insideQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        insideQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      insideQuotes = true;
    } else if (char === delimiter) {
      currentRow.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && next === '\n') i += 1;
      currentRow.push(field);
      if (currentRow.some((cell) => cell.trim() !== '')) rows.push(currentRow);
      currentRow = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field !== '' || currentRow.length > 0) {
    currentRow.push(field);
    if (currentRow.some((cell) => cell.trim() !== '')) rows.push(currentRow);
  }

  const [headerRow = ['Column A'], ...bodyRows] = rows;
  return {
    sourceFormat: 'csv',
    sheets: [
      {
        name: sheetName,
        columns: headerRow.map((col, idx) => col.trim() || columnIndexToLetter(idx)),
        rows: bodyRows.map((row) => headerRow.map((_, idx) => coerceScalar(row[idx] ?? ''))),
      },
    ],
  };
}

export function columnIndexToLetter(index: number): string {
  let n = index;
  let label = '';
  while (n >= 0) {
    label = String.fromCharCode((n % 26) + 65) + label;
    n = Math.floor(n / 26) - 1;
  }
  return label;
}

function columnLettersToIndex(ref: string): number {
  const letters = ref.replace(/[^A-Z]/gi, '').toUpperCase();
  let index = 0;
  for (let i = 0; i < letters.length; i += 1) {
    index = index * 26 + (letters.charCodeAt(i) - 64);
  }
  return Math.max(0, index - 1);
}

function decodeXmlEntities(input: string): string {
  return input
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

async function inflateRawBytes(compressed: Uint8Array): Promise<Uint8Array> {
  const copy = new Uint8Array(compressed.byteLength);
  copy.set(compressed);
  const stream = new Blob([copy]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  const arrayBuffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

/**
 * Minimal zero-dependency OpenXML (.xlsx) ZIP extractor.
 * Reads Central Directory headers so even streaming data-descriptor ZIPs parse reliably.
 */
async function extractZipTextEntries(buffer: ArrayBuffer): Promise<Map<string, string>> {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const decoder = new TextDecoder();
  const entries = new Map<string, string>();

  let eocdOffset = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset < 0) throw new Error('Invalid .xlsx archive');

  const totalEntries = view.getUint16(eocdOffset + 10, true);
  let dirOffset = view.getUint32(eocdOffset + 16, true);

  for (let i = 0; i < totalEntries; i += 1) {
    if (view.getUint32(dirOffset, true) !== 0x02014b50) break;
    const compressionMethod = view.getUint16(dirOffset + 10, true);
    const compressedSize = view.getUint32(dirOffset + 20, true);
    const nameLen = view.getUint16(dirOffset + 28, true);
    const extraLen = view.getUint16(dirOffset + 30, true);
    const commentLen = view.getUint16(dirOffset + 32, true);
    const localHeaderOffset = view.getUint32(dirOffset + 42, true);

    const filename = decoder.decode(bytes.subarray(dirOffset + 46, dirOffset + 46 + nameLen));
    dirOffset += 46 + nameLen + extraLen + commentLen;

    if (!filename.endsWith('.xml')) continue;

    const localNameLen = view.getUint16(localHeaderOffset + 26, true);
    const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
    const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
    const rawSlice = bytes.subarray(dataStart, dataStart + compressedSize);

    const unpacked =
      compressionMethod === 0 ? rawSlice : await inflateRawBytes(rawSlice);
    entries.set(filename, decoder.decode(unpacked));
  }

  return entries;
}

export async function parseXlsxBuffer(buffer: ArrayBuffer): Promise<SpreadsheetWorkbook> {
  const xmlFiles = await extractZipTextEntries(buffer);

  const sharedStrings: string[] = [];
  const sharedXml = xmlFiles.get('xl/sharedStrings.xml') ?? '';
  for (const siMatch of sharedXml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)) {
    const textParts = [...siMatch[1]!.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) =>
      decodeXmlEntities(m[1]!)
    );
    sharedStrings.push(textParts.join(''));
  }

  const workbookXml = xmlFiles.get('xl/workbook.xml') ?? '';
  const sheetNames = [...workbookXml.matchAll(/<sheet\b[^>]*\bname="([^"]+)"/g)].map((m) =>
    decodeXmlEntities(m[1]!)
  );

  const sheetPaths = [...xmlFiles.keys()]
    .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const sheets: SpreadsheetSheet[] = sheetPaths.map((path, sheetIdx) => {
    const xml = xmlFiles.get(path) ?? '';
    const parsedRows: CellScalar[][] = [];
    const formulas: Record<string, string> = {};
    let maxCol = 0;

    for (const rowMatch of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
      const rowValues: CellScalar[] = [];
      let fallbackCol = 0;

      for (const cellMatch of rowMatch[1]!.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
        const attrs = cellMatch[1]!;
        const inner = cellMatch[2]!;
        const refMatch = attrs.match(/\br="([A-Z]+\d+)"/i);
        const typeMatch = attrs.match(/\bt="([^"]+)"/);

        const coordinate = refMatch?.[1]?.toUpperCase();
        const colIdx = coordinate ? columnLettersToIndex(coordinate) : fallbackCol;
        fallbackCol = colIdx + 1;
        maxCol = Math.max(maxCol, colIdx + 1);

        const formulaText = inner.match(/<f(?:\s[^>]*)?>([\s\S]*?)<\/f>/)?.[1];
        if (coordinate && formulaText) {
          formulas[coordinate] = `=${decodeXmlEntities(formulaText)}`;
        }

        const cellType = typeMatch?.[1];
        const rawValue = inner.match(/<v>([\s\S]*?)<\/v>/)?.[1];
        const inlineText = inner.match(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/)?.[1];

        let value: CellScalar = null;
        if (cellType === 's' && rawValue !== undefined) {
          value = sharedStrings[Number(rawValue)] ?? '';
        } else if (cellType === 'inlineStr' && inlineText !== undefined) {
          value = decodeXmlEntities(inlineText);
        } else if (cellType === 'b' && rawValue !== undefined) {
          value = rawValue === '1';
        } else if (rawValue !== undefined) {
          value = coerceScalar(decodeXmlEntities(rawValue));
        }

        rowValues[colIdx] = value;
      }

      parsedRows.push(rowValues);
    }

    const normalized = parsedRows.map((row) =>
      Array.from({ length: maxCol }, (_, idx) => row[idx] ?? null)
    );
    const [headerCandidate, ...dataRows] = normalized;
    const hasHeaderStrings =
      headerCandidate !== undefined && headerCandidate.every((cell) => typeof cell === 'string');

    const columns = hasHeaderStrings
      ? headerCandidate.map((cell, idx) => String(cell || columnIndexToLetter(idx)))
      : Array.from({ length: maxCol }, (_, idx) => columnIndexToLetter(idx));

    return {
      name: sheetNames[sheetIdx] ?? `Sheet ${sheetIdx + 1}`,
      columns,
      rows: hasHeaderStrings ? dataRows : normalized,
      formulas,
    };
  });

  return {
    sourceFormat: 'xlsx',
    sheets: sheets.length > 0 ? sheets : [{ name: 'Sheet 1', columns: ['A'], rows: [] }],
  };
}

export async function parseSpreadsheetFile(file: File): Promise<SpreadsheetWorkbook> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.xlsx')) {
    return parseXlsxBuffer(await file.arrayBuffer());
  }
  const delimiter = lower.endsWith('.tsv') ? '\t' : ',';
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'Imported';
  return parseDelimitedText(await file.text(), baseName, delimiter);
}

export function serializeSheetToCsv(sheet: SpreadsheetSheet): string {
  const escapeCsv = (val: CellScalar): string => {
    if (val === null || val === undefined) return '';
    const text = String(val);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [
    sheet.columns.map(escapeCsv).join(','),
    ...sheet.rows.map((row) => row.map(escapeCsv).join(',')),
  ];
  return lines.join('\n');
}
