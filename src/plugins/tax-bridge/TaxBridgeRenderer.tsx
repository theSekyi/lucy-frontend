import { useState } from 'preact/hooks';
import { evaluateTaxBridgeTieOut } from '../../core/ledger';
import { formatMoneyMinor } from '../../core/money';
import type { LoadedRenderer, RendererContext } from '../../core/renderers';
import { MoneyInput } from '../../ui/primitives/MoneyInput';
import '../enterprise-stage.css';
import '../accounting.css';
import type { TaxBridgeData } from './sample';

function TaxBridgeStageView({ context }: { context: RendererContext<TaxBridgeData> }) {
  const baseline = context.block.data;
  const [localDraft, setLocalDraft] = useState<TaxBridgeData | null>(null);
  const data = context.draft ?? localDraft ?? baseline;
  const currency = data.currency ?? 'USD';
  const symbol = currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$';
  const ratePct = data.taxRatePct ?? 21;

  const [tab, setTab] = useState<'m1' | 'k1'>('m1');
  const [selectedId, setSelectedId] = useState<string>(data.adjustments[0]?.id ?? '');

  const tieOut = evaluateTaxBridgeTieOut(data);
  const partnerAllocations = data.partners.map((p) => ({
    ...p,
    allocatedMinor: Math.round((tieOut.taxableMinor * p.ownershipPct) / 100),
  }));
  const baselineMap = new Map(baseline.adjustments.map((a) => [a.id, a]));
  const selectedLine =
    data.adjustments.find((a) => a.id === selectedId) ?? data.adjustments[0];

  function updateAdjustment(id: string, nextAmount: number) {
    const next: TaxBridgeData = {
      ...data,
      adjustments: data.adjustments.map((a) =>
        a.id === id ? { ...a, amount: Math.round(nextAmount) } : a
      ),
    };
    if (context.onUpdateDraft) {
      context.onUpdateDraft(next);
    } else {
      setLocalDraft(next);
    }
  }

  function saveTaxBridge() {
    const summary = [
      `Taxable income reconciled at ${formatMoneyMinor(tieOut.taxableMinor, { currency })} (Est. ${ratePct}% tax: ${formatMoneyMinor(tieOut.estTaxMinor, { currency })})`,
    ];
    context.onCommitRevision?.(data, summary);
    setLocalDraft(null);
  }

  return (
    <div class="stage-plugin-shell">
      <div class="stage-subbar">
        <div class="stage-subbar-group">
          <div class="seg-tabs" role="tablist" aria-label="Tax workpaper schedules">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'm1'}
              class={`seg-tab ${tab === 'm1' ? 'is-active' : ''}`}
              onClick={() => setTab('m1')}
            >
              Schedule M-1
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'k1'}
              class={`seg-tab ${tab === 'k1' ? 'is-active' : ''}`}
              onClick={() => setTab('k1')}
            >
              Schedule K-1 ({data.partners.length})
            </button>
          </div>
          <span class="sheet-meta-count">
            Est. {ratePct}% Tax:{' '}
            <strong>{formatMoneyMinor(tieOut.estTaxMinor, { currency })}</strong>
          </span>
        </div>

        <button type="button" class="primary-stage-btn" onClick={saveTaxBridge}>
          Save
        </button>
      </div>

      <div class="stage-scroll-area">
        <div class="tax-waterfall-grid">
          <div class="kpi-tile">
            <div class="kpi-tile-label">Book Net Income</div>
            <div class="kpi-tile-value">
              {formatMoneyMinor(tieOut.bookMinor, { currency, accounting: true })}
            </div>
          </div>
          <div class="kpi-tile">
            <div class="kpi-tile-label">Permanent Diffs</div>
            <div class="kpi-tile-value">
              {formatMoneyMinor(tieOut.permMinor, { currency, accounting: true })}
            </div>
          </div>
          <div class="kpi-tile">
            <div class="kpi-tile-label">Temporary Diffs</div>
            <div class="kpi-tile-value">
              {formatMoneyMinor(tieOut.tempMinor, { currency, accounting: true })}
            </div>
          </div>
          <div class="kpi-tile">
            <div class="kpi-tile-label">Taxable Income</div>
            <div class="kpi-tile-value">
              {formatMoneyMinor(tieOut.taxableMinor, { currency, accounting: true })}
            </div>
          </div>
        </div>

        {tab === 'm1' ? (
          <>
            <table class="acct-table">
              <thead>
                <tr>
                  <th scope="col">Adjustment</th>
                  <th scope="col">Type</th>
                  <th scope="col">Authority</th>
                  <th scope="col" class="is-num">
                    M-1 Amount ({symbol})
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.adjustments.map((adj) => {
                  const orig = baselineMap.get(adj.id);
                  const isSelected = adj.id === selectedLine?.id;
                  return (
                    <tr
                      key={adj.id}
                      tabIndex={0}
                      aria-selected={isSelected}
                      class={`acct-row-clickable ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => setSelectedId(adj.id)}
                      onKeyDown={(e) => {
                        if (e.target !== e.currentTarget) return;
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedId(adj.id);
                        }
                      }}
                    >
                      <td>
                        <strong>{adj.description}</strong>
                      </td>
                      <td>
                        <span
                          class={`cell-pill ${adj.type === 'permanent' ? 'tone-warn' : 'tone-neutral'}`}
                        >
                          {adj.type === 'permanent' ? 'Permanent' : 'Temporary'}
                        </span>
                      </td>
                      <td class="acct-mono-cell">{adj.ircSection}</td>
                      <td class="is-num" onClick={(e) => e.stopPropagation()}>
                        <MoneyInput
                          value={adj.amount}
                          baselineValue={orig?.amount}
                          allowNegative
                          ariaLabel={`${adj.description} amount`}
                          onChange={(val) => updateAdjustment(adj.id, val)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {selectedLine && (
              <div class="redline-doc-banner is-bottom-banner">
                <div>
                  <strong>
                    Form trace: {selectedLine.formBox} ({selectedLine.ircSection})
                  </strong>
                  <div class="clause-footnote">
                    Source Trial Balance account: {selectedLine.tbAccounts}
                  </div>
                </div>
                <span class={`tickmark-pill ${tieOut.isTiedToBaselineTb ? 'tick-tied' : 'tick-pbc'}`}>
                  {tieOut.isTiedToBaselineTb
                    ? 'Tied to TB'
                    : `${tieOut.modifiedIds.length} Override${tieOut.modifiedIds.length === 1 ? '' : 's'}`}
                </span>
              </div>
            )}
          </>
        ) : (
          <table class="acct-table">
            <thead>
              <tr>
                <th scope="col">Partner / Member</th>
                <th scope="col">Classification</th>
                <th scope="col" class="is-num">
                  Ownership %
                </th>
                <th scope="col" class="is-num">
                  Box 1 Ordinary Income
                </th>
              </tr>
            </thead>
            <tbody>
              {partnerAllocations.map((p) => (
                <tr key={p.partner}>
                  <td>
                    <strong>{p.partner}</strong>
                  </td>
                  <td class="acct-muted-cell">{p.entityType}</td>
                  <td class="is-num">{p.ownershipPct.toFixed(1)}%</td>
                  <td class="is-num">
                    <strong>
                      {formatMoneyMinor(p.allocatedMinor, { currency, accounting: true })}
                    </strong>
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

export const taxBridgeRendererModule: LoadedRenderer<
  preact.ComponentChildren,
  TaxBridgeData
> = {
  render(context) {
    return <TaxBridgeStageView context={context} />;
  },
};
