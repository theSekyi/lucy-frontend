import { Fragment } from 'preact';
import { useState } from 'preact/hooks';
import type { LoadedRenderer, RendererContext } from '../../core/renderers';
import '../enterprise-stage.css';
import '../accounting.css';
import type { TrialBalanceAccount, TrialBalanceData } from './sample';

const CATEGORIES: TrialBalanceAccount['category'][] = [
  'Assets',
  'Liabilities & Equity',
  'Revenue',
  'Operating Expenses',
];

function fmtAcct(n: number): string {
  const abs = Math.abs(Math.round(n)).toLocaleString('en-US');
  return n < 0 ? `(${abs})` : abs;
}

function TrialBalanceStageView({ context }: { context: RendererContext<TrialBalanceData> }) {
  const tb = context.block.data;
  const [pmThreshold, setPmThreshold] = useState(tb.materialityThreshold);
  const [ajeMap, setAjeMap] = useState<Record<string, number>>(() =>
    Object.fromEntries(tb.accounts.map((a) => [a.code, a.aje]))
  );
  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  const [collapsedCats, setCollapsedCats] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);

  const netAdjusted = tb.accounts.reduce(
    (sum, a) => sum + a.unadjusted + (ajeMap[a.code] ?? a.aje),
    0
  );
  const netAje = tb.accounts.reduce((sum, a) => sum + (ajeMap[a.code] ?? a.aje), 0);

  function saveAdjustments() {
    const changes = tb.accounts
      .filter((a) => (ajeMap[a.code] ?? a.aje) !== a.aje)
      .map((a) => `Acct ${a.code} (${a.name}) AJE: ${fmtAcct(a.aje)} → ${fmtAcct(ajeMap[a.code]!)}`);
    if (pmThreshold !== tb.materialityThreshold) {
      changes.push(`Performance Materiality: $${pmThreshold.toLocaleString('en-US')}`);
    }
    if (changes.length === 0) {
      changes.push(`Verified Trial Balance tie-out (Net balance: $${netAdjusted})`);
    }
    context.onCommitRevision?.(
      {
        ...tb,
        materialityThreshold: pmThreshold,
        accounts: tb.accounts.map((a) => ({ ...a, aje: ajeMap[a.code] ?? a.aje })),
      },
      changes
    );
    setSaved(true);
  }

  return (
    <div class="stage-plugin-shell">
      <div class="stage-subbar">
        <div class="stage-subbar-group">
          <span
            class={`tickmark-pill ${netAdjusted === 0 ? 'tick-tied' : 'tick-exception'}`}
          >
            {netAdjusted === 0
              ? '✓ TB Balanced ($0)'
              : `⊗ Out of Balance: $${fmtAcct(netAdjusted)}`}
          </span>

          <span class="sheet-meta-count">PM ($):</span>
          <input
            type="number"
            step="5000"
            class="acct-inline-num-input"
            value={pmThreshold}
            aria-label="Performance materiality threshold"
            onInput={(e) => {
              setPmThreshold(Number((e.currentTarget as HTMLInputElement).value) || 0);
              setSaved(false);
            }}
          />
        </div>

        <button
          type="button"
          class="primary-stage-btn"
          disabled={netAdjusted !== 0}
          style={netAdjusted !== 0 ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
          onClick={saveAdjustments}
        >
          {saved ? '✓ Posted' : 'Save TB & AJEs'}
        </button>
      </div>

      <div class="vgrid-viewport">
        <table class="acct-table">
          <thead>
            <tr>
              <th>Account</th>
              <th class="is-num">Unadjusted</th>
              <th class="is-num">AJE Dr/(Cr)</th>
              <th class="is-num">Adjusted TB</th>
              <th class="is-num">Flux ($)</th>
              <th>Flag</th>
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map((cat) => {
              const rows = tb.accounts.filter((a) => a.category === cat);
              const isCollapsed = collapsedCats[cat];

              return (
                <Fragment key={cat}>
                  <tr
                    class="tb-group-row"
                    onClick={() =>
                      setCollapsedCats((prev) => ({ ...prev, [cat]: !prev[cat] }))
                    }
                  >
                    <td colSpan={6}>
                      {isCollapsed ? '▸' : '▾'} {cat} ({rows.length})
                    </td>
                  </tr>

                  {!isCollapsed &&
                    rows.map((acct) => {
                      const ajeVal = ajeMap[acct.code] ?? acct.aje;
                      const adjusted = acct.unadjusted + ajeVal;
                      const flux = adjusted - acct.priorPeriod;
                      const exceedsPm = Math.abs(flux) >= pmThreshold;
                      const isExpanded = expandedCode === acct.code;

                      return (
                        <Fragment key={acct.code}>
                          <tr
                            class={`acct-row-clickable ${isExpanded ? 'is-selected' : ''}`}
                            onClick={() =>
                              setExpandedCode((curr) => (curr === acct.code ? null : acct.code))
                            }
                          >
                            <td>
                              <strong>{acct.code}</strong> · {acct.name}
                            </td>
                            <td class="is-num">{fmtAcct(acct.unadjusted)}</td>
                            <td class="is-num" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="number"
                                class="acct-inline-num-input"
                                value={ajeVal}
                                aria-label={`AJE for ${acct.code}`}
                                onInput={(e) => {
                                  setSaved(false);
                                  setAjeMap((prev) => ({
                                    ...prev,
                                    [acct.code]:
                                      Number((e.currentTarget as HTMLInputElement).value) || 0,
                                  }));
                                }}
                              />
                            </td>
                            <td class="is-num">
                              <strong>{fmtAcct(adjusted)}</strong>
                            </td>
                            <td
                              class="is-num"
                              style={{ color: exceedsPm ? '#fcd34d' : '#a1a1aa' }}
                            >
                              {flux >= 0 ? `+${fmtAcct(flux)}` : fmtAcct(flux)}
                            </td>
                            <td>
                              {exceedsPm ? (
                                <span class="tickmark-pill tick-pbc">&gt; PM</span>
                              ) : (
                                <span class="sheet-meta-count">Pass</span>
                              )}
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr class="tb-drilldown-row">
                              <td colSpan={6}>
                                <div style={{ fontSize: '11.5px', color: '#a1a1aa' }}>
                                  <strong>GL Drill-Down ({acct.code}):</strong>{' '}
                                  {acct.drilldown.join(' · ')}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div class="sheet-tabs-bar">
        <span class="sheet-meta-count">
          {tb.entity} · {tb.period} · Net AJE: <strong>{fmtAcct(netAje)}</strong>
        </span>
        <span class="sheet-meta-count">Click any account row to drill into GL entries</span>
      </div>
    </div>
  );
}

export const trialBalanceRendererModule: LoadedRenderer<
  preact.ComponentChildren,
  TrialBalanceData
> = {
  render(context) {
    return <TrialBalanceStageView context={context} />;
  },
};
