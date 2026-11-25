import type { ComponentChildren } from 'preact';
import { CONNECTOR_CATALOG } from '../core/connectors';
import type { RendererRegistry } from '../core/renderers';
import type {
  ContentBlock,
  TodayWorkItem,
  UserProfile,
} from '../core/types';
import { Composer } from './Composer';
import { CONNECTOR_LOGOS } from './connectors/connectorLogos';

interface LaunchpadProps {
  readonly userProfile: UserProfile;
  readonly todayItems: ReadonlyArray<TodayWorkItem>;
  readonly connectedCount: number;
  readonly disconnectedIds: ReadonlyArray<string>;
  readonly draft: string;
  readonly attachments: ReadonlyArray<ContentBlock>;
  readonly registry: RendererRegistry<ComponentChildren>;
  readonly onDraftChange: (value: string) => void;
  readonly onIngestFile: (file: File) => void;
  readonly onRemoveAttachment: (blockId: string) => void;
  readonly onLaunchPluginSample: (pluginId: string) => void;
  readonly onSubmit: () => void;
  readonly onOpenTodayItem: (item: TodayWorkItem) => void;
  readonly onReconnectConnector: (connectorId: string) => void;
  readonly onOpenInbox: () => void;
  readonly onOpenProfile: () => void;
  readonly onOpenConnectors: () => void;
}

export function Launchpad({
  userProfile,
  todayItems,
  connectedCount,
  disconnectedIds,
  draft,
  attachments,
  registry,
  onDraftChange,
  onIngestFile,
  onRemoveAttachment,
  onLaunchPluginSample,
  onSubmit,
  onOpenTodayItem,
  onReconnectConnector,
  onOpenInbox,
  onOpenProfile,
  onOpenConnectors,
}: LaunchpadProps) {
  const firstName = userProfile.fullName.trim().split(/\s+/)[0] ?? 'Partner';
  const disconnectedApps = disconnectedIds
    .map((id) => CONNECTOR_CATALOG.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

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
          registry={registry}
          onDraftChange={onDraftChange}
          onIngestFile={onIngestFile}
          onRemoveAttachment={onRemoveAttachment}
          onLaunchPluginSample={onLaunchPluginSample}
          onSubmit={onSubmit}
        />

        <section class="dashboard-clients-section" aria-label="Today">
          <div class="dashboard-section-bar">
            <div class="recent-topics-header">
              <h2 class="recent-topics-title">Today</h2>
              <span class="recent-count-badge">{todayItems.length}</span>
            </div>
            <button
              type="button"
              class="conn-open-link"
              onClick={onOpenInbox}
            >
              Inbox →
            </button>
          </div>

          <div class="dashboard-clients-box">
            {todayItems.map((item) => (
              <button
                key={item.id}
                type="button"
                class="dashboard-client-row"
                onClick={() => onOpenTodayItem(item)}
              >
                <div class="dashboard-today-left">
                  <span class={`today-kind-pill is-${item.kindLabel.toLowerCase()}`}>
                    {item.kindLabel}
                  </span>
                  <span class="dashboard-client-name">{item.title}</span>
                </div>

                <div class="dashboard-client-right">
                  <span class="dashboard-client-due">{item.metaLabel}</span>
                  <span class="client-dir-chevron" aria-hidden="true">
                    ›
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section class="recent-topics-section" aria-label="Disconnected connectors">
          <div class="dashboard-section-bar">
            <div class="recent-topics-header">
              <h2 class="recent-topics-title">Disconnected</h2>
              <span class="recent-count-badge">{disconnectedApps.length}</span>
            </div>
            <button
              type="button"
              class="conn-open-link"
              onClick={onOpenConnectors}
            >
              All connectors →
            </button>
          </div>

          {disconnectedApps.length === 0 ? (
            <div class="dashboard-empty-box">All connectors active.</div>
          ) : (
            <div class="conn-list-box">
              {disconnectedApps.map((app) => {
                const Logo = CONNECTOR_LOGOS[app.id];
                return (
                  <div key={app.id} class="conn-row">
                    <div class="conn-row-left">
                      <span class="conn-row-logo">{Logo && <Logo size={18} />}</span>
                      <span class="conn-row-name">{app.name}</span>
                    </div>

                    <div class="conn-row-right">
                      <button
                        type="button"
                        class="conn-oauth-btn"
                        onClick={() => onReconnectConnector(app.id)}
                      >
                        Reconnect ↗
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
