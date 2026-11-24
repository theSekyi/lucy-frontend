import { useState } from 'preact/hooks';
import type { LoadedRenderer, RendererContext } from '../../core/renderers';
import type { RedlineDocumentData } from '../../core/types';
import '../enterprise-stage.css';

type Decision = 'pending' | 'accepted' | 'rejected';

function RedlineDiffView({ context }: { context: RendererContext<RedlineDocumentData> }) {
  const doc = context.block.data;
  const [decisions, setDecisions] = useState<Record<string, Decision>>(() =>
    Object.fromEntries(doc.hunks.map((h) => [h.id, h.initialDecision ?? 'pending']))
  );

  const acceptedCount = doc.hunks.filter((h) => decisions[h.id] === 'accepted').length;
  const rejectedCount = doc.hunks.filter((h) => decisions[h.id] === 'rejected').length;
  const pendingCount = doc.hunks.length - acceptedCount - rejectedCount;

  function setHunkDecision(id: string, next: Decision) {
    setDecisions((prev) => ({ ...prev, [id]: next }));
  }

  function acceptAllPending() {
    setDecisions((prev) => {
      const updated = { ...prev };
      for (const hunk of doc.hunks) {
        if (updated[hunk.id] === 'pending') updated[hunk.id] = 'accepted';
      }
      return updated;
    });
  }

  return (
    <div class="stage-plugin-shell">
      <div class="stage-subbar">
        <div class="stage-subbar-group">
          <span class="cell-pill tone-good">{acceptedCount} Accepted</span>
          {rejectedCount > 0 && <span class="cell-pill tone-warn">{rejectedCount} Rejected</span>}
          <span class="cell-pill tone-neutral">{pendingCount} Pending</span>
        </div>

        {pendingCount > 0 && (
          <button type="button" class="ghost-pill" onClick={acceptAllPending}>
            Accept remaining ({pendingCount})
          </button>
        )}
      </div>

      <div class="stage-scroll-area">
        {doc.hunks.map((hunk) => {
          const status = decisions[hunk.id] ?? 'pending';
          return (
            <article key={hunk.id} class="redline-hunk-card">
              <div class="redline-hunk-header">
                <strong>{hunk.section}</strong>
                <div class="stage-subbar-group">
                  <button
                    type="button"
                    class={`decision-btn ${status === 'accepted' ? 'is-accept-active' : ''}`}
                    onClick={() => setHunkDecision(hunk.id, 'accepted')}
                  >
                    {status === 'accepted' ? '✓ Accepted' : 'Accept'}
                  </button>
                  <button
                    type="button"
                    class={`decision-btn ${status === 'rejected' ? 'is-reject-active' : ''}`}
                    onClick={() => setHunkDecision(hunk.id, 'rejected')}
                  >
                    {status === 'rejected' ? '✕ Rejected' : 'Reject'}
                  </button>
                </div>
              </div>

              <div class="redline-rationale">{hunk.rationale}</div>

              <div class="redline-columns">
                <div class="redline-col is-before" aria-label="Original text">
                  {hunk.before}
                </div>
                <div class="redline-col is-after" aria-label="Proposed redline">
                  {hunk.after}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export const redlineRendererModule: LoadedRenderer<preact.ComponentChildren, RedlineDocumentData> = {
  render(context) {
    return <RedlineDiffView context={context} />;
  },
};
