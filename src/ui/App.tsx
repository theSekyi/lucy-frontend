import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { OnboardingStepId } from '../core/onboarding';
import type { RendererRegistry } from '../core/renderers';
import {
  formatRoute,
  getRouteTitle,
  isSamePrimaryView,
  parseRoute,
  routesEqual,
  type AppRoute,
} from '../core/routes';
import type {
  AuthProviderId,
  TodayWorkItem,
  WorkspaceNotification,
  WorkspaceState,
} from '../core/types';
import {
  selectSidebarRecentTopics,
  type WorkspaceController,
} from '../core/workspace';
import type { DeepLinkTarget } from './inbox/MailIntelligencePanel';
import { Launchpad } from './Launchpad';
import { ErrorBoundary, reloadForUpdatedVersion } from './primitives/ErrorBoundary';
import { clearResolvedPageCache, LazyPageSlot } from './primitives/LazyPageSlot';
import { ToastRegion } from './primitives/ToastRegion';
import { Sidebar } from './Sidebar';

const loadThreadView = () => import('./ThreadView').then((m) => m.ThreadView);
const loadCommandPalette = () =>
  import('./CommandPalette').then((m) => m.CommandPalette);
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

function deriveRouteFromState(
  state: WorkspaceState,
  loginMode: AuthProviderId,
  onboardingStep: OnboardingStepId
): AppRoute {
  if (!state.authSession.isAuthenticated) {
    if (state.activeSection === 'onboarding') {
      return { kind: 'onboarding', step: onboardingStep };
    }
    return { kind: 'login', mode: loginMode };
  }

  if (state.activeTopicId) {
    return {
      kind: 'workpaper',
      topicId: state.activeTopicId,
      blockId: state.inspectedBlockId,
      anchor: state.inspectedAnchor,
    };
  }

  switch (state.activeSection) {
    case 'inbox':
      return {
        kind: 'inbox',
        provider: state.inboxProvider,
        mailId: state.selectedMailId,
      };
    case 'clients':
      return {
        kind: 'clients',
        clientId: state.selectedClientId,
        engagementId: state.selectedEngagementId,
      };
    case 'connectors':
      return { kind: 'connectors' };
    case 'admin':
      return { kind: 'admin' };
    case 'profile':
      return { kind: 'profile' };
    case 'login':
      return { kind: 'login', mode: loginMode };
    case 'onboarding':
      return { kind: 'onboarding', step: onboardingStep };
    case 'home':
    default:
      return { kind: 'home' };
  }
}

export function App({ workspace, registry, onIngestFile }: AppProps) {
  const [state, setState] = useState<WorkspaceState>(() => workspace.getState());
  const [, bumpRegistryRevision] = useState(0);
  const [loginMode, setLoginMode] = useState<AuthProviderId>('entra');
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStepId>('firm');
  const isApplyingHistoryRef = useRef(true);
  const lastRouteRef = useRef<AppRoute | null>(null);

  useEffect(() => {
    setState(workspace.getState());
    return workspace.subscribe(setState);
  }, [workspace]);

  useEffect(
    () => registry.subscribe(() => bumpRegistryRevision((n) => n + 1)),
    [registry]
  );

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
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
    function applyLocationSearch(isInitialMount: boolean) {
      isApplyingHistoryRef.current = true;
      try {
        const rawSearch = window.location.search;
        const parsed = parseRoute(rawSearch);
        lastRouteRef.current = parsed;

        // On bare "/" initial mount, preserve any already-active or persisted workspace view
        // and let deriveRouteFromState synchronize the URL instead of clobbering it to Home.
        if (isInitialMount && rawSearch.trim() === '' && parsed.kind === 'home') {
          if (!workspace.getState().authSession.isAuthenticated) {
            workspace.selectSection('login');
          }
          return;
        }

        if (!workspace.getState().authSession.isAuthenticated) {
          if (parsed.kind === 'onboarding') {
            setOnboardingStep(parsed.step);
            workspace.selectSection('onboarding');
          } else {
            if (parsed.kind === 'login') setLoginMode(parsed.mode);
            workspace.selectSection('login');
          }
          return;
        }

        switch (parsed.kind) {
          case 'login':
            setLoginMode(parsed.mode);
            workspace.selectSection('login');
            break;
          case 'onboarding':
            setOnboardingStep(parsed.step);
            workspace.selectSection('onboarding');
            break;
          case 'profile':
          case 'connectors':
          case 'admin':
          case 'home':
            workspace.selectSection(parsed.kind);
            break;
          case 'clients':
            workspace.openClient(parsed.clientId ?? null, parsed.engagementId ?? null);
            break;
          case 'inbox':
            if (parsed.mailId) {
              workspace.openMailThread(parsed.mailId, parsed.provider);
            } else {
              workspace.setInboxProvider(parsed.provider);
            }
            break;
          case 'workpaper': {
            const opened = workspace.openWorkpaper(parsed.topicId, parsed.anchor);
            if (opened && parsed.blockId) {
              workspace.inspectArtifact(parsed.blockId, parsed.anchor);
            } else if (!opened) {
              const matchedPlugin = registry.findByRoute(parsed.topicId);
              if (matchedPlugin) {
                void workspace.launchPluginSample(matchedPlugin.id).then((topicId) => {
                  if (topicId && parsed.anchor) {
                    const blockId = workspace.getState().inspectedBlockId;
                    if (blockId) workspace.inspectArtifact(blockId, parsed.anchor);
                  }
                });
              } else {
                workspace.selectSection('home');
              }
            }
            break;
          }
        }
      } finally {
        isApplyingHistoryRef.current = false;
      }
    }

    const onPopState = () => applyLocationSearch(false);
    applyLocationSearch(true);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [registry, workspace]);

  const activeTopic = state.topics.find((t) => t.id === state.activeTopicId) ?? null;

  useEffect(() => {
    const nextRoute = deriveRouteFromState(state, loginMode, onboardingStep);
    document.title = getRouteTitle(nextRoute, { topicTitle: activeTopic?.title });

    if (isApplyingHistoryRef.current) {
      lastRouteRef.current = nextRoute;
      return;
    }

    const prevRoute = lastRouteRef.current;
    const nextUrl = formatRoute(nextRoute, window.location.pathname);
    const currentUrl = `${window.location.pathname}${window.location.search}`;

    if (prevRoute && routesEqual(prevRoute, nextRoute) && nextUrl === currentUrl) {
      return;
    }

    if (!prevRoute || isSamePrimaryView(prevRoute, nextRoute)) {
      window.history.replaceState(null, '', nextUrl);
    } else {
      window.history.pushState(null, '', nextUrl);
    }
    lastRouteRef.current = nextRoute;
  }, [
    activeTopic?.title,
    loginMode,
    onboardingStep,
    state,
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
        workspace.setCommandPaletteOpen(!workspace.getState().isCommandPaletteOpen);
        return;
      }
      if (event.key === 'Escape') {
        const current = workspace.getState();
        if (current.isCommandPaletteOpen) {
          workspace.setCommandPaletteOpen(false);
          return;
        }
        const target = event.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable)
        ) {
          return;
        }
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

  const sidebarRecents = selectSidebarRecentTopics(state);

  async function handleNavigateDeepLink(target: DeepLinkTarget) {
    const key = target.workpaperId ?? target.pluginRoute;
    if (key) {
      const openedExisting = workspace.openWorkpaper(key, target.anchor);
      if (openedExisting) {
        if (target.blockId) {
          workspace.inspectArtifact(target.blockId, target.anchor);
        }
        return;
      }

      const matched = registry.findByRoute(key);
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
    if (workspace.openWorkpaper(item.target.workpaperId, item.target.anchor)) {
      return;
    }
    void handleNavigateDeepLink({
      workpaperId: item.target.workpaperId,
      pluginRoute: item.target.pluginRoute,
      anchor: item.target.anchor,
    });
  }

  function handleToastAction(item: WorkspaceNotification) {
    workspace.dismissNotification(item.id);
    if (item.reloadApp) {
      reloadForUpdatedVersion();
    } else if (item.undoRevisionId) {
      workspace.undoRevision(item.undoRevisionId);
    } else if (item.undoSentMailId) {
      workspace.undoSentMail(item.undoSentMailId);
    }
  }

  const effectiveSection =
    !state.authSession.isAuthenticated &&
    state.activeSection !== 'login' &&
    state.activeSection !== 'onboarding'
      ? 'login'
      : state.activeSection;

  if (effectiveSection === 'login' && !activeTopic) {
    return (
      <ErrorBoundary boundaryKey="login-shell" label="sign in">
        <LazyPageSlot
          key="login"
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
        <ToastRegion
          notifications={state.notifications}
          onAction={handleToastAction}
          onDismiss={(id) => workspace.dismissNotification(id)}
        />
      </ErrorBoundary>
    );
  }

  if (effectiveSection === 'onboarding' && !activeTopic) {
    return (
      <ErrorBoundary boundaryKey="onboarding-shell" label="workspace setup">
        <LazyPageSlot
          key="onboarding"
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
        <ToastRegion
          notifications={state.notifications}
          onAction={handleToastAction}
          onDismiss={(id) => workspace.dismissNotification(id)}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary boundaryKey="app-shell" label="Lucy workspace">
      <div class="app-frame">
        <a href="#main-content" class="skip-link">
          Skip to main content
        </a>

        <Sidebar
          isOpen={state.isSidebarOpen}
          activeSection={effectiveSection}
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
          onOpenCommandPalette={() => workspace.setCommandPaletteOpen(true)}
          onToggleSearch={() => workspace.setSearchOpen(!state.isSearchOpen)}
          onSearchChange={(q) => workspace.setSearchQuery(q)}
          onToggleRecents={() => workspace.toggleRecents()}
          onToggleMoreRecents={() => workspace.toggleMoreSidebarRecents()}
          onOpenTopic={(id) => workspace.openTopic(id)}
        />

        <main id="main-content" class="main-surface" tabIndex={-1}>
          {activeTopic ? (
            <LazyPageSlot
              key="thread-view"
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
                  artifactDrafts={state.artifactDrafts}
                  revisions={state.revisions}
                  actorName={state.userProfile.fullName}
                  onReturnHome={() => workspace.returnHome()}
                  onInspectBlock={(id, anchor) => workspace.inspectArtifact(id, anchor)}
                  onUpdateArtifactDraft={(blockId, nextDraft) =>
                    workspace.updateArtifactDraft(blockId, nextDraft)
                  }
                  onClearArtifactDraft={(blockId) =>
                    workspace.clearArtifactDraft(blockId)
                  }
                  onCommitRevision={(blockId, nextData, summary) => {
                    workspace.commitArtifactRevision(blockId, nextData, summary);
                  }}
                  onUndoRevision={(revisionId) => workspace.undoRevision(revisionId)}
                  onToggleMaximizeStage={() => workspace.toggleStageMaximize()}
                  onDraftChange={(text) => workspace.updateDraft(text)}
                  onIngestFile={onIngestFile}
                  onRemoveAttachment={(id) => workspace.removeAttachment(id)}
                  onLaunchPluginSample={(pluginId) => void workspace.launchPluginSample(pluginId)}
                  onSubmit={() => workspace.submitPrompt()}
                />
              )}
            />
          ) : effectiveSection === 'inbox' ? (
            <LazyPageSlot
              key="inbox"
              slotKey="inbox"
              label="inbox"
              loader={loadInboxWorkspace}
              render={(InboxWorkspace) => (
                <InboxWorkspace
                  provider={state.inboxProvider}
                  selectedMailId={state.selectedMailId}
                  mailThreads={state.mailThreads}
                  registry={registry}
                  workspace={workspace}
                  senderEmail={state.userProfile.email}
                  senderName={state.userProfile.fullName}
                  onSwitchProvider={(provider) => workspace.setInboxProvider(provider)}
                  onSelectMailThread={(mailId) => {
                    if (mailId) workspace.openMailThread(mailId);
                  }}
                  onNavigateSource={(target) => void handleNavigateDeepLink(target)}
                />
              )}
            />
          ) : effectiveSection === 'clients' ? (
            <LazyPageSlot
              key="clients"
              slotKey="clients"
              label="clients"
              loader={loadClientsPage}
              render={(ClientsPage) => (
                <ClientsPage
                  selectedClientId={state.selectedClientId}
                  selectedEngagementId={state.selectedEngagementId}
                  currentUser={state.userProfile}
                  onNotify={(n) => workspace.notify(n)}
                  onSelectClient={(clientId, engId) =>
                    workspace.openClient(clientId, engId)
                  }
                  onOpenWorkpaper={(target) => void handleNavigateDeepLink(target)}
                  onClientCountChange={(count) => workspace.setClientCount(count)}
                />
              )}
            />
          ) : effectiveSection === 'connectors' ? (
            <LazyPageSlot
              key="connectors"
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
          ) : effectiveSection === 'admin' ? (
            <LazyPageSlot
              key="admin"
              slotKey="admin"
              label="firm admin"
              loader={loadFirmAdminPage}
              render={(FirmAdminPage) => (
                <FirmAdminPage
                  currentUser={state.userProfile}
                  onNotify={(n) => workspace.notify(n)}
                  onOpenClientEngagement={(clientId, engId) =>
                    workspace.openClient(clientId, engId)
                  }
                  onOpenWorkpaper={(target) => void handleNavigateDeepLink(target)}
                  onOpenOnboarding={() => workspace.selectSection('onboarding')}
                  onClientCountChange={(count) => workspace.setClientCount(count)}
                />
              )}
            />
          ) : effectiveSection === 'profile' ? (
            <LazyPageSlot
              key="profile"
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
                  onSignOut={() => {
                    clearResolvedPageCache();
                    workspace.signOut();
                  }}
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

        {state.isCommandPaletteOpen && (
          <LazyPageSlot
            key="command-palette"
            slotKey="command-palette"
            label="command palette"
            loader={loadCommandPalette}
            render={(CommandPalette) => (
              <CommandPalette
                isOpen={state.isCommandPaletteOpen}
                topics={state.topics}
                mailThreads={state.mailThreads}
                revisions={state.revisions}
                onClose={() => workspace.setCommandPaletteOpen(false)}
                onSelectSection={(sec) => workspace.selectSection(sec)}
                onOpenInboxProvider={(provider) => workspace.setInboxProvider(provider)}
                onOpenTopic={(id) => workspace.openTopic(id)}
                onOpenMailThread={(mailId) => workspace.openMailThread(mailId)}
                onUndoLatestRevision={(revisionId) => workspace.undoRevision(revisionId)}
              />
            )}
          />
        )}

        <ToastRegion
          notifications={state.notifications}
          onAction={handleToastAction}
          onDismiss={(id) => workspace.dismissNotification(id)}
        />
      </div>
    </ErrorBoundary>
  );
}
