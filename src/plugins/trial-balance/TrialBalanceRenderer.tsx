import { Fragment } from 'preact';
import { useState } from 'preact/hooks';
import { evaluateTrialBalanceTieOut } from '../../core/ledger';
import { formatAccountingNumber, formatMoney, formatMoneyMinor } from '../../core/money';
import type { LoadedRenderer, RendererContext } from '../../core/renderers';
import { MoneyInput } from '../../ui/primitives/MoneyInput';
import '../enterprise-stage.css';
import '../accounting.css';
import type { TrialBalanceAccount, TrialBalanceData } from './sample';

const CATEGORIES: TrialBalanceAccount['category'][] = [
  'Assets',
  'Liabilities & Equity',
  'Revenue',
  'Operating Expenses',
];

function TrialBalanceStageView({ context }: { context: RendererContext<TrialBalanceData> }) {
  const baseline = context.block.data;
  const [localDraft, setLocalDraft] = useState<TrialBalanceData | null>(null);
  const tb = context.draft ?? localDraft ?? baseline;
  const currency = tb.currency ?? 'GBP';
  const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '£';

  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  const [collapsedCats, setCollapsedCats] = useState<Record<string, boolean>>({});

  const tieOut = evaluateTrialBalanceTieOut(tb);
  const baselineMap = new Map(baseline.accounts.map((a) => [a.code, a]));

  function applyDraft(next: TrialBalanceData) {
    if (context.onUpdateDraft) {
      context.onUpdateDraft(next);
    } else {
      setLocalDraft(next);
    }
  }

  function updatePm(nextPm: number) {
    applyDraft({
      ...tb,
      materialityThreshold: Math.max(0, Math.round(nextPm)),
    });
  }

  function updateAccountAje(code: string, nextAje: number) {
    applyDraft({
      ...tb,
      accounts: tb.accounts.map((a) =>
        a.code === code ? { ...a, aje: Math.round(nextAje) } : a
      ),
    });
  }

  function saveAdjustments() {
    if (!tieOut.isBalanced) return;
    const changes = tb.accounts
      .filter((a) => {
        const orig = baselineMap.get(a.code);
        return orig !== undefined && orig.aje !== a.aje;
      })
      .map((a) => {
        const orig = baselineMap.get(a.code)!;
        return `Acct ${a.code} (${a.name}) AJE: ${formatAccountingNumber(orig.aje)} → ${formatAccountingNumber(a.aje)}`;
      });

    if (tb.materialityThreshold !== baseline.materialityThreshold) {
      changes.push(
        `Performance materiality: ${formatMoney(tb.materialityThreshold, { currency })}`
      );
    }
    if (changes.length === 0) {
      changes.push(
        `Verified Trial Balance tie-out (Net balance: ${formatMoneyMinor(tieOut.netAdjustedMinor, { currency })})`
      );
    }
    context.onCommitRevision?.(tb, changes);
    setLocalDraft(null);
  }

  return (
    <div class="stage-plugin-shell">
      <div class="stage-subbar">
        <div class="stage-subbar-group">
          <span
            class={`tickmark-pill ${tieOut.isBalanced ? 'tick-tied' : 'tick-exception'}`}
          >
            {tieOut.isBalanced
              ? `Balanced (${symbol}0)`
              : `Imbalance: ${formatMoneyMinor(tieOut.netAdjustedMinor, { currency, accounting: true })}`}
          </span>

          <label class="inline-field-label">
            <span
              class="sheet-meta-count"
              title="Performance materiality threshold for period-over-period flux review"
            >
              PM ({symbol}):
            </span>
            <MoneyInput
              value={tb.materialityThreshold}
              baselineValue={baseline.materialityThreshold}
              allowNegative={false}
              ariaLabel="Performance materiality threshold"
              onChange={updatePm}
            />
          </label>

          <span class="sheet-meta-count">
            {tieOut.flaggedCount} flagged
          </span>
        </div>

        <div class="stage-subbar-group">
          {!tieOut.isBalanced && (
            <span class="guard-reason-hint">
              Balance debits and credits to {symbol}0 to save
            </span>
          )}
          <button
            type="button"
            class="primary-stage-btn"
            disabled={!tieOut.isBalanced}
            onClick={saveAdjustments}
          >
            Save
          </button>
        </div>
      </div>

      <div class="acct-scroll-viewport">
        <table class="acct-table">
          <thead>
            <tr>
              <th scope="col">Account</th>
              <th scope="col" class="is-num">
                Unadjusted ({symbol})
              </th>
              <th scope="col" class="is-num">
                AJE Dr/(Cr)
              </th>
              <th scope="col" class="is-num">
                Adjusted TB
              </th>
              <th scope="col" class="is-num">
                Flux ({symbol})
              </th>
              <th scope="col">Flag</th>
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map((cat) => {
              const rows = tb.accounts.filter((a) => a.category === cat);
              const isCollapsed = Boolean(collapsedCats[cat]);

              return (
                <Fragment key={cat}>
                  <tr
                    class="tb-group-row"
                    tabIndex={0}
                    role="button"
                    aria-expanded={!isCollapsed}
                    onClick={() =>
                      setCollapsedCats((prev) => ({ ...prev, [cat]: !prev[cat] }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setCollapsedCats((prev) => ({ ...prev, [cat]: !prev[cat] }));
                      }
                    }}
                  >
                    <td colSpan={6}>
                      {isCollapsed ? '▸' : '▾'} {cat} ({rows.length})
                    </td>
                  </tr>

                  {!isCollapsed &&
                    rows.map((acct) => {
                      const orig = baselineMap.get(acct.code);
                      const adjusted = acct.unadjusted + acct.aje;
                      const flux = adjusted - acct.priorPeriod;
                      const exceedsPm = Math.abs(flux) >= tb.materialityThreshold;
                      const isExpanded = expandedCode === acct.code;

                      return (
                        <Fragment key={acct.code}>
                          <tr
                            class={`acct-row-clickable ${isExpanded ? 'is-selected' : ''}`}
                            tabIndex={0}
                            aria-expanded={isExpanded}
                            onClick={() =>
                              setExpandedCode((curr) =>
                                curr === acct.code ? null : acct.code
                              )
                            }
                            onKeyDown={(e) => {
                              if (e.target !== e.currentTarget) return;
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setExpandedCode((curr) =>
                                  curr === acct.code ? null : acct.code
                                );
                              }
                            }}
                          >
                            <td>
                              <strong>{acct.code}</strong> · {acct.name}
                            </td>
                            <td class="is-num">{formatAccountingNumber(acct.unadjusted)}</td>
                            <td class="is-num" onClick={(e) => e.stopPropagation()}>
                              <MoneyInput
                                value={acct.aje}
                                baselineValue={orig?.aje}
                                allowNegative
                                ariaLabel={`Adjusting journal amount for account ${acct.code} ${acct.name}`}
                                onChange={(val) => updateAccountAje(acct.code, val)}
                              />
                            </td>
                            <td class="is-num">
                              <strong>{formatAccountingNumber(adjusted)}</strong>
                            </td>
                            <td
                              class={`is-num ${exceedsPm ? 'flux-exceeds-pm' : 'flux-within-pm'}`}
                            >
                              {flux >= 0
                                ? `+${formatAccountingNumber(flux)}`
                                : formatAccountingNumber(flux)}
                            </td>
                            <td>
                              {exceedsPm ? (
                                <span
                                  class="tickmark-pill tick-pbc"
                                  title="Exceeds performance materiality — flux explanation required"
                                >
                                  &gt; PM
                                </span>
                              ) : (
                                <span class="sheet-meta-count">Within PM</span>
                              )}
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr class="tb-drilldown-row">
                              <td colSpan={6}>
                                <div class="tb-drilldown-detail">
                                  <strong>GL subledger detail ({acct.code}):</strong>{' '}
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

      <div class="acct-footer-bar">
        <span class="sheet-meta-count">
          {tb.entity} · {tb.period}
        </span>
        <span class="sheet-meta-count">
          Net Profit: <strong>{formatMoneyMinor(tieOut.netProfitMinor, { currency })}</strong> · Net AJE:{' '}
          <strong>{formatMoneyMinor(tieOut.netAjeMinor, { currency, accounting: true })}</strong>
        </span>
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
