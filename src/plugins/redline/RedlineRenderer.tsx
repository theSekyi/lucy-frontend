import { useMemo, useState } from 'preact/hooks';
import type { LoadedRenderer, RendererContext } from '../../core/renderers';
import type { RedlineDocumentData } from '../../core/types';
import '../enterprise-stage.css';

type Decision = 'pending' | 'accepted' | 'rejected';
type DiffMode = 'split' | 'inline' | 'clean';

interface DiffToken {
  readonly kind: 'same' | 'del' | 'ins';
  readonly text: string;
}

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

  const merged: DiffToken[] = [];
  for (const token of out) {
    const prev = merged[merged.length - 1];
    if (prev && prev.kind === token.kind) {
      merged[merged.length - 1] = { kind: prev.kind, text: prev.text + token.text };
    } else if (token.kind !== 'same' && /^\s+$/.test(token.text)) {
      merged.push({ kind: 'same', text: token.text });
    } else {
      merged.push(token);
    }
  }
  return merged;
}

function RedlineDiffView({ context }: { context: RendererContext<RedlineDocumentData> }) {
  const doc = context.block.data;
  const [mode, setMode] = useState<DiffMode>('split');
  const [decisions, setDecisions] = useState<Record<string, Decision>>(() =>
    Object.fromEntries(doc.hunks.map((h) => [h.id, h.initialDecision ?? 'pending']))
  );
  const [draftAfter, setDraftAfter] = useState<Record<string, string>>(() =>
    Object.fromEntries(doc.hunks.map((h) => [h.id, h.after]))
  );
  const [savedFlag, setSavedFlag] = useState(false);

  const wordDiffByHunk = useMemo(
    () =>
      Object.fromEntries(
        doc.hunks.map((h) => [h.id, computeWordDiff(h.before, draftAfter[h.id] ?? h.after)])
      ),
    [doc.hunks, draftAfter]
  );

  const acceptedCount = doc.hunks.filter((h) => decisions[h.id] === 'accepted').length;
  const rejectedCount = doc.hunks.filter((h) => decisions[h.id] === 'rejected').length;
  const pendingCount = doc.hunks.length - acceptedCount - rejectedCount;

  const hasChanges = doc.hunks.some(
    (h) =>
      (draftAfter[h.id] ?? h.after) !== h.after ||
      (decisions[h.id] ?? 'pending') !== (h.initialDecision ?? 'pending')
  );

  function setHunkDecision(id: string, next: Decision) {
    setDecisions((prev) => ({ ...prev, [id]: next }));
    setSavedFlag(false);
  }

  function updateProposedText(id: string, nextText: string) {
    setDraftAfter((prev) => ({ ...prev, [id]: nextText }));
    setDecisions((prev) => ({ ...prev, [id]: 'accepted' }));
    setSavedFlag(false);
  }

  function acceptAllPending() {
    setDecisions((prev) => {
      const updated = { ...prev };
      for (const hunk of doc.hunks) {
        if (updated[hunk.id] === 'pending') updated[hunk.id] = 'accepted';
      }
      return updated;
    });
    setSavedFlag(false);
  }

  function commitRedlines() {
    const summary = doc.hunks.map((h) => {
      const status = (decisions[h.id] ?? 'pending').toUpperCase();
      const currentAfter = draftAfter[h.id] ?? h.after;
      const wasEdited = currentAfter !== h.after;
      return `${h.section}: ${status}${wasEdited ? ` — "${currentAfter}"` : ''}`;
    });

    const updatedDoc: RedlineDocumentData = {
      ...doc,
      hunks: doc.hunks.map((h) => ({
        ...h,
        after: draftAfter[h.id] ?? h.after,
        initialDecision: decisions[h.id] ?? 'pending',
      })),
    };
    context.onCommitRevision?.(updatedDoc, summary);
    setSavedFlag(true);
  }

  return (
    <div class="stage-plugin-shell">
      <div class="stage-subbar">
        <div class="stage-subbar-group">
          <div class="seg-tabs" role="tablist">
            <button
              type="button"
              class={`seg-tab ${mode === 'split' ? 'is-active' : ''}`}
              onClick={() => setMode('split')}
            >
              Side-by-Side
            </button>
            <button
              type="button"
              class={`seg-tab ${mode === 'inline' ? 'is-active' : ''}`}
              onClick={() => setMode('inline')}
            >
              Inline
            </button>
            <button
              type="button"
              class={`seg-tab ${mode === 'clean' ? 'is-active' : ''}`}
              onClick={() => setMode('clean')}
            >
              Clean
            </button>
          </div>

          <span class="sheet-meta-count">
            {acceptedCount} accepted · {pendingCount} pending
          </span>
        </div>

        <div class="stage-subbar-group">
          {pendingCount > 0 && (
            <button type="button" class="ghost-pill" onClick={acceptAllPending}>
              Accept all
            </button>
          )}
          {(hasChanges || !savedFlag) && (
            <button type="button" class="primary-stage-btn" onClick={commitRedlines}>
              {savedFlag ? 'Saved' : 'Save'}
            </button>
          )}
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
          <span class="sheet-meta-count">{doc.hunks.length} clauses</span>
        </div>

        {doc.hunks.map((hunk) => {
          const status = decisions[hunk.id] ?? 'pending';
          const currentAfter = draftAfter[hunk.id] ?? hunk.after;
          const isEdited = currentAfter !== hunk.after;
          const tokens = wordDiffByHunk[hunk.id] ?? [];
          const resolvedClean = status === 'rejected' ? hunk.before : currentAfter;

          return (
            <article key={hunk.id} class={`redline-hunk-card status-${status}`}>
              <div class="redline-hunk-header">
                <div class="stage-subbar-group">
                  <strong>{hunk.section}</strong>
                  {isEdited && <span class="cell-pill tone-neutral">Edited</span>}
                </div>

                <div class="stage-subbar-group">
                  {isEdited && (
                    <button
                      type="button"
                      class="ghost-pill"
                      onClick={() =>
                        setDraftAfter((prev) => ({ ...prev, [hunk.id]: hunk.after }))
                      }
                    >
                      Reset
                    </button>
                  )}
                  <button
                    type="button"
                    class={`decision-btn ${status === 'accepted' ? 'is-accept-active' : ''}`}
                    onClick={() => setHunkDecision(hunk.id, 'accepted')}
                  >
                    {status === 'accepted' ? 'Accepted' : 'Accept'}
                  </button>
                  <button
                    type="button"
                    class={`decision-btn ${status === 'rejected' ? 'is-reject-active' : ''}`}
                    onClick={() => setHunkDecision(hunk.id, 'rejected')}
                  >
                    {status === 'rejected' ? 'Rejected' : 'Reject'}
                  </button>
                </div>
              </div>

              <div class="redline-rationale">{hunk.rationale}</div>

              {mode === 'split' && (
                <div class="redline-columns">
                  <div class="redline-col is-before">
                    <div class="redline-col-label">Prior Draft</div>
                    <div>{hunk.before}</div>
                  </div>
                  <div class="redline-col is-after">
                    <div class="redline-col-label">Proposed Redline</div>
                    <textarea
                      rows={Math.max(4, Math.ceil(currentAfter.length / 30))}
                      class="redline-editable-prose"
                      value={currentAfter}
                      aria-label={`Proposed redline for ${hunk.section}`}
                      onInput={(e) =>
                        updateProposedText(
                          hunk.id,
                          (e.currentTarget as HTMLTextAreaElement).value
                        )
                      }
                    />
                  </div>
                </div>
              )}

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

              {mode === 'clean' && (
                <div class="redline-col is-clean-edit">
                  <textarea
                    rows={3}
                    class="redline-editable-prose"
                    value={resolvedClean}
                    aria-label={`Final text for ${hunk.section}`}
                    onInput={(e) =>
                      updateProposedText(
                        hunk.id,
                        (e.currentTarget as HTMLTextAreaElement).value
                      )
                    }
                  />
                </div>
              )}
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
