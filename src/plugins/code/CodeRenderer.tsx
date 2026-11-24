import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import type { LoadedRenderer } from '../../core/renderers';
import type { CodeSnippetData } from '../../core/types';

interface LanguageTheme {
  readonly badge: string;
  readonly label: string;
  readonly color: string;
  readonly tint: string;
}

const EXTENSION_PALETTE: Readonly<Record<string, LanguageTheme>> = {
  ts: { badge: '.TS', label: 'TypeScript', color: '#60a5fa', tint: 'rgba(59, 130, 246, 0.2)' },
  tsx: { badge: '.TSX', label: 'TypeScript JSX', color: '#38bdf8', tint: 'rgba(14, 165, 233, 0.2)' },
  typescript: { badge: '.TS', label: 'TypeScript', color: '#60a5fa', tint: 'rgba(59, 130, 246, 0.2)' },
  js: { badge: '.JS', label: 'JavaScript', color: '#facc15', tint: 'rgba(234, 179, 8, 0.2)' },
  javascript: { badge: '.JS', label: 'JavaScript', color: '#facc15', tint: 'rgba(234, 179, 8, 0.2)' },
  py: { badge: '.PY', label: 'Python', color: '#34d399', tint: 'rgba(16, 185, 129, 0.2)' },
  python: { badge: '.PY', label: 'Python', color: '#34d399', tint: 'rgba(16, 185, 129, 0.2)' },
  sql: { badge: '.SQL', label: 'SQL', color: '#22d3ee', tint: 'rgba(6, 182, 212, 0.2)' },
  rs: { badge: '.RS', label: 'Rust', color: '#fb923c', tint: 'rgba(249, 115, 22, 0.2)' },
  rust: { badge: '.RS', label: 'Rust', color: '#fb923c', tint: 'rgba(249, 115, 22, 0.2)' },
  go: { badge: '.GO', label: 'Go', color: '#2dd4bf', tint: 'rgba(20, 184, 166, 0.2)' },
  json: { badge: '.JSON', label: 'JSON', color: '#c084fc', tint: 'rgba(168, 85, 247, 0.2)' },
  yaml: { badge: '.YAML', label: 'YAML', color: '#e879f9', tint: 'rgba(217, 70, 239, 0.2)' },
  yml: { badge: '.YML', label: 'YAML', color: '#e879f9', tint: 'rgba(217, 70, 239, 0.2)' },
  css: { badge: '.CSS', label: 'CSS', color: '#f472b6', tint: 'rgba(236, 72, 153, 0.2)' },
  sh: { badge: '.SH', label: 'Shell', color: '#4ade80', tint: 'rgba(34, 197, 94, 0.2)' },
  bash: { badge: '.SH', label: 'Bash', color: '#4ade80', tint: 'rgba(34, 197, 94, 0.2)' },
};

function resolveLanguageTheme(language: string, title?: string): LanguageTheme {
  const extFromTitle = title?.split('.').pop()?.toLowerCase() ?? '';
  return (
    EXTENSION_PALETTE[extFromTitle] ??
    EXTENSION_PALETTE[language.toLowerCase()] ?? {
      badge: `.${(extFromTitle || language || 'CODE').slice(0, 4).toUpperCase()}`,
      label: language || 'Code',
      color: '#a1a1aa',
      tint: 'rgba(255, 255, 255, 0.1)',
    }
  );
}

const TOKEN_REGEX =
  /(\/\/.*$|#.*$|--.*$|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:export|import|from|function|return|const|let|var|async|await|if|else|for|while|def|class|SELECT|FROM|WHERE|GROUP|BY|ORDER|ROUND|SUM|AVG|AND|AS|type|interface|readonly|true|false|null)\b|\b\d+(?:\.\d+)?\b)/gm;

function highlightLine(line: string): ComponentChildren[] {
  const parts = line.split(TOKEN_REGEX);
  return parts.map((part, idx) => {
    if (!part) return null;
    if (/^(\/\/|#|--)/.test(part)) {
      return (
        <span key={idx} style={{ color: '#6b7280', fontStyle: 'italic' }}>
          {part}
        </span>
      );
    }
    if (/^["'`]/.test(part)) {
      return (
        <span key={idx} style={{ color: '#86efac' }}>
          {part}
        </span>
      );
    }
    if (/^\d/.test(part)) {
      return (
        <span key={idx} style={{ color: '#fcd34d' }}>
          {part}
        </span>
      );
    }
    if (TOKEN_REGEX.test(part)) {
      TOKEN_REGEX.lastIndex = 0;
      return (
        <span key={idx} style={{ color: '#93c5fd', fontWeight: 500 }}>
          {part}
        </span>
      );
    }
    return part;
  });
}

function CodeSnippetBlock({ data, title }: { data: CodeSnippetData; title?: string }) {
  const [copied, setCopied] = useState(false);
  const theme = resolveLanguageTheme(data.language, title);
  const lines = data.code.split('\n');

  function copyCode() {
    navigator.clipboard?.writeText(data.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div
      class="code-block-card"
      style={{ borderLeft: `3px solid ${theme.color}` }}
    >
      <div class="code-block-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            class="artifact-badge"
            style={{ background: theme.tint, color: theme.color }}
          >
            {theme.badge}
          </span>
          <strong style={{ color: '#e4e4e7', fontSize: '12px' }}>
            {title ?? theme.label}
          </strong>
          <span style={{ color: '#6e6e77', fontSize: '11px' }}>
            {theme.label} · {lines.length} lines
          </span>
        </div>

        <button type="button" class="ghost-pill" onClick={copyCode}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>

      <pre class="code-block-pre">
        <code>
          {lines.map((line, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '14px' }}>
              <span
                style={{
                  width: '22px',
                  textAlign: 'right',
                  color: '#52525b',
                  userSelect: 'none',
                  flexShrink: 0,
                }}
              >
                {idx + 1}
              </span>
              <span style={{ flex: 1 }}>{highlightLine(line)}</span>
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
}

export const codeRendererModule: LoadedRenderer<ComponentChildren, CodeSnippetData> = {
  render({ block }) {
    return <CodeSnippetBlock data={block.data} title={block.title} />;
  },
};
