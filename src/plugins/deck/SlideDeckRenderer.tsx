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
  const [draftDeck, setDraftDeck] = useState<SlideDeckData>(() => baseline);
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<'slide' | 'memo'>('slide');
  const [justSynced, setJustSynced] = useState(false);

  const pendingChanges = useMemo(
    () => computeDeckDiffSummary(baseline, draftDeck),
    [baseline, draftDeck]
  );

  const activeSlide = draftDeck.slides[index] ?? draftDeck.slides[0];
  if (!activeSlide) return null;

  function updateSlide(slideIdx: number, recipe: (current: ExecutiveSlide) => ExecutiveSlide) {
    setJustSynced(false);
    setDraftDeck((prev) => ({
      ...prev,
      slides: prev.slides.map((s, idx) => (idx === slideIdx ? recipe(s) : s)),
    }));
  }

  function addNewSlide() {
    const nextNum = draftDeck.slides.length + 1;
    const created: ExecutiveSlide = {
      id: `slide-${Date.now()}`,
      eyebrow: `0${nextNum} · NEW SECTION`,
      title: 'Click headline or metrics to customize this slide',
      takeaway: 'Any edits you make here sync straight back into Lucy’s conversation memory.',
      metrics: [
        { label: 'Target Metric', value: '$1.2M', delta: '+18% QoQ' },
        { label: 'Efficiency', value: '94%', delta: '+4 pts' },
        { label: 'Timeline', value: 'Q1 FY27', delta: 'On Track' },
      ],
      bullets: ['Add key executive decision or action item here.'],
    };
    setJustSynced(false);
    setDraftDeck((prev) => ({ ...prev, slides: [...prev.slides, created] }));
    setIndex(draftDeck.slides.length);
  }

  function commitEditsToLucy() {
    if (pendingChanges.length === 0) return;
    context.onCommitRevision?.(draftDeck, pendingChanges);
    setJustSynced(true);
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

  const progressPct = ((index + 1) / draftDeck.slides.length) * 100;

  return (
    <div class="stage-plugin-shell">
      <div class="stage-subbar">
        <div class="stage-subbar-group">
          <div class="seg-tabs" role="tablist">
            <button
              type="button"
              class={`seg-tab ${mode === 'slide' ? 'is-active' : ''}`}
              onClick={() => setMode('slide')}
            >
              16:9 Editable Canvas
            </button>
            <button
              type="button"
              class={`seg-tab ${mode === 'memo' ? 'is-active' : ''}`}
              onClick={() => setMode('memo')}
            >
              Board Memo
            </button>
          </div>

          <button type="button" class="ghost-pill" onClick={addNewSlide}>
            + Slide
          </button>
        </div>

        <div class="stage-subbar-group">
          {pendingChanges.length > 0 ? (
            <>
              <button
                type="button"
                class="ghost-pill"
                onClick={() => setDraftDeck(baseline)}
              >
                Revert
              </button>
              <button
                type="button"
                class="sync-llm-btn"
                onClick={commitEditsToLucy}
              >
                Sync {pendingChanges.length} Edit{pendingChanges.length === 1 ? '' : 's'} to Lucy →
              </button>
            </>
          ) : justSynced ? (
            <span class="cell-pill tone-good">✓ Synced with Lucy</span>
          ) : (
            <span class="sheet-meta-count">Click any text or KPI on slide to edit</span>
          )}

          <button type="button" class="ghost-pill" onClick={exportMarkdownBrief}>
            Export
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
                    updateSlide(index, (s) => ({
                      ...s,
                      eyebrow: (e.currentTarget as HTMLInputElement).value,
                    }))
                  }
                />
                <span class="sheet-meta-count">
                  {draftDeck.dateLabel} · {index + 1}/{draftDeck.slides.length}
                </span>
              </div>

              <textarea
                rows={2}
                class="editable-field deck-headline-textarea"
                value={activeSlide.title}
                aria-label="Slide headline"
                onInput={(e) =>
                  updateSlide(index, (s) => ({
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
                        updateSlide(index, (s) => ({
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
                        updateSlide(index, (s) => ({
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
                        updateSlide(index, (s) => ({
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
              <input
                type="text"
                class="editable-field"
                style={{ color: '#f4f4f6', fontWeight: 500 }}
                value={activeSlide.takeaway}
                aria-label="Executive takeaway"
                onInput={(e) =>
                  updateSlide(index, (s) => ({
                    ...s,
                    takeaway: (e.currentTarget as HTMLInputElement).value,
                  }))
                }
              />
            </div>

            <div class="deck-bullets-list">
              {activeSlide.bullets.map((bullet, bIdx) => (
                <div key={bIdx} class="deck-bullet-row">
                  <span class="deck-bullet-dot">•</span>
                  <input
                    type="text"
                    class="editable-field"
                    style={{ color: '#d4d4d8' }}
                    value={bullet}
                    aria-label={`Bullet ${bIdx + 1}`}
                    onInput={(e) =>
                      updateSlide(index, (s) => ({
                        ...s,
                        bullets: s.bullets.map((item, k) =>
                          k === bIdx ? (e.currentTarget as HTMLInputElement).value : item
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
                        updateSlide(index, (s) => ({
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
                    updateSlide(index, (s) => ({
                      ...s,
                      bullets: [...s.bullets, 'New executive action item…'],
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
                aria-selected={idx === index}
                class={`deck-thumb-btn ${idx === index ? 'is-active' : ''}`}
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
            <section key={s.id} class="pdf-folio-page theme-dark" style={{ padding: '20px 24px' }}>
              <div class="deck-eyebrow-input" style={{ marginBottom: '6px' }}>
                {s.eyebrow}
              </div>
              <input
                type="text"
                class="editable-field"
                style={{ fontSize: '15px', fontWeight: 600, marginBottom: '10px', color: '#f4f4f6' }}
                value={s.title}
                onInput={(e) =>
                  updateSlide(sIdx, (curr) => ({
                    ...curr,
                    title: (e.currentTarget as HTMLInputElement).value,
                  }))
                }
              />
              <div class="deck-takeaway-box" style={{ marginBottom: '10px' }}>
                {s.takeaway}
              </div>
              <ul class="prose-list" style={{ marginBottom: 0 }}>
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

export const slideDeckRendererModule: LoadedRenderer<preact.ComponentChildren, SlideDeckData> = {
  render(context) {
    return <SlideDeckStageView context={context} />;
  },
};
