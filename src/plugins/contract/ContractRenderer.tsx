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
  const [query, setQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!context.focusAnchor) return;
    setActiveClause(context.focusAnchor);
    const el = scrollRef.current?.querySelector<HTMLElement>(
      `[data-clause="${CSS.escape(context.focusAnchor)}"]`
    );
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [context.focusAnchor, context.anchorPulse]);

  function jumpToClause(section: string) {
    setActiveClause(section);
    const el = scrollRef.current?.querySelector<HTMLElement>(
      `[data-clause="${CSS.escape(section)}"]`
    );
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
              {clause.section}
            </button>
          ))}
        </div>

        <input
          type="search"
          class="sheet-filter-input"
          placeholder="Search clauses…"
          value={query}
          onInput={(e) => setQuery((e.currentTarget as HTMLInputElement).value)}
        />
      </div>

      <div class="stage-scroll-area" ref={scrollRef}>
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
            <section key={page.pageNumber} class="contract-page-sheet">
              <div class="contract-page-meta">
                <span>{page.header}</span>
                <span>
                  PAGE {page.pageNumber} OF {doc.totalPages}
                </span>
              </div>

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
                    class={`contract-clause-box ${isGrounded ? 'is-grounded' : ''}`}
                    onClick={() => setActiveClause(clause.section)}
                  >
                    <div class="clause-title-row">
                      <div>
                        <span class="clause-sec-id">{clause.section}</span>
                        <strong>{clause.heading}</strong>
                      </div>
                      {clause.riskLevel && (
                        <span class={`cell-pill ${riskTone}`}>
                          {clause.riskLevel === 'high'
                            ? 'Negotiate'
                            : clause.riskLevel === 'watch'
                              ? 'Watch'
                              : 'Verified'}
                        </span>
                      )}
                    </div>

                    <p class="clause-body-text">{clause.text}</p>
                    {clause.note && <div class="clause-footnote">↳ {clause.note}</div>}
                  </article>
                );
              })}
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
