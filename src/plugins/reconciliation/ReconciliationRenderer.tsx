import { useState } from 'preact/hooks';
import type { LoadedRenderer, RendererContext } from '../../core/renderers';
import '../enterprise-stage.css';
import '../accounting.css';
import type { ReconResolution, ReconciliationData } from './sample';

function fmtSignedUsd(n: number): string {
  const abs = `$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return n < 0 ? `-${abs}` : `+${abs}`;
}

function ReconciliationStageView({ context }: { context: RendererContext<ReconciliationData> }) {
  const data = context.block.data;
  const [tab, setTab] = useState<'exceptions' | 'matched'>('exceptions');
  const [resolutions, setResolutions] = useState<Record<string, ReconResolution>>(() =>
    Object.fromEntries(data.exceptions.map((e) => [e.id, e.status]))
  );
  const [saved, setSaved] = useState(false);

  const openItems = data.exceptions.filter((e) => (resolutions[e.id] ?? 'open') === 'open');
  const resolvedItems = data.exceptions.filter((e) => (resolutions[e.id] ?? 'open') !== 'open');
  const remainingVariance = openItems.reduce((sum, e) => sum + e.variance, 0);

  function resolveItem(id: string, next: ReconResolution) {
    setSaved(false);
    setResolutions((prev) => ({ ...prev, [id]: next }));
  }

  function finalizeRecon() {
    const summary = data.exceptions.map(
      (e) => `${e.sourceRef} (${e.counterparty}): ${(resolutions[e.id] ?? 'open').toUpperCase()}`
    );
    context.onCommitRevision?.(
      {
        ...data,
        exceptions: data.exceptions.map((e) => ({
          ...e,
          status: resolutions[e.id] ?? 'open',
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
              class={`seg-tab ${tab === 'exceptions' ? 'is-active' : ''}`}
              onClick={() => setTab('exceptions')}
            >
              Exceptions ({openItems.length})
            </button>
            <button
              type="button"
              class={`seg-tab ${tab === 'matched' ? 'is-active' : ''}`}
              onClick={() => setTab('matched')}
            >
              Matched ({data.autoMatchedCount + resolvedItems.length})
            </button>
          </div>

          <span
            class={`tickmark-pill ${Math.abs(remainingVariance) < 0.01 ? 'tick-tied' : 'tick-exception'}`}
          >
            {Math.abs(remainingVariance) < 0.01
              ? 'Reconciled ($0.00)'
              : `Variance: ${fmtSignedUsd(remainingVariance)}`}
          </span>
        </div>

        <button type="button" class="primary-stage-btn" onClick={finalizeRecon}>
          {saved ? 'Saved' : 'Save'}
        </button>
      </div>

      <div class="stage-scroll-area">
        {tab === 'exceptions' ? (
          <>
            {data.exceptions.map((item) => {
              const status = resolutions[item.id] ?? 'open';
              return (
                <article key={item.id} class="recon-card">
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div class="stage-subbar-group" style={{ marginBottom: '4px' }}>
                      <strong>
                        {item.sourceRef} · {item.counterparty}
                      </strong>
                      <span class="tickmark-pill tick-exception">
                        {fmtSignedUsd(item.variance)}
                      </span>
                      {status !== 'open' && (
                        <span class="tickmark-pill tick-tied">{status.toUpperCase()}</span>
                      )}
                    </div>
                    <div style={{ color: '#a1a1aa', fontSize: '12px' }}>{item.reason}</div>
                    <div class="sheet-meta-count" style={{ marginTop: '4px' }}>
                      {item.date} · Bank: ${item.bankAmount.toLocaleString('en-US')} vs GL: $
                      {item.glAmount.toLocaleString('en-US')}
                    </div>
                  </div>

                  <div class="stage-subbar-group">
                    <button
                      type="button"
                      class={`decision-btn ${status === 'matched' ? 'is-accept-active' : ''}`}
                      onClick={() => resolveItem(item.id, 'matched')}
                    >
                      Match Timing
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
                {data.autoMatchedCount} Bank & Subledger Rules Auto-Matched ($
                {data.autoMatchedVolume.toLocaleString('en-US')})
              </strong>
              <div class="clause-footnote" style={{ marginTop: '4px' }}>
                Exact amount + +/-2 day settlement date + counterparty ACH ID matched with $0.00 variance.
                {resolvedItems.length > 0 &&
                  ` Plus ${resolvedItems.length} exception(s) cleared in this session.`}
              </div>
            </div>
            <span class="tickmark-pill tick-tied">✓ Verified</span>
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
