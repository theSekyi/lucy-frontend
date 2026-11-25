import type { ComponentChildren } from 'preact';
import { formatAuditTimestamp } from '../core/money';
import type { RendererRegistry } from '../core/renderers';
import type { ArtifactRevision, ContentBlock, TopicThread } from '../core/types';
import { BlockSlot } from './BlockSlot';
import { Composer } from './Composer';
import './thread.css';

interface ThreadViewProps {
  readonly topic: TopicThread;
  readonly registry: RendererRegistry<ComponentChildren>;
  readonly inspectedBlockId: string | null;
  readonly inspectedAnchor: string | null;
  readonly anchorPulse: number;
  readonly isStageMaximized: boolean;
  readonly draft: string;
  readonly attachments: ReadonlyArray<ContentBlock>;
  readonly artifactDrafts: Readonly<Record<string, unknown>>;
  readonly revisions: ReadonlyArray<ArtifactRevision>;
  readonly actorName: string;
  readonly onReturnHome: () => void;
  readonly onInspectBlock: (blockId: string | null, anchor?: string | null) => void;
  readonly onUpdateArtifactDraft: (blockId: string, nextDraft: unknown) => void;
  readonly onClearArtifactDraft: (blockId: string) => void;
  readonly onCommitRevision: (
    blockId: string,
    nextData: unknown,
    changeSummary: ReadonlyArray<string>
  ) => void;
  readonly onUndoRevision: (revisionId: string) => void;
  readonly onToggleMaximizeStage: () => void;
  readonly onDraftChange: (value: string) => void;
  readonly onIngestFile: (file: File) => void;
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
  artifactDrafts,
  revisions,
  actorName,
  onReturnHome,
  onInspectBlock,
  onUpdateArtifactDraft,
  onClearArtifactDraft,
  onCommitRevision,
  onUndoRevision,
  onToggleMaximizeStage,
  onDraftChange,
  onIngestFile,
  onRemoveAttachment,
  onLaunchPluginSample,
  onSubmit,
}: ThreadViewProps) {
  const allBlocks = topic.turns.flatMap((turn) => turn.blocks);
  const stageBlocks = allBlocks.filter((b) => registry.resolve(b).placement === 'stage');
  const activeStageBlock = allBlocks.find((b) => b.id === inspectedBlockId) ?? null;
  const activeStagePlugin = activeStageBlock ? registry.resolve(activeStageBlock) : null;
  const hasStageDraft =
    activeStageBlock !== null && artifactDrafts[activeStageBlock.id] !== undefined;
  const latestStageRevision = activeStageBlock
    ? [...revisions].reverse().find((r) => r.blockId === activeStageBlock.id) ?? null
    : null;

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
              Open {stageBlocks[stageBlocks.length - 1]!.filename ?? 'stage'} →
            </button>
          )}
        </div>
      </header>

      <div class={`thread-split-layout ${activeStageBlock ? 'has-stage' : ''}`}>
        {!isStageMaximized && (
          <section class="thread-conversation-pane" aria-label="Workspace thread">
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
                      {turn.role === 'assistant' && turn.status === 'queued-offline' && (
                        <div class="turn-author-row">
                          <span class="turn-status-pill">Queued offline</span>
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
                              draft={artifactDrafts[block.id]}
                              actorName={actorName}
                              isCompact={renderCompact}
                              siblingArtifactId={turnStageArtifactId}
                              onInspect={(id, anchor) => onInspectBlock(id, anchor ?? null)}
                              onUpdateDraft={(nextDraft) =>
                                onUpdateArtifactDraft(block.id, nextDraft)
                              }
                              onClearDraft={() => onClearArtifactDraft(block.id)}
                              onCommitRevision={(nextData, summary) =>
                                onCommitRevision(block.id, nextData, summary)
                              }
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
                  placeholder="Add a workpaper note or click + to open a schedule…"
                  draft={draft}
                  attachments={attachments}
                  registry={registry}
                  onDraftChange={onDraftChange}
                  onIngestFile={onIngestFile}
                  onRemoveAttachment={onRemoveAttachment}
                  onLaunchPluginSample={onLaunchPluginSample}
                  onSubmit={onSubmit}
                />
              </div>
            </div>
          </section>
        )}

        {activeStageBlock && activeStagePlugin && (
          <aside class="artifact-stage-pane" aria-label="Document stage">
            <div class="artifact-stage-header">
              <div class="artifact-stage-title-group">
                <span class={`artifact-badge accent-${activeStagePlugin.accent ?? 'emerald'}`}>
                  {activeStagePlugin.badge}
                </span>
                <strong class="artifact-stage-title">
                  {activeStageBlock.filename ?? activeStageBlock.title ?? activeStagePlugin.label}
                </strong>
                {hasStageDraft && (
                  <span class="draft-indicator-pill" title="Edits are auto-saved locally as a draft">
                    Unsaved draft
                  </span>
                )}
                {!hasStageDraft && latestStageRevision && (
                  <span
                    class="revision-stamp-label"
                    title={`Saved by ${latestStageRevision.actorName}`}
                  >
                    Saved {formatAuditTimestamp(latestStageRevision.createdAtIso)}
                  </span>
                )}
              </div>

              <div class="artifact-stage-controls">
                {hasStageDraft && (
                  <button
                    type="button"
                    class="ghost-pill"
                    onClick={() => onClearArtifactDraft(activeStageBlock.id)}
                  >
                    Discard draft
                  </button>
                )}
                {latestStageRevision && (
                  <button
                    type="button"
                    class="ghost-pill"
                    onClick={() => onUndoRevision(latestStageRevision.id)}
                  >
                    Undo save
                  </button>
                )}
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
                  aria-label="Close stage"
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
                draft={artifactDrafts[activeStageBlock.id]}
                actorName={actorName}
                isCompact={false}
                focusAnchor={inspectedAnchor}
                anchorPulse={anchorPulse}
                onUpdateDraft={(nextDraft) =>
                  onUpdateArtifactDraft(activeStageBlock.id, nextDraft)
                }
                onClearDraft={() => onClearArtifactDraft(activeStageBlock.id)}
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
