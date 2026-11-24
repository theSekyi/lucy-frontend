import type { ComponentChildren } from 'preact';
import type { LoadedRenderer, RendererContext, RendererPlugin } from '../../core/renderers';

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
          title={`Jump to ${anchor}`}
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

export const proseRendererModule: LoadedRenderer<ComponentChildren, string> = {
  render(context) {
    const text =
      typeof context.block.data === 'string'
        ? context.block.data
        : String(context.block.data ?? '');
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

export const prosePlugin: RendererPlugin<ComponentChildren, string> = {
  id: 'prose',
  label: 'Text',
  badge: 'TEXT',
  placement: 'inline',
  priority: 10,
  matches: (block) => block.kind === 'prose' || block.mimeType === 'text/plain',
  load: () => Promise.resolve(proseRendererModule),
};
