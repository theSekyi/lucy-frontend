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
  const baseline = context.block.data;
  const [localDraft, setLocalDraft] = useState<RedlineDocumentData | null>(null);
  const doc = context.draft ?? localDraft ?? baseline;
  const [mode, setMode] = useState<DiffMode>('split');

  const baselineMap = new Map(baseline.hunks.map((h) => [h.id, h]));

  const wordDiffByHunk = useMemo(
    () =>
      Object.fromEntries(doc.hunks.map((h) => [h.id, computeWordDiff(h.before, h.after)])),
    [doc.hunks]
  );

  const acceptedCount = doc.hunks.filter((h) => h.initialDecision === 'accepted').length;
  const rejectedCount = doc.hunks.filter((h) => h.initialDecision === 'rejected').length;
  const pendingCount = doc.hunks.length - acceptedCount - rejectedCount;

  function applyDraft(next: RedlineDocumentData) {
    if (context.onUpdateDraft) {
      context.onUpdateDraft(next);
    } else {
      setLocalDraft(next);
    }
  }

  function setHunkDecision(id: string, next: Decision) {
    applyDraft({
      ...doc,
      hunks: doc.hunks.map((h) =>
        h.id === id ? { ...h, initialDecision: next } : h
      ),
    });
  }

  function updateProposedText(id: string, nextText: string) {
    applyDraft({
      ...doc,
      hunks: doc.hunks.map((h) =>
        h.id === id
          ? { ...h, after: nextText, initialDecision: 'accepted' }
          : h
      ),
    });
  }

  function resetHunkText(id: string) {
    const orig = baselineMap.get(id);
    if (!orig) return;
    applyDraft({
      ...doc,
      hunks: doc.hunks.map((h) =>
        h.id === id
          ? { ...h, after: orig.after, initialDecision: orig.initialDecision ?? 'pending' }
          : h
      ),
    });
  }

  function acceptAllPending() {
    applyDraft({
      ...doc,
      hunks: doc.hunks.map((h) =>
        (h.initialDecision ?? 'pending') === 'pending'
          ? { ...h, initialDecision: 'accepted' }
          : h
      ),
    });
  }

  function commitRedlines() {
    const summary = doc.hunks.map((h) => {
      const orig = baselineMap.get(h.id);
      const status = (h.initialDecision ?? 'pending').toUpperCase();
      const wasEdited = orig !== undefined && h.after !== orig.after;
      return `${h.section}: ${status}${wasEdited ? ` — "${h.after}"` : ''}`;
    });

    context.onCommitRevision?.(doc, summary);
    setLocalDraft(null);
  }

  return (
    <div class="stage-plugin-shell">
      <div class="stage-subbar">
        <div class="stage-subbar-group">
          <div class="seg-tabs" role="tablist" aria-label="Redline display mode">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'split'}
              class={`seg-tab ${mode === 'split' ? 'is-active' : ''}`}
              onClick={() => setMode('split')}
            >
              Side-by-side
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'inline'}
              class={`seg-tab ${mode === 'inline' ? 'is-active' : ''}`}
              onClick={() => setMode('inline')}
            >
              Inline
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'clean'}
              class={`seg-tab ${mode === 'clean' ? 'is-active' : ''}`}
              onClick={() => setMode('clean')}
            >
              Clean
            </button>
          </div>

          <span class="sheet-meta-count">
            {acceptedCount} accepted · {rejectedCount} rejected · {pendingCount} pending
          </span>
        </div>

        <div class="stage-subbar-group">
          {pendingCount > 0 && (
            <button type="button" class="ghost-pill" onClick={acceptAllPending}>
              Accept all
            </button>
          )}
          <button type="button" class="primary-stage-btn" onClick={commitRedlines}>
            Save
          </button>
        </div>
      </div>

      <div class="stage-scroll-area">
        <div class="redline-doc-banner">
          <div>
            <strong>{doc.documentName}</strong>
            <div class="clause-footnote">{doc.author}</div>
          </div>
          <span class="sheet-meta-count">{doc.hunks.length} clauses</span>
        </div>

        {doc.hunks.map((hunk) => {
          const orig = baselineMap.get(hunk.id);
          const status = hunk.initialDecision ?? 'pending';
          const isEdited = orig !== undefined && hunk.after !== orig.after;
          const tokens = wordDiffByHunk[hunk.id] ?? [];
          const resolvedClean = status === 'rejected' ? hunk.before : hunk.after;

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
                      onClick={() => resetHunkText(hunk.id)}
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
                    <div class="redline-col-label">Prior draft</div>
                    <div>{hunk.before}</div>
                  </div>
                  <div class="redline-col is-after">
                    <div class="redline-col-label">Proposed redline</div>
                    <textarea
                      rows={Math.max(4, Math.ceil(hunk.after.length / 30))}
                      class="redline-editable-prose"
                      value={hunk.after}
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

export const redlineRendererModule: LoadedRenderer<
  preact.ComponentChildren,
  RedlineDocumentData
> = {
  render(context) {
    return <RedlineDiffView context={context} />;
  },
};
