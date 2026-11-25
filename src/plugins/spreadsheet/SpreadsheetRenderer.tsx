import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { LoadedRenderer, RendererContext } from '../../core/renderers';
import type { CellScalar, SpreadsheetWorkbook } from '../../core/types';
import { columnIndexToLetter, serializeSheetToCsv } from './parser';
import './spreadsheet.css';

const VIRTUAL_ROW_HEIGHT = 32;
const VIRTUAL_OVERSCAN = 8;
const DEFAULT_VIEWPORT_HEIGHT = 560;

function formatCellDisplay(value: CellScalar): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? value.toLocaleString('en-US')
      : value.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 6,
        });
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

interface IndexedSheetRow {
  readonly cells: ReadonlyArray<CellScalar>;
  readonly sourceRowNumber: number;
}

function SpreadsheetStageView({ context }: { context: RendererContext<SpreadsheetWorkbook> }) {
  const workbook = context.block.data;
  const [sheetIndex, setSheetIndex] = useState(0);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number }>({
    row: 0,
    col: 0,
  });
  const [sortConfig, setSortConfig] = useState<{ col: number; asc: boolean } | null>(null);
  const [filterText, setFilterText] = useState('');
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(DEFAULT_VIEWPORT_HEIGHT);
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const gridScrollRef = useRef<HTMLDivElement>(null);

  const activeSheet = workbook.sheets[sheetIndex] ?? workbook.sheets[0];

  useEffect(() => {
    const el = gridScrollRef.current;
    if (!el) return;
    const measure = () => {
      if (el.clientHeight > 0) setViewportHeight(el.clientHeight);
    };
    measure();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    }
    return undefined;
  }, [sheetIndex]);

  const visibleRows = useMemo<ReadonlyArray<IndexedSheetRow>>(() => {
    if (!activeSheet) return [];
    const indexed: IndexedSheetRow[] = activeSheet.rows.map((cells, idx) => ({
      cells,
      sourceRowNumber: activeSheet.sourceRowNumbers?.[idx] ?? idx + 2,
    }));

    const query = filterText.trim().toLowerCase();
    const filtered = query
      ? indexed.filter((entry) =>
          entry.cells.some(
            (cell) => cell !== null && String(cell).toLowerCase().includes(query)
          )
        )
      : indexed;

    if (!sortConfig) return filtered;
    const { col, asc } = sortConfig;
    return [...filtered].sort((a, b) => {
      const av = a.cells[col];
      const bv = b.cells[col];
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

  const colCount = Math.max(activeSheet.columns.length, 1);
  const clampedRow =
    visibleRows.length === 0 ? 0 : Math.min(selectedCell.row, visibleRows.length - 1);
  const clampedCol = Math.min(selectedCell.col, colCount - 1);
  const selectedEntry = visibleRows[clampedRow];
  const selectedSourceRow = selectedEntry?.sourceRowNumber ?? clampedRow + 2;
  const selectedCoord = `${columnIndexToLetter(clampedCol)}${selectedSourceRow}`;
  const selectedRaw = selectedEntry?.cells[clampedCol] ?? null;
  const formulaOrValue =
    activeSheet.formulas?.[selectedCoord] ?? formatCellDisplay(selectedRaw) ?? '—';

  // Virtual window: mounts ~40 rows at any time even on 10,000+ row CSVs
  const totalRows = visibleRows.length;
  const startRow = Math.max(0, Math.floor(scrollTop / VIRTUAL_ROW_HEIGHT) - VIRTUAL_OVERSCAN);
  const visibleCount = Math.ceil(viewportHeight / VIRTUAL_ROW_HEIGHT) + VIRTUAL_OVERSCAN * 2;
  const endRow = Math.min(totalRows, startRow + Math.max(visibleCount, 30));
  const virtualSlice = visibleRows.slice(startRow, endRow);
  const topSpacerHeight = startRow * VIRTUAL_ROW_HEIGHT;
  const bottomSpacerHeight = Math.max(0, (totalRows - endRow) * VIRTUAL_ROW_HEIGHT);

  function moveSelection(nextRow: number, nextCol: number) {
    if (totalRows === 0) return;
    const targetRow = Math.max(0, Math.min(totalRows - 1, nextRow));
    const targetCol = Math.max(0, Math.min(colCount - 1, nextCol));
    setSelectedCell({ row: targetRow, col: targetCol });

    const container = gridScrollRef.current;
    if (container) {
      const rowTop = targetRow * VIRTUAL_ROW_HEIGHT;
      const rowBottom = rowTop + VIRTUAL_ROW_HEIGHT;
      const headerAllowance = 40;
      if (rowTop < container.scrollTop) {
        container.scrollTop = rowTop;
      } else if (rowBottom > container.scrollTop + container.clientHeight - headerAllowance) {
        container.scrollTop = rowBottom - container.clientHeight + headerAllowance;
      }
    }
  }

  function handleGridKeyDown(event: KeyboardEvent) {
    if (totalRows === 0) return;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        moveSelection(clampedRow + 1, clampedCol);
        break;
      case 'ArrowUp':
        event.preventDefault();
        moveSelection(clampedRow - 1, clampedCol);
        break;
      case 'ArrowRight':
        event.preventDefault();
        moveSelection(clampedRow, clampedCol + 1);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        moveSelection(clampedRow, clampedCol - 1);
        break;
      case 'Home':
        event.preventDefault();
        moveSelection(event.ctrlKey || event.metaKey ? 0 : clampedRow, 0);
        break;
      case 'End':
        event.preventDefault();
        moveSelection(
          event.ctrlKey || event.metaKey ? totalRows - 1 : clampedRow,
          colCount - 1
        );
        break;
      case 'PageDown':
        event.preventDefault();
        moveSelection(clampedRow + 15, clampedCol);
        break;
      case 'PageUp':
        event.preventDefault();
        moveSelection(clampedRow - 15, clampedCol);
        break;
      default:
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'c') {
          const textToCopy =
            selectedRaw === null || selectedRaw === undefined ? '' : String(selectedRaw);
          if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
            event.preventDefault();
            navigator.clipboard
              .writeText(textToCopy)
              .then(() => {
                setCopiedFeedback(true);
                setTimeout(() => setCopiedFeedback(false), 1400);
              })
              .catch(() => {});
          }
        }
        break;
    }
  }

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
          {copiedFeedback
            ? `Copied ${selectedCoord}`
            : formulaOrValue || 'Empty cell'}
        </span>
        <input
          type="search"
          class="sheet-filter-input"
          placeholder="Filter rows…"
          value={filterText}
          onInput={(e) => {
            setFilterText((e.currentTarget as HTMLInputElement).value);
            setSelectedCell({ row: 0, col: 0 });
            if (gridScrollRef.current) gridScrollRef.current.scrollTop = 0;
          }}
          aria-label="Filter spreadsheet rows"
        />
        <button type="button" class="ghost-pill" onClick={handleDownloadCsv}>
          Export CSV
        </button>
      </div>

      <div
        class="sheet-grid-scroll"
        ref={gridScrollRef}
        tabIndex={0}
        role="region"
        aria-label={`${activeSheet.name} data grid`}
        onScroll={(e) => setScrollTop((e.currentTarget as HTMLDivElement).scrollTop)}
        onKeyDown={handleGridKeyDown}
      >
        {visibleRows.length === 0 ? (
          <div class="empty-note">
            <span>
              {filterText.trim()
                ? `No rows match "${filterText}".`
                : 'This worksheet contains no rows.'}
            </span>
            {filterText.trim() && (
              <button
                type="button"
                class="ghost-pill"
                onClick={() => setFilterText('')}
              >
                Clear filter
              </button>
            )}
          </div>
        ) : (
          <table
            class="sheet-table"
            role="grid"
            aria-label={activeSheet.name}
            aria-rowcount={totalRows + 1}
            aria-colcount={colCount}
          >
            <thead>
              <tr role="row" aria-rowindex={1}>
                <th class="sheet-corner" aria-hidden="true">
                  #
                </th>
                {activeSheet.columns.map((colName, colIdx) => {
                  const isSorted = sortConfig?.col === colIdx;
                  const ariaSort = isSorted
                    ? sortConfig.asc
                      ? 'ascending'
                      : 'descending'
                    : 'none';
                  return (
                    <th
                      key={colIdx}
                      role="columnheader"
                      aria-sort={ariaSort}
                      class="sheet-col-header"
                    >
                      <button
                        type="button"
                        class="sheet-col-sort-btn"
                        title={`Sort column ${colName}`}
                        onClick={() =>
                          setSortConfig((prev) =>
                            prev?.col === colIdx
                              ? { col: colIdx, asc: !prev.asc }
                              : { col: colIdx, asc: true }
                          )
                        }
                      >
                        <span class="sheet-col-letter">{columnIndexToLetter(colIdx)}</span>
                        <span class="sheet-col-title">
                          <span>{colName}</span>
                          {isSorted && (
                            <span class="sort-indicator">{sortConfig.asc ? '↑' : '↓'}</span>
                          )}
                        </span>
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {topSpacerHeight > 0 && (
                <tr aria-hidden="true" class="sheet-virtual-spacer">
                  <td
                    colSpan={colCount + 1}
                    style={{ height: `${topSpacerHeight}px`, padding: 0, border: 'none' }}
                  />
                </tr>
              )}
              {virtualSlice.map((entry, localIdx) => {
                const rowIdx = startRow + localIdx;
                return (
                  <tr key={entry.sourceRowNumber} role="row" aria-rowindex={rowIdx + 2}>
                    <td class="sheet-row-num">{entry.sourceRowNumber}</td>
                    {activeSheet.columns.map((_, colIdx) => {
                      const cell = entry.cells[colIdx] ?? null;
                      const isSelected = clampedRow === rowIdx && clampedCol === colIdx;
                      const isNumeric = typeof cell === 'number';
                      const display = formatCellDisplay(cell);
                      const tone = typeof cell === 'string' ? classifyBadgeTone(cell) : null;

                      return (
                        <td
                          key={colIdx}
                          role="gridcell"
                          aria-selected={isSelected}
                          class={[
                            'sheet-cell',
                            isNumeric ? 'is-numeric' : '',
                            isSelected ? 'is-selected' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          onClick={() => {
                            setSelectedCell({ row: rowIdx, col: colIdx });
                            gridScrollRef.current?.focus({ preventScroll: true });
                          }}
                        >
                          {tone ? <span class={`cell-pill ${tone}`}>{display}</span> : display}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {bottomSpacerHeight > 0 && (
                <tr aria-hidden="true" class="sheet-virtual-spacer">
                  <td
                    colSpan={colCount + 1}
                    style={{ height: `${bottomSpacerHeight}px`, padding: 0, border: 'none' }}
                  />
                </tr>
              )}
            </tbody>
          </table>
        )}
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
                setScrollTop(0);
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
          {visibleRows.length.toLocaleString('en-US')} rows · {activeSheet.columns.length} cols
        </span>
      </div>
    </div>
  );
}

export const spreadsheetRendererModule: LoadedRenderer<
  preact.ComponentChildren,
  SpreadsheetWorkbook
> = {
  render(context) {
    return <SpreadsheetStageView context={context} />;
  },
};
