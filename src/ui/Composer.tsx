import { useEffect, useRef, useState } from 'preact/hooks';
import { SAMPLE_FINANCIAL_WORKBOOK } from '../core/seed';
import type { ComposerMode, ContentBlock, ModelChoice } from '../core/types';
import { AgentLoopIcon, SendArrowIcon } from './icons';

type OpenComposerMenu = 'mode' | 'attach' | 'model' | null;

interface ComposerProps {
  readonly draft: string;
  readonly attachments: ReadonlyArray<ContentBlock>;
  readonly modes: ReadonlyArray<ComposerMode>;
  readonly selectedModeId: string;
  readonly models: ReadonlyArray<ModelChoice>;
  readonly selectedModelId: string;
  readonly placeholder?: string;
  readonly compact?: boolean;
  readonly onDraftChange: (value: string) => void;
  readonly onModeChange: (modeId: string) => void;
  readonly onModelChange: (modelId: string) => void;
  readonly onAttach: (block: ContentBlock) => void;
  readonly onRemoveAttachment: (blockId: string) => void;
  readonly onSubmit: () => void;
}

export function Composer({
  draft,
  attachments,
  modes,
  selectedModeId,
  models,
  selectedModelId,
  placeholder = 'Ask, create, or start a task',
  compact = false,
  onDraftChange,
  onModeChange,
  onModelChange,
  onAttach,
  onRemoveAttachment,
  onSubmit,
}: ComposerProps) {
  const [openMenu, setOpenMenu] = useState<OpenComposerMenu>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeMode = modes.find((m) => m.id === selectedModeId) ?? modes[0]!;
  const activeModel = models.find((m) => m.id === selectedModelId) ?? models[0]!;

  useEffect(() => {
    if (!openMenu) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setOpenMenu(null);
      }
    }

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [openMenu]);

  async function ingestFile(file: File) {
    const { parseSpreadsheetFile } = await import('../plugins/spreadsheet/parser');
    const workbook = await parseSpreadsheetFile(file);
    const totalRows = workbook.sheets.reduce((sum, s) => sum + s.rows.length, 0);

    onAttach({
      id: `upload-${Date.now()}`,
      kind: 'spreadsheet',
      title: file.name.replace(/\.[^.]+$/, ''),
      filename: file.name,
      mimeType: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      summary: `${workbook.sheets.length} sheet${workbook.sheets.length === 1 ? '' : 's'} · ${totalRows} rows imported locally`,
      data: workbook,
    });
    setOpenMenu(null);
  }

  function attachSampleExcel() {
    onAttach({
      id: `sample-xlsx-${Date.now()}`,
      kind: 'spreadsheet',
      title: 'Q4 Revenue & Regional Model',
      filename: 'Q4_Revenue_Model.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      summary: '2 sheets · Q4 Forecast ($1.64M net) & Region Breakdown',
      data: SAMPLE_FINANCIAL_WORKBOOK,
    });
    setOpenMenu(null);
  }

  function toggleMenu(target: Exclude<OpenComposerMenu, null>) {
    setOpenMenu((current) => (current === target ? null : target));
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
        if (file) void ingestFile(file);
      }}
    >
      {attachments.length > 0 && (
        <div class="composer-attachments">
          {attachments.map((item) => (
            <span key={item.id} class="attachment-chip">
              <span class="artifact-badge badge-xlsx">XLSX</span>
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
              class="composer-chip-btn"
              aria-haspopup="listbox"
              aria-expanded={openMenu === 'mode'}
              onClick={() => toggleMenu('mode')}
            >
              <AgentLoopIcon />
              <span>{activeMode.label}</span>
              <span class="chevron-glyph">⌄</span>
            </button>

            {openMenu === 'mode' && (
              <div class={`dropdown-popover align-left ${compact ? 'opens-up' : 'opens-down'}`} role="listbox" aria-label="Assistant mode">
                {modes.map((mode) => {
                  const selected = mode.id === activeMode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      class={`popover-item ${selected ? 'is-selected' : ''}`}
                      onClick={() => {
                        onModeChange(mode.id);
                        setOpenMenu(null);
                      }}
                    >
                      <span>{mode.label}</span>
                      {selected && <span class="popover-check">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div class="menu-anchor">
            <button
              type="button"
              class="composer-plus-btn"
              aria-label="Attach spreadsheet or file"
              aria-haspopup="menu"
              aria-expanded={openMenu === 'attach'}
              onClick={() => toggleMenu('attach')}
            >
              +
            </button>

            {openMenu === 'attach' && (
              <div class={`dropdown-popover align-left is-wide ${compact ? 'opens-up' : 'opens-down'}`} role="menu">
                <button
                  type="button"
                  role="menuitem"
                  class="popover-item"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <span>Upload Excel / CSV (.xlsx, .csv)</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  class="popover-item"
                  onClick={attachSampleExcel}
                >
                  <span>Attach sample Q4 Excel model</span>
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.csv,.tsv"
              hidden
              onChange={(e) => {
                const file = (e.currentTarget as HTMLInputElement).files?.[0];
                if (file) void ingestFile(file);
                (e.currentTarget as HTMLInputElement).value = '';
              }}
            />
          </div>
        </div>

        <div class="composer-tools-right">
          <div class="menu-anchor model-menu-anchor">
            <button
              type="button"
              class="composer-model-btn"
              aria-haspopup="listbox"
              aria-expanded={openMenu === 'model'}
              onClick={() => toggleMenu('model')}
            >
              <span class="model-family">{activeModel.family}</span>
              <span class="model-tier">{activeModel.tier}</span>
              <span class="chevron-glyph">⌄</span>
            </button>

            {openMenu === 'model' && (
              <div class={`dropdown-popover align-right is-model-list ${compact ? 'opens-up' : 'opens-down'}`} role="listbox" aria-label="Select model">
                {models.map((model) => {
                  const selected = model.id === activeModel.id;
                  return (
                    <button
                      key={model.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      class={`popover-item ${selected ? 'is-selected' : ''}`}
                      onClick={() => {
                        onModelChange(model.id);
                        setOpenMenu(null);
                      }}
                    >
                      <span class="popover-model-label">
                        <span>{model.family}</span>
                        <span class="popover-tier-badge">{model.tier}</span>
                      </span>
                      {selected && <span class="popover-check">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button
            type="button"
            class="composer-send-btn"
            aria-label="Send message"
            onClick={onSubmit}
          >
            <SendArrowIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
