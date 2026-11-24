import type { ComponentChildren } from 'preact';
import {
  createRendererRegistry,
  type LoadedRenderer,
  type RendererContext,
  type RendererPlugin,
  type RendererRegistry,
} from '../core/renderers';

function formatInlineTokens(
  line: string,
  context: RendererContext<string>
): ComponentChildren[] {
  const tokens = line.split(/(\*\*[^*]+\*\*|`[^`]+`|\[§[\d.]+\]|<mention\s+name="[^"]+"\s*\/?>)/g);
  return tokens.map((segment, index) => {
    if (segment.startsWith('**') && segment.endsWith('**')) {
      return <strong key={index}>{segment.slice(2, -2)}</strong>;
    }
    if (segment.startsWith('`') && segment.endsWith('`')) {
      return (
        <code key={index} class="inline-code">
          {segment.slice(1, -1)}
        </code>
      );
    }
    if (/^\[§[\d.]+\]$/.test(segment)) {
      const anchor = segment.slice(1, -1);
      return (
        <button
          key={index}
          type="button"
          class="inline-citation"
          title={`Jump to ${anchor} in document stage`}
          onClick={() => {
            if (context.siblingArtifactId) {
              context.onInspect?.(context.siblingArtifactId, anchor);
            }
          }}
        >
          {segment}
        </button>
      );
    }
    const mentionMatch = segment.match(/^<mention\s+name="([^"]+)"\s*\/?>$/);
    if (mentionMatch) {
      return (
        <span key={index} class="inline-mention">
          @{mentionMatch[1]}
        </span>
      );
    }
    return segment;
  });
}

const proseRendererModule: LoadedRenderer<ComponentChildren, string> = {
  render(context) {
    const text = typeof context.block.data === 'string' ? context.block.data : String(context.block.data ?? '');
    const paragraphs = text.split('\n\n');

    return (
      <div class="prose-content">
        {paragraphs.map((chunk, pIdx) => {
          const lines = chunk.split('\n');
          const isBulletList = lines.every((line) => line.trim().startsWith('• '));
          if (isBulletList) {
            return (
              <ul key={pIdx} class="prose-list">
                {lines.map((line, lIdx) => (
                  <li key={lIdx}>{formatInlineTokens(line.trim().slice(2), context)}</li>
                ))}
              </ul>
            );
          }
          return (
            <p key={pIdx} class="prose-paragraph">
              {lines.map((line, lIdx) => (
                <span key={lIdx}>
                  {lIdx > 0 && <br />}
                  {formatInlineTokens(line, context)}
                </span>
              ))}
            </p>
          );
        })}
      </div>
    );
  },
};

const fallbackPlugin: RendererPlugin<ComponentChildren> = {
  id: 'fallback-inspector',
  label: 'Structured Payload',
  badge: 'DATA',
  accent: 'neutral',
  placement: 'inline',
  matches: () => true,
  load: async () => ({
    render({ block }) {
      return (
        <div class="fallback-block">
          <div class="fallback-header">
            <span class="artifact-badge">{block.kind.toUpperCase()}</span>
            <span>{block.filename ?? block.title ?? 'Unhandled content block'}</span>
          </div>
          {block.summary && <p class="fallback-summary">{block.summary}</p>}
        </div>
      );
    },
  }),
};

async function loadPresetSample(
  preset: 'spreadsheet' | 'contract' | 'redline' | 'sql-canvas' | 'topology' | 'slide-deck',
  nextId: (prefix: string) => string
) {
  const { createEnterprisePresetTurn } = await import('./samples');
  return createEnterprisePresetTurn(preset, nextId);
}

/**
 * Plug-and-play plugin table: adding or removing an enterprise capability
 * requires only adding/removing one self-contained entry here.
 */
export function createDefaultRendererRegistry(): RendererRegistry<ComponentChildren> {
  const registry = createRendererRegistry<ComponentChildren>(fallbackPlugin);

  registry.register<string>({
    id: 'prose',
    label: 'Prose',
    badge: 'TEXT',
    placement: 'inline',
    priority: 10,
    matches: (block) => block.kind === 'prose' || block.mimeType === 'text/plain',
    load: () => Promise.resolve(proseRendererModule),
  });

  registry.register({
    id: 'code',
    label: 'Code Snippet',
    badge: 'CODE',
    placement: 'inline',
    priority: 20,
    matches: (block) => block.kind === 'code',
    load: async () => (await import('./code/CodeRenderer')).codeRendererModule,
  });

  registry.register({
    id: 'spreadsheet',
    label: 'Excel Workbook',
    badge: 'XLSX',
    accent: 'emerald',
    ctaLabel: 'Open sheet →',
    placement: 'stage',
    priority: 30,
    promptPattern: /\b(excel|xlsx|csv|spreadsheet|sheet|budget|forecast|revenue|financial)\b/i,
    sampleMenuLabel: 'Excel Forecast Workbook (.xlsx)',
    createSample: (nextId) => loadPresetSample('spreadsheet', nextId),
    matches: (block) =>
      block.kind === 'spreadsheet' ||
      block.mimeType === 'text/csv' ||
      block.mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      /\.(xlsx|csv|tsv)$/i.test(block.filename ?? ''),
    load: async () => (await import('./spreadsheet/SpreadsheetRenderer')).spreadsheetRendererModule,
  });

  registry.register({
    id: 'cited-document',
    label: 'Cited Contract Inspector',
    badge: 'PDF',
    accent: 'amber',
    ctaLabel: 'Inspect clauses →',
    placement: 'stage',
    priority: 35,
    promptPattern: /\b(contract|msa|soc2|clause|pdf|10-k|rfp|indemnif|liability)\b/i,
    sampleMenuLabel: 'Cited Contract / MSA ([§4.2])',
    createSample: (nextId) => loadPresetSample('contract', nextId),
    matches: (block) => block.kind === 'cited-document' || block.mimeType === 'application/pdf',
    load: async () => (await import('./contract/ContractRenderer')).contractRendererModule,
  });

  registry.register({
    id: 'redline',
    label: 'Semantic Redline Viewer',
    badge: 'DIFF',
    accent: 'rose',
    ctaLabel: 'Review redlines →',
    placement: 'stage',
    priority: 34,
    promptPattern: /\b(redline|diff|patch|iam|terraform|accept|reject|amendment)\b/i,
    sampleMenuLabel: 'Semantic Redline & Diff (Accept/Reject)',
    createSample: (nextId) => loadPresetSample('redline', nextId),
    matches: (block) => block.kind === 'redline' || /\.diff$/i.test(block.filename ?? ''),
    load: async () => (await import('./redline/RedlineRenderer')).redlineRendererModule,
  });

  registry.register({
    id: 'sql-canvas',
    label: 'SQL + Chart + Grid Canvas',
    badge: 'SQL',
    accent: 'sky',
    ctaLabel: 'Open BI canvas →',
    placement: 'stage',
    priority: 33,
    promptPattern: /\b(sql|snowflake|bigquery|warehouse|cohort|pivot|chart|query)\b/i,
    sampleMenuLabel: 'SQL + Chart + 2.4k-Row Virtual Grid',
    createSample: (nextId) => loadPresetSample('sql-canvas', nextId),
    matches: (block) => block.kind === 'sql-canvas' || /\.sql$/i.test(block.filename ?? ''),
    load: async () => (await import('./sql-canvas/SqlCanvasRenderer')).sqlCanvasRendererModule,
  });

  registry.register({
    id: 'topology',
    label: 'Lineage & Topology Graph',
    badge: 'DAG',
    accent: 'amber',
    ctaLabel: 'Inspect graph →',
    placement: 'stage',
    priority: 32,
    promptPattern: /\b(lineage|topology|blast\s*radius|incident|dag|graph|mermaid|dependency)\b/i,
    sampleMenuLabel: 'Interactive Lineage & Blast-Radius DAG',
    createSample: (nextId) => loadPresetSample('topology', nextId),
    matches: (block) => block.kind === 'topology' || /\.dag$/i.test(block.filename ?? ''),
    load: async () => (await import('./topology/TopologyRenderer')).topologyRendererModule,
  });

  registry.register({
    id: 'slide-deck',
    label: 'Executive Slide Deck',
    badge: 'DECK',
    accent: 'violet',
    ctaLabel: 'Present deck →',
    placement: 'stage',
    priority: 31,
    promptPattern: /\b(slide|deck|pptx|qbr|board\s*memo|presentation|executive\s*brief)\b/i,
    sampleMenuLabel: 'Executive QBR Slide Deck (16:9 / Memo)',
    createSample: (nextId) => loadPresetSample('slide-deck', nextId),
    matches: (block) => block.kind === 'slide-deck' || /\.pptx$/i.test(block.filename ?? ''),
    load: async () => (await import('./deck/SlideDeckRenderer')).slideDeckRendererModule,
  });

  // Prime synchronous prose renderer so conversation text paints on the first frame
  void registry.loadRenderer({ id: 'prime', kind: 'prose', data: '' });

  return registry;
}
