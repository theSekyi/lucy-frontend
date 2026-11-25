import { useEffect, useRef, useState } from 'preact/hooks';
import type { LoadedRenderer, RendererContext } from '../../core/renderers';
import type { CitedDocumentData } from '../../core/types';
import '../enterprise-stage.css';

function ContractInspectorView({ context }: { context: RendererContext<CitedDocumentData> }) {
  const doc = context.block.data;
  const allClauses = doc.pages.flatMap((p) => p.clauses);
  const [activeClause, setActiveClause] = useState<string>(
    context.focusAnchor ?? allClauses[0]?.section ?? ''
  );
  const [folioTheme, setFolioTheme] = useState<'paper' | 'dark'>('paper');
  const [query, setQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  function scrollClauseIntoMat(section: string) {
    const container = scrollRef.current;
    if (!container) return;
    const el = container.querySelector<HTMLElement>(
      `[data-clause="${CSS.escape(section)}"]`
    );
    if (!el) return;
    const cRect = container.getBoundingClientRect();
    const eRect = el.getBoundingClientRect();
    const targetTop =
      container.scrollTop + (eRect.top - cRect.top) - Math.max(24, (cRect.height - eRect.height) / 3);
    container.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
  }

  useEffect(() => {
    if (!context.focusAnchor) return;
    setActiveClause(context.focusAnchor);
    scrollClauseIntoMat(context.focusAnchor);
  }, [context.focusAnchor, context.anchorPulse]);

  function jumpToClause(section: string) {
    setActiveClause(section);
    scrollClauseIntoMat(section);
  }

  const filterLower = query.trim().toLowerCase();

  return (
    <div class="stage-plugin-shell">
      <div class="stage-subbar">
        <div class="contract-clause-nav" role="navigation" aria-label="Indexed clauses">
          {allClauses.map((clause) => (
            <button
              key={clause.section}
              type="button"
              class={`clause-jump-pill ${activeClause === clause.section ? 'is-focused' : ''}`}
              onClick={() => jumpToClause(clause.section)}
            >
              <span class={`risk-dot is-${clause.riskLevel ?? 'low'}`} />
              <span>{clause.section}</span>
            </button>
          ))}
        </div>

        <div class="stage-subbar-group">
          <div class="seg-tabs" role="group" aria-label="Document surface theme">
            <button
              type="button"
              class={`seg-tab ${folioTheme === 'paper' ? 'is-active' : ''}`}
              onClick={() => setFolioTheme('paper')}
            >
              Paper
            </button>
            <button
              type="button"
              class={`seg-tab ${folioTheme === 'dark' ? 'is-active' : ''}`}
              onClick={() => setFolioTheme('dark')}
            >
              Dark
            </button>
          </div>

          <input
            type="search"
            class="sheet-filter-input"
            placeholder="Find in contract…"
            value={query}
            onInput={(e) => setQuery((e.currentTarget as HTMLInputElement).value)}
          />
        </div>
      </div>

      <div class="pdf-desk-mat" ref={scrollRef}>
        {doc.pages.map((page) => {
          const matchingClauses = filterLower
            ? page.clauses.filter(
                (c) =>
                  c.section.toLowerCase().includes(filterLower) ||
                  c.heading.toLowerCase().includes(filterLower) ||
                  c.text.toLowerCase().includes(filterLower)
              )
            : page.clauses;

          if (matchingClauses.length === 0) return null;

          return (
            <section
              key={page.pageNumber}
              class={`pdf-folio-page theme-${folioTheme}`}
              aria-label={`Page ${page.pageNumber}`}
            >
              <header class="pdf-running-header">
                <span>{doc.documentTitle}</span>
                <span>EXECUTION COPY</span>
              </header>

              <div class="pdf-section-banner">{page.header}</div>

              {matchingClauses.map((clause) => {
                const isGrounded = activeClause === clause.section;
                const riskTone =
                  clause.riskLevel === 'high'
                    ? 'tone-warn'
                    : clause.riskLevel === 'watch'
                      ? 'tone-neutral'
                      : 'tone-good';

                return (
                  <article
                    key={clause.section}
                    data-clause={clause.section}
                    class={`pdf-clause-row ${isGrounded ? 'is-grounded' : ''}`}
                    onClick={() => setActiveClause(clause.section)}
                  >
                    <div class="pdf-clause-num">{clause.section}</div>

                    <div>
                      <div class="pdf-clause-heading-line">
                        <strong>{clause.heading}</strong>
                        {clause.riskLevel && (
                          <span class={`cell-pill ${riskTone}`}>
                            {clause.riskLevel === 'high'
                              ? 'Negotiate'
                              : clause.riskLevel === 'watch'
                                ? 'Watch'
                                : 'Standard'}
                          </span>
                        )}
                      </div>

                      <p class="pdf-clause-prose">{clause.text}</p>

                      {clause.note && (
                        <div class="pdf-counsel-pin">
                          <strong>Counsel Note:</strong>
                          <span>{clause.note}</span>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}

              <footer class="pdf-page-footer">
                <span>{doc.partySummary}</span>
                <span>
                  Page {page.pageNumber} of {doc.totalPages}
                </span>
              </footer>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export const contractRendererModule: LoadedRenderer<preact.ComponentChildren, CitedDocumentData> = {
  render(context) {
    return <ContractInspectorView context={context} />;
  },
};
