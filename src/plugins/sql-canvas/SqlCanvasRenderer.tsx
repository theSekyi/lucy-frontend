import { useMemo, useState } from 'preact/hooks';
import type { LoadedRenderer, RendererContext } from '../../core/renderers';
import type { CellScalar, SqlCanvasData } from '../../core/types';
import '../enterprise-stage.css';

type SqlTab = 'chart' | 'grid' | 'sql';
type ChartKind = 'bars' | 'area';

const VIRTUAL_ROW_HEIGHT = 30;
const OVERSCAN_ROWS = 6;
const SEGMENTS = ['All', 'Financial Services', 'Healthcare', 'Global Retail', 'Cloud Infra', 'Defense'];

function expandWarehouseDrilldownRows(baseRows: ReadonlyArray<ReadonlyArray<CellScalar>>) {
  if (baseRows.length > 50) return baseRows;
  const segments = ['Financial Services', 'Healthcare', 'Global Retail', 'Cloud Infra', 'Defense'];
  const regions = ['US-East', 'EU-Central', 'UK-South', 'APAC-Tokyo'];
  const expanded: CellScalar[][] = [];
  for (let i = 0; i < 2400; i += 1) {
    const q = baseRows[i % baseRows.length]!;
    const arr = Math.round(45 + ((i * 37) % 480));
    const exp = Math.round(arr * (0.12 + (i % 7) * 0.03));
    const ndr = Number((114 + ((i * 3) % 24) + (i % 5) * 0.2).toFixed(1));
    expanded.push([
      `${q[0]} · ${segments[i % segments.length]} #${i + 1} (${regions[i % regions.length]})`,
      arr,
      exp,
      ndr,
      q[4] ?? 84.0,
    ]);
  }
  return expanded;
}

function SqlCanvasStageView({ context }: { context: RendererContext<SqlCanvasData> }) {
  const data = context.block.data;
  const [tab, setTab] = useState<SqlTab>('chart');
  const [chartKind, setChartKind] = useState<ChartKind>('bars');
  const [metricIdx, setMetricIdx] = useState<number>(1);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const [selectedQuarter, setSelectedQuarter] = useState<string | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<string>('All');
  const [sortCol, setSortCol] = useState<{ idx: number; asc: boolean } | null>(null);
  const [pickedRowIdx, setPickedRowIdx] = useState<number | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [filter, setFilter] = useState('');
  const [sqlText, setSqlText] = useState(data.query);
  const [execMs, setExecMs] = useState(data.executionMs);
  const [sqlLimit, setSqlLimit] = useState<number | null>(null);

  const drilldownRows = useMemo(() => expandWarehouseDrilldownRows(data.rows), [data.rows]);

  const filteredGridRows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    let result = drilldownRows.filter((row) => {
      const label = String(row[0] ?? '');
      if (selectedQuarter && !label.startsWith(selectedQuarter)) return false;
      if (selectedSegment !== 'All' && !label.includes(selectedSegment)) return false;
      if (q && !label.toLowerCase().includes(q)) return false;
      return true;
    });

    if (sortCol) {
      const { idx, asc } = sortCol;
      result = [...result].sort((a, b) => {
        const av = a[idx];
        const bv = b[idx];
        const cmp =
          typeof av === 'number' && typeof bv === 'number'
            ? av - bv
            : String(av ?? '').localeCompare(String(bv ?? ''), undefined, { numeric: true });
        return asc ? cmp : -cmp;
      });
    }

    if (sqlLimit !== null && sqlLimit > 0) {
      result = result.slice(0, sqlLimit);
    }
    return result;
  }, [drilldownRows, filter, selectedQuarter, selectedSegment, sortCol, sqlLimit]);

  const summaryStats = useMemo(() => {
    let sumArr = 0;
    let sumNdr = 0;
    for (const r of filteredGridRows) {
      sumArr += typeof r[1] === 'number' ? r[1] : 0;
      sumNdr += typeof r[3] === 'number' ? r[3] : 0;
    }
    const avgNdr = filteredGridRows.length ? (sumNdr / filteredGridRows.length).toFixed(1) : '0.0';
    return { sumArr, avgNdr };
  }, [filteredGridRows]);

  function runInteractiveQuery() {
    const t0 = performance.now();
    const limitMatch = sqlText.match(/\bLIMIT\s+(\d+)/i);
    setSqlLimit(limitMatch ? Number(limitMatch[1]) : null);

    const whereSeg = SEGMENTS.slice(1).find((s) =>
      new RegExp(s, 'i').test(sqlText)
    );
    if (whereSeg) setSelectedSegment(whereSeg);

    const elapsed = Math.max(4, Math.round((performance.now() - t0) * 10 + 11));
    setExecMs(elapsed);
    setTab('grid');
  }

  const viewportHeight = 390;
  const startIdx = Math.max(0, Math.floor(scrollTop / VIRTUAL_ROW_HEIGHT) - OVERSCAN_ROWS);
  const endIdx = Math.min(
    filteredGridRows.length,
    Math.ceil((scrollTop + viewportHeight) / VIRTUAL_ROW_HEIGHT) + OVERSCAN_ROWS
  );
  const visibleSlice = filteredGridRows.slice(startIdx, endIdx);
  const gridTemplate = `minmax(195px, 2.3fr) repeat(${data.columns.length - 1}, minmax(82px, 1fr))`;

  const metricName = data.columns[metricIdx] ?? 'Enterprise ARR ($K)';
  const chartValues = data.rows.map((r) => Number(r[metricIdx] ?? 0));
  const maxVal = Math.max(1, ...chartValues);
  const activeBarIndex = hoveredBar ?? data.rows.length - 1;
  const activeRow = data.rows[activeBarIndex] ?? data.rows[0]!;
  const prevRow = activeBarIndex > 0 ? data.rows[activeBarIndex - 1] : null;
  const qoqDelta =
    prevRow && Number(prevRow[metricIdx]) > 0
      ? `+${(((Number(activeRow[metricIdx]) - Number(prevRow[metricIdx])) / Number(prevRow[metricIdx])) * 100).toFixed(1)}% QoQ`
      : 'Baseline quarter';

  const areaPoints = data.rows
    .map((row, idx) => {
      const x = 95 + idx * 110;
      const y = 185 - (Number(row[metricIdx] ?? 0) / maxVal) * 140;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div class="stage-plugin-shell">
      <div class="stage-subbar">
        <div class="seg-tabs" role="tablist" aria-label="SQL canvas views">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'chart'}
            class={`seg-tab ${tab === 'chart' ? 'is-active' : ''}`}
            onClick={() => setTab('chart')}
          >
            Chart
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'grid'}
            class={`seg-tab ${tab === 'grid' ? 'is-active' : ''}`}
            onClick={() => setTab('grid')}
          >
            Rows ({filteredGridRows.length.toLocaleString()})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'sql'}
            class={`seg-tab ${tab === 'sql' ? 'is-active' : ''}`}
            onClick={() => setTab('sql')}
          >
            SQL Editor
          </button>
        </div>

        <div class="stage-subbar-group">
          {selectedQuarter && (
            <button
              type="button"
              class="cell-pill tone-good"
              onClick={() => setSelectedQuarter(null)}
              title="Clear quarter filter"
            >
              Cohort: {selectedQuarter} ×
            </button>
          )}
          <span class="sheet-meta-count">
            {data.warehouse} · {execMs} ms
          </span>
        </div>
      </div>

      {tab === 'chart' && (
        <div class="stage-scroll-area">
          <div class="sql-kpi-strip">
            <div class="kpi-tile">
              <div class="kpi-tile-label">Q4 Recognized Rev</div>
              <div class="kpi-tile-value">$5.64M</div>
            </div>
            <div class="kpi-tile">
              <div class="kpi-tile-label">Gross Margin</div>
              <div class="kpi-tile-value">85.1%</div>
            </div>
            <div class="kpi-tile">
              <div class="kpi-tile-label">Subledger Rows</div>
              <div class="kpi-tile-value">{filteredGridRows.length.toLocaleString()}</div>
            </div>
          </div>

          <div class="chart-controls-row">
            <div class="stage-subbar-group">
              {data.columns.slice(1).map((col, idx) => {
                const colIndex = idx + 1;
                return (
                  <button
                    key={col}
                    type="button"
                    class={`metric-chip ${metricIdx === colIndex ? 'is-active' : ''}`}
                    onClick={() => setMetricIdx(colIndex)}
                  >
                    {col}
                  </button>
                );
              })}
            </div>

            <div class="seg-tabs">
              <button
                type="button"
                class={`seg-tab ${chartKind === 'bars' ? 'is-active' : ''}`}
                onClick={() => setChartKind('bars')}
              >
                Bars
              </button>
              <button
                type="button"
                class={`seg-tab ${chartKind === 'area' ? 'is-active' : ''}`}
                onClick={() => setChartKind('area')}
              >
                Trend
              </button>
            </div>
          </div>

          <div class="chart-tooltip-banner">
            <span>
              <strong>{String(activeRow[0])}</strong> · {metricName}:{' '}
              <strong>{Number(activeRow[metricIdx]).toLocaleString('en-US')}</strong>
            </span>
            <span class="sheet-meta-count">{qoqDelta}</span>
          </div>

          <svg viewBox="0 0 520 225" width="100%" role="img" aria-label={metricName}>
            <defs>
              <linearGradient id="sqlAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#e4e4e7" stop-opacity="0.22" />
                <stop offset="100%" stop-color="#e4e4e7" stop-opacity="0.01" />
              </linearGradient>
            </defs>

            {[0, 0.25, 0.5, 0.75, 1].map((step) => {
              const y = 185 - step * 140;
              const rawVal = maxVal * step;
              const label = rawVal >= 1000 ? `${(rawVal / 1000).toFixed(1)}k` : rawVal.toFixed(0);
              return (
                <g key={step}>
                  <line x1="46" y1={y} x2="500" y2={y} stroke="rgba(255,255,255,0.06)" />
                  <text x="38" y={y + 4} text-anchor="end" fill="#6e6e77" font-size="10">
                    {label}
                  </text>
                </g>
              );
            })}

            {chartKind === 'area' && (
              <>
                <polygon
                  points={`95,185 ${areaPoints} ${95 + (data.rows.length - 1) * 110},185`}
                  fill="url(#sqlAreaGrad)"
                />
                <polyline
                  points={areaPoints}
                  fill="none"
                  stroke="#e4e4e7"
                  stroke-width="2"
                />
              </>
            )}

            {data.rows.map((row, idx) => {
              const quarterLabel = String(row[0]);
              const val = Number(row[metricIdx] ?? 0);
              const xCenter = 95 + idx * 110;
              const h = (val / maxVal) * 140;
              const isSelected = selectedQuarter === quarterLabel;
              const isHovered = hoveredBar === idx;

              return (
                <g
                  key={quarterLabel}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredBar(idx)}
                  onMouseLeave={() => setHoveredBar(null)}
                  onClick={() =>
                    setSelectedQuarter((curr) => (curr === quarterLabel ? null : quarterLabel))
                  }
                >
                  {chartKind === 'bars' ? (
                    <rect
                      x={xCenter - 20}
                      y={185 - h}
                      width="40"
                      height={h}
                      rx="4"
                      fill={isSelected ? '#ffffff' : isHovered ? '#e4e4e7' : '#a1a1aa'}
                    />
                  ) : (
                    <circle
                      cx={xCenter}
                      cy={185 - h}
                      r={isHovered || isSelected ? 5.5 : 4}
                      fill={isSelected ? '#ffffff' : '#d4d4d8'}
                      stroke="#0b0b0e"
                      stroke-width="2"
                    />
                  )}
                  <text
                    x={xCenter}
                    y={177 - h}
                    text-anchor="middle"
                    fill="#e4e4e7"
                    font-size="10.5"
                    font-weight="500"
                  >
                    {val.toLocaleString('en-US')}
                  </text>
                  <text
                    x={xCenter}
                    y="204"
                    text-anchor="middle"
                    fill={isSelected ? '#ffffff' : '#a1a1aa'}
                    font-size="11"
                    font-weight={isSelected ? '600' : '400'}
                  >
                    {quarterLabel}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {tab === 'grid' && (
        <>
          <div class="stage-subbar" style={{ background: '#0e0e12' }}>
            <div class="stage-subbar-group">
              {SEGMENTS.map((seg) => (
                <button
                  key={seg}
                  type="button"
                  class={`metric-chip ${selectedSegment === seg ? 'is-active' : ''}`}
                  onClick={() => {
                    setSelectedSegment(seg);
                    setScrollTop(0);
                  }}
                >
                  {seg}
                </button>
              ))}
            </div>

            <input
              type="search"
              class="sheet-filter-input"
              placeholder="Search cohorts…"
              value={filter}
              onInput={(e) => {
                setFilter((e.currentTarget as HTMLInputElement).value);
                setScrollTop(0);
              }}
            />
          </div>

          <div
            class="vgrid-viewport"
            onScroll={(e) => setScrollTop((e.currentTarget as HTMLDivElement).scrollTop)}
          >
            <div class="vgrid-header" style={{ gridTemplateColumns: gridTemplate }}>
              {data.columns.map((col, idx) => {
                const sorted = sortCol?.idx === idx;
                return (
                  <button
                    key={col}
                    type="button"
                    class={`vgrid-header-btn ${idx > 0 ? 'is-num' : ''}`}
                    onClick={() =>
                      setSortCol((prev) =>
                        prev?.idx === idx ? { idx, asc: !prev.asc } : { idx, asc: false }
                      )
                    }
                  >
                    <span>{col}</span>
                    {sorted && <span>{sortCol.asc ? '↑' : '↓'}</span>}
                  </button>
                );
              })}
            </div>

            <div
              style={{
                height: `${filteredGridRows.length * VIRTUAL_ROW_HEIGHT}px`,
                position: 'relative',
              }}
            >
              {visibleSlice.map((row, offset) => {
                const rowIndex = startIdx + offset;
                return (
                  <div
                    key={rowIndex}
                    class={`vgrid-row ${pickedRowIdx === rowIndex ? 'is-picked' : ''}`}
                    style={{
                      top: `${rowIndex * VIRTUAL_ROW_HEIGHT}px`,
                      gridTemplateColumns: gridTemplate,
                    }}
                    onClick={() => setPickedRowIdx(rowIndex)}
                  >
                    {row.map((cell, cIdx) => (
                      <div key={cIdx} class={`vgrid-cell ${cIdx > 0 ? 'is-num' : ''}`}>
                        {typeof cell === 'number' ? cell.toLocaleString('en-US') : String(cell ?? '')}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          <div class="sheet-tabs-bar">
            <span class="sheet-meta-count">
              Rows: <strong>{filteredGridRows.length.toLocaleString()}</strong> · Recognized:{' '}
              <strong>${summaryStats.sumArr.toLocaleString('en-US')}K</strong> · Avg Retention:{' '}
              <strong>{summaryStats.avgNdr}%</strong>
            </span>
            {(selectedQuarter || selectedSegment !== 'All' || filter || sqlLimit) && (
              <button
                type="button"
                class="ghost-pill"
                onClick={() => {
                  setSelectedQuarter(null);
                  setSelectedSegment('All');
                  setFilter('');
                  setSqlLimit(null);
                }}
              >
                Reset filters
              </button>
            )}
          </div>
        </>
      )}

      {tab === 'sql' && (
        <div class="stage-scroll-area">
          <div class="sql-editor-card">
            <div class="sql-editor-header">
              <span>{data.warehouse}</span>
              <button type="button" class="primary-stage-btn" onClick={runInteractiveQuery}>
                Run query
              </button>
            </div>
            <textarea
              class="sql-editor-textarea"
              value={sqlText}
              spellcheck={false}
              onInput={(e) => setSqlText((e.currentTarget as HTMLTextAreaElement).value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  runInteractiveQuery();
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export const sqlCanvasRendererModule: LoadedRenderer<preact.ComponentChildren, SqlCanvasData> = {
  render(context) {
    return <SqlCanvasStageView context={context} />;
  },
};
