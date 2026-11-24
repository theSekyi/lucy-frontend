import { useState } from 'preact/hooks';
import type { LoadedRenderer, RendererContext } from '../../core/renderers';
import type { SlideDeckData } from '../../core/types';
import '../enterprise-stage.css';

function SlideDeckStageView({ context }: { context: RendererContext<SlideDeckData> }) {
  const deck = context.block.data;
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<'slide' | 'memo'>('slide');

  const activeSlide = deck.slides[index] ?? deck.slides[0];
  if (!activeSlide) return null;

  function exportMarkdownBrief() {
    const md = deck.slides
      .map(
        (s) =>
          `## ${s.eyebrow}: ${s.title}\n\n> ${s.takeaway}\n\n${s.bullets.map((b) => `- ${b}`).join('\n')}`
      )
      .join('\n\n---\n\n');
    const blob = new Blob([`# ${deck.deckTitle}\n\n${md}`], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${deck.deckTitle.replace(/\s+/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div class="stage-plugin-shell">
      <div class="stage-subbar">
        <div class="seg-tabs" role="tablist">
          <button
            type="button"
            class={`seg-tab ${mode === 'slide' ? 'is-active' : ''}`}
            onClick={() => setMode('slide')}
          >
            16:9 Slide
          </button>
          <button
            type="button"
            class={`seg-tab ${mode === 'memo' ? 'is-active' : ''}`}
            onClick={() => setMode('memo')}
          >
            Executive Memo
          </button>
        </div>

        <div class="stage-subbar-group">
          {mode === 'slide' && (
            <>
              <button
                type="button"
                class="ghost-pill"
                disabled={index === 0}
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
              >
                ← Prev
              </button>
              <span class="sheet-meta-count">
                {index + 1} / {deck.slides.length}
              </span>
              <button
                type="button"
                class="ghost-pill"
                disabled={index >= deck.slides.length - 1}
                onClick={() => setIndex((i) => Math.min(deck.slides.length - 1, i + 1))}
              >
                Next →
              </button>
            </>
          )}
          <button type="button" class="ghost-pill" onClick={exportMarkdownBrief}>
            Export Brief
          </button>
        </div>
      </div>

      {mode === 'slide' ? (
        <div class="slide-stage-center">
          <article class="slide-card-frame is-widescreen">
            <div>
              <div class="slide-eyebrow">{activeSlide.eyebrow}</div>
              <h2 class="slide-headline">{activeSlide.title}</h2>
            </div>

            {activeSlide.metrics && (
              <div class="sql-kpi-strip" style={{ marginBottom: 0 }}>
                {activeSlide.metrics.map((m) => (
                  <div key={m.label} class="kpi-tile">
                    <div class="kpi-tile-label">{m.label}</div>
                    <div class="kpi-tile-value">{m.value}</div>
                    {m.delta && <div class="clause-footnote">{m.delta}</div>}
                  </div>
                ))}
              </div>
            )}

            <p class="slide-takeaway">{activeSlide.takeaway}</p>

            <ul class="prose-list" style={{ marginBottom: 0 }}>
              {activeSlide.bullets.map((b, idx) => (
                <li key={idx}>{b}</li>
              ))}
            </ul>
          </article>

          <div class="slide-filmstrip" role="tablist" aria-label="Slide selector">
            {deck.slides.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                class={`filmstrip-dot ${idx === index ? 'is-active' : ''}`}
                onClick={() => setIndex(idx)}
              >
                Slide {idx + 1}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div class="stage-scroll-area">
          {deck.slides.map((s) => (
            <section key={s.id} class="contract-page-sheet">
              <div class="slide-eyebrow">{s.eyebrow}</div>
              <h3 class="slide-headline" style={{ fontSize: '15px', marginBottom: '10px' }}>
                {s.title}
              </h3>
              <p class="slide-takeaway" style={{ marginBottom: '10px' }}>
                {s.takeaway}
              </p>
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
