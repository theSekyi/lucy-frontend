import { useState } from 'preact/hooks';
import { evaluateRollforwardTieOut } from '../../core/ledger';
import { formatMoneyMinor } from '../../core/money';
import type { LoadedRenderer, RendererContext } from '../../core/renderers';
import { MoneyInput } from '../../ui/primitives/MoneyInput';
import '../enterprise-stage.css';
import '../accounting.css';
import type { RollforwardData } from './sample';

function RollforwardStageView({ context }: { context: RendererContext<RollforwardData> }) {
  const baseline = context.block.data;
  const [localDraft, setLocalDraft] = useState<RollforwardData | null>(null);
  const data = context.draft ?? localDraft ?? baseline;
  const currency = data.currency ?? 'GBP';
  const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '£';

  const [schedIdx, setSchedIdx] = useState(0);
  const activeSched = data.schedules[schedIdx] ?? data.schedules[0]!;
  const activeEval = evaluateRollforwardTieOut(activeSched);
  const baselineSched =
    baseline.schedules.find((s) => s.id === activeSched.id) ?? activeSched;
  const lastRow = activeEval.rows[activeEval.rows.length - 1]!;

  function updateCell(idx: number, key: 'additions' | 'recognized', val: number) {
    const next: RollforwardData = {
      ...data,
      schedules: data.schedules.map((s) =>
        s.id === activeSched.id
          ? {
              ...s,
              periods: s.periods.map((p, pIdx) =>
                pIdx === idx ? { ...p, [key]: Math.max(0, Math.round(val)) } : p
              ),
            }
          : s
      ),
    };
    if (context.onUpdateDraft) {
      context.onUpdateDraft(next);
    } else {
      setLocalDraft(next);
    }
  }

  function saveSchedule() {
    const summary = [
      `${activeSched.standard} (${lastRow.period}): ${activeSched.accountPair} — recognized ${formatMoneyMinor(lastRow.recMinor, { currency })} (ending balance: ${formatMoneyMinor(lastRow.endingMinor, { currency })})`,
    ];
    context.onCommitRevision?.(data, summary);
    setLocalDraft(null);
  }

  return (
    <div class="stage-plugin-shell">
      <div class="stage-subbar">
        <div class="seg-tabs" role="tablist" aria-label="Accounting rollforward schedules">
          {data.schedules.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={idx === schedIdx}
              class={`seg-tab ${idx === schedIdx ? 'is-active' : ''}`}
              onClick={() => setSchedIdx(idx)}
            >
              {s.standard.split('·')[0]?.trim()}
            </button>
          ))}
        </div>

        <div class="stage-subbar-group">
          <span class="tickmark-pill tick-tied">Reconciled</span>
          <button type="button" class="primary-stage-btn" onClick={saveSchedule}>
            Save
          </button>
        </div>
      </div>

      <div class="stage-scroll-area">
        <div class="redline-doc-banner">
          <div>
            <strong>{activeSched.standard}</strong>
            <div class="clause-footnote">Entry rule: {activeSched.accountPair}</div>
          </div>
          <span class="sheet-meta-count">
            Ending: <strong>{formatMoneyMinor(lastRow.endingMinor, { currency })}</strong>
          </span>
        </div>

        <table class="acct-table">
          <thead>
            <tr>
              <th scope="col">Period</th>
              <th scope="col" class="is-num">
                Opening ({symbol})
              </th>
              <th scope="col" class="is-num">
                + Additions ({symbol})
              </th>
              <th scope="col" class="is-num">
                − Recognized ({symbol})
              </th>
              <th scope="col" class="is-num">
                Ending Balance ({symbol})
              </th>
            </tr>
          </thead>
          <tbody>
            {activeEval.rows.map((row, idx) => {
              const origPeriod = baselineSched.periods[idx];
              const livePeriod = activeSched.periods[idx]!;
              return (
                <tr key={row.period}>
                  <td>
                    <strong>{row.period}</strong>
                  </td>
                  <td class="is-num">{formatMoneyMinor(row.openMinor, { currency })}</td>
                  <td class="is-num">
                    <MoneyInput
                      value={livePeriod.additions}
                      baselineValue={origPeriod?.additions}
                      allowNegative={false}
                      ariaLabel={`${row.period} additions`}
                      onChange={(val) => updateCell(idx, 'additions', val)}
                    />
                  </td>
                  <td class="is-num">
                    <MoneyInput
                      value={livePeriod.recognized}
                      baselineValue={origPeriod?.recognized}
                      allowNegative={false}
                      ariaLabel={`${row.period} recognized`}
                      onChange={(val) => updateCell(idx, 'recognized', val)}
                    />
                  </td>
                  <td class="is-num">
                    <strong>{formatMoneyMinor(row.endingMinor, { currency })}</strong>
                  </td>
                </tr>
              );
            })}
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
