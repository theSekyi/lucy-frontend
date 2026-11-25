import type { CellScalar, SpreadsheetSheet, SpreadsheetWorkbook } from '../../core/types';

export const MAX_SPREADSHEET_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_UNCOMPRESSED_XML_BYTES = 25 * 1024 * 1024;
export const MAX_SHEET_ROWS = 25_000;
export const MAX_SHEET_COLS = 256;

/**
 * Safe scalar coercion for CSV/TSV text:
 * - Preserves leading-zero identifiers ("00123", "-0042") as strings
 * - Preserves integers outside IEEE-754 safe integer precision (> 15 digits) as strings
 */
export function coerceDelimitedScalar(raw: string): CellScalar {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  if (/^(true|false)$/i.test(trimmed)) return trimmed.toLowerCase() === 'true';

  if (/^-?0\d+$/.test(trimmed)) {
    return trimmed;
  }

  if (/^-?\d+$/.test(trimmed)) {
    const digits = trimmed.replace(/^-/, '');
    if (digits.length > 15) return trimmed;
    const parsedInt = Number(trimmed);
    return Number.isSafeInteger(parsedInt) ? parsedInt : trimmed;
  }

  if (/^-?\d+\.\d+$/.test(trimmed)) {
    const digits = trimmed.replace(/[-.]/g, '');
    if (digits.length > 15) return trimmed;
    const parsedFloat = Number(trimmed);
    return Number.isFinite(parsedFloat) ? parsedFloat : trimmed;
  }

  return trimmed;
}

function parseNumericXmlCell(raw: string): CellScalar {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const num = Number(trimmed);
  if (!Number.isFinite(num)) return trimmed;
  if (/^-?\d+$/.test(trimmed) && !Number.isSafeInteger(num)) {
    return trimmed;
  }
  return num;
}

export function parseDelimitedText(
  text: string,
  sheetName = 'Sheet 1',
  delimiter = ','
): SpreadsheetWorkbook {
  if (text.length > MAX_UNCOMPRESSED_XML_BYTES) {
    throw new Error('Spreadsheet text exceeds the 25 MB browser safety limit.');
  }

  const rows: { readonly values: string[]; readonly lineNumber: number }[] = [];
  let currentRow: string[] = [];
  let field = '';
  let insideQuotes = false;
  let currentLine = 1;
  let rowStartLine = 1;

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
        if (char === '\n') currentLine += 1;
        field += char;
      }
      continue;
    }

    if (char === '"') {
      insideQuotes = true;
    } else if (char === delimiter) {
      currentRow.push(field);
      if (currentRow.length > MAX_SHEET_COLS) {
        throw new Error(
          `Spreadsheet exceeds maximum supported column width (${MAX_SHEET_COLS} columns).`
        );
      }
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && next === '\n') i += 1;
      currentRow.push(field);
      if (currentRow.length > MAX_SHEET_COLS) {
        throw new Error(
          `Spreadsheet exceeds maximum supported column width (${MAX_SHEET_COLS} columns).`
        );
      }
      if (currentRow.some((cell) => cell.trim() !== '')) {
        rows.push({ values: currentRow, lineNumber: rowStartLine });
        if (rows.length > MAX_SHEET_ROWS + 1) {
          throw new Error(
            `Spreadsheet exceeds maximum supported row count (${MAX_SHEET_ROWS.toLocaleString('en-US')} rows).`
          );
        }
      }
      currentLine += 1;
      rowStartLine = currentLine;
      currentRow = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field !== '' || currentRow.length > 0) {
    currentRow.push(field);
    if (currentRow.length > MAX_SHEET_COLS) {
      throw new Error(
        `Spreadsheet exceeds maximum supported column width (${MAX_SHEET_COLS} columns).`
      );
    }
    if (currentRow.some((cell) => cell.trim() !== '')) {
      rows.push({ values: currentRow, lineNumber: rowStartLine });
      if (rows.length > MAX_SHEET_ROWS + 1) {
        throw new Error(
          `Spreadsheet exceeds maximum supported row count (${MAX_SHEET_ROWS.toLocaleString('en-US')} rows).`
        );
      }
    }
  }

  const [headerEntry, ...bodyEntries] = rows;
  const headerRow = headerEntry?.values ?? ['Column A'];

  return {
    sourceFormat: 'csv',
    sheets: [
      {
        name: sheetName,
        columns: headerRow.map((col, idx) => col.trim() || columnIndexToLetter(idx)),
        rows: bodyEntries.map((entry) =>
          headerRow.map((_, idx) => coerceDelimitedScalar(entry.values[idx] ?? ''))
        ),
        sourceRowNumbers: bodyEntries.map((entry) => entry.lineNumber),
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

async function inflateRawBytesBounded(
  compressed: Uint8Array,
  maxBytes: number
): Promise<Uint8Array> {
  const copy = new Uint8Array(compressed.byteLength);
  copy.set(compressed);
  const rawBody =
    typeof Blob !== 'undefined' && typeof Blob.prototype.stream === 'function'
      ? new Blob([copy]).stream()
      : new Response(copy).body!;
  const stream = rawBody.pipeThrough(new DecompressionStream('deflate-raw'));
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        total += value.byteLength;
        if (total > maxBytes) {
          await reader.cancel().catch(() => {});
          throw new Error('Archive exceeds uncompressed size safety limit.');
        }
        chunks.push(value);
      }
    }
  } finally {
    reader.releaseLock();
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return merged;
}

/**
 * Minimal zero-dependency OpenXML (.xlsx) ZIP extractor with strict bounds checking.
 */
async function extractZipTextEntries(buffer: ArrayBuffer): Promise<Map<string, string>> {
  if (buffer.byteLength > MAX_SPREADSHEET_FILE_BYTES) {
    throw new Error('Workbook exceeds the 10 MB file size limit.');
  }
  if (buffer.byteLength < 22) {
    throw new Error('Invalid or empty .xlsx archive.');
  }

  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const decoder = new TextDecoder();
  const entries = new Map<string, string>();
  let totalUnpackedBytes = 0;

  let eocdOffset = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset < 0) throw new Error('Invalid .xlsx archive (missing ZIP directory).');

  const totalEntries = view.getUint16(eocdOffset + 10, true);
  let dirOffset = view.getUint32(eocdOffset + 16, true);

  for (let i = 0; i < totalEntries; i += 1) {
    if (dirOffset + 46 > bytes.length || view.getUint32(dirOffset, true) !== 0x02014b50) {
      throw new Error('Corrupted .xlsx central directory.');
    }
    const compressionMethod = view.getUint16(dirOffset + 10, true);
    const compressedSize = view.getUint32(dirOffset + 20, true);
    const nameLen = view.getUint16(dirOffset + 28, true);
    const extraLen = view.getUint16(dirOffset + 30, true);
    const commentLen = view.getUint16(dirOffset + 32, true);
    const localHeaderOffset = view.getUint32(dirOffset + 42, true);

    if (dirOffset + 46 + nameLen > bytes.length) {
      throw new Error('Corrupted .xlsx entry header.');
    }

    const filename = decoder.decode(bytes.subarray(dirOffset + 46, dirOffset + 46 + nameLen));
    dirOffset += 46 + nameLen + extraLen + commentLen;

    if (!filename.endsWith('.xml') && !filename.endsWith('.rels')) continue;

    if (localHeaderOffset + 30 > bytes.length) {
      throw new Error('Corrupted .xlsx local file header.');
    }
    const localNameLen = view.getUint16(localHeaderOffset + 26, true);
    const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
    const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
    if (dataStart + compressedSize > bytes.length) {
      throw new Error('Truncated .xlsx worksheet stream.');
    }

    const rawSlice = bytes.subarray(dataStart, dataStart + compressedSize);
    const remainingBudget = MAX_UNCOMPRESSED_XML_BYTES - totalUnpackedBytes;
    if (remainingBudget <= 0) {
      throw new Error('Archive exceeds uncompressed size safety limit.');
    }

    let unpacked: Uint8Array;
    if (compressionMethod === 0) {
      if (rawSlice.byteLength > remainingBudget) {
        throw new Error('Archive exceeds uncompressed size safety limit.');
      }
      unpacked = rawSlice;
    } else if (compressionMethod === 8) {
      unpacked = await inflateRawBytesBounded(rawSlice, remainingBudget);
    } else {
      throw new Error(`Unsupported .xlsx compression method (${compressionMethod}).`);
    }

    totalUnpackedBytes += unpacked.byteLength;
    entries.set(filename, decoder.decode(unpacked));
  }

  return entries;
}

function normalizeWorkbookRelTarget(target: string): string {
  const cleaned = target.trim().replace(/^\/+/, '');
  if (cleaned.startsWith('xl/')) return cleaned;
  return `xl/${cleaned.replace(/^\.\//, '')}`;
}

function resolveOrderedSheets(
  xmlFiles: Map<string, string>
): ReadonlyArray<{ readonly name: string; readonly path: string }> {
  const relXml = xmlFiles.get('xl/_rels/workbook.xml.rels') ?? '';
  const relById = new Map<string, string>();
  for (const relMatch of relXml.matchAll(/<Relationship\b([^>]*?)\/?>/g)) {
    const attrs = relMatch[1]!;
    const id = attrs.match(/\bId="([^"]+)"/)?.[1];
    const target = attrs.match(/\bTarget="([^"]+)"/)?.[1];
    if (id && target) {
      relById.set(id, normalizeWorkbookRelTarget(decodeXmlEntities(target)));
    }
  }

  const fallbackPaths = [...xmlFiles.keys()]
    .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const workbookXml = xmlFiles.get('xl/workbook.xml') ?? '';
  const sheetTags = [...workbookXml.matchAll(/<sheet\b([^>]*?)\/?>/g)];

  if (sheetTags.length === 0) {
    return fallbackPaths.map((path, idx) => ({
      name: `Sheet ${idx + 1}`,
      path,
    }));
  }

  const resolved: { readonly name: string; readonly path: string }[] = [];
  for (let idx = 0; idx < sheetTags.length; idx += 1) {
    const attrs = sheetTags[idx]![1]!;
    const rawName = attrs.match(/\bname="([^"]+)"/)?.[1];
    const relId = attrs.match(/\b(?:r:id|id)="([^"]+)"/)?.[1];
    const mappedPath = (relId ? relById.get(relId) : undefined) ?? fallbackPaths[idx];
    if (mappedPath && xmlFiles.has(mappedPath)) {
      resolved.push({
        name: rawName ? decodeXmlEntities(rawName) : `Sheet ${idx + 1}`,
        path: mappedPath,
      });
    }
  }

  return resolved.length > 0
    ? resolved
    : fallbackPaths.map((path, idx) => ({ name: `Sheet ${idx + 1}`, path }));
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

  const orderedSheetMeta = resolveOrderedSheets(xmlFiles);

  const sheets: SpreadsheetSheet[] = orderedSheetMeta.map((sheetMeta) => {
    const xml = xmlFiles.get(sheetMeta.path) ?? '';
    const parsedRows: { readonly cells: CellScalar[]; readonly rowNumber: number }[] = [];
    const formulas: Record<string, string> = {};
    let maxCol = 0;
    let sequentialRowNumber = 0;

    for (const rowMatch of xml.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
      sequentialRowNumber += 1;
      if (parsedRows.length >= MAX_SHEET_ROWS + 1) {
        throw new Error(
          `Worksheet "${sheetMeta.name}" exceeds maximum supported row count (${MAX_SHEET_ROWS.toLocaleString('en-US')} rows).`
        );
      }

      const rowAttrs = rowMatch[1] ?? '';
      const rowInner = rowMatch[2] ?? '';
      const explicitRowNum = Number(rowAttrs.match(/\br="(\d+)"/)?.[1] ?? 0);
      const sourceRowNum = explicitRowNum > 0 ? explicitRowNum : sequentialRowNumber;

      const rowValues: CellScalar[] = [];
      let fallbackCol = 0;

      // Matches BOTH self-closing cells (<c r="B2" s="3"/>) AND paired cells (<c r="C2"><v>500</v></c>)
      for (const cellMatch of rowInner.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const attrs = cellMatch[1]!;
        const inner = cellMatch[2];
        const refMatch = attrs.match(/\br="([A-Z]+)(\d+)"/i);
        const typeMatch = attrs.match(/\bt="([^"]+)"/);

        const colLetters = refMatch?.[1]?.toUpperCase();
        const rowDigits = refMatch?.[2];
        const coordinate = colLetters && rowDigits ? `${colLetters}${rowDigits}` : undefined;
        const colIdx = colLetters ? columnLettersToIndex(colLetters) : fallbackCol;

        if (colIdx >= MAX_SHEET_COLS) {
          throw new Error(
            `Worksheet "${sheetMeta.name}" exceeds maximum supported column width (${MAX_SHEET_COLS} columns).`
          );
        }

        fallbackCol = colIdx + 1;
        maxCol = Math.max(maxCol, colIdx + 1);

        if (inner === undefined) {
          rowValues[colIdx] = null;
          continue;
        }

        const formulaText = inner.match(/<f(?:\s[^>]*)?>([\s\S]*?)<\/f>/)?.[1];
        if (coordinate && formulaText) {
          formulas[coordinate] = `=${decodeXmlEntities(formulaText)}`;
        }

        const cellType = typeMatch?.[1];
        const rawValue = inner.match(/<v>([\s\S]*?)<\/v>/)?.[1];
        const inlineParts = [...inner.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) =>
          decodeXmlEntities(m[1]!)
        );

        let value: CellScalar = null;
        if (cellType === 's' && rawValue !== undefined) {
          value = sharedStrings[Number(rawValue)] ?? '';
        } else if (cellType === 'inlineStr') {
          value = inlineParts.join('');
        } else if (cellType === 'str' || cellType === 'e') {
          value = rawValue !== undefined ? decodeXmlEntities(rawValue) : inlineParts.join('');
        } else if (cellType === 'b' && rawValue !== undefined) {
          value = rawValue === '1' || rawValue.toLowerCase() === 'true';
        } else if (rawValue !== undefined) {
          value = parseNumericXmlCell(decodeXmlEntities(rawValue));
        }

        rowValues[colIdx] = value;
      }

      parsedRows.push({ cells: rowValues, rowNumber: sourceRowNum });
    }

    const colCount = Math.max(maxCol, 1);
    const normalized = parsedRows.map((entry) => ({
      rowNumber: entry.rowNumber,
      cells: Array.from({ length: colCount }, (_, idx) => entry.cells[idx] ?? null),
    }));

    const [headerCandidate, ...dataEntries] = normalized;
    const hasHeaderStrings =
      headerCandidate !== undefined &&
      maxCol > 0 &&
      headerCandidate.cells.some((c) => typeof c === 'string' && c.trim() !== '') &&
      headerCandidate.cells.every((cell) => cell === null || typeof cell === 'string');

    const columns = hasHeaderStrings
      ? headerCandidate.cells.map((cell, idx) =>
          typeof cell === 'string' && cell.trim() !== ''
            ? cell
            : columnIndexToLetter(idx)
        )
      : Array.from({ length: colCount }, (_, idx) => columnIndexToLetter(idx));

    const bodyEntries = hasHeaderStrings ? dataEntries : normalized;

    return {
      name: sheetMeta.name,
      columns,
      rows: bodyEntries.map((entry) => entry.cells),
      sourceRowNumbers: bodyEntries.map((entry) => entry.rowNumber),
      formulas,
    };
  });

  return {
    sourceFormat: 'xlsx',
    sheets: sheets.length > 0 ? sheets : [{ name: 'Sheet 1', columns: ['A'], rows: [] }],
  };
}

export async function parseSpreadsheetFile(file: File): Promise<SpreadsheetWorkbook> {
  if (file.size > MAX_SPREADSHEET_FILE_BYTES) {
    throw new Error(`"${file.name}" exceeds the 10 MB spreadsheet limit.`);
  }
  const lower = file.name.toLowerCase();
  if (!/\.(xlsx|csv|tsv)$/.test(lower)) {
    throw new Error(`Unsupported file extension for "${file.name}". Expected .xlsx, .csv, or .tsv.`);
  }
  if (lower.endsWith('.xlsx')) {
    return parseXlsxBuffer(await file.arrayBuffer());
  }
  const delimiter = lower.endsWith('.tsv') ? '\t' : ',';
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'Imported';
  return parseDelimitedText(await file.text(), baseName, delimiter);
}

/**
 * Neutralizes spreadsheet formula injection (CSV injection) on string values
 * starting with =, +, -, @, tab, or CR while preserving numeric negatives (-1250).
 */
function sanitizeFormulaPrefix(value: CellScalar): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (/^[=+\-@\t\r]/.test(value)) {
    return `'${value}`;
  }
  return value;
}

export function serializeSheetToCsv(sheet: SpreadsheetSheet): string {
  const escapeCsv = (val: CellScalar): string => {
    const text = sanitizeFormulaPrefix(val);
    if (text === '') return '';
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [
    sheet.columns.map((col) => escapeCsv(col)).join(','),
    ...sheet.rows.map((row) => row.map(escapeCsv).join(',')),
  ];
  return lines.join('\n');
}
