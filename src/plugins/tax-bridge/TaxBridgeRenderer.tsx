import { useState } from 'preact/hooks';
import type { LoadedRenderer, RendererContext } from '../../core/renderers';
import '../enterprise-stage.css';
import '../accounting.css';
import type { TaxBridgeData } from './sample';

function fmtTaxUsd(n: number): string {
  const abs = `$${Math.abs(Math.round(n)).toLocaleString('en-US')}`;
  return n < 0 ? `(${abs})` : abs;
}

function TaxBridgeStageView({ context }: { context: RendererContext<TaxBridgeData> }) {
  const data = context.block.data;
  const [tab, setTab] = useState<'m1' | 'k1'>('m1');
  const [amounts, setAmounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(data.adjustments.map((a) => [a.id, a.amount]))
  );
  const [selectedId, setSelectedId] = useState<string>(data.adjustments[0]?.id ?? '');
  const [saved, setSaved] = useState(false);

  const permTotal = data.adjustments
    .filter((a) => a.type === 'permanent')
    .reduce((sum, a) => sum + (amounts[a.id] ?? a.amount), 0);
  const tempTotal = data.adjustments
    .filter((a) => a.type === 'temporary')
    .reduce((sum, a) => sum + (amounts[a.id] ?? a.amount), 0);
  const taxableIncome = data.bookNetIncome + permTotal + tempTotal;
  const estCorpTax21 = Math.max(0, Math.round(taxableIncome * 0.21));

  const selectedLine =
    data.adjustments.find((a) => a.id === selectedId) ?? data.adjustments[0];

  function saveTaxBridge() {
    const summary = [
      `Taxable Income reconciled at ${fmtTaxUsd(taxableIncome)} (Est. 21% Federal: ${fmtTaxUsd(estCorpTax21)})`,
    ];
    context.onCommitRevision?.(
      {
        ...data,
        adjustments: data.adjustments.map((a) => ({
          ...a,
          amount: amounts[a.id] ?? a.amount,
        })),
      },
      summary
    );
    setSaved(true);
  }

  return (
    <div class="stage-plugin-shell">
      <div class="stage-subbar">
        <div class="stage-subbar-group">
          <div class="seg-tabs" role="tablist">
            <button
              type="button"
              class={`seg-tab ${tab === 'm1' ? 'is-active' : ''}`}
              onClick={() => setTab('m1')}
            >
              Schedule M-1 / M-3 Bridge
            </button>
            <button
              type="button"
              class={`seg-tab ${tab === 'k1' ? 'is-active' : ''}`}
              onClick={() => setTab('k1')}
            >
              Schedule K-1 Allocations ({data.partners.length})
            </button>
          </div>
          <span class="sheet-meta-count">21% Est. Tax: {fmtTaxUsd(estCorpTax21)}</span>
        </div>

        <button type="button" class="primary-stage-btn" onClick={saveTaxBridge}>
          {saved ? '✓ Saved' : 'Save tax workpaper'}
        </button>
      </div>

      <div class="stage-scroll-area">
        <div class="tax-waterfall-grid">
          <div class="kpi-tile">
            <div class="kpi-tile-label">Book Net Income</div>
            <div class="kpi-tile-value">{fmtTaxUsd(data.bookNetIncome)}</div>
          </div>
          <div class="kpi-tile">
            <div class="kpi-tile-label">Permanent Diffs</div>
            <div class="kpi-tile-value">{fmtTaxUsd(permTotal)}</div>
          </div>
          <div class="kpi-tile">
            <div class="kpi-tile-label">Temporary Diffs</div>
            <div class="kpi-tile-value">{fmtTaxUsd(tempTotal)}</div>
          </div>
          <div class="kpi-tile" style={{ borderColor: 'rgba(74, 222, 128, 0.4)' }}>
            <div class="kpi-tile-label">Taxable Income</div>
            <div class="kpi-tile-value" style={{ color: '#86efac' }}>
              {fmtTaxUsd(taxableIncome)}
            </div>
          </div>
        </div>

        {tab === 'm1' ? (
          <>
            <table class="acct-table">
              <thead>
                <tr>
                  <th>Adjustment</th>
                  <th>Type</th>
                  <th>Authority</th>
                  <th class="is-num">M-1 Amount ($)</th>
                </tr>
              </thead>
              <tbody>
                {data.adjustments.map((adj) => {
                  const val = amounts[adj.id] ?? adj.amount;
                  return (
                    <tr
                      key={adj.id}
                      class={`acct-row-clickable ${adj.id === selectedLine?.id ? 'is-selected' : ''}`}
                      onClick={() => setSelectedId(adj.id)}
                    >
                      <td>
                        <strong>{adj.description}</strong>
                      </td>
                      <td>
                        <span
                          class={`cell-pill ${adj.type === 'permanent' ? 'tone-warn' : 'tone-neutral'}`}
                        >
                          {adj.type === 'permanent' ? 'Perm' : 'Temp'}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'ui-monospace, monospace', fontSize: '11.5px' }}>
                        {adj.ircSection}
                      </td>
                      <td class="is-num" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="number"
                          step="1000"
                          class="acct-inline-num-input"
                          value={val}
                          aria-label={adj.description}
                          onInput={(e) => {
                            setSaved(false);
                            setAmounts((prev) => ({
                              ...prev,
                              [adj.id]:
                                Number((e.currentTarget as HTMLInputElement).value) || 0,
                            }));
                          }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {selectedLine && (
              <div class="redline-doc-banner" style={{ marginTop: '14px', marginBottom: 0 }}>
                <div>
                  <strong>
                    Form Trace: {selectedLine.formBox} ({selectedLine.ircSection})
                  </strong>
                  <div class="clause-footnote" style={{ marginTop: '3px' }}>
                    Source Trial Balance Account: {selectedLine.tbAccounts}
                  </div>
                </div>
                <span class="tickmark-pill tick-tied">✓ Traced to TB</span>
              </div>
            )}
          </>
        ) : (
          <table class="acct-table">
            <thead>
              <tr>
                <th>Partner / Member</th>
                <th>Classification</th>
                <th class="is-num">Ownership %</th>
                <th class="is-num">Box 1 Ordinary Income</th>
              </tr>
            </thead>
            <tbody>
              {data.partners.map((p) => (
                <tr key={p.partner}>
                  <td>
                    <strong>{p.partner}</strong>
                  </td>
                  <td style={{ color: '#a1a1aa' }}>{p.entityType}</td>
                  <td class="is-num">{p.ownershipPct.toFixed(1)}%</td>
                  <td class="is-num">
                    <strong>{fmtTaxUsd((taxableIncome * p.ownershipPct) / 100)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export const taxBridgeRendererModule: LoadedRenderer<preact.ComponentChildren, TaxBridgeData> = {
  render(context) {
    return <TaxBridgeStageView context={context} />;
  },
};
