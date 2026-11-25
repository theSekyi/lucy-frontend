import { useState } from 'preact/hooks';
import { evaluateReconciliationTieOut } from '../../core/ledger';
import { formatMoney, formatMoneyMinor } from '../../core/money';
import type { LoadedRenderer, RendererContext } from '../../core/renderers';
import '../enterprise-stage.css';
import '../accounting.css';
import type { ReconResolution, ReconciliationData } from './sample';

const RESOLUTION_LABELS: Record<ReconResolution, string> = {
  open: 'Open',
  matched: 'Timing matched',
  'aje-drafted': 'AJE drafted',
  pbc: 'Client PBC',
};

function ReconciliationStageView({ context }: { context: RendererContext<ReconciliationData> }) {
  const baseline = context.block.data;
  const [localDraft, setLocalDraft] = useState<ReconciliationData | null>(null);
  const data = context.draft ?? localDraft ?? baseline;
  const currency = data.currency ?? 'GBP';
  const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '£';

  const [tab, setTab] = useState<'exceptions' | 'matched'>('exceptions');
  const tieOut = evaluateReconciliationTieOut(data);

  function resolveItem(id: string, next: ReconResolution) {
    const updated: ReconciliationData = {
      ...data,
      exceptions: data.exceptions.map((e) =>
        e.id === id ? { ...e, status: e.status === next ? 'open' : next } : e
      ),
    };
    if (context.onUpdateDraft) {
      context.onUpdateDraft(updated);
    } else {
      setLocalDraft(updated);
    }
  }

  function finalizeRecon() {
    const summary = data.exceptions.map(
      (e) => `${e.sourceRef} (${e.counterparty}): ${RESOLUTION_LABELS[e.status]}`
    );
    context.onCommitRevision?.(data, summary);
    setLocalDraft(null);
  }

  return (
    <div class="stage-plugin-shell">
      <div class="stage-subbar">
        <div class="stage-subbar-group">
          <div class="seg-tabs" role="tablist" aria-label="Reconciliation views">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'exceptions'}
              class={`seg-tab ${tab === 'exceptions' ? 'is-active' : ''}`}
              onClick={() => setTab('exceptions')}
            >
              Exceptions ({tieOut.unresolvedCount})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'matched'}
              class={`seg-tab ${tab === 'matched' ? 'is-active' : ''}`}
              onClick={() => setTab('matched')}
            >
              Matched ({tieOut.totalMatchedCount})
            </button>
          </div>

          <span
            class={`tickmark-pill ${tieOut.isReconciled ? 'tick-tied' : 'tick-exception'}`}
          >
            {tieOut.isReconciled
              ? `Reconciled (${symbol}0.00)`
              : `Open variance: ${formatMoneyMinor(tieOut.remainingVarianceMinor, { currency, decimals: 2, signed: true })}`}
          </span>
        </div>

        <button type="button" class="primary-stage-btn" onClick={finalizeRecon}>
          Save
        </button>
      </div>

      <div class="stage-scroll-area">
        {tab === 'exceptions' ? (
          <>
            {data.exceptions.map((item) => {
              const status = item.status;
              return (
                <article key={item.id} class="recon-card">
                  <div class="recon-card-body">
                    <div class="stage-subbar-group">
                      <strong>
                        {item.sourceRef} · {item.counterparty}
                      </strong>
                      <span class="tickmark-pill tick-exception">
                        {formatMoney(item.variance, { currency, decimals: 2, signed: true })}
                      </span>
                      {status !== 'open' && (
                        <span class="tickmark-pill tick-tied">
                          {RESOLUTION_LABELS[status]}
                        </span>
                      )}
                    </div>
                    <div class="recon-reason-text">{item.reason}</div>
                    <div class="sheet-meta-count">
                      {item.date} · Bank:{' '}
                      {formatMoney(item.bankAmount, { currency, decimals: 2 })} vs GL:{' '}
                      {formatMoney(item.glAmount, { currency, decimals: 2 })}
                    </div>
                  </div>

                  <div class="stage-subbar-group">
                    <button
                      type="button"
                      class={`decision-btn ${status === 'matched' ? 'is-accept-active' : ''}`}
                      onClick={() => resolveItem(item.id, 'matched')}
                    >
                      Match timing
                    </button>
                    <button
                      type="button"
                      class={`decision-btn ${status === 'aje-drafted' ? 'is-accept-active' : ''}`}
                      onClick={() => resolveItem(item.id, 'aje-drafted')}
                    >
                      Book AJE
                    </button>
                    <button
                      type="button"
                      class={`decision-btn ${status === 'pbc' ? 'is-reject-active' : ''}`}
                      onClick={() => resolveItem(item.id, 'pbc')}
                    >
                      PBC
                    </button>
                  </div>
                </article>
              );
            })}
          </>
        ) : (
          <div class="redline-doc-banner">
            <div>
              <strong>
                {data.autoMatchedCount} bank & subledger rules matched (
                {formatMoney(data.autoMatchedVolume, { currency })})
              </strong>
              <div class="clause-footnote">
                Exact amount, ±2 day settlement window, and counterparty reference matched with{' '}
                {symbol}0.00 variance.
                {tieOut.clearedCount > 0 &&
                  ` Plus ${tieOut.clearedCount} exception(s) cleared in this workpaper.`}
              </div>
            </div>
            <span class="tickmark-pill tick-tied">Verified</span>
          </div>
        )}
      </div>
    </div>
  );
}

export const reconciliationRendererModule: LoadedRenderer<
  preact.ComponentChildren,
  ReconciliationData
> = {
  render(context) {
    return <ReconciliationStageView context={context} />;
  },
};
