import { useState } from 'preact/hooks';
import type { LoadedRenderer } from '../../core/renderers';
import type { CodeSnippetData } from '../../core/types';

function CodeSnippetBlock({ data, title }: { data: CodeSnippetData; title?: string }) {
  const [copied, setCopied] = useState(false);

  function copyCode() {
    navigator.clipboard?.writeText(data.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div class="code-block-card">
      <div class="code-block-header">
        <span>{title ?? data.language}</span>
        <button type="button" class="ghost-pill" onClick={copyCode}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre class="code-block-pre">
        <code>{data.code}</code>
      </pre>
    </div>
  );
}

export const codeRendererModule: LoadedRenderer<preact.ComponentChildren, CodeSnippetData> = {
  render({ block }) {
    return <CodeSnippetBlock data={block.data} title={block.title} />;
  },
};
