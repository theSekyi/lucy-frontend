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
import { LucyMark } from './icons';

interface ThreadViewProps {
  readonly topic: TopicThread;
  readonly registry: RendererRegistry<ComponentChildren>;
  readonly inspectedBlockId: string | null;
  readonly inspectedAnchor: string | null;
  readonly anchorPulse: number;
  readonly isStageMaximized: boolean;
  readonly draft: string;
  readonly attachments: ReadonlyArray<ContentBlock>;
  readonly modes: ReadonlyArray<ComposerMode>;
  readonly selectedModeId: string;
  readonly models: ReadonlyArray<ModelChoice>;
  readonly selectedModelId: string;
  readonly onReturnHome: () => void;
  readonly onInspectBlock: (blockId: string | null, anchor?: string | null) => void;
  readonly onCommitRevision: (
    blockId: string,
    nextData: unknown,
    changeSummary: ReadonlyArray<string>
  ) => void;
  readonly onToggleMaximizeStage: () => void;
  readonly onDraftChange: (value: string) => void;
  readonly onModeChange: (modeId: string) => void;
  readonly onModelChange: (modelId: string) => void;
  readonly onAttach: (block: ContentBlock) => void;
  readonly onRemoveAttachment: (blockId: string) => void;
  readonly onLaunchPluginSample: (pluginId: string) => void;
  readonly onSubmit: () => void;
}

export function ThreadView({
  topic,
  registry,
  inspectedBlockId,
  inspectedAnchor,
  anchorPulse,
  isStageMaximized,
  draft,
  attachments,
  modes,
  selectedModeId,
  models,
  selectedModelId,
  onReturnHome,
  onInspectBlock,
  onCommitRevision,
  onToggleMaximizeStage,
  onDraftChange,
  onModeChange,
  onModelChange,
  onAttach,
  onRemoveAttachment,
  onLaunchPluginSample,
  onSubmit,
}: ThreadViewProps) {
  const allBlocks = topic.turns.flatMap((turn) => turn.blocks);
  const stageBlocks = allBlocks.filter((b) => registry.resolve(b).placement === 'stage');
  const activeStageBlock = allBlocks.find((b) => b.id === inspectedBlockId) ?? null;
  const activeStagePlugin = activeStageBlock ? registry.resolve(activeStageBlock) : null;

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
              onClick={() => onInspectBlock(stageBlocks[stageBlocks.length - 1]!.id)}
            >
              Open {stageBlocks[stageBlocks.length - 1]!.filename ?? 'Artifact'}
            </button>
          )}
        </div>
      </header>

      <div class={`thread-split-layout ${activeStageBlock ? 'has-stage' : ''}`}>
        {!isStageMaximized && (
          <section class="thread-conversation-pane" aria-label="Conversation">
            <div class="thread-turns-scroll">
              <div class="thread-turns-column">
                {topic.turns.map((turn) => {
                  const turnStageArtifactId =
                    turn.blocks.find((b) => registry.resolve(b).placement === 'stage')?.id ??
                    stageBlocks[stageBlocks.length - 1]?.id ??
                    null;

                  return (
                    <article
                      key={turn.id}
                      class={`turn-item is-${turn.role} status-${turn.status}`}
                    >
                      {turn.role === 'assistant' && (
                        <div class="turn-author-row">
                          <LucyMark size={18} />
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
                              siblingArtifactId={turnStageArtifactId}
                              onInspect={(id, anchor) => onInspectBlock(id, anchor ?? null)}
                            />
                          );
                        })}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            <div class="thread-composer-dock">
              <div class="thread-turns-column">
                <Composer
                  compact
                  placeholder="Reply, ask a follow-up, or click + for enterprise stages…"
                  draft={draft}
                  attachments={attachments}
                  modes={modes}
                  selectedModeId={selectedModeId}
                  models={models}
                  selectedModelId={selectedModelId}
                  registry={registry}
                  onDraftChange={onDraftChange}
                  onModeChange={onModeChange}
                  onModelChange={onModelChange}
                  onAttach={onAttach}
                  onRemoveAttachment={onRemoveAttachment}
                  onLaunchPluginSample={onLaunchPluginSample}
                  onSubmit={onSubmit}
                />
              </div>
            </div>
          </section>
        )}

        {activeStageBlock && activeStagePlugin && (
          <aside class="artifact-stage-pane" aria-label="Artifact inspector">
            <div class="artifact-stage-header">
              <div class="artifact-stage-title-group">
                <span class={`artifact-badge accent-${activeStagePlugin.accent ?? 'emerald'}`}>
                  {activeStagePlugin.badge}
                </span>
                <strong class="artifact-stage-title">
                  {activeStageBlock.filename ?? activeStageBlock.title ?? activeStagePlugin.label}
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
                key={activeStageBlock.id}
                block={activeStageBlock}
                registry={registry}
                isCompact={false}
                focusAnchor={inspectedAnchor}
                anchorPulse={anchorPulse}
                onCommitRevision={(nextData, summary) =>
                  onCommitRevision(activeStageBlock.id, nextData, summary)
                }
              />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
