import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { RendererRegistry } from '../core/renderers';
import type { ContentBlock } from '../core/types';
import { SendArrowIcon } from './icons';

interface ComposerProps {
  readonly draft: string;
  readonly attachments: ReadonlyArray<ContentBlock>;
  readonly registry?: RendererRegistry<ComponentChildren>;
  readonly placeholder?: string;
  readonly compact?: boolean;
  readonly onDraftChange: (value: string) => void;
  readonly onIngestFile?: (file: File) => void;
  readonly onRemoveAttachment: (blockId: string) => void;
  readonly onLaunchPluginSample?: (pluginId: string) => void;
  readonly onSubmit: () => void;
}

export function Composer({
  draft,
  attachments,
  registry,
  placeholder = 'Open a workpaper, reconcile accounts, or drop an .xlsx / .csv file…',
  compact = false,
  onDraftChange,
  onIngestFile,
  onRemoveAttachment,
  onLaunchPluginSample,
  onSubmit,
}: ComposerProps) {
  const [isAttachOpen, setIsAttachOpen] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const samplePlugins = (registry?.listPlugins() ?? []).filter((p) => p.sampleMenuLabel);

  useEffect(() => {
    if (!isAttachOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsAttachOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setIsAttachOpen(false);
      }
    }

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isAttachOpen]);

  function handleFileChosen(file: File) {
    setIsAttachOpen(false);
    onIngestFile?.(file);
  }

  return (
    <div
      ref={rootRef}
      class={`composer-card ${compact ? 'is-compact' : ''} ${isDraggingFile ? 'is-drop-target' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingFile(true);
      }}
      onDragLeave={() => setIsDraggingFile(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingFile(false);
        const file = e.dataTransfer?.files?.[0];
        if (file) handleFileChosen(file);
      }}
    >
      {attachments.length > 0 && (
        <div class="composer-attachments">
          {attachments.map((item) => (
            <span key={item.id} class="attachment-chip">
              <span class="artifact-badge accent-emerald">FILE</span>
              <span>{item.filename ?? item.title}</span>
              <button
                type="button"
                class="attachment-remove"
                aria-label="Remove attachment"
                onClick={() => onRemoveAttachment(item.id)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <textarea
        class="composer-textarea"
        rows={compact ? 2 : 3}
        placeholder={placeholder}
        value={draft}
        aria-label={placeholder}
        onInput={(e) => onDraftChange((e.currentTarget as HTMLTextAreaElement).value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSubmit();
          }
        }}
      />

      <div class="composer-toolbar">
        <div class="composer-tools-left">
          <div class="menu-anchor">
            <button
              type="button"
              class="composer-plus-btn"
              aria-label="Import file or open workpaper"
              aria-haspopup="menu"
              aria-expanded={isAttachOpen}
              onClick={() => setIsAttachOpen((v) => !v)}
            >
              +
            </button>

            {isAttachOpen && (
              <div
                class={`dropdown-popover align-left is-enterprise-menu ${compact ? 'opens-up' : 'opens-down'}`}
                role="menu"
              >
                <button
                  type="button"
                  role="menuitem"
                  class="popover-item"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <span>Import .xlsx / .csv file…</span>
                  <span class="popover-tier-badge">Local</span>
                </button>

                {samplePlugins.length > 0 && <div class="popover-divider" />}

                {samplePlugins.map((plugin) => (
                  <button
                    key={plugin.id}
                    type="button"
                    role="menuitem"
                    class="popover-item"
                    onClick={() => {
                      setIsAttachOpen(false);
                      onLaunchPluginSample?.(plugin.id);
                    }}
                  >
                    <span>{plugin.sampleMenuLabel}</span>
                    <span class={`artifact-badge accent-${plugin.accent ?? 'neutral'}`}>
                      {plugin.badge}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.csv,.tsv"
              hidden
              onChange={(e) => {
                const file = (e.currentTarget as HTMLInputElement).files?.[0];
                if (file) handleFileChosen(file);
                (e.currentTarget as HTMLInputElement).value = '';
              }}
            />
          </div>
          <span class="composer-hint-text">Workpapers · .xlsx / .csv</span>
        </div>

        <div class="composer-tools-right">
          <button
            type="button"
            class="composer-send-btn"
            aria-label="Submit"
            onClick={onSubmit}
          >
            <SendArrowIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
