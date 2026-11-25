import { useMemo, useState } from 'preact/hooks';
import type { LoadedRenderer, RendererContext } from '../../core/renderers';
import type { ExecutiveSlide, SlideDeckData } from '../../core/types';
import '../enterprise-stage.css';

function computeDeckDiffSummary(
  baseline: SlideDeckData,
  draft: SlideDeckData
): string[] {
  const changes: string[] = [];

  draft.slides.forEach((slide, idx) => {
    const orig = baseline.slides[idx];
    const tag = `Slide ${idx + 1}`;
    if (!orig) {
      changes.push(`Added ${tag}: "${slide.title}"`);
      return;
    }
    if (orig.eyebrow !== slide.eyebrow) {
      changes.push(`${tag} Eyebrow: "${orig.eyebrow}" → "${slide.eyebrow}"`);
    }
    if (orig.title !== slide.title) {
      changes.push(`${tag} Headline → "${slide.title}"`);
    }
    if (orig.takeaway !== slide.takeaway) {
      changes.push(`${tag} Key Takeaway → "${slide.takeaway}"`);
    }
    slide.metrics?.forEach((m, mIdx) => {
      const om = orig.metrics?.[mIdx];
      if (!om) return;
      if (om.value !== m.value || om.label !== m.label || om.delta !== m.delta) {
        changes.push(`${tag} KPI (${m.label}): ${om.value} → ${m.value} (${m.delta ?? ''})`);
      }
    });
    if (JSON.stringify(orig.bullets) !== JSON.stringify(slide.bullets)) {
      changes.push(`${tag} Bullets updated (${slide.bullets.length} points)`);
    }
  });

  return changes;
}

function SlideDeckStageView({ context }: { context: RendererContext<SlideDeckData> }) {
  const baseline = context.block.data;
  const [localDraft, setLocalDraft] = useState<SlideDeckData | null>(null);
  const draftDeck = context.draft ?? localDraft ?? baseline;

  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<'slide' | 'memo'>('slide');

  const pendingChanges = useMemo(
    () => computeDeckDiffSummary(baseline, draftDeck),
    [baseline, draftDeck]
  );

  const clampedIndex = Math.min(index, Math.max(0, draftDeck.slides.length - 1));
  const activeSlide = draftDeck.slides[clampedIndex] ?? draftDeck.slides[0];
  if (!activeSlide) return null;

  function applyDraft(next: SlideDeckData) {
    if (context.onUpdateDraft) {
      context.onUpdateDraft(next);
    } else {
      setLocalDraft(next);
    }
  }

  function updateSlide(slideIdx: number, recipe: (current: ExecutiveSlide) => ExecutiveSlide) {
    applyDraft({
      ...draftDeck,
      slides: draftDeck.slides.map((s, idx) => (idx === slideIdx ? recipe(s) : s)),
    });
  }

  function addNewSlide() {
    const nextNum = draftDeck.slides.length + 1;
    const created: ExecutiveSlide = {
      id: `slide-${Date.now()}`,
      eyebrow: `0${nextNum} · ADDITIONAL SCHEDULE`,
      title: 'Audit Committee Supplemental Note',
      takeaway: 'Supporting workpaper detail tied to Consolidated Trial Balance.',
      metrics: [
        { label: 'Scope', value: '100%', delta: 'Tested' },
        { label: 'Materiality', value: '£25,000', delta: '5% Pre-Tax' },
        { label: 'Sign-off', value: '30 Nov', delta: 'On track' },
      ],
      bullets: ['Document key engagement conclusion or adjustment item.'],
    };
    applyDraft({ ...draftDeck, slides: [...draftDeck.slides, created] });
    setIndex(draftDeck.slides.length);
  }

  function commitDeckEdits() {
    const summary =
      pendingChanges.length > 0
        ? pendingChanges
        : [`Verified ${draftDeck.deckTitle} (${draftDeck.slides.length} slides)`];
    context.onCommitRevision?.(draftDeck, summary);
    setLocalDraft(null);
  }

  function exportMarkdownBrief() {
    const md = draftDeck.slides
      .map(
        (s) =>
          `## ${s.eyebrow}: ${s.title}\n\n> ${s.takeaway}\n\n${s.bullets.map((b) => `- ${b}`).join('\n')}`
      )
      .join('\n\n---\n\n');
    const blob = new Blob([`# ${draftDeck.deckTitle}\n\n${md}`], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${draftDeck.deckTitle.replace(/\s+/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const progressPct = ((clampedIndex + 1) / draftDeck.slides.length) * 100;

  return (
    <div class="stage-plugin-shell">
      <div class="stage-subbar">
        <div class="stage-subbar-group">
          <div class="seg-tabs" role="tablist" aria-label="Presentation views">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'slide'}
              class={`seg-tab ${mode === 'slide' ? 'is-active' : ''}`}
              onClick={() => setMode('slide')}
            >
              Slides
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'memo'}
              class={`seg-tab ${mode === 'memo' ? 'is-active' : ''}`}
              onClick={() => setMode('memo')}
            >
              Memo
            </button>
          </div>

          <button type="button" class="ghost-pill" onClick={addNewSlide}>
            + Slide
          </button>
        </div>

        <div class="stage-subbar-group">
          <button type="button" class="ghost-pill" onClick={exportMarkdownBrief}>
            Export Markdown
          </button>
          <button type="button" class="primary-stage-btn" onClick={commitDeckEdits}>
            {pendingChanges.length > 0 ? `Save (${pendingChanges.length})` : 'Save'}
          </button>
        </div>
      </div>

      {mode === 'slide' ? (
        <div class="deck-workspace">
          <article class="deck-slide-canvas">
            <div class="deck-progress-track">
              <div class="deck-progress-fill" style={{ width: `${progressPct}%` }} />
            </div>

            <div>
              <div class="deck-top-meta">
                <input
                  type="text"
                  class="editable-field deck-eyebrow-input"
                  value={activeSlide.eyebrow}
                  aria-label="Slide section label"
                  onInput={(e) =>
                    updateSlide(clampedIndex, (s) => ({
                      ...s,
                      eyebrow: (e.currentTarget as HTMLInputElement).value,
                    }))
                  }
                />
                <span class="sheet-meta-count">
                  {draftDeck.dateLabel} · {clampedIndex + 1}/{draftDeck.slides.length}
                </span>
              </div>

              <textarea
                rows={2}
                class="editable-field deck-headline-textarea"
                value={activeSlide.title}
                aria-label="Slide headline"
                onInput={(e) =>
                  updateSlide(clampedIndex, (s) => ({
                    ...s,
                    title: (e.currentTarget as HTMLTextAreaElement).value,
                  }))
                }
              />
            </div>

            {activeSlide.metrics && (
              <div class="deck-kpi-grid">
                {activeSlide.metrics.map((metric, mIdx) => (
                  <div key={mIdx} class="deck-kpi-card">
                    <input
                      type="text"
                      class="editable-field kpi-tile-label"
                      value={metric.label}
                      aria-label={`KPI ${mIdx + 1} label`}
                      onInput={(e) =>
                        updateSlide(clampedIndex, (s) => ({
                          ...s,
                          metrics: s.metrics?.map((item, k) =>
                            k === mIdx
                              ? { ...item, label: (e.currentTarget as HTMLInputElement).value }
                              : item
                          ),
                        }))
                      }
                    />
                    <input
                      type="text"
                      class="editable-field deck-kpi-val-input"
                      value={metric.value}
                      aria-label={`KPI ${mIdx + 1} value`}
                      onInput={(e) =>
                        updateSlide(clampedIndex, (s) => ({
                          ...s,
                          metrics: s.metrics?.map((item, k) =>
                            k === mIdx
                              ? { ...item, value: (e.currentTarget as HTMLInputElement).value }
                              : item
                          ),
                        }))
                      }
                    />
                    <input
                      type="text"
                      class="editable-field deck-kpi-delta-input"
                      value={metric.delta ?? ''}
                      aria-label={`KPI ${mIdx + 1} delta`}
                      onInput={(e) =>
                        updateSlide(clampedIndex, (s) => ({
                          ...s,
                          metrics: s.metrics?.map((item, k) =>
                            k === mIdx
                              ? { ...item, delta: (e.currentTarget as HTMLInputElement).value }
                              : item
                          ),
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            )}

            <div class="deck-takeaway-box">
              <textarea
                rows={2}
                class="editable-field deck-takeaway-textarea"
                value={activeSlide.takeaway}
                aria-label="Executive takeaway"
                onInput={(e) =>
                  updateSlide(clampedIndex, (s) => ({
                    ...s,
                    takeaway: (e.currentTarget as HTMLTextAreaElement).value,
                  }))
                }
              />
            </div>

            <div class="deck-bullets-list">
              {activeSlide.bullets.map((bullet, bIdx) => (
                <div key={bIdx} class="deck-bullet-row">
                  <span class="deck-bullet-dot">•</span>
                  <textarea
                    rows={2}
                    class="editable-field deck-bullet-textarea"
                    value={bullet}
                    aria-label={`Slide bullet ${bIdx + 1}`}
                    onInput={(e) =>
                      updateSlide(clampedIndex, (s) => ({
                        ...s,
                        bullets: s.bullets.map((item, k) =>
                          k === bIdx ? (e.currentTarget as HTMLTextAreaElement).value : item
                        ),
                      }))
                    }
                  />
                  {activeSlide.bullets.length > 1 && (
                    <button
                      type="button"
                      class="icon-action-btn"
                      aria-label="Remove bullet"
                      onClick={() =>
                        updateSlide(clampedIndex, (s) => ({
                          ...s,
                          bullets: s.bullets.filter((_, k) => k !== bIdx),
                        }))
                      }
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}

              <div>
                <button
                  type="button"
                  class="ghost-pill"
                  onClick={() =>
                    updateSlide(clampedIndex, (s) => ({
                      ...s,
                      bullets: [...s.bullets, 'Additional audit committee observation…'],
                    }))
                  }
                >
                  + Add point
                </button>
              </div>
            </div>
          </article>

          <div class="deck-thumbnails-rail" role="tablist" aria-label="Slide selector">
            {draftDeck.slides.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={idx === clampedIndex}
                class={`deck-thumb-btn ${idx === clampedIndex ? 'is-active' : ''}`}
                onClick={() => setIndex(idx)}
              >
                <span class="deck-thumb-num">SLIDE 0{idx + 1}</span>
                <span class="deck-thumb-title">{s.title}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div class="stage-scroll-area">
          {draftDeck.slides.map((s, sIdx) => (
            <section key={s.id} class="pdf-folio-page theme-dark deck-memo-card">
              <div class="deck-eyebrow-input">{s.eyebrow}</div>
              <input
                type="text"
                class="editable-field deck-memo-title-input"
                value={s.title}
                aria-label={`Slide ${sIdx + 1} headline`}
                onInput={(e) =>
                  updateSlide(sIdx, (curr) => ({
                    ...curr,
                    title: (e.currentTarget as HTMLInputElement).value,
                  }))
                }
              />
              <div class="deck-takeaway-box">{s.takeaway}</div>
              <ul class="prose-list">
                {s.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export const slideDeckRendererModule: LoadedRenderer<
  preact.ComponentChildren,
  SlideDeckData
> = {
  render(context) {
    return <SlideDeckStageView context={context} />;
  },
};
