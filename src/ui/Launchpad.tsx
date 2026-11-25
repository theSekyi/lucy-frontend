import type { ComponentChildren } from 'preact';
import type { ClientEngagementGroup } from '../core/admin';
import type { RendererRegistry } from '../core/renderers';
import type {
  ContentBlock,
  ModelChoice,
  TopicThread,
  UserProfile,
} from '../core/types';
import { Composer } from './Composer';
import { ThreadItemIcon } from './icons';

interface LaunchpadProps {
  readonly userProfile: UserProfile;
  readonly clientGroups: ReadonlyArray<ClientEngagementGroup>;
  readonly connectedCount: number;
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
  readonly onOpenTopic: (topicId: string) => void;
  readonly onOpenClients: () => void;
  readonly onOpenProfile: () => void;
  readonly onOpenConnectors: () => void;
}

export function Launchpad({
  userProfile,
  clientGroups,
  connectedCount,
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
  onOpenTopic,
  onOpenClients,
  onOpenProfile,
  onOpenConnectors,
}: LaunchpadProps) {
  const firstName = userProfile.fullName.trim().split(/\s+/)[0] ?? 'Partner';

  return (
    <div class="launchpad-scroll">
      <div class="launchpad-column">
        <header class="hero-header">
          <h1 class="hero-title">Good afternoon, {firstName}</h1>

          <div class="dashboard-header-actions">
            <button
              type="button"
              class="ghost-pill"
              onClick={onOpenConnectors}
            >
              {connectedCount} Connected
            </button>

            <button
              type="button"
              class="dashboard-profile-pill"
              onClick={onOpenProfile}
              aria-label={`Open user profile for ${userProfile.fullName}`}
            >
              <span class="dashboard-avatar-chip" aria-hidden="true">
                {userProfile.initials}
              </span>
              <strong class="dashboard-profile-name">{userProfile.fullName}</strong>
            </button>
          </div>
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

        <section class="dashboard-clients-section" aria-label="Clients summary">
          <div class="dashboard-section-bar">
            <div class="recent-topics-header" style={{ marginBottom: 0 }}>
              <h2 class="recent-topics-title">Clients</h2>
              <span class="recent-count-badge">{clientGroups.length}</span>
            </div>
            <button
              type="button"
              class="conn-open-link"
              onClick={onOpenClients}
            >
              View all →
            </button>
          </div>

          <div class="dashboard-clients-box">
            {clientGroups.map((client) => (
              <button
                key={client.clientName}
                type="button"
                class="dashboard-client-row"
                onClick={onOpenClients}
              >
                <div class="dashboard-client-left">
                  <span class="dashboard-client-name">{client.clientName}</span>
                  <span class="dashboard-client-count">
                    {client.totalCount} {client.totalCount === 1 ? 'engagement' : 'engagements'}
                  </span>
                </div>

                <div class="dashboard-client-right">
                  <span class="dashboard-client-due">{client.nextDueLabel}</span>
                  <div class="client-progress-inline is-sm">
                    <div class="client-progress-track">
                      <span
                        class="client-progress-fill"
                        style={{ width: `${client.averageProgressPct}%` }}
                      />
                    </div>
                    <span class="client-progress-pct">{client.averageProgressPct}%</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section class="recent-topics-section" aria-label="Recent items">
          <div class="recent-topics-header">
            <h2 class="recent-topics-title">
              {searchQuery.trim() ? 'Matching' : 'Recent'}
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
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
