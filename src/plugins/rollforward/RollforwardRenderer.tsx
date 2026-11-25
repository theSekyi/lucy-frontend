import { useState } from 'preact/hooks';
import type { LoadedRenderer, RendererContext } from '../../core/renderers';
import '../enterprise-stage.css';
import '../accounting.css';
import type { RollforwardData, RollforwardPeriod } from './sample';

function fmtUsdWhole(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

function RollforwardStageView({ context }: { context: RendererContext<RollforwardData> }) {
  const initial = context.block.data;
  const [schedIdx, setSchedIdx] = useState(0);
  const [periodsBySched, setPeriodsBySched] = useState<Record<string, RollforwardPeriod[]>>(() =>
    Object.fromEntries(initial.schedules.map((s) => [s.id, [...s.periods]]))
  );
  const [stagedAje, setStagedAje] = useState(false);

  const activeSched = initial.schedules[schedIdx] ?? initial.schedules[0]!;
  const periods = periodsBySched[activeSched.id] ?? [...activeSched.periods];

  // Cascade Opening -> Ending dynamically so the rollforward identity never breaks
  let runningOpening = activeSched.openingBalance;
  const computedRows = periods.map((p) => {
    const open = runningOpening;
    const ending = open + p.additions - p.recognized;
    runningOpening = ending;
    return { ...p, open, ending };
  });

  const lastRow = computedRows[computedRows.length - 1]!;

  function updateCell(idx: number, key: 'additions' | 'recognized', val: number) {
    setStagedAje(false);
    setPeriodsBySched((prev) => ({
      ...prev,
      [activeSched.id]: (prev[activeSched.id] ?? []).map((p, i) =>
        i === idx ? { ...p, [key]: val } : p
      ),
    }));
  }

  function stagePeriodEndAje() {
    const summary = [
      `${activeSched.standard} (${lastRow.period}): ${activeSched.accountPair} for ${fmtUsdWhole(lastRow.recognized)} (Ending balance: ${fmtUsdWhole(lastRow.ending)})`,
    ];
    context.onCommitRevision?.(
      {
        schedules: initial.schedules.map((s) => ({
          ...s,
          periods: periodsBySched[s.id] ?? s.periods,
        })),
      },
      summary
    );
    setStagedAje(true);
  }

  return (
    <div class="stage-plugin-shell">
      <div class="stage-subbar">
        <div class="seg-tabs" role="tablist">
          {initial.schedules.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              class={`seg-tab ${idx === schedIdx ? 'is-active' : ''}`}
              onClick={() => {
                setSchedIdx(idx);
                setStagedAje(false);
              }}
            >
              {s.standard.split('·')[0]?.trim()}
            </button>
          ))}
        </div>

        <div class="stage-subbar-group">
          <span class="tickmark-pill tick-tied">Tied</span>
          <button type="button" class="primary-stage-btn" onClick={stagePeriodEndAje}>
            {stagedAje ? 'Staged' : `Stage ${lastRow.period} AJE`}
          </button>
        </div>
      </div>

      <div class="stage-scroll-area">
        <div class="redline-doc-banner">
          <div>
            <strong>{activeSched.standard}</strong>
            <div class="clause-footnote" style={{ marginTop: '3px' }}>
              Entry rule: {activeSched.accountPair}
            </div>
          </div>
          <span class="sheet-meta-count">Ending: {fmtUsdWhole(lastRow.ending)}</span>
        </div>

        <table class="acct-table">
          <thead>
            <tr>
              <th>Period</th>
              <th class="is-num">Opening</th>
              <th class="is-num">+ Additions</th>
              <th class="is-num">− Recognized</th>
              <th class="is-num">Ending Balance</th>
            </tr>
          </thead>
          <tbody>
            {computedRows.map((row, idx) => (
              <tr key={row.period}>
                <td>
                  <strong>{row.period}</strong>
                </td>
                <td class="is-num">{fmtUsdWhole(row.open)}</td>
                <td class="is-num">
                  <input
                    type="number"
                    step="5000"
                    class="acct-inline-num-input"
                    value={row.additions}
                    aria-label={`${row.period} additions`}
                    onInput={(e) =>
                      updateCell(
                        idx,
                        'additions',
                        Number((e.currentTarget as HTMLInputElement).value) || 0
                      )
                    }
                  />
                </td>
                <td class="is-num">
                  <input
                    type="number"
                    step="5000"
                    class="acct-inline-num-input"
                    value={row.recognized}
                    aria-label={`${row.period} recognized`}
                    onInput={(e) =>
                      updateCell(
                        idx,
                        'recognized',
                        Number((e.currentTarget as HTMLInputElement).value) || 0
                      )
                    }
                  />
                </td>
                <td class="is-num">
                  <strong>{fmtUsdWhole(row.ending)}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export const rollforwardRendererModule: LoadedRenderer<
  preact.ComponentChildren,
  RollforwardData
> = {
  render(context) {
    return <RollforwardStageView context={context} />;
  },
};
