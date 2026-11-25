import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import {
  defaultFirmAdmin,
  selectClientEngagementGroups,
  type FirmAdminState,
} from '../core/admin';
import type { RendererRegistry } from '../core/renderers';
import type { TodayWorkItem, WorkspaceState } from '../core/types';
import {
  selectSidebarRecentTopics,
  type WorkspaceController,
} from '../core/workspace';
import type { FirmAdminPage as FirmAdminPageComponent } from './admin/FirmAdminPage';
import type { ClientsPage as ClientsPageComponent } from './clients/ClientsPage';
import type { ConnectorsPage as ConnectorsPageComponent } from './connectors/ConnectorsPage';
import type { InboxWorkspace as InboxWorkspaceComponent } from './inbox/InboxWorkspace';
import type { DeepLinkTarget } from './inbox/MailIntelligencePanel';
import { Launchpad } from './Launchpad';
import type { ProfilePage as ProfilePageComponent } from './ProfilePage';
import { Sidebar } from './Sidebar';
import type { ThreadView as ThreadViewComponent } from './ThreadView';

interface AppProps {
  readonly workspace: WorkspaceController;
  readonly registry: RendererRegistry<ComponentChildren>;
  readonly onIngestFile: (file: File) => void;
}

export function App({ workspace, registry, onIngestFile }: AppProps) {
  const [state, setState] = useState<WorkspaceState>(() => workspace.getState());
  const [adminState, setAdminState] = useState<FirmAdminState>(() =>
    defaultFirmAdmin.getState()
  );
  const [ThreadViewLoaded, setThreadViewLoaded] = useState<typeof ThreadViewComponent | null>(null);
  const [ProfileLoaded, setProfileLoaded] = useState<typeof ProfilePageComponent | null>(null);
  const [ClientsLoaded, setClientsLoaded] = useState<typeof ClientsPageComponent | null>(null);
  const [ConnectorsLoaded, setConnectorsLoaded] =
    useState<typeof ConnectorsPageComponent | null>(null);
  const [InboxLoaded, setInboxLoaded] = useState<typeof InboxWorkspaceComponent | null>(null);
  const [AdminLoaded, setAdminLoaded] = useState<typeof FirmAdminPageComponent | null>(null);

  useEffect(() => workspace.subscribe(setState), [workspace]);
  useEffect(() => defaultFirmAdmin.subscribe(setAdminState), []);

  useEffect(() => {
    async function applyUrlParams() {
      const params = new URLSearchParams(window.location.search);
      const rawPage = params.get('page')?.trim().toLowerCase();
      const rawProvider = (params.get('provider') ?? params.get('inbox'))?.trim().toLowerCase();

      if (rawPage === 'profile') {
        workspace.selectSection('profile');
        return;
      }
      if (rawPage === 'clients') {
        const clientParam = params.get('client')?.trim() || null;
        const engParam = params.get('eng')?.trim() || null;
        workspace.openClient(clientParam, engParam);
        return;
      }
      if (rawPage === 'connectors') {
        workspace.selectSection('connectors');
        return;
      }
      if (rawPage === 'admin') {
        workspace.selectSection('admin');
        return;
      }
      if (rawPage === 'inbox' || rawProvider === 'gmail' || rawProvider === 'outlook') {
        const threadParam = params.get('thread')?.trim() || null;
        const targetProvider = rawProvider === 'outlook' ? 'outlook' : 'gmail';
        if (threadParam) {
          workspace.openMailThread(threadParam, targetProvider);
        } else {
          workspace.setInboxProvider(targetProvider);
        }
        return;
      }

      const rawStage = params.get('stage')?.trim().toLowerCase();
      const anchor = params.get('anchor');
      if (!rawStage) return;

      const matchedPlugin = registry.findByRoute(rawStage);
      if (!matchedPlugin) return;

      const topicId = await workspace.launchPluginSample(matchedPlugin.id);
      if (topicId && anchor) {
        const blockId = workspace.getState().inspectedBlockId;
        if (blockId) workspace.inspectArtifact(blockId, anchor);
      }
    }

    void applyUrlParams();
    window.addEventListener('popstate', applyUrlParams);
    return () => window.removeEventListener('popstate', applyUrlParams);
  }, [registry, workspace]);

  useEffect(() => {
    const topic = state.topics.find((t) => t.id === state.activeTopicId);
    if (topic) {
      const block = topic.turns
        .flatMap((t) => t.blocks)
        .find((b) => b.id === state.inspectedBlockId);
      if (!block) return;
      const pluginId = registry.resolve(block).id;
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.delete('page');
      nextUrl.searchParams.delete('provider');
      nextUrl.searchParams.set('stage', pluginId);
      if (state.inspectedAnchor) nextUrl.searchParams.set('anchor', state.inspectedAnchor);
      else nextUrl.searchParams.delete('anchor');
      window.history.replaceState(
        null,
        '',
        `${nextUrl.pathname}?${nextUrl.searchParams.toString()}`
      );
      return;
    }

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete('stage');
    nextUrl.searchParams.delete('anchor');

    if (state.activeSection === 'inbox') {
      nextUrl.searchParams.set('page', 'inbox');
      nextUrl.searchParams.set('provider', state.inboxProvider);
      nextUrl.searchParams.delete('client');
      nextUrl.searchParams.delete('eng');
      window.history.replaceState(
        null,
        '',
        `${nextUrl.pathname}?${nextUrl.searchParams.toString()}`
      );
    } else if (state.activeSection === 'clients') {
      nextUrl.searchParams.set('page', 'clients');
      nextUrl.searchParams.delete('provider');
      if (state.selectedClientId) nextUrl.searchParams.set('client', state.selectedClientId);
      else nextUrl.searchParams.delete('client');
      if (state.selectedEngagementId) nextUrl.searchParams.set('eng', state.selectedEngagementId);
      else nextUrl.searchParams.delete('eng');
      window.history.replaceState(
        null,
        '',
        `${nextUrl.pathname}?${nextUrl.searchParams.toString()}`
      );
    } else if (
      state.activeSection === 'profile' ||
      state.activeSection === 'connectors' ||
      state.activeSection === 'admin'
    ) {
      nextUrl.searchParams.set('page', state.activeSection);
      nextUrl.searchParams.delete('provider');
      nextUrl.searchParams.delete('client');
      nextUrl.searchParams.delete('eng');
      window.history.replaceState(
        null,
        '',
        `${nextUrl.pathname}?${nextUrl.searchParams.toString()}`
      );
    } else if (window.location.search) {
      window.history.replaceState(null, '', nextUrl.pathname);
    }
  }, [
    registry,
    state.activeSection,
    state.selectedClientId,
    state.selectedEngagementId,
    state.activeTopicId,
    state.inboxProvider,
    state.inspectedAnchor,
    state.inspectedBlockId,
    state.topics,
  ]);

  useEffect(() => {
    if (state.activeTopicId && !ThreadViewLoaded) {
      void import('./ThreadView').then((mod) => setThreadViewLoaded(() => mod.ThreadView));
      return;
    }
    if (state.activeSection === 'profile' && !ProfileLoaded) {
      void import('./ProfilePage').then((mod) => setProfileLoaded(() => mod.ProfilePage));
      return;
    }
    if (state.activeSection === 'clients' && !ClientsLoaded) {
      void import('./clients/ClientsPage').then((mod) =>
        setClientsLoaded(() => mod.ClientsPage)
      );
      return;
    }
    if (state.activeSection === 'connectors' && !ConnectorsLoaded) {
      void import('./connectors/ConnectorsPage').then((mod) =>
        setConnectorsLoaded(() => mod.ConnectorsPage)
      );
      return;
    }
    if (state.activeSection === 'inbox' && !InboxLoaded) {
      void import('./inbox/InboxWorkspace').then((mod) =>
        setInboxLoaded(() => mod.InboxWorkspace)
      );
      return;
    }
    if (state.activeSection === 'admin' && !AdminLoaded) {
      void import('./admin/FirmAdminPage').then((mod) =>
        setAdminLoaded(() => mod.FirmAdminPage)
      );
      return;
    }
    if (state.networkStatus === 'online' && !ThreadViewLoaded && state.activeSection === 'home') {
      const timer = setTimeout(() => {
        void import('./ThreadView').then((mod) => setThreadViewLoaded(() => mod.ThreadView));
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [
    state.activeTopicId,
    state.activeSection,
    state.networkStatus,
    ThreadViewLoaded,
    ProfileLoaded,
    ClientsLoaded,
    ConnectorsLoaded,
    InboxLoaded,
    AdminLoaded,
  ]);

  useEffect(() => {
    function syncConnectivity() {
      if (!navigator.onLine) {
        workspace.setNetworkStatus('offline');
        return;
      }
      const conn = (navigator as Navigator & { connection?: { effectiveType?: string } })
        .connection;
      const isSlow =
        conn?.effectiveType === 'slow-2g' ||
        conn?.effectiveType === '2g' ||
        conn?.effectiveType === '3g';
      workspace.setNetworkStatus(isSlow ? 'slow' : 'online');
    }

    syncConnectivity();
    window.addEventListener('online', syncConnectivity);
    window.addEventListener('offline', syncConnectivity);
    return () => {
      window.removeEventListener('online', syncConnectivity);
      window.removeEventListener('offline', syncConnectivity);
    };
  }, [workspace]);

  useEffect(() => {
    function handleGlobalKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        workspace.setSearchOpen(!workspace.getState().isSearchOpen);
      } else if (event.key === 'Escape') {
        const target = event.target as HTMLElement | null;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
        const current = workspace.getState();
        if (current.inspectedBlockId) {
          workspace.inspectArtifact(null);
        } else if (current.activeTopicId) {
          workspace.returnHome();
        }
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [workspace]);

  const activeTopic = state.topics.find((t) => t.id === state.activeTopicId) ?? null;
  const sidebarRecents = selectSidebarRecentTopics(state);
  const clientGroups = selectClientEngagementGroups(adminState);

  async function handleNavigateDeepLink(target: DeepLinkTarget) {
    if (target.pluginRoute) {
      const matched = registry.findByRoute(target.pluginRoute);
      if (matched) {
        const topicId = await workspace.launchPluginSample(matched.id);
        if (topicId && target.anchor) {
          const blockId = workspace.getState().inspectedBlockId;
          if (blockId) workspace.inspectArtifact(blockId, target.anchor);
        }
        return;
      }
    }
    if (target.connectorId) {
      workspace.selectSection('connectors');
    }
  }

  function handleOpenTodayItem(item: TodayWorkItem) {
    if (item.target.kind === 'mail') {
      workspace.openMailThread(item.target.mailId);
      return;
    }
    if (item.target.kind === 'client') {
      workspace.openClient(item.target.clientId, item.target.engagementId ?? null);
      return;
    }
    void handleNavigateDeepLink({
      pluginRoute: item.target.pluginRoute,
      anchor: item.target.anchor,
    });
  }

  return (
    <div class="app-frame">
      <Sidebar
        isOpen={state.isSidebarOpen}
        activeSection={state.activeSection}
        activeTopicId={state.activeTopicId}
        unreadInboxCount={state.unreadInboxCount}
        clientCount={clientGroups.length}
        connectedCount={state.connectedAppIds.length}
        userProfile={state.userProfile}
        isRecentsOpen={state.isRecentsOpen}
        showAllRecents={state.showAllSidebarRecents}
        isSearchOpen={state.isSearchOpen}
        searchQuery={state.searchQuery}
        recentTopics={sidebarRecents}
        networkStatus={state.networkStatus}
        queuedCount={state.queuedTurnIds.length}
        onToggleSidebar={() => workspace.toggleSidebar()}
        onSelectSection={(sec) => workspace.selectSection(sec)}
        onToggleSearch={() => workspace.setSearchOpen(!state.isSearchOpen)}
        onSearchChange={(q) => workspace.setSearchQuery(q)}
        onToggleRecents={() => workspace.toggleRecents()}
        onToggleMoreRecents={() => workspace.toggleMoreSidebarRecents()}
        onOpenTopic={(id) => workspace.openTopic(id)}
      />

      <main class="main-surface">
        {activeTopic ? (
          ThreadViewLoaded ? (
            <ThreadViewLoaded
              topic={activeTopic}
              registry={registry}
              inspectedBlockId={state.inspectedBlockId}
              inspectedAnchor={state.inspectedAnchor}
              anchorPulse={state.anchorPulse}
              isStageMaximized={state.isStageMaximized}
              draft={state.composerDraft}
              attachments={state.attachments}
              models={state.models}
              selectedModelId={state.selectedModelId}
              onReturnHome={() => workspace.returnHome()}
              onInspectBlock={(id, anchor) => workspace.inspectArtifact(id, anchor)}
              onCommitRevision={(blockId, nextData, summary) =>
                workspace.commitArtifactRevision(blockId, nextData, summary)
              }
              onToggleMaximizeStage={() => workspace.toggleStageMaximize()}
              onDraftChange={(text) => workspace.updateDraft(text)}
              onModelChange={(id) => workspace.setModel(id)}
              onIngestFile={onIngestFile}
              onRemoveAttachment={(id) => workspace.removeAttachment(id)}
              onLaunchPluginSample={(pluginId) => void workspace.launchPluginSample(pluginId)}
              onSubmit={() => workspace.submitPrompt()}
            />
          ) : (
            <div class="launchpad-scroll">
              <div class="renderer-skeleton">Loading view…</div>
            </div>
          )
        ) : state.activeSection === 'inbox' ? (
          InboxLoaded ? (
            <InboxLoaded
              provider={state.inboxProvider}
              selectedMailId={state.selectedMailId}
              registry={registry}
              senderEmail={state.userProfile.email}
              senderName={state.userProfile.fullName}
              onSwitchProvider={(provider) => workspace.setInboxProvider(provider)}
              onUnreadCountChange={(count) => workspace.setUnreadInboxCount(count)}
              onNavigateSource={(target) => void handleNavigateDeepLink(target)}
            />
          ) : (
            <div class="launchpad-scroll">
              <div class="renderer-skeleton">Loading inbox…</div>
            </div>
          )
        ) : state.activeSection === 'clients' ? (
          ClientsLoaded ? (
            <ClientsLoaded
              selectedClientId={state.selectedClientId}
              selectedEngagementId={state.selectedEngagementId}
              onSelectClient={(clientId, engId) =>
                workspace.openClient(clientId, engId)
              }
              onOpenWorkpaper={(target) => void handleNavigateDeepLink(target)}
            />
          ) : (
            <div class="launchpad-scroll">
              <div class="renderer-skeleton">Loading clients…</div>
            </div>
          )
        ) : state.activeSection === 'connectors' ? (
          ConnectorsLoaded ? (
            <ConnectorsLoaded
              connectedIds={state.connectedAppIds}
              disconnectedIds={state.disconnectedAppIds}
              onToggleConnector={(id) => workspace.toggleConnector(id)}
              onOpenInboxProvider={(provider) => workspace.setInboxProvider(provider)}
              onNavigate={(sec) => workspace.selectSection(sec)}
            />
          ) : (
            <div class="launchpad-scroll">
              <div class="renderer-skeleton">Loading connectors…</div>
            </div>
          )
        ) : state.activeSection === 'admin' ? (
          AdminLoaded ? (
            <AdminLoaded
              onOpenClientEngagement={(clientId, engId) =>
                workspace.openClient(clientId, engId)
              }
              onOpenWorkpaper={(target) => void handleNavigateDeepLink(target)}
            />
          ) : (
            <div class="launchpad-scroll">
              <div class="renderer-skeleton">Loading firm admin…</div>
            </div>
          )
        ) : state.activeSection === 'profile' ? (
          ProfileLoaded ? (
            <ProfileLoaded
              profile={state.userProfile}
              connectedCount={state.connectedAppIds.length}
              onUpdateProfile={(patch) => workspace.updateUserProfile(patch)}
              onNavigate={(sec) => workspace.selectSection(sec)}
            />
          ) : (
            <div class="launchpad-scroll">
              <div class="renderer-skeleton">Loading profile…</div>
            </div>
          )
        ) : (
          <Launchpad
            userProfile={state.userProfile}
            todayItems={state.todayItems}
            connectedCount={state.connectedAppIds.length}
            disconnectedIds={state.disconnectedAppIds}
            draft={state.composerDraft}
            attachments={state.attachments}
            models={state.models}
            selectedModelId={state.selectedModelId}
            registry={registry}
            onDraftChange={(text) => workspace.updateDraft(text)}
            onModelChange={(id) => workspace.setModel(id)}
            onIngestFile={onIngestFile}
            onRemoveAttachment={(id) => workspace.removeAttachment(id)}
            onLaunchPluginSample={(pluginId) => void workspace.launchPluginSample(pluginId)}
            onSubmit={() => workspace.submitPrompt()}
            onOpenTodayItem={handleOpenTodayItem}
            onReconnectConnector={(id) => workspace.toggleConnector(id)}
            onOpenInbox={() => workspace.selectSection('inbox')}
            onOpenProfile={() => workspace.selectSection('profile')}
            onOpenConnectors={() => workspace.selectSection('connectors')}
          />
        )}
      </main>
    </div>
  );
}
