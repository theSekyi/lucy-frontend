import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { LoadedRenderer, RendererContext } from '../../core/renderers';
import type { CodeFileEntry, CodeSnippetData } from '../../core/types';
import './code.css';

interface ExtStyle {
  readonly ext: string;
  readonly color: string;
  readonly bg: string;
}

const EXT_THEME: Readonly<Record<string, ExtStyle>> = {
  ts: { ext: 'TS', color: '#60a5fa', bg: 'rgba(59, 130, 246, 0.18)' },
  tsx: { ext: 'TSX', color: '#38bdf8', bg: 'rgba(14, 165, 233, 0.18)' },
  typescript: { ext: 'TS', color: '#60a5fa', bg: 'rgba(59, 130, 246, 0.18)' },
  js: { ext: 'JS', color: '#facc15', bg: 'rgba(234, 179, 8, 0.18)' },
  jsx: { ext: 'JSX', color: '#fde047', bg: 'rgba(234, 179, 8, 0.18)' },
  javascript: { ext: 'JS', color: '#facc15', bg: 'rgba(234, 179, 8, 0.18)' },
  py: { ext: 'PY', color: '#34d399', bg: 'rgba(16, 185, 129, 0.18)' },
  python: { ext: 'PY', color: '#34d399', bg: 'rgba(16, 185, 129, 0.18)' },
  sql: { ext: 'SQL', color: '#22d3ee', bg: 'rgba(6, 182, 212, 0.18)' },
  rs: { ext: 'RS', color: '#fb923c', bg: 'rgba(249, 115, 22, 0.18)' },
  rust: { ext: 'RS', color: '#fb923c', bg: 'rgba(249, 115, 22, 0.18)' },
  go: { ext: 'GO', color: '#2dd4bf', bg: 'rgba(20, 184, 166, 0.18)' },
  json: { ext: 'JSON', color: '#c084fc', bg: 'rgba(168, 85, 247, 0.18)' },
  yaml: { ext: 'YAML', color: '#e879f9', bg: 'rgba(217, 70, 239, 0.18)' },
  yml: { ext: 'YML', color: '#e879f9', bg: 'rgba(217, 70, 239, 0.18)' },
  css: { ext: 'CSS', color: '#f472b6', bg: 'rgba(236, 72, 153, 0.18)' },
  html: { ext: 'HTML', color: '#fb7185', bg: 'rgba(244, 63, 94, 0.18)' },
  sh: { ext: 'SH', color: '#4ade80', bg: 'rgba(34, 197, 94, 0.18)' },
  bash: { ext: 'SH', color: '#4ade80', bg: 'rgba(34, 197, 94, 0.18)' },
};

function getExtStyle(filename: string, language?: string): ExtStyle {
  const dotExt = filename.includes('.') ? filename.split('.').pop()!.toLowerCase() : '';
  return (
    EXT_THEME[dotExt] ??
    EXT_THEME[(language ?? '').toLowerCase()] ?? {
      ext: (dotExt || language || 'CODE').slice(0, 4).toUpperCase(),
      color: '#94a3b8',
      bg: 'rgba(148, 163, 184, 0.16)',
    }
  );
}

const KEYWORDS = new Set([
  'export', 'import', 'from', 'function', 'return', 'const', 'let', 'var',
  'async', 'await', 'if', 'else', 'for', 'while', 'switch', 'case', 'default',
  'def', 'class', 'and', 'or', 'not', 'in', 'elif', 'None',
  'SELECT', 'FROM', 'WHERE', 'GROUP', 'BY', 'ORDER', 'ASC', 'DESC', 'LIMIT', 'AS', 'AND', 'OR', 'JOIN', 'ON',
  'type', 'interface', 'readonly', 'extends', 'implements', 'new', 'throw', 'try', 'catch',
]);

const TYPES_AND_BUILTINS = new Set([
  'number', 'string', 'boolean', 'void', 'unknown', 'any', 'never',
  'int', 'float', 'bool', 'str', 'dict', 'list',
  'Math', 'Promise', 'Array', 'Map', 'Set', 'Object', 'Readonly', 'ReadonlyArray',
]);

/**
 * Single-pass zero-dependency lexical highlighter covering TS/JS, Python, SQL, YAML/JSON, Go, and Rust.
 */
function tokenizeCodeLine(line: string): ComponentChildren[] {
  const out: ComponentChildren[] = [];
  let i = 0;
  let k = 0;

  while (i < line.length) {
    const rest = line.slice(i);

    // 1. Line comments (//, #, --)
    if (rest.startsWith('//') || rest.startsWith('#') || rest.startsWith('--')) {
      out.push(
        <span key={k++} class="tok-comment">
          {rest}
        </span>
      );
      break;
    }

    // 2. Quoted strings
    const strMatch = rest.match(/^(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)/);
    if (strMatch) {
      out.push(
        <span key={k++} class="tok-string">
          {strMatch[0]}
        </span>
      );
      i += strMatch[0].length;
      continue;
    }

    // 3. YAML / Object property keys (identifier followed immediately by colon)
    const keyMatch = rest.match(/^([A-Za-z_][\w-]*)(\s*:)(?!:)/);
    if (keyMatch && (i === 0 || /^\s+$/.test(line.slice(0, i)) || line[i - 1] === '{' || line[i - 1] === ',')) {
      out.push(
        <span key={k++} class="tok-key">
          {keyMatch[1]}
        </span>
      );
      out.push(
        <span key={k++} class="tok-punct">
          {keyMatch[2]}
        </span>
      );
      i += keyMatch[0].length;
      continue;
    }

    // 4. Numbers & boolean literals
    const numMatch = rest.match(/^(?:\b\d+(?:\.\d+)?\b|\b(?:true|false|True|False|null)\b)/);
    if (numMatch) {
      out.push(
        <span key={k++} class="tok-num">
          {numMatch[0]}
        </span>
      );
      i += numMatch[0].length;
      continue;
    }

    // 5. Identifiers, Keywords, Types, Function calls
    const idMatch = rest.match(/^[A-Za-z_$][\w$]*/);
    if (idMatch) {
      const word = idMatch[0];
      const nextChar = rest[word.length];
      if (KEYWORDS.has(word)) {
        out.push(
          <span key={k++} class="tok-keyword">
            {word}
          </span>
        );
      } else if (TYPES_AND_BUILTINS.has(word) || /^[A-Z][A-Za-z0-9]+$/.test(word)) {
        out.push(
          <span key={k++} class="tok-type">
            {word}
          </span>
        );
      } else if (nextChar === '(') {
        out.push(
          <span key={k++} class="tok-fn">
            {word}
          </span>
        );
      } else {
        out.push(word);
      }
      i += word.length;
      continue;
    }

    // 6. Operators & brackets
    const punctMatch = rest.match(/^[{}()[\].,:;=>+\-*/%&|<>!?]+/);
    if (punctMatch) {
      out.push(
        <span key={k++} class="tok-punct">
          {punctMatch[0]}
        </span>
      );
      i += punctMatch[0].length;
      continue;
    }

    // 7. Whitespace / plain text
    const wsMatch = rest.match(/^\s+/);
    const chunk = wsMatch ? wsMatch[0] : rest[0]!;
    out.push(chunk);
    i += chunk.length;
  }

  return out;
}

function normalizeFiles(data: CodeSnippetData, fallbackTitle?: string): CodeFileEntry[] {
  if (data.files && data.files.length > 0) return [...data.files];
  return [
    {
      filename: fallbackTitle ?? `snippet.${data.language ?? 'ts'}`,
      filepath: data.filepath,
      language: data.language ?? 'typescript',
      code: data.code ?? '',
    },
  ];
}

function CodeWorkbenchView({ context }: { context: RendererContext<CodeSnippetData> }) {
  const baselineFiles = useMemo(
    () => normalizeFiles(context.block.data, context.block.filename ?? context.block.title),
    [context.block.data, context.block.filename, context.block.title]
  );

  const [files, setFiles] = useState<CodeFileEntry[]>(() => baselineFiles);
  const [activeIdx, setActiveIdx] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [wrapLines, setWrapLines] = useState(false);
  const [copied, setCopied] = useState(false);
  const [synced, setSynced] = useState(false);
  const [lineRange, setLineRange] = useState<{ start: number; end: number } | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const activeFile = files[activeIdx] ?? files[0]!;
  const origFile = baselineFiles[activeIdx] ?? baselineFiles[0]!;
  const origLines = origFile.code.split('\n');
  const lines = activeFile.code.split('\n');
  const style = getExtStyle(activeFile.filename, activeFile.language);

  const dirtyFiles = files.filter((f, idx) => f.code !== baselineFiles[idx]?.code);
  const isInlineSingle = baselineFiles.length === 1 && !context.onCommitRevision;

  function handleLineClick(lineNum: number, shiftKey: boolean) {
    setLineRange((prev) => {
      if (shiftKey && prev) {
        return { start: Math.min(prev.start, lineNum), end: Math.max(prev.start, lineNum) };
      }
      if (prev && prev.start === lineNum && prev.end === lineNum) return null;
      return { start: lineNum, end: lineNum };
    });
  }

  function copyActiveFile() {
    navigator.clipboard?.writeText(activeFile.code);
    setCopied(true);
    if (copyTimerRef.current !== null) {
      clearTimeout(copyTimerRef.current);
    }
    copyTimerRef.current = setTimeout(() => {
      copyTimerRef.current = null;
      setCopied(false);
    }, 1300);
  }

  function downloadActiveFile() {
    const blob = new Blob([activeFile.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFile.filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function syncCodeEditsToLucy() {
    if (dirtyFiles.length === 0) return;
    const summary = dirtyFiles.map((f) => {
      const orig = baselineFiles.find((b) => b.filename === f.filename);
      const changedCount = f.code
        .split('\n')
        .filter((l, i) => l !== orig?.code.split('\n')[i]).length;
      return `${f.filename}: updated ${Math.max(1, changedCount)} line(s)`;
    });
    context.onCommitRevision?.({ ...context.block.data, files }, summary);
    setIsEditing(false);
    setSynced(true);
  }

  if (isInlineSingle) {
    return (
      <div class="inline-ide-card" style={{ borderLeft: `3px solid ${style.color}` }}>
        <div class="inline-ide-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <span class="ide-ext-pill" style={{ background: style.bg, color: style.color }}>
              {style.ext}
            </span>
            <strong
              style={{
                fontSize: '12px',
                color: '#e4e4e7',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {activeFile.filename}
            </strong>
          </div>

          <div class="ide-actions">
            <button
              type="button"
              class="ghost-pill"
              onClick={() => setWrapLines((w) => !w)}
            >
              {wrapLines ? 'Unwrap' : 'Wrap'}
            </button>
            <button type="button" class="ghost-pill" onClick={copyActiveFile}>
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>

        <div class={`ide-viewport ${wrapLines ? 'is-wrapped' : ''}`}>
          {lines.map((line, idx) => {
            const ln = idx + 1;
            const highlighted =
              lineRange !== null && ln >= lineRange.start && ln <= lineRange.end;
            return (
              <div
                key={idx}
                class={`ide-code-line ${highlighted ? 'is-highlighted' : ''}`}
              >
                <span
                  class="ide-gutter-num"
                  onClick={(e) => handleLineClick(ln, e.shiftKey)}
                >
                  {ln}
                </span>
                <span class="ide-line-content">{tokenizeCodeLine(line)}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div class="ide-stage-shell">
      <div class="ide-tabs-rail" role="tablist" aria-label="Source files">
        {files.map((file, idx) => {
          const fStyle = getExtStyle(file.filename, file.language);
          const isActive = idx === activeIdx;
          const isDirty = file.code !== baselineFiles[idx]?.code;

          return (
            <button
              key={file.filename}
              type="button"
              role="tab"
              aria-selected={isActive}
              class={`ide-file-tab ${isActive ? 'is-active' : ''}`}
              onClick={() => {
                setActiveIdx(idx);
                setLineRange(null);
              }}
            >
              {isActive && (
                <span class="ide-tab-topline" style={{ background: fStyle.color }} />
              )}
              <span
                class="ide-ext-pill"
                style={{ background: fStyle.bg, color: fStyle.color }}
              >
                {fStyle.ext}
              </span>
              <span>{file.filename}</span>
              {isDirty && <span class="ide-dirty-dot" title="Unsaved local edits" />}
            </button>
          );
        })}
      </div>

      <div class="ide-toolbar">
        <span class="ide-filepath">
          {activeFile.filepath ?? `src/${activeFile.filename}`}
          {lineRange && (
            <span style={{ color: '#60a5fa', marginLeft: '8px' }}>
              · L{lineRange.start}
              {lineRange.end > lineRange.start ? `–L${lineRange.end}` : ''}
            </span>
          )}
        </span>

        <div class="ide-actions">
          <button
            type="button"
            class="ghost-pill"
            onClick={() => setWrapLines((w) => !w)}
          >
            {wrapLines ? 'Unwrap' : 'Wrap'}
          </button>
          <button
            type="button"
            class="ghost-pill"
            onClick={() => setIsEditing((e) => !e)}
          >
            {isEditing ? 'Done Editing' : 'Edit'}
          </button>
          {dirtyFiles.length > 0 && (
            <button
              type="button"
              class="primary-stage-btn"
              onClick={syncCodeEditsToLucy}
            >
              Apply edits ({dirtyFiles.length})
            </button>
          )}
          {dirtyFiles.length === 0 && synced && (
            <span class="cell-pill tone-good">✓ Saved</span>
          )}
          <button type="button" class="ghost-pill" onClick={downloadActiveFile}>
            Download
          </button>
          <button type="button" class="ghost-pill" onClick={copyActiveFile}>
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {isEditing ? (
        <textarea
          class="ide-editor-surface"
          value={activeFile.code}
          spellcheck={false}
          aria-label={`Edit ${activeFile.filename}`}
          onInput={(e) => {
            const nextCode = (e.currentTarget as HTMLTextAreaElement).value;
            setSynced(false);
            setFiles((prev) =>
              prev.map((f, idx) => (idx === activeIdx ? { ...f, code: nextCode } : f))
            );
          }}
        />
      ) : (
        <div class={`ide-viewport ${wrapLines ? 'is-wrapped' : ''}`}>
          {lines.map((line, idx) => {
            const ln = idx + 1;
            const highlighted =
              lineRange !== null && ln >= lineRange.start && ln <= lineRange.end;
            const changedFromBaseline = line !== origLines[idx];

            return (
              <div
                key={idx}
                class={[
                  'ide-code-line',
                  highlighted ? 'is-highlighted' : '',
                  !highlighted && changedFromBaseline ? 'is-diff-changed' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <span
                  class="ide-gutter-num"
                  title="Click to highlight line (Shift+Click for range)"
                  onClick={(e) => handleLineClick(ln, e.shiftKey)}
                >
                  {ln}
                </span>
                <span class="ide-line-content">{tokenizeCodeLine(line)}</span>
              </div>
            );
          })}
        </div>
      )}

      <div class="ide-statusbar">
        <span>
          <span style={{ color: style.color, fontWeight: 600 }}>{style.ext}</span> · UTF-8 · Click gutter numbers to highlight lines
        </span>
        <span>
          {dirtyFiles.length > 0
            ? `${dirtyFiles.length} modified file(s)`
            : 'Clean working tree'}
        </span>
      </div>
    </div>
  );
}

export const codeRendererModule: LoadedRenderer<ComponentChildren, CodeSnippetData> = {
  render(context) {
    return <CodeWorkbenchView context={context} />;
  },
};
