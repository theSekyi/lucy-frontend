import { useMemo, useRef, useState } from 'preact/hooks';
import type { LoadedRenderer, RendererContext } from '../../core/renderers';
import type { CellScalar, SpreadsheetWorkbook } from '../../core/types';
import { columnIndexToLetter, serializeSheetToCsv } from './parser';
import './spreadsheet.css';

function formatCellDisplay(value: CellScalar): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? value.toLocaleString('en-US')
      : value.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  return value;
}

function classifyBadgeTone(text: string): string | null {
  if (/^(critical|high|watch)$/i.test(text) || /^-\d/.test(text)) return 'tone-warn';
  if (/^(verified|on track|patch ready)$/i.test(text) || /^\+\d/.test(text)) return 'tone-good';
  if (/^(in review|assigned|investigating|scheduled|medium|low)$/i.test(text)) return 'tone-neutral';
  return null;
}

function SpreadsheetStageView({ context }: { context: RendererContext<SpreadsheetWorkbook> }) {
  const workbook = context.block.data;
  const [sheetIndex, setSheetIndex] = useState(0);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number }>({ row: 0, col: 0 });
  const [sortConfig, setSortConfig] = useState<{ col: number; asc: boolean } | null>(null);
  const [filterText, setFilterText] = useState('');
  const gridScrollRef = useRef<HTMLDivElement>(null);

  const activeSheet = workbook.sheets[sheetIndex] ?? workbook.sheets[0];

  const visibleRows = useMemo(() => {
    if (!activeSheet) return [];
    const query = filterText.trim().toLowerCase();
    const filtered = query
      ? activeSheet.rows.filter((row) =>
          row.some((cell) => cell !== null && String(cell).toLowerCase().includes(query))
        )
      : [...activeSheet.rows];

    if (!sortConfig) return filtered;
    const { col, asc } = sortConfig;
    return filtered.sort((a, b) => {
      const av = a[col];
      const bv = b[col];
      if (av === bv) return 0;
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const cmp =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv), undefined, { numeric: true });
      return asc ? cmp : -cmp;
    });
  }, [activeSheet, filterText, sortConfig]);

  if (!activeSheet) {
    return <div class="empty-note">Empty workbook.</div>;
  }

  const selectedCoord = `${columnIndexToLetter(selectedCell.col)}${selectedCell.row + 2}`;
  const selectedRaw = visibleRows[selectedCell.row]?.[selectedCell.col] ?? null;
  const formulaOrValue =
    activeSheet.formulas?.[selectedCoord] ?? formatCellDisplay(selectedRaw) ?? '—';

  function handleDownloadCsv() {
    if (!activeSheet) return;
    const csv = serializeSheetToCsv(activeSheet);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(context.block.filename ?? activeSheet.name).replace(/\.xlsx$/i, '')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div class="sheet-viewer">
      <div class="sheet-formula-bar">
        <span class="sheet-coord" aria-label="Selected cell coordinate">
          {selectedCoord}
        </span>
        <span class="sheet-fx">fx</span>
        <span class="sheet-formula-value" title={String(formulaOrValue)}>
          {formulaOrValue || 'Empty cell'}
        </span>
        <input
          type="search"
          class="sheet-filter-input"
          placeholder="Filter rows…"
          value={filterText}
          onInput={(e) => setFilterText((e.currentTarget as HTMLInputElement).value)}
          aria-label="Filter spreadsheet rows"
        />
        <button type="button" class="ghost-pill" onClick={handleDownloadCsv}>
          Export CSV
        </button>
      </div>

      <div class="sheet-grid-scroll" ref={gridScrollRef} role="region" aria-label={activeSheet.name}>
        <table class="sheet-table">
          <thead>
            <tr>
              <th class="sheet-corner" aria-hidden="true">
                #
              </th>
              {activeSheet.columns.map((colName, colIdx) => {
                const isSorted = sortConfig?.col === colIdx;
                return (
                  <th
                    key={colIdx}
                    onClick={() =>
                      setSortConfig((prev) =>
                        prev?.col === colIdx ? { col: colIdx, asc: !prev.asc } : { col: colIdx, asc: true }
                      )
                    }
                    class="sheet-col-header"
                    title="Click to sort column"
                  >
                    <div class="sheet-col-letter">{columnIndexToLetter(colIdx)}</div>
                    <div class="sheet-col-title">
                      <span>{colName}</span>
                      {isSorted && <span class="sort-indicator">{sortConfig.asc ? '↑' : '↓'}</span>}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, rowIdx) => (
              <tr key={rowIdx}>
                <td class="sheet-row-num">{rowIdx + 1}</td>
                {activeSheet.columns.map((_, colIdx) => {
                  const cell = row[colIdx] ?? null;
                  const isSelected =
                    selectedCell.row === rowIdx && selectedCell.col === colIdx;
                  const isNumeric = typeof cell === 'number';
                  const display = formatCellDisplay(cell);
                  const tone = typeof cell === 'string' ? classifyBadgeTone(cell) : null;

                  return (
                    <td
                      key={colIdx}
                      class={[
                        'sheet-cell',
                        isNumeric ? 'is-numeric' : '',
                        isSelected ? 'is-selected' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => setSelectedCell({ row: rowIdx, col: colIdx })}
                    >
                      {tone ? <span class={`cell-pill ${tone}`}>{display}</span> : display}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div class="sheet-tabs-bar" role="tablist" aria-label="Workbook sheets">
        <div class="sheet-tabs-list">
          {workbook.sheets.map((sheet, idx) => (
            <button
              key={sheet.name}
              type="button"
              role="tab"
              aria-selected={idx === sheetIndex}
              class={`sheet-tab ${idx === sheetIndex ? 'is-active' : ''}`}
              onClick={() => {
                setSheetIndex(idx);
                setSelectedCell({ row: 0, col: 0 });
                setSortConfig(null);
                if (gridScrollRef.current) {
                  gridScrollRef.current.scrollLeft = 0;
                  gridScrollRef.current.scrollTop = 0;
                }
              }}
            >
              {sheet.name}
            </button>
          ))}
        </div>
        <span class="sheet-meta-count">
          {visibleRows.length} rows · {activeSheet.columns.length} cols
        </span>
      </div>
    </div>
  );
}

export const spreadsheetRendererModule: LoadedRenderer<preact.ComponentChildren, SpreadsheetWorkbook> = {
  render(context) {
    const { block, isCompact, onInspect } = context;
    if (isCompact) {
      const sheetCount = block.data.sheets.length;
      const rowCount = block.data.sheets.reduce((sum, s) => sum + s.rows.length, 0);
      return (
        <button
          type="button"
          class="artifact-inline-card"
          onClick={() => onInspect?.(block.id)}
        >
          <span class="artifact-badge badge-xlsx">XLSX</span>
          <span class="artifact-card-body">
            <span class="artifact-card-title">
              {block.filename ?? block.title ?? 'Spreadsheet Workbook'}
            </span>
            <span class="artifact-card-summary">
              {block.summary ?? `${sheetCount} sheet${sheetCount === 1 ? '' : 's'} · ${rowCount} rows`}
            </span>
          </span>
          <span class="artifact-card-cta">Open sheet →</span>
        </button>
      );
    }

    return <SpreadsheetStageView context={context} />;
  },
};
