import { useMemo, useState } from 'preact/hooks';
import type { LoadedRenderer, RendererContext } from '../../core/renderers';
import type { CellScalar, SqlCanvasData } from '../../core/types';
import '../enterprise-stage.css';

type SqlTab = 'chart' | 'grid' | 'sql';

const VIRTUAL_ROW_HEIGHT = 30;
const OVERSCAN_ROWS = 6;

/**
 * Generates 2,400 deterministic enterprise account cohort rows on-demand in <0.5ms
 * to back the virtualized warehouse grid without shipping 150 KB of static JSON.
 */
function expandWarehouseDrilldownRows(baseRows: ReadonlyArray<ReadonlyArray<CellScalar>>) {
  if (baseRows.length > 50) return baseRows;
  const segments = ['Financial Services', 'Healthcare', 'Global Retail', 'Cloud Infra', 'Defense'];
  const regions = ['US-East', 'EU-Central', 'UK-South', 'APAC-Tokyo'];
  const expanded: CellScalar[][] = [];
  for (let i = 0; i < 2400; i += 1) {
    const q = baseRows[i % baseRows.length]!;
    const arr = Math.round(45 + ((i * 37) % 480));
    const exp = Math.round(arr * (0.12 + ((i % 7) * 0.03)));
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
  const [scrollTop, setScrollTop] = useState(0);
  const [filter, setFilter] = useState('');
  const [copied, setCopied] = useState(false);

  const drilldownRows = useMemo(() => expandWarehouseDrilldownRows(data.rows), [data.rows]);

  const filteredGridRows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return drilldownRows;
    return drilldownRows.filter((r) => String(r[0] ?? '').toLowerCase().includes(q));
  }, [drilldownRows, filter]);

  const viewportHeight = 420;
  const startIdx = Math.max(0, Math.floor(scrollTop / VIRTUAL_ROW_HEIGHT) - OVERSCAN_ROWS);
  const endIdx = Math.min(
    filteredGridRows.length,
    Math.ceil((scrollTop + viewportHeight) / VIRTUAL_ROW_HEIGHT) + OVERSCAN_ROWS
  );
  const visibleSlice = filteredGridRows.slice(startIdx, endIdx);
  const gridTemplate = `minmax(180px, 2.2fr) repeat(${data.columns.length - 1}, minmax(82px, 1fr))`;

  const maxPrimary = Math.max(
    1,
    ...data.rows.map((r) => (typeof r[1] === 'number' ? r[1] : 0))
  );

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
            Virtualized Grid ({filteredGridRows.length.toLocaleString()})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'sql'}
            class={`seg-tab ${tab === 'sql' ? 'is-active' : ''}`}
            onClick={() => setTab('sql')}
          >
            SQL Query
          </button>
        </div>

        {tab === 'grid' ? (
          <input
            type="search"
            class="sheet-filter-input"
            placeholder="Filter 2,400 rows…"
            value={filter}
            onInput={(e) => {
              setFilter((e.currentTarget as HTMLInputElement).value);
              setScrollTop(0);
            }}
          />
        ) : (
          <span class="sheet-meta-count">
            {data.warehouse} · {data.executionMs} ms
          </span>
        )}
      </div>

      {tab === 'chart' && (
        <div class="stage-scroll-area">
          <div class="sql-kpi-strip">
            <div class="kpi-tile">
              <div class="kpi-tile-label">Ending Q4 ARR</div>
              <div class="kpi-tile-value">$5.64M</div>
            </div>
            <div class="kpi-tile">
              <div class="kpi-tile-label">Net Dollar Retention</div>
              <div class="kpi-tile-value">128.2%</div>
            </div>
            <div class="kpi-tile">
              <div class="kpi-tile-label">Warehouse Scan</div>
              <div class="kpi-tile-value">{data.scannedMb} MB</div>
            </div>
          </div>

          <svg viewBox="0 0 520 230" width="100%" role="img" aria-label="Quarterly Enterprise ARR chart">
            {[0, 0.25, 0.5, 0.75, 1].map((step) => {
              const y = 185 - step * 145;
              const label = `$${((maxPrimary * step) / 1000).toFixed(1)}M`;
              return (
                <g key={step}>
                  <line x1="48" y1={y} x2="500" y2={y} stroke="rgba(255,255,255,0.07)" />
                  <text x="40" y={y + 4} text-anchor="end" fill="#6e6e77" font-size="10">
                    {label}
                  </text>
                </g>
              );
            })}

            {data.rows.map((row, idx) => {
              const arrVal = Number(row[1] ?? 0);
              const expVal = Number(row[2] ?? 0);
              const xBase = 88 + idx * 106;
              const arrH = (arrVal / maxPrimary) * 145;
              const expH = (expVal / maxPrimary) * 145;
              return (
                <g key={String(row[0])}>
                  <rect
                    x={xBase}
                    y={185 - arrH}
                    width="32"
                    height={arrH}
                    rx="4"
                    fill="#38bdf8"
                  />
                  <rect
                    x={xBase + 36}
                    y={185 - expH}
                    width="24"
                    height={expH}
                    rx="4"
                    fill="#818cf8"
                  />
                  <text x={xBase + 28} y={178 - arrH} text-anchor="middle" fill="#e4e4e7" font-size="10" font-weight="600">
                    ${(arrVal / 1000).toFixed(2)}M
                  </text>
                  <text x={xBase + 28} y="204" text-anchor="middle" fill="#a1a1aa" font-size="11">
                    {String(row[0])}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {tab === 'grid' && (
        <div
          class="vgrid-viewport"
          onScroll={(e) => setScrollTop((e.currentTarget as HTMLDivElement).scrollTop)}
        >
          <div class="vgrid-header" style={{ gridTemplateColumns: gridTemplate }}>
            {data.columns.map((col, idx) => (
              <div key={col} class={`vgrid-cell ${idx > 0 ? 'is-num' : ''}`}>
                {col}
              </div>
            ))}
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
                  class="vgrid-row"
                  style={{
                    top: `${rowIndex * VIRTUAL_ROW_HEIGHT}px`,
                    gridTemplateColumns: gridTemplate,
                  }}
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
      )}

      {tab === 'sql' && (
        <div class="stage-scroll-area">
          <div class="code-block-card">
            <div class="code-block-header">
              <span>{data.warehouse}</span>
              <button
                type="button"
                class="ghost-pill"
                onClick={() => {
                  navigator.clipboard?.writeText(data.query);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1200);
                }}
              >
                {copied ? 'Copied' : 'Copy SQL'}
              </button>
            </div>
            <pre class="code-block-pre">
              <code>{data.query}</code>
            </pre>
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
