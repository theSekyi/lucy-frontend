import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { OnboardingStepId } from '../core/onboarding';
import type { RendererRegistry } from '../core/renderers';
import type { AuthProviderId, TodayWorkItem, WorkspaceState } from '../core/types';
import {
  selectSidebarRecentTopics,
  type WorkspaceController,
} from '../core/workspace';
import type { DeepLinkTarget } from './inbox/MailIntelligencePanel';
import { Launchpad } from './Launchpad';
import { LazyPageSlot } from './primitives/LazyPageSlot';
import { Sidebar } from './Sidebar';

const loadThreadView = () => import('./ThreadView').then((m) => m.ThreadView);
const loadInboxWorkspace = () =>
  import('./inbox/InboxWorkspace').then((m) => m.InboxWorkspace);
const loadClientsPage = () =>
  import('./clients/ClientsPage').then((m) => m.ClientsPage);
const loadConnectorsPage = () =>
  import('./connectors/ConnectorsPage').then((m) => m.ConnectorsPage);
const loadFirmAdminPage = () =>
  import('./admin/FirmAdminPage').then((m) => m.FirmAdminPage);
const loadProfilePage = () => import('./ProfilePage').then((m) => m.ProfilePage);
const loadLoginPage = () => import('./auth/LoginPage').then((m) => m.LoginPage);
const loadOnboardingPage = () =>
  import('./auth/WorkspaceOnboardingPage').then((m) => m.WorkspaceOnboardingPage);

interface AppProps {
  readonly workspace: WorkspaceController;
  readonly registry: RendererRegistry<ComponentChildren>;
  readonly onIngestFile: (file: File) => void;
}

export function App({ workspace, registry, onIngestFile }: AppProps) {
  const [state, setState] = useState<WorkspaceState>(() => workspace.getState());
  const [loginMode, setLoginMode] = useState<AuthProviderId>('entra');
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStepId | undefined>(
    undefined
  );
  const isHydratingUrlRef = useRef(true);

  useEffect(() => workspace.subscribe(setState), [workspace]);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 860px)');
    if (mql.matches) {
      workspace.setSidebarOpen(false);
    }
    function handleBreakpoint(e: MediaQueryListEvent) {
      if (e.matches) workspace.setSidebarOpen(false);
    }
    mql.addEventListener('change', handleBreakpoint);
    return () => mql.removeEventListener('change', handleBreakpoint);
  }, [workspace]);

  useEffect(() => {
    async function applyUrlParams() {
      isHydratingUrlRef.current = true;
      try {
        const params = new URLSearchParams(window.location.search);
        const rawPage = params.get('page')?.trim().toLowerCase();
        const rawProvider = (params.get('provider') ?? params.get('inbox'))?.trim().toLowerCase();

        if (rawPage === 'login' || rawPage === 'signin') {
          const rawMode = params.get('mode')?.trim().toLowerCase();
          if (rawMode === 'okta' || rawMode === 'invite' || rawMode === 'entra') {
            setLoginMode(rawMode);
          }
          workspace.selectSection('login');
          return;
        }
        if (rawPage === 'onboarding' || rawPage === 'setup') {
          const rawStep = params.get('step')?.trim().toLowerCase();
          if (
            rawStep === 'firm' ||
            rawStep === 'identity' ||
            rawStep === 'stack' ||
            rawStep === 'templates' ||
            rawStep === 'team'
          ) {
            setOnboardingStep(rawStep);
          }
          workspace.selectSection('onboarding');
          return;
        }
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
      } finally {
        isHydratingUrlRef.current = false;
      }
    }

    void applyUrlParams();
    window.addEventListener('popstate', applyUrlParams);
    return () => window.removeEventListener('popstate', applyUrlParams);
  }, [registry, workspace]);

  useEffect(() => {
    if (isHydratingUrlRef.current) return;

    const topic = state.topics.find((t) => t.id === state.activeTopicId);
    if (topic) {
      const allBlocks = topic.turns.flatMap((t) => t.blocks);
      const block =
        allBlocks.find((b) => b.id === state.inspectedBlockId) ??
        [...allBlocks].reverse().find((b) => b.kind !== 'prose');
      if (!block) return;
      const pluginId = registry.resolve(block).id;
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.delete('page');
      nextUrl.searchParams.delete('provider');
      nextUrl.searchParams.delete('mode');
      nextUrl.searchParams.delete('step');
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
      nextUrl.searchParams.delete('mode');
      nextUrl.searchParams.delete('step');
      window.history.replaceState(
        null,
        '',
        `${nextUrl.pathname}?${nextUrl.searchParams.toString()}`
      );
    } else if (state.activeSection === 'clients') {
      nextUrl.searchParams.set('page', 'clients');
      nextUrl.searchParams.delete('provider');
      nextUrl.searchParams.delete('mode');
      nextUrl.searchParams.delete('step');
      if (state.selectedClientId) nextUrl.searchParams.set('client', state.selectedClientId);
      else nextUrl.searchParams.delete('client');
      if (state.selectedEngagementId) nextUrl.searchParams.set('eng', state.selectedEngagementId);
      else nextUrl.searchParams.delete('eng');
      window.history.replaceState(
        null,
        '',
        `${nextUrl.pathname}?${nextUrl.searchParams.toString()}`
      );
    } else if (state.activeSection === 'login') {
      nextUrl.searchParams.set('page', 'login');
      nextUrl.searchParams.set('mode', loginMode);
      nextUrl.searchParams.delete('provider');
      nextUrl.searchParams.delete('client');
      nextUrl.searchParams.delete('eng');
      nextUrl.searchParams.delete('step');
      window.history.replaceState(
        null,
        '',
        `${nextUrl.pathname}?${nextUrl.searchParams.toString()}`
      );
    } else if (
      state.activeSection === 'onboarding' ||
      state.activeSection === 'profile' ||
      state.activeSection === 'connectors' ||
      state.activeSection === 'admin'
    ) {
      nextUrl.searchParams.set('page', state.activeSection);
      nextUrl.searchParams.delete('provider');
      nextUrl.searchParams.delete('client');
      nextUrl.searchParams.delete('eng');
      nextUrl.searchParams.delete('mode');
      if (state.activeSection === 'onboarding') {
        if (onboardingStep) nextUrl.searchParams.set('step', onboardingStep);
      } else {
        nextUrl.searchParams.delete('step');
      }
      window.history.replaceState(
        null,
        '',
        `${nextUrl.pathname}?${nextUrl.searchParams.toString()}`
      );
    } else if (window.location.search) {
      window.history.replaceState(null, '', nextUrl.pathname);
    }
  }, [
    loginMode,
    onboardingStep,
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

  if (state.activeSection === 'login' && !activeTopic) {
    return (
      <LazyPageSlot
        slotKey="login"
        label="sign in"
        loader={loadLoginPage}
        render={(LoginPage) => (
          <LoginPage
            initialMode={loginMode}
            defaultEmail={state.userProfile.email}
            defaultFirm={state.userProfile.firm}
            isAlreadyAuthenticated={state.authSession.isAuthenticated}
            onModeChange={setLoginMode}
            onCompleteSignIn={(payload) => workspace.completeSignIn(payload)}
            onStartOnboarding={() => workspace.selectSection('onboarding')}
            onReturnWorkspace={() => workspace.selectSection('home')}
          />
        )}
      />
    );
  }

  if (state.activeSection === 'onboarding' && !activeTopic) {
    return (
      <LazyPageSlot
        slotKey="onboarding"
        label="workspace setup"
        loader={loadOnboardingPage}
        render={(WorkspaceOnboardingPage) => (
          <WorkspaceOnboardingPage
            initialStep={onboardingStep}
            adminEmail={state.userProfile.email}
            connectedIds={state.connectedAppIds}
            onStepChange={setOnboardingStep}
            onToggleConnector={(id) => workspace.toggleConnector(id)}
            onClientCountChange={(count) => workspace.setClientCount(count)}
            onCompleteWorkspaceSetup={(payload) => workspace.completeSignIn(payload)}
            onNavigate={(sec) => workspace.selectSection(sec)}
          />
        )}
      />
    );
  }

  return (
    <div class="app-frame">
      <Sidebar
        isOpen={state.isSidebarOpen}
        activeSection={state.activeSection}
        activeTopicId={state.activeTopicId}
        unreadInboxCount={state.unreadInboxCount}
        clientCount={state.clientCount}
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
          <LazyPageSlot
            slotKey="thread-view"
            label="workpaper thread"
            loader={loadThreadView}
            render={(ThreadView) => (
              <ThreadView
                topic={activeTopic}
                registry={registry}
                inspectedBlockId={state.inspectedBlockId}
                inspectedAnchor={state.inspectedAnchor}
                anchorPulse={state.anchorPulse}
                isStageMaximized={state.isStageMaximized}
                draft={state.composerDraft}
                attachments={state.attachments}
                onReturnHome={() => workspace.returnHome()}
                onInspectBlock={(id, anchor) => workspace.inspectArtifact(id, anchor)}
                onCommitRevision={(blockId, nextData, summary) =>
                  workspace.commitArtifactRevision(blockId, nextData, summary)
                }
                onToggleMaximizeStage={() => workspace.toggleStageMaximize()}
                onDraftChange={(text) => workspace.updateDraft(text)}
                onIngestFile={onIngestFile}
                onRemoveAttachment={(id) => workspace.removeAttachment(id)}
                onLaunchPluginSample={(pluginId) => void workspace.launchPluginSample(pluginId)}
                onSubmit={() => workspace.submitPrompt()}
              />
            )}
          />
        ) : state.activeSection === 'inbox' ? (
          <LazyPageSlot
            slotKey="inbox"
            label="inbox"
            loader={loadInboxWorkspace}
            render={(InboxWorkspace) => (
              <InboxWorkspace
                provider={state.inboxProvider}
                selectedMailId={state.selectedMailId}
                registry={registry}
                senderEmail={state.userProfile.email}
                senderName={state.userProfile.fullName}
                onSwitchProvider={(provider) => workspace.setInboxProvider(provider)}
                onUnreadCountChange={(count) => workspace.setUnreadInboxCount(count)}
                onNavigateSource={(target) => void handleNavigateDeepLink(target)}
              />
            )}
          />
        ) : state.activeSection === 'clients' ? (
          <LazyPageSlot
            slotKey="clients"
            label="clients"
            loader={loadClientsPage}
            render={(ClientsPage) => (
              <ClientsPage
                selectedClientId={state.selectedClientId}
                selectedEngagementId={state.selectedEngagementId}
                onSelectClient={(clientId, engId) =>
                  workspace.openClient(clientId, engId)
                }
                onOpenWorkpaper={(target) => void handleNavigateDeepLink(target)}
                onClientCountChange={(count) => workspace.setClientCount(count)}
              />
            )}
          />
        ) : state.activeSection === 'connectors' ? (
          <LazyPageSlot
            slotKey="connectors"
            label="connectors"
            loader={loadConnectorsPage}
            render={(ConnectorsPage) => (
              <ConnectorsPage
                connectedIds={state.connectedAppIds}
                disconnectedIds={state.disconnectedAppIds}
                onToggleConnector={(id) => workspace.toggleConnector(id)}
                onOpenInboxProvider={(provider) => workspace.setInboxProvider(provider)}
                onNavigate={(sec) => workspace.selectSection(sec)}
              />
            )}
          />
        ) : state.activeSection === 'admin' ? (
          <LazyPageSlot
            slotKey="admin"
            label="firm admin"
            loader={loadFirmAdminPage}
            render={(FirmAdminPage) => (
              <FirmAdminPage
                onOpenClientEngagement={(clientId, engId) =>
                  workspace.openClient(clientId, engId)
                }
                onOpenWorkpaper={(target) => void handleNavigateDeepLink(target)}
                onOpenOnboarding={() => workspace.selectSection('onboarding')}
                onClientCountChange={(count) => workspace.setClientCount(count)}
              />
            )}
          />
        ) : state.activeSection === 'profile' ? (
          <LazyPageSlot
            slotKey="profile"
            label="profile"
            loader={loadProfilePage}
            render={(ProfilePage) => (
              <ProfilePage
                profile={state.userProfile}
                authSession={state.authSession}
                connectedCount={state.connectedAppIds.length}
                onUpdateProfile={(patch) => workspace.updateUserProfile(patch)}
                onNavigate={(sec) => workspace.selectSection(sec)}
                onSignOut={() => workspace.signOut()}
              />
            )}
          />
        ) : (
          <Launchpad
            userProfile={state.userProfile}
            todayItems={state.todayItems}
            connectedCount={state.connectedAppIds.length}
            disconnectedIds={state.disconnectedAppIds}
            draft={state.composerDraft}
            attachments={state.attachments}
            registry={registry}
            onDraftChange={(text) => workspace.updateDraft(text)}
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
