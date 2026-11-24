import type { ComponentChildren } from 'preact';
import type { RendererRegistry } from '../core/renderers';
import type {
  ContentBlock,
  DailyBriefSlide,
  ModelChoice,
  TopicThread,
} from '../core/types';
import { Composer } from './Composer';
import { ThreadItemIcon } from './icons';

interface LaunchpadProps {
  readonly brief: DailyBriefSlide;
  readonly recentTopics: ReadonlyArray<TopicThread>;
  readonly totalRecentCount: number;
  readonly draft: string;
  readonly attachments: ReadonlyArray<ContentBlock>;
  readonly models: ReadonlyArray<ModelChoice>;
  readonly selectedModelId: string;
  readonly registry: RendererRegistry<ComponentChildren>;
  readonly searchQuery: string;
  readonly onDraftChange: (value: string) => void;
  readonly onModelChange: (modelId: string) => void;
  readonly onIngestFile: (file: File) => void;
  readonly onRemoveAttachment: (blockId: string) => void;
  readonly onLaunchPluginSample: (pluginId: string) => void;
  readonly onSubmit: () => void;
  readonly onStepBrief: (delta: -1 | 1) => void;
  readonly onOpenTopic: (topicId: string) => void;
}

export function Launchpad({
  brief,
  recentTopics,
  totalRecentCount,
  draft,
  attachments,
  models,
  selectedModelId,
  registry,
  searchQuery,
  onDraftChange,
  onModelChange,
  onIngestFile,
  onRemoveAttachment,
  onLaunchPluginSample,
  onSubmit,
  onStepBrief,
  onOpenTopic,
}: LaunchpadProps) {
  return (
    <div class="launchpad-scroll">
      <div class="launchpad-column">
        <header class="hero-header">
          <h1 class="hero-title">Good afternoon</h1>
        </header>

        <Composer
          draft={draft}
          attachments={attachments}
          models={models}
          selectedModelId={selectedModelId}
          registry={registry}
          onDraftChange={onDraftChange}
          onModelChange={onModelChange}
          onIngestFile={onIngestFile}
          onRemoveAttachment={onRemoveAttachment}
          onLaunchPluginSample={onLaunchPluginSample}
          onSubmit={onSubmit}
        />

        <section class="daily-brief-section" aria-label="Daily brief">
          <div class="daily-brief-header">
            <div class="daily-brief-heading">
              <strong class="brief-title">Daily brief</strong>
              <span class="brief-separator">·</span>
              <span class="brief-subtitle">{brief.subtitle}</span>
            </div>

            <div class="brief-pager">
              <button
                type="button"
                class="pager-btn"
                aria-label="Previous brief"
                onClick={() => onStepBrief(-1)}
              >
                ‹
              </button>
              <button
                type="button"
                class="pager-btn"
                aria-label="Next brief"
                onClick={() => onStepBrief(1)}
              >
                ›
              </button>
            </div>
          </div>

          <p class="daily-brief-body">{brief.body}</p>
        </section>

        <section class="recent-topics-section" aria-label="Recent items">
          <div class="recent-topics-header">
            <h2 class="recent-topics-title">
              {searchQuery.trim() ? 'Matching items' : 'Recent'}
            </h2>
            <span class="recent-count-badge">
              {searchQuery.trim() ? recentTopics.length : totalRecentCount}
            </span>
          </div>

          <div class="recent-topics-list">
            {recentTopics.map((topic) => (
              <button
                key={topic.id}
                type="button"
                class="topic-row"
                onClick={() => onOpenTopic(topic.id)}
              >
                <div class="topic-row-avatar">
                  <ThreadItemIcon size={18} />
                </div>

                <div class="topic-row-content">
                  <div class="topic-row-top">
                    <span class="topic-row-title">{topic.title}</span>
                    <span class="topic-row-date">{topic.dateLabel}</span>
                  </div>
                  <div class="topic-row-preview">{topic.preview}</div>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
