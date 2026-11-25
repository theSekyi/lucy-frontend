import { useState } from 'preact/hooks';
import { evaluateVouchingTieOut } from '../../core/ledger';
import { formatAuditTimestamp, formatMoney, formatMoneyMinor, toMinorUnits } from '../../core/money';
import type { LoadedRenderer, RendererContext } from '../../core/renderers';
import '../enterprise-stage.css';
import '../accounting.css';
import type { TickmarkState, VouchingWorkpaperData } from './sample';

const TICK_META: Record<TickmarkState, { label: string; cls: string }> = {
  tied: { label: 'Agreed', cls: 'tick-tied' },
  exception: { label: 'Variance', cls: 'tick-exception' },
  pbc: { label: 'PBC', cls: 'tick-pbc' },
};

const TICK_ORDER: TickmarkState[] = ['tied', 'exception', 'pbc'];

function VouchingStageView({ context }: { context: RendererContext<VouchingWorkpaperData> }) {
  const baseline = context.block.data;
  const [localDraft, setLocalDraft] = useState<VouchingWorkpaperData | null>(null);
  const wp = context.draft ?? localDraft ?? baseline;
  const currency = wp.currency ?? 'GBP';
  const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '£';

  const [selectedId, setSelectedId] = useState<string>(
    wp.items[1]?.id ?? wp.items[0]?.id ?? ''
  );

  const active = wp.items.find((i) => i.id === selectedId) ?? wp.items[0]!;
  const tieOut = evaluateVouchingTieOut(wp);
  const openCount = tieOut.exceptionCount + tieOut.pbcCount;

  function applyDraft(next: VouchingWorkpaperData) {
    if (context.onUpdateDraft) {
      context.onUpdateDraft(next);
    } else {
      setLocalDraft(next);
    }
  }

  function cycleTick(id: string) {
    applyDraft({
      ...wp,
      signedOffBy: undefined,
      signedOffAt: undefined,
      items: wp.items.map((item) => {
        if (item.id !== id) return item;
        const next = TICK_ORDER[(TICK_ORDER.indexOf(item.tickmark) + 1) % TICK_ORDER.length]!;
        return { ...item, tickmark: next };
      }),
    });
  }

  function saveTickmarksOnly() {
    const summary = wp.items.map(
      (i) => `${i.sampleCode} (${i.vendor.trim()}): ${TICK_META[i.tickmark].label}`
    );
    context.onCommitRevision?.(wp, summary);
    setLocalDraft(null);
  }

  function signOffWorkpaper() {
    if (!tieOut.canSignOff) return;
    const actor = context.actorName ?? 'Elena Carter';
    const nowIso = new Date().toISOString();
    const signed: VouchingWorkpaperData = {
      ...wp,
      signedOffBy: actor,
      signedOffAt: nowIso,
    };
    context.onCommitRevision?.(signed, [
      `WP E-40 signed off by ${actor}: all ${wp.items.length} selections (${formatMoneyMinor(tieOut.totalLedgerMinor, { currency, decimals: 2 })}) agreed to source evidence`,
    ]);
    setLocalDraft(null);
  }

  const diffMinor = toMinorUnits(active.ledgerAmount) - toMinorUnits(active.docAmount);
  const subtotalMinor = toMinorUnits(active.docAmount) - toMinorUnits(active.taxAmount);

  return (
    <div class="stage-plugin-shell">
      <div class="stage-subbar">
        <div class="stage-subbar-group">
          <span class="tickmark-pill tick-tied">{tieOut.tiedCount} Agreed</span>
          {tieOut.exceptionCount > 0 && (
            <span class="tickmark-pill tick-exception">{tieOut.exceptionCount} Variance</span>
          )}
          {tieOut.pbcCount > 0 && (
            <span class="tickmark-pill tick-pbc">{tieOut.pbcCount} PBC</span>
          )}
          {wp.signedOffBy && (
            <span class="sheet-meta-count">
              Signed off by {wp.signedOffBy}
              {wp.signedOffAt ? ` · ${formatAuditTimestamp(wp.signedOffAt)}` : ''}
            </span>
          )}
        </div>

        <div class="stage-subbar-group">
          {!tieOut.canSignOff && (
            <span class="guard-reason-hint">
              Resolve {openCount} open item{openCount === 1 ? '' : 's'} before sign-off
            </span>
          )}
          <button type="button" class="ghost-pill" onClick={saveTickmarksOnly}>
            Save
          </button>
          <button
            type="button"
            class="primary-stage-btn"
            disabled={!tieOut.canSignOff}
            onClick={signOffWorkpaper}
          >
            {wp.signedOffBy ? 'Signed off' : 'Sign off'}
          </button>
        </div>
      </div>

      <div class="vouch-split">
        <div class="vouch-ledger-pane">
          <table class="acct-table">
            <thead>
              <tr>
                <th scope="col">Ref</th>
                <th scope="col">Supplier / Payee</th>
                <th scope="col">GL Account</th>
                <th scope="col" class="is-num">
                  GL ({symbol})
                </th>
                <th scope="col" class="is-num">
                  Source ({symbol})
                </th>
                <th scope="col">Tickmark</th>
              </tr>
            </thead>
            <tbody>
              {wp.items.map((item) => {
                const meta = TICK_META[item.tickmark];
                const isSelected = item.id === active.id;
                return (
                  <tr
                    key={item.id}
                    tabIndex={0}
                    aria-selected={isSelected}
                    class={`acct-row-clickable ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => setSelectedId(item.id)}
                    onKeyDown={(e) => {
                      if (e.target !== e.currentTarget) return;
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedId(item.id);
                      }
                    }}
                  >
                    <td>
                      <strong>{item.sampleCode}</strong>
                    </td>
                    <td>{item.vendor}</td>
                    <td class="acct-muted-cell">{item.glAccount}</td>
                    <td class="is-num">
                      {formatMoney(item.ledgerAmount, { currency, decimals: 2 })}
                    </td>
                    <td class="is-num">
                      {formatMoney(item.docAmount, { currency, decimals: 2 })}
                    </td>
                    <td>
                      <button
                        type="button"
                        class={`tickmark-pill ${meta.cls}`}
                        aria-label={`Cycle tickmark for ${item.sampleCode} (${meta.label})`}
                        onClick={(e) => {
                          e.stopPropagation();
                          cycleTick(item.id);
                        }}
                      >
                        {meta.label}
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
            <div class="pdf-running-header">
              <span>{active.formType.toUpperCase()} · VOUCHED SOURCE</span>
              <span>SELECTION {active.sampleCode}</span>
            </div>

            <div class="vouch-paper-top">
              <div>
                <div class="vouch-vendor-heading">{active.vendor}</div>
                <div class="vouch-vendor-desc">{active.description}</div>
              </div>

              <div class="vouch-doc-meta">
                <div>
                  <span class="vouch-meta-label">Doc #:</span>
                  <span class="vouch-bbox">{active.invoiceNo}</span>
                </div>
                <div>
                  <span class="vouch-meta-label">Date:</span>
                  <span class="vouch-bbox">{active.invoiceDate}</span>
                </div>
              </div>
            </div>

            <div class="vouch-amounts-box">
              <div class="vouch-amount-row">
                <span>Net Subtotal</span>
                <span class="vouch-mono">
                  {formatMoneyMinor(subtotalMinor, { currency, decimals: 2 })}
                </span>
              </div>
              <div class="vouch-amount-row">
                <span>Tax / VAT</span>
                <span class="vouch-mono">
                  {formatMoney(active.taxAmount, { currency, decimals: 2 })}
                </span>
              </div>
              <div class="vouch-amount-row is-total">
                <span>Source Document Total</span>
                <span class={`vouch-bbox ${diffMinor !== 0 ? 'is-mismatch' : ''}`}>
                  {formatMoney(active.docAmount, { currency, decimals: 2 })}
                </span>
              </div>
            </div>

            <div class={`vouch-tie-footer ${diffMinor === 0 ? 'is-tied' : 'is-variance'}`}>
              <span>
                GL Posted ({active.glAccount}):{' '}
                {formatMoney(active.ledgerAmount, { currency, decimals: 2 })}
              </span>
              <span>
                {diffMinor === 0
                  ? `Agreed to General Ledger (${symbol}0.00)`
                  : `Variance vs GL: ${formatMoneyMinor(diffMinor, { currency, decimals: 2, signed: true })}`}
              </span>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}

export const vouchingRendererModule: LoadedRenderer<
  preact.ComponentChildren,
  VouchingWorkpaperData
> = {
  render(context) {
    return <VouchingStageView context={context} />;
  },
};
