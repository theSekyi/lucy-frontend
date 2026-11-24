import { useMemo, useState } from 'preact/hooks';
import type { LoadedRenderer, RendererContext } from '../../core/renderers';
import type { RedlineDocumentData } from '../../core/types';
import '../enterprise-stage.css';

type Decision = 'pending' | 'accepted' | 'rejected';
type DiffMode = 'inline' | 'split' | 'clean';

interface DiffToken {
  readonly kind: 'same' | 'del' | 'ins';
  readonly text: string;
}

/**
 * Word-level Longest Common Subsequence diff so unchanged legal clauses remain
 * calm and legible while only the exact altered words are highlighted.
 */
function computeWordDiff(before: string, after: string): DiffToken[] {
  const a = before.split(/(\s+)/).filter(Boolean);
  const b = after.split(/(\s+)/).filter(Boolean);
  const dp: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0)
  );

  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      dp[i]![j] =
        a[i] === b[j]
          ? (dp[i + 1]?.[j + 1] ?? 0) + 1
          : Math.max(dp[i + 1]?.[j] ?? 0, dp[i]?.[j + 1] ?? 0);
    }
  }

  const out: DiffToken[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push({ kind: 'same', text: a[i]! });
      i += 1;
      j += 1;
    } else if ((dp[i + 1]?.[j] ?? 0) >= (dp[i]?.[j + 1] ?? 0)) {
      out.push({ kind: 'del', text: a[i]! });
      i += 1;
    } else {
      out.push({ kind: 'ins', text: b[j]! });
      j += 1;
    }
  }
  while (i < a.length) out.push({ kind: 'del', text: a[i++]! });
  while (j < b.length) out.push({ kind: 'ins', text: b[j++]! });
  return out;
}

function RedlineDiffView({ context }: { context: RendererContext<RedlineDocumentData> }) {
  const doc = context.block.data;
  const [mode, setMode] = useState<DiffMode>('inline');
  const [decisions, setDecisions] = useState<Record<string, Decision>>(() =>
    Object.fromEntries(doc.hunks.map((h) => [h.id, h.initialDecision ?? 'pending']))
  );
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [syncedFlag, setSyncedFlag] = useState(false);

  const wordDiffByHunk = useMemo(
    () =>
      Object.fromEntries(doc.hunks.map((h) => [h.id, computeWordDiff(h.before, h.after)])),
    [doc.hunks]
  );

  const acceptedCount = doc.hunks.filter((h) => decisions[h.id] === 'accepted').length;
  const rejectedCount = doc.hunks.filter((h) => decisions[h.id] === 'rejected').length;
  const pendingCount = doc.hunks.length - acceptedCount - rejectedCount;

  function setHunkDecision(id: string, next: Decision) {
    setDecisions((prev) => ({ ...prev, [id]: next }));
    setSyncedFlag(false);
  }

  function acceptAllPending() {
    setDecisions((prev) => {
      const updated = { ...prev };
      for (const hunk of doc.hunks) {
        if (updated[hunk.id] === 'pending') updated[hunk.id] = 'accepted';
      }
      return updated;
    });
    setSyncedFlag(false);
  }

  function syncRedlineToLucy() {
    const summary = doc.hunks.map((h) => {
      const status = (decisions[h.id] ?? 'pending').toUpperCase();
      const note = notes[h.id]?.trim();
      return `${h.section}: ${status}${note ? ` (Note: "${note}")` : ''}`;
    });
    const updatedDoc: RedlineDocumentData = {
      ...doc,
      hunks: doc.hunks.map((h) => ({ ...h, initialDecision: decisions[h.id] ?? 'pending' })),
    };
    context.onCommitRevision?.(updatedDoc, summary);
    setSyncedFlag(true);
  }

  return (
    <div class="stage-plugin-shell">
      <div class="stage-subbar">
        <div class="stage-subbar-group">
          <div class="seg-tabs" role="tablist">
            <button
              type="button"
              class={`seg-tab ${mode === 'inline' ? 'is-active' : ''}`}
              onClick={() => setMode('inline')}
            >
              Word Redline
            </button>
            <button
              type="button"
              class={`seg-tab ${mode === 'split' ? 'is-active' : ''}`}
              onClick={() => setMode('split')}
            >
              Side-by-Side
            </button>
            <button
              type="button"
              class={`seg-tab ${mode === 'clean' ? 'is-active' : ''}`}
              onClick={() => setMode('clean')}
            >
              Clean Preview
            </button>
          </div>

          <span class="cell-pill tone-good">{acceptedCount} Accepted</span>
          {rejectedCount > 0 && <span class="cell-pill tone-warn">{rejectedCount} Rejected</span>}
          {pendingCount > 0 && <span class="cell-pill tone-neutral">{pendingCount} Pending</span>}
        </div>

        <div class="stage-subbar-group">
          {pendingCount > 0 && (
            <button type="button" class="ghost-pill" onClick={acceptAllPending}>
              Accept remaining
            </button>
          )}
          <button type="button" class="sync-llm-btn" onClick={syncRedlineToLucy}>
            {syncedFlag ? '✓ Synced to Lucy' : 'Send Decisions to Lucy →'}
          </button>
        </div>
      </div>

      <div class="stage-scroll-area">
        <div class="redline-doc-banner">
          <div>
            <strong>{doc.documentName}</strong>
            <div class="clause-footnote" style={{ marginTop: '2px' }}>
              {doc.author}
            </div>
          </div>
          <span class="sheet-meta-count">{doc.hunks.length} Tracked Clauses</span>
        </div>

        {doc.hunks.map((hunk) => {
          const status = decisions[hunk.id] ?? 'pending';
          const tokens = wordDiffByHunk[hunk.id] ?? [];
          const resolvedClean = status === 'rejected' ? hunk.before : hunk.after;

          return (
            <article key={hunk.id} class={`redline-hunk-card status-${status}`}>
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

              <div class="redline-rationale">Counsel rationale: {hunk.rationale}</div>

              {mode === 'inline' && (
                <div class="redline-unified-prose">
                  {tokens.map((tok, idx) => {
                    if (tok.kind === 'del') {
                      return (
                        <del key={idx} class="diff-del">
                          {tok.text}
                        </del>
                      );
                    }
                    if (tok.kind === 'ins') {
                      return (
                        <ins key={idx} class="diff-ins">
                          {tok.text}
                        </ins>
                      );
                    }
                    return <span key={idx}>{tok.text}</span>;
                  })}
                </div>
              )}

              {mode === 'split' && (
                <div class="redline-columns">
                  <div class="redline-col is-before">
                    <div class="redline-col-label">Prior Draft</div>
                    {hunk.before}
                  </div>
                  <div class="redline-col is-after">
                    <div class="redline-col-label">Proposed Redline</div>
                    {hunk.after}
                  </div>
                </div>
              )}

              {mode === 'clean' && (
                <div class="redline-unified-prose">{resolvedClean}</div>
              )}

              <div class="redline-note-bar">
                <span class="sheet-meta-count">Counter-edit / Note:</span>
                <input
                  type="text"
                  class="redline-note-input"
                  placeholder="Add instruction for Lucy (e.g., 'Cap at 2x TTM instead')…"
                  value={notes[hunk.id] ?? ''}
                  onInput={(e) => {
                    setNotes((prev) => ({
                      ...prev,
                      [hunk.id]: (e.currentTarget as HTMLInputElement).value,
                    }));
                    setSyncedFlag(false);
                  }}
                />
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
