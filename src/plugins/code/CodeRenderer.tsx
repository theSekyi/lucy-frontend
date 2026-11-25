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

function tokenizeCodeLine(line: string): ComponentChildren[] {
  const out: ComponentChildren[] = [];
  let i = 0;
  let k = 0;

  while (i < line.length) {
    const rest = line.slice(i);

    if (rest.startsWith('//') || rest.startsWith('#') || rest.startsWith('--')) {
      out.push(
        <span key={k++} class="tok-comment">
          {rest}
        </span>
      );
      break;
    }

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

    const keyMatch = rest.match(/^([A-Za-z_][\w-]*)(\s*:)(?!:)/);
    if (
      keyMatch &&
      (i === 0 ||
        /^\s+$/.test(line.slice(0, i)) ||
        line[i - 1] === '{' ||
        line[i - 1] === ',')
    ) {
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

  const [localDraft, setLocalDraft] = useState<CodeSnippetData | null>(null);
  const effectiveData = context.draft ?? localDraft ?? context.block.data;
  const files = useMemo(
    () => normalizeFiles(effectiveData, context.block.filename ?? context.block.title),
    [context.block.filename, context.block.title, effectiveData]
  );

  const [activeIdx, setActiveIdx] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [wrapLines, setWrapLines] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
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

  function scheduleCopyReset() {
    if (copyTimerRef.current !== null) {
      clearTimeout(copyTimerRef.current);
    }
    copyTimerRef.current = setTimeout(() => {
      copyTimerRef.current = null;
      setCopyState('idle');
    }, 1600);
  }

  function copyActiveFile() {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      setCopyState('failed');
      scheduleCopyReset();
      return;
    }

    navigator.clipboard
      .writeText(activeFile.code)
      .then(() => {
        setCopyState('copied');
        scheduleCopyReset();
      })
      .catch(() => {
        setCopyState('failed');
        scheduleCopyReset();
      });
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

  function updateActiveFileCode(nextCode: string) {
    const nextFiles = files.map((f, idx) =>
      idx === activeIdx ? { ...f, code: nextCode } : f
    );
    const nextData: CodeSnippetData = { ...effectiveData, files: nextFiles };
    if (context.onUpdateDraft) {
      context.onUpdateDraft(nextData);
    } else {
      setLocalDraft(nextData);
    }
  }

  function commitCodeEdits() {
    const summary =
      dirtyFiles.length > 0
        ? dirtyFiles.map((f) => {
            const orig = baselineFiles.find((b) => b.filename === f.filename);
            const changedCount = f.code
              .split('\n')
              .filter((l, i) => l !== orig?.code.split('\n')[i]).length;
            return `${f.filename}: updated ${Math.max(1, changedCount)} line(s)`;
          })
        : [`Verified ${activeFile.filename}`];
    context.onCommitRevision?.({ ...effectiveData, files }, summary);
    setIsEditing(false);
    setLocalDraft(null);
  }

  const copyLabel =
    copyState === 'copied'
      ? 'Copied'
      : copyState === 'failed'
        ? 'Copy unavailable'
        : 'Copy';

  if (isInlineSingle) {
    return (
      <div class="inline-ide-card">
        <div class="inline-ide-header">
          <div class="inline-header-meta">
            <span class="ide-ext-pill">{style.ext}</span>
            <strong class="ide-inline-filename">{activeFile.filename}</strong>
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
              {copyLabel}
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
                <button
                  type="button"
                  class="ide-gutter-num"
                  aria-label={`Highlight line ${ln}`}
                  onClick={(e) => handleLineClick(ln, e.shiftKey)}
                >
                  {ln}
                </button>
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
              {isActive && <span class="ide-tab-topline" />}
              <span class="ide-ext-pill">{fStyle.ext}</span>
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
            <span class="ide-line-range-tag">
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
            {isEditing ? 'Preview' : 'Edit'}
          </button>
          <button type="button" class="ghost-pill" onClick={downloadActiveFile}>
            Download
          </button>
          <button type="button" class="ghost-pill" onClick={copyActiveFile}>
            {copyLabel}
          </button>
          <button
            type="button"
            class="primary-stage-btn"
            onClick={commitCodeEdits}
          >
            {dirtyFiles.length > 0 ? `Save (${dirtyFiles.length})` : 'Save'}
          </button>
        </div>
      </div>

      {isEditing ? (
        <textarea
          class="ide-editor-surface"
          value={activeFile.code}
          spellcheck={false}
          aria-label={`Edit ${activeFile.filename}`}
          onInput={(e) =>
            updateActiveFileCode((e.currentTarget as HTMLTextAreaElement).value)
          }
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
                <button
                  type="button"
                  class="ide-gutter-num"
                  aria-label={`Highlight line ${ln}`}
                  title="Click to highlight line (Shift+Click for range)"
                  onClick={(e) => handleLineClick(ln, e.shiftKey)}
                >
                  {ln}
                </button>
                <span class="ide-line-content">{tokenizeCodeLine(line)}</span>
              </div>
            );
          })}
        </div>
      )}

      <div class="ide-statusbar">
        <span>{style.ext} · UTF-8</span>
        <span>
          {dirtyFiles.length > 0
            ? `${dirtyFiles.length} modified`
            : `${lines.length} lines`}
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
