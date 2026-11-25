import { useState } from 'preact/hooks';
import type { LoadedRenderer, RendererContext } from '../../core/renderers';
import '../enterprise-stage.css';
import '../accounting.css';
import type { TickmarkState, VouchingWorkpaperData } from './sample';

const TICK_META: Record<TickmarkState, { symbol: string; label: string; cls: string }> = {
  tied: { symbol: '✓', label: 'Agreed to source', cls: 'tick-tied' },
  exception: { symbol: '⊗', label: 'Variance', cls: 'tick-exception' },
  pbc: { symbol: 'PBC', label: 'PBC Open', cls: 'tick-pbc' },
};

const TICK_ORDER: TickmarkState[] = ['tied', 'exception', 'pbc'];

function fmtUsd(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function VouchingStageView({ context }: { context: RendererContext<VouchingWorkpaperData> }) {
  const wp = context.block.data;
  const [selectedId, setSelectedId] = useState<string>(wp.items[1]?.id ?? wp.items[0]?.id ?? '');
  const [ticks, setTicks] = useState<Record<string, TickmarkState>>(() =>
    Object.fromEntries(wp.items.map((i) => [i.id, i.tickmark]))
  );
  const [saved, setSaved] = useState(false);

  const active = wp.items.find((i) => i.id === selectedId) ?? wp.items[0]!;
  const tiedCount = wp.items.filter((i) => ticks[i.id] === 'tied').length;
  const excCount = wp.items.filter((i) => ticks[i.id] === 'exception').length;
  const pbcCount = wp.items.filter((i) => ticks[i.id] === 'pbc').length;

  function cycleTick(id: string) {
    setSaved(false);
    setTicks((prev) => {
      const curr = prev[id] ?? 'tied';
      const next = TICK_ORDER[(TICK_ORDER.indexOf(curr) + 1) % TICK_ORDER.length]!;
      return { ...prev, [id]: next };
    });
  }

  function saveWorkpaper() {
    const summary = wp.items.map(
      (i) => `${i.sampleCode} (${i.vendor.trim()}): ${TICK_META[ticks[i.id] ?? i.tickmark].label}`
    );
    const updated: VouchingWorkpaperData = {
      ...wp,
      items: wp.items.map((i) => ({ ...i, tickmark: ticks[i.id] ?? i.tickmark })),
    };
    context.onCommitRevision?.(updated, summary);
    setSaved(true);
  }

  const diff = Number((active.ledgerAmount - active.docAmount).toFixed(2));
  const subtotal = Number((active.docAmount - active.taxAmount).toFixed(2));

  return (
    <div class="stage-plugin-shell">
      <div class="stage-subbar">
        <div class="stage-subbar-group">
          <span class="tickmark-pill tick-tied">✓ {tiedCount} Tied</span>
          {excCount > 0 && <span class="tickmark-pill tick-exception">⊗ {excCount} Exception</span>}
          {pbcCount > 0 && <span class="tickmark-pill tick-pbc">PBC {pbcCount}</span>}
        </div>

        <div class="stage-subbar-group">
          <span class="sheet-meta-count">Click tickmark pill to reclassify</span>
          <button type="button" class="primary-stage-btn" onClick={saveWorkpaper}>
            {saved ? '✓ Signed off' : 'Sign off workpaper'}
          </button>
        </div>
      </div>

      <div class="vouch-split">
        <div class="vouch-ledger-pane">
          <table class="acct-table">
            <thead>
              <tr>
                <th>Ref</th>
                <th>Vendor / Payee</th>
                <th>GL Account</th>
                <th class="is-num">GL Amount</th>
                <th class="is-num">Source Doc</th>
                <th>Tickmark</th>
              </tr>
            </thead>
            <tbody>
              {wp.items.map((item) => {
                const tick = ticks[item.id] ?? item.tickmark;
                const meta = TICK_META[tick];
                return (
                  <tr
                    key={item.id}
                    class={`acct-row-clickable ${item.id === active.id ? 'is-selected' : ''}`}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <td>
                      <strong>{item.sampleCode}</strong>
                    </td>
                    <td>{item.vendor}</td>
                    <td style={{ color: '#a1a1aa' }}>{item.glAccount}</td>
                    <td class="is-num">{fmtUsd(item.ledgerAmount)}</td>
                    <td class="is-num">{fmtUsd(item.docAmount)}</td>
                    <td>
                      <button
                        type="button"
                        class={`tickmark-pill ${meta.cls}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          cycleTick(item.id);
                        }}
                      >
                        {meta.symbol} {meta.label}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div class="vouch-doc-pane">
          <article class="vouch-invoice-paper" aria-label="Source document preview">
            <div class="pdf-running-header" style={{ marginBottom: '12px' }}>
              <span>{active.formType.toUpperCase()} · VOUCHED SOURCE</span>
              <span>SELECTION {active.sampleCode}</span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '16px',
              }}
            >
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700 }}>{active.vendor}</div>
                <div style={{ color: '#57534e', marginTop: '3px' }}>{active.description}</div>
              </div>

              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#78716c', marginRight: '6px' }}>
                    Doc #:
                  </span>
                  <span class="vouch-bbox">{active.invoiceNo}</span>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#78716c', marginRight: '6px' }}>
                    Date:
                  </span>
                  <span class="vouch-bbox">{active.invoiceDate}</span>
                </div>
              </div>
            </div>

            <div
              style={{
                borderTop: '1px solid #d6d3d1',
                borderBottom: '1px solid #d6d3d1',
                padding: '10px 0',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Net Subtotal</span>
                <span style={{ fontFamily: 'ui-monospace, monospace' }}>{fmtUsd(subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Tax / Withholding</span>
                <span style={{ fontFamily: 'ui-monospace, monospace' }}>
                  {fmtUsd(active.taxAmount)}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '6px',
                  borderTop: '1px dashed #d6d3d1',
                  fontWeight: 700,
                }}
              >
                <span>Source Document Total</span>
                <span class={`vouch-bbox ${diff !== 0 ? 'is-mismatch' : ''}`}>
                  {fmtUsd(active.docAmount)}
                </span>
              </div>
            </div>

            <div
              style={{
                marginTop: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap',
                fontSize: '11.5px',
                color: diff === 0 ? '#15803d' : '#b91c1c',
                fontWeight: 600,
              }}
            >
              <span>GL Posted ({active.glAccount}): {fmtUsd(active.ledgerAmount)}</span>
              <span>
                {diff === 0
                  ? '✓ $0.00 Variance — Tied to General Ledger'
                  : `⊗ Variance: ${fmtUsd(diff)} vs General Ledger`}
              </span>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}

export const vouchingRendererModule: LoadedRenderer<preact.ComponentChildren, VouchingWorkpaperData> = {
  render(context) {
    return <VouchingStageView context={context} />;
  },
};
