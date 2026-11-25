import type { ComponentChildren } from 'preact';
import { Fragment } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { PluginCategory, RendererPlugin, RendererRegistry } from '../core/renderers';
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

const CATEGORY_ORDER: ReadonlyArray<{
  readonly key: PluginCategory;
  readonly label: string;
}> = [
  { key: 'accounting', label: 'Accounting & Audit' },
  { key: 'documents', label: 'Contracts & Packs' },
  { key: 'data', label: 'Data & Models' },
];

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
  const plusBtnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const samplePlugins = (registry?.listPlugins() ?? []).filter((p) => p.sampleMenuLabel);

  useEffect(() => {
    if (!isAttachOpen) return;

    const firstItem = menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]');
    firstItem?.focus();

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsAttachOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setIsAttachOpen(false);
        plusBtnRef.current?.focus();
      }
    }

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isAttachOpen]);

  function handleMenuKeyDown(event: KeyboardEvent) {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []
    );
    if (items.length === 0) return;
    const currentIdx = items.indexOf(document.activeElement as HTMLButtonElement);

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const next = currentIdx < 0 ? 0 : (currentIdx + 1) % items.length;
      items[next]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prev = currentIdx <= 0 ? items.length - 1 : currentIdx - 1;
      items[prev]?.focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      items[0]?.focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      items[items.length - 1]?.focus();
    }
  }

  function handleFileChosen(file: File) {
    setIsAttachOpen(false);
    onIngestFile?.(file);
  }

  const groupedPlugins: ReadonlyArray<{
    readonly key: PluginCategory;
    readonly label: string;
    readonly items: ReadonlyArray<RendererPlugin<ComponentChildren>>;
  }> = CATEGORY_ORDER.map((group) => ({
    ...group,
    items: samplePlugins.filter((p) => (p.category ?? 'accounting') === group.key),
  })).filter((g) => g.items.length > 0);

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
                aria-label={`Remove attachment ${item.filename ?? item.title ?? ''}`}
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
              ref={plusBtnRef}
              type="button"
              class="composer-plus-btn"
              aria-label="Import file or open new workpaper"
              aria-haspopup="menu"
              aria-expanded={isAttachOpen}
              onClick={() => setIsAttachOpen((v) => !v)}
            >
              +
            </button>

            {isAttachOpen && (
              <div
                ref={menuRef}
                class={`dropdown-popover align-left is-enterprise-menu ${compact ? 'opens-up' : 'opens-down'}`}
                role="menu"
                aria-label="Workpaper templates and spreadsheet import"
                onKeyDown={handleMenuKeyDown}
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

                {groupedPlugins.map((group) => (
                  <Fragment key={group.key}>
                    <div class="popover-divider" />
                    <div class="popover-group-heading" role="presentation">
                      {group.label}
                    </div>
                    {group.items.map((plugin) => (
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
                  </Fragment>
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
            aria-label="Submit prompt"
            onClick={onSubmit}
          >
            <SendArrowIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
