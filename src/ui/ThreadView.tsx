import type { ComponentChildren } from 'preact';
import type { RendererRegistry } from '../core/renderers';
import type {
  ComposerMode,
  ContentBlock,
  ModelChoice,
  TopicThread,
} from '../core/types';
import { BlockSlot } from './BlockSlot';
import { Composer } from './Composer';
import { LobeTopicAvatar } from './icons';

interface ThreadViewProps {
  readonly topic: TopicThread;
  readonly registry: RendererRegistry<ComponentChildren>;
  readonly inspectedBlockId: string | null;
  readonly isStageMaximized: boolean;
  readonly draft: string;
  readonly attachments: ReadonlyArray<ContentBlock>;
  readonly modes: ReadonlyArray<ComposerMode>;
  readonly selectedModeId: string;
  readonly models: ReadonlyArray<ModelChoice>;
  readonly selectedModelId: string;
  readonly onReturnHome: () => void;
  readonly onInspectBlock: (blockId: string | null) => void;
  readonly onToggleMaximizeStage: () => void;
  readonly onDraftChange: (value: string) => void;
  readonly onModeChange: (modeId: string) => void;
  readonly onModelChange: (modelId: string) => void;
  readonly onAttach: (block: ContentBlock) => void;
  readonly onRemoveAttachment: (blockId: string) => void;
  readonly onSubmit: () => void;
}

export function ThreadView({
  topic,
  registry,
  inspectedBlockId,
  isStageMaximized,
  draft,
  attachments,
  modes,
  selectedModeId,
  models,
  selectedModelId,
  onReturnHome,
  onInspectBlock,
  onToggleMaximizeStage,
  onDraftChange,
  onModeChange,
  onModelChange,
  onAttach,
  onRemoveAttachment,
  onSubmit,
}: ThreadViewProps) {
  const allBlocks = topic.turns.flatMap((turn) => turn.blocks);
  const stageBlocks = allBlocks.filter((b) => registry.resolve(b).placement === 'stage');
  const activeStageBlock =
    allBlocks.find((b) => b.id === inspectedBlockId) ?? null;

  return (
    <div class="thread-workspace">
      <header class="thread-topbar">
        <button type="button" class="back-home-btn" onClick={onReturnHome}>
          <span>←</span>
          <span>Home</span>
        </button>

        <h1 class="thread-topbar-title" title={topic.title}>
          {topic.title}
        </h1>

        <div class="thread-topbar-actions">
          {stageBlocks.length > 0 && !activeStageBlock && (
            <button
              type="button"
              class="ghost-pill"
              onClick={() => onInspectBlock(stageBlocks[0]!.id)}
            >
              Open {stageBlocks[0]!.filename ?? 'Artifact'}
            </button>
          )}
        </div>
      </header>

      <div class={`thread-split-layout ${activeStageBlock ? 'has-stage' : ''}`}>
        {!isStageMaximized && (
          <section class="thread-conversation-pane" aria-label="Conversation">
            <div class="thread-turns-scroll">
              <div class="thread-turns-column">
                {topic.turns.map((turn) => (
                  <article
                    key={turn.id}
                    class={`turn-item is-${turn.role} status-${turn.status}`}
                  >
                    {turn.role === 'assistant' && (
                      <div class="turn-author-row">
                        <LobeTopicAvatar size={20} />
                        <span class="turn-author-name">Lucy</span>
                        <span class="turn-time">{turn.createdAt}</span>
                        {turn.status === 'queued-offline' && (
                          <span class="turn-status-pill">Queued offline</span>
                        )}
                      </div>
                    )}

                    <div class="turn-blocks">
                      {turn.blocks.map((block) => {
                        const plugin = registry.resolve(block);
                        const renderCompact = plugin.placement === 'stage';
                        return (
                          <BlockSlot
                            key={block.id}
                            block={block}
                            registry={registry}
                            isCompact={renderCompact}
                            onInspect={(id) => onInspectBlock(id)}
                          />
                        );
                      })}
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div class="thread-composer-dock">
              <div class="thread-turns-column">
                <Composer
                  compact
                  placeholder="Reply, ask a follow-up, or drop an .xlsx / .csv file…"
                  draft={draft}
                  attachments={attachments}
                  modes={modes}
                  selectedModeId={selectedModeId}
                  models={models}
                  selectedModelId={selectedModelId}
                  onDraftChange={onDraftChange}
                  onModeChange={onModeChange}
                  onModelChange={onModelChange}
                  onAttach={onAttach}
                  onRemoveAttachment={onRemoveAttachment}
                  onSubmit={onSubmit}
                />
              </div>
            </div>
          </section>
        )}

        {activeStageBlock && (
          <aside class="artifact-stage-pane" aria-label="Artifact inspector">
            <div class="artifact-stage-header">
              <div class="artifact-stage-title-group">
                <span class="artifact-badge badge-xlsx">
                  {registry.resolve(activeStageBlock).badge}
                </span>
                <strong class="artifact-stage-title">
                  {activeStageBlock.filename ?? activeStageBlock.title ?? 'Artifact'}
                </strong>
              </div>

              <div class="artifact-stage-controls">
                <button
                  type="button"
                  class="ghost-pill"
                  onClick={onToggleMaximizeStage}
                >
                  {isStageMaximized ? 'Split view' : 'Expand'}
                </button>
                <button
                  type="button"
                  class="icon-action-btn"
                  aria-label="Close artifact stage"
                  onClick={() => onInspectBlock(null)}
                >
                  ×
                </button>
              </div>
            </div>

            <div class="artifact-stage-body">
              <BlockSlot
                block={activeStageBlock}
                registry={registry}
                isCompact={false}
              />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
