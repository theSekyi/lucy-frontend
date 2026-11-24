import type { ComponentChildren } from 'preact';
import {
  createRendererRegistry,
  type LoadedRenderer,
  type RendererPlugin,
  type RendererRegistry,
} from '../core/renderers';

function formatInlineTokens(line: string): ComponentChildren[] {
  const tokens = line.split(/(\*\*[^*]+\*\*|`[^`]+`|<mention\s+name="[^"]+"\s*\/?>)/g);
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
  render({ block }) {
    const text = typeof block.data === 'string' ? block.data : String(block.data ?? '');
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
                  <li key={lIdx}>{formatInlineTokens(line.trim().slice(2))}</li>
                ))}
              </ul>
            );
          }
          return (
            <p key={pIdx} class="prose-paragraph">
              {lines.map((line, lIdx) => (
                <span key={lIdx}>
                  {lIdx > 0 && <br />}
                  {formatInlineTokens(line)}
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
    id: 'spreadsheet',
    label: 'Spreadsheet Workbook',
    badge: 'XLSX',
    placement: 'stage',
    priority: 30,
    matches: (block) =>
      block.kind === 'spreadsheet' ||
      block.mimeType === 'text/csv' ||
      block.mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      /\.(xlsx|csv|tsv)$/i.test(block.filename ?? ''),
    load: async () => {
      const mod = await import('./spreadsheet/SpreadsheetRenderer');
      return mod.spreadsheetRendererModule;
    },
  });

  registry.register({
    id: 'code',
    label: 'Code Snippet',
    badge: 'CODE',
    placement: 'inline',
    priority: 20,
    matches: (block) => block.kind === 'code',
    load: async () => {
      const mod = await import('./code/CodeRenderer');
      return mod.codeRendererModule;
    },
  });

  // Prime synchronous prose renderer so conversation text renders on the very first frame
  void registry.loadRenderer({ id: 'prime', kind: 'prose', data: '' });

  return registry;
}
