import type { RendererRegistry } from './renderers';
import { createInitialWorkspaceState } from './seed';
import { createStore, type ReadableStore } from './store';
import type {
  AuthProviderId,
  ContentBlock,
  ConversationTurn,
  InboxProvider,
  NavSection,
  NetworkStatus,
  TopicThread,
  UserProfile,
  WorkspaceState,
} from './types';

export interface WorkspaceOptions<TView = unknown> {
  readonly initialState?: WorkspaceState;
  readonly responseDelayMs?: number;
  readonly registry?: RendererRegistry<TView>;
}

export interface SignInCompletionPayload {
  readonly provider: AuthProviderId;
  readonly email: string;
  readonly fullName?: string;
  readonly role?: string;
  readonly firm?: string;
  readonly organizationDomain: string;
  readonly ssoTenantLabel: string;
  readonly nextSection?: NavSection;
}

export interface WorkspaceController extends ReadableStore<WorkspaceState> {
  selectSection: (section: NavSection) => void;
  openClient: (clientId: string | null, engagementId?: string | null) => void;
  openMailThread: (mailId: string | null, provider?: InboxProvider) => void;
  setInboxProvider: (provider: InboxProvider) => void;
  setUnreadInboxCount: (count: number) => void;
  setClientCount: (count: number) => void;
  updateUserProfile: (patch: Partial<UserProfile>) => void;
  completeSignIn: (payload: SignInCompletionPayload) => void;
  signOut: () => void;
  toggleConnector: (connectorId: string) => void;
  openTopic: (topicId: string) => void;
  returnHome: () => void;
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  toggleRecents: () => void;
  toggleMoreSidebarRecents: () => void;
  setSearchOpen: (isOpen: boolean) => void;
  setSearchQuery: (query: string) => void;
  updateDraft: (draft: string) => void;
  attachContent: (block: ContentBlock) => void;
  removeAttachment: (blockId: string) => void;
  inspectArtifact: (blockId: string | null, anchor?: string | null) => void;
  commitArtifactRevision: <TData>(
    blockId: string,
    nextData: TData,
    changeSummary: ReadonlyArray<string>
  ) => void;
  toggleStageMaximize: () => void;
  setNetworkStatus: (status: NetworkStatus) => void;
  launchPluginSample: (pluginId: string) => Promise<string | null>;
  submitPrompt: (overridePrompt?: string) => string | null;
  dispose: () => void;
}

let idSequence = 100;
export function nextWorkspaceId(prefix: string): string {
  idSequence += 1;
  return `${prefix}-${idSequence}`;
}

function computeInitialsFromName(name: string, fallback = 'EC'): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
  return initials || fallback;
}

export function createWorkspace<TView = unknown>(
  options: WorkspaceOptions<TView> = {}
): WorkspaceController {
  const store = createStore<WorkspaceState>(options.initialState ?? createInitialWorkspaceState());
  const delayMs = options.responseDelayMs ?? 90;
  const registry = options.registry;
  const activeTimers = new Set<ReturnType<typeof setTimeout>>();
  let isDisposed = false;

  function isStageBlock(block: ContentBlock): boolean {
    if (registry) return registry.resolve(block).placement === 'stage';
    return block.kind !== 'prose' && block.kind !== 'code';
  }

  function findFirstStageArtifact(blocks: ReadonlyArray<ContentBlock>): string | null {
    return blocks.find(isStageBlock)?.id ?? null;
  }

  async function resolveAssistantOutput(
    prompt: string,
    userAttachments: ReadonlyArray<ContentBlock>
  ): Promise<{ blocks: ReadonlyArray<ContentBlock>; defaultAnchor?: string }> {
    const attachedStage = userAttachments.find(isStageBlock);
    if (attachedStage) {
      return {
        blocks: [
          {
            id: nextWorkspaceId('block'),
            kind: 'prose',
            data: `Loaded **${attachedStage.filename ?? attachedStage.title ?? 'workpaper'}**.`,
          },
          attachedStage,
        ],
      };
    }

    const matchedPlugin = registry?.matchPromptPlugin(prompt);
    if (matchedPlugin?.createSample) {
      const sample = await matchedPlugin.createSample(nextWorkspaceId);
      return {
        defaultAnchor: sample.defaultAnchor,
        blocks: [{ id: nextWorkspaceId('block'), kind: 'prose', data: sample.prose }, sample.artifact],
      };
    }

    return {
      blocks: [
        {
          id: nextWorkspaceId('block'),
          kind: 'prose',
          data: `Note recorded for **${prompt}**. Use **+** to attach a spreadsheet or open a workpaper.`,
        },
      ],
    };
  }

  async function deliverAssistantTurn(
    topicId: string,
    assistantTurnId: string,
    prompt: string,
    attachments: ReadonlyArray<ContentBlock>
  ) {
    if (isDisposed) return;
    const { blocks: generatedBlocks, defaultAnchor } = await resolveAssistantOutput(
      prompt,
      attachments
    );
    if (isDisposed) return;
    const stageArtifactId = findFirstStageArtifact(generatedBlocks);

    store.update((state) => ({
      ...state,
      inspectedBlockId: stageArtifactId ?? state.inspectedBlockId,
      inspectedAnchor: defaultAnchor ?? null,
      anchorPulse: defaultAnchor ? state.anchorPulse + 1 : state.anchorPulse,
      queuedTurnIds: state.queuedTurnIds.filter((id) => id !== assistantTurnId),
      topics: state.topics.map((topic) => {
        if (topic.id !== topicId) return topic;
        const firstProse = generatedBlocks.find((b) => b.kind === 'prose');
        const previewText =
          typeof firstProse?.data === 'string'
            ? firstProse.data.replace(/\s+/g, ' ').slice(0, 140)
            : topic.preview;

        return {
          ...topic,
          preview: previewText,
          turns: topic.turns.map((turn) =>
            turn.id === assistantTurnId
              ? { ...turn, status: 'complete', blocks: generatedBlocks }
              : turn
          ),
        };
      }),
    }));
  }

  const pendingOfflinePayloads = new Map<
    string,
    { topicId: string; prompt: string; attachments: ReadonlyArray<ContentBlock> }
  >();

  const controller: WorkspaceController = {
    getState: store.getState,
    subscribe: store.subscribe,
    getListenerCount: store.getListenerCount,

    selectSection(section) {
      store.update((state) => ({
        ...state,
        activeSection: section,
        selectedClientId: section === 'clients' ? null : state.selectedClientId,
        selectedEngagementId: null,
        selectedMailId: section === 'inbox' ? null : state.selectedMailId,
        activeTopicId: null,
        inspectedBlockId: null,
        inspectedAnchor: null,
      }));
    },

    openClient(clientId, engagementId = null) {
      store.update((state) => ({
        ...state,
        activeSection: 'clients',
        selectedClientId: clientId,
        selectedEngagementId: engagementId,
        activeTopicId: null,
        inspectedBlockId: null,
        inspectedAnchor: null,
      }));
    },

    openMailThread(mailId, provider) {
      store.update((state) => ({
        ...state,
        activeSection: 'inbox',
        inboxProvider: provider ?? state.inboxProvider,
        selectedMailId: mailId,
        activeTopicId: null,
        inspectedBlockId: null,
        inspectedAnchor: null,
      }));
    },

    setInboxProvider(provider) {
      store.update((state) =>
        state.activeSection === 'inbox' &&
        state.inboxProvider === provider &&
        state.activeTopicId === null
          ? state
          : {
              ...state,
              activeSection: 'inbox',
              inboxProvider: provider,
              activeTopicId: null,
            }
      );
    },

    setUnreadInboxCount(count) {
      const clamped = Math.max(0, count);
      store.update((state) =>
        state.unreadInboxCount === clamped ? state : { ...state, unreadInboxCount: clamped }
      );
    },

    setClientCount(count) {
      const clamped = Math.max(0, count);
      store.update((state) =>
        state.clientCount === clamped ? state : { ...state, clientCount: clamped }
      );
    },

    updateUserProfile(patch) {
      store.update((state) => {
        const nextName = patch.fullName ?? state.userProfile.fullName;
        return {
          ...state,
          userProfile: {
            ...state.userProfile,
            ...patch,
            initials: computeInitialsFromName(nextName, state.userProfile.initials),
          },
        };
      });
    },

    completeSignIn(payload) {
      store.update((state) => {
        const nextName = payload.fullName?.trim() || state.userProfile.fullName;
        const nextEmail = payload.email.trim() || state.userProfile.email;
        const nextRole = payload.role?.trim() || state.userProfile.role;
        const nextFirm = payload.firm?.trim() || state.userProfile.firm;
        return {
          ...state,
          activeSection: payload.nextSection ?? 'home',
          activeTopicId: null,
          inspectedBlockId: null,
          authSession: {
            isAuthenticated: true,
            provider: payload.provider,
            organizationDomain: payload.organizationDomain,
            ssoTenantLabel: payload.ssoTenantLabel,
            lastVerifiedAt: 'Verified just now',
          },
          userProfile: {
            ...state.userProfile,
            fullName: nextName,
            initials: computeInitialsFromName(nextName, state.userProfile.initials),
            email: nextEmail,
            role: nextRole,
            firm: nextFirm,
          },
        };
      });
    },

    signOut() {
      store.update((state) => ({
        ...state,
        activeSection: 'login',
        activeTopicId: null,
        inspectedBlockId: null,
        inspectedAnchor: null,
        authSession: {
          ...state.authSession,
          isAuthenticated: false,
          lastVerifiedAt: 'Signed out',
        },
      }));
    },

    toggleConnector(connectorId) {
      store.update((state) => {
        const isCurrentlyConnected = state.connectedAppIds.includes(connectorId);
        if (isCurrentlyConnected) {
          return {
            ...state,
            connectedAppIds: state.connectedAppIds.filter((id) => id !== connectorId),
            disconnectedAppIds: state.disconnectedAppIds.includes(connectorId)
              ? state.disconnectedAppIds
              : [connectorId, ...state.disconnectedAppIds],
          };
        }
        return {
          ...state,
          connectedAppIds: [...state.connectedAppIds, connectorId],
          disconnectedAppIds: state.disconnectedAppIds.filter((id) => id !== connectorId),
        };
      });
    },

    openTopic(topicId) {
      store.update((state) => {
        const topic = state.topics.find((item) => item.id === topicId);
        if (!topic) return state;

        const allBlocks = topic.turns.flatMap((turn) => turn.blocks);
        const defaultArtifact = findFirstStageArtifact(allBlocks);

        return {
          ...state,
          activeSection: 'home',
          activeTopicId: topicId,
          inspectedBlockId: defaultArtifact,
          inspectedAnchor: null,
          isSearchOpen: false,
        };
      });
    },

    returnHome() {
      store.update((state) => ({
        ...state,
        activeSection: 'home',
        activeTopicId: null,
        inspectedBlockId: null,
        inspectedAnchor: null,
        isStageMaximized: false,
      }));
    },

    toggleSidebar() {
      store.update((state) => ({ ...state, isSidebarOpen: !state.isSidebarOpen }));
    },

    setSidebarOpen(isOpen) {
      store.update((state) =>
        state.isSidebarOpen === isOpen ? state : { ...state, isSidebarOpen: isOpen }
      );
    },

    toggleRecents() {
      store.update((state) => ({ ...state, isRecentsOpen: !state.isRecentsOpen }));
    },

    toggleMoreSidebarRecents() {
      store.update((state) => ({
        ...state,
        showAllSidebarRecents: !state.showAllSidebarRecents,
      }));
    },

    setSearchOpen(isOpen) {
      store.update((state) => ({
        ...state,
        isSearchOpen: isOpen,
        searchQuery: isOpen ? state.searchQuery : '',
      }));
    },

    setSearchQuery(query) {
      store.update((state) => ({ ...state, searchQuery: query }));
    },

    updateDraft(draft) {
      store.update((state) => ({ ...state, composerDraft: draft }));
    },

    attachContent(block) {
      store.update((state) => ({
        ...state,
        attachments: [...state.attachments, block],
      }));
    },

    removeAttachment(blockId) {
      store.update((state) => ({
        ...state,
        attachments: state.attachments.filter((item) => item.id !== blockId),
      }));
    },

    inspectArtifact(blockId, anchor = null) {
      store.update((state) => ({
        ...state,
        inspectedBlockId: blockId,
        inspectedAnchor: anchor,
        anchorPulse: anchor ? state.anchorPulse + 1 : state.anchorPulse,
        isStageMaximized: blockId === null ? false : state.isStageMaximized,
      }));
    },

    commitArtifactRevision(blockId, nextData, changeSummary) {
      if (changeSummary.length === 0) return;

      store.update((state) => {
        const targetTopic = state.topics.find((t) =>
          t.turns.some((turn) => turn.blocks.some((b) => b.id === blockId))
        );
        if (!targetTopic) return state;

        const targetBlock = targetTopic.turns
          .flatMap((t) => t.blocks)
          .find((b) => b.id === blockId);
        const artifactLabel = targetBlock?.filename ?? targetBlock?.title ?? 'workpaper';
        const bulletLines = changeSummary.map((line) => `• ${line}`).join('\n');

        const userRevisionTurn: ConversationTurn = {
          id: nextWorkspaceId('turn-user-rev'),
          role: 'user',
          createdAt: 'Just now',
          status: 'complete',
          blocks: [
            {
              id: nextWorkspaceId('block'),
              kind: 'prose',
              data: `Updated **${artifactLabel}** with ${changeSummary.length} correction${changeSummary.length === 1 ? '' : 's'}:\n\n${bulletLines}`,
            },
          ],
        };

        const assistantAckTurn: ConversationTurn = {
          id: nextWorkspaceId('turn-assistant-rev'),
          role: 'assistant',
          createdAt: 'Just now',
          status: 'complete',
          blocks: [
            {
              id: nextWorkspaceId('block'),
              kind: 'prose',
              data: `Saved ${changeSummary.length} revision${changeSummary.length === 1 ? '' : 's'} to **${artifactLabel}**. Workpaper state updated.`,
            },
          ],
        };

        return {
          ...state,
          topics: state.topics.map((topic) => {
            if (topic.id !== targetTopic.id) return topic;
            const updatedTurns = topic.turns.map((turn) => ({
              ...turn,
              blocks: turn.blocks.map((b) =>
                b.id === blockId ? { ...b, data: nextData } : b
              ),
            }));
            return {
              ...topic,
              dateLabel: 'Just now',
              preview: `Synced ${changeSummary.length} correction(s) to ${artifactLabel}`,
              turns: [...updatedTurns, userRevisionTurn, assistantAckTurn],
            };
          }),
        };
      });
    },

    toggleStageMaximize() {
      store.update((state) => ({
        ...state,
        isStageMaximized: !state.isStageMaximized,
      }));
    },

    setNetworkStatus(status) {
      store.update((state) =>
        state.networkStatus === status ? state : { ...state, networkStatus: status }
      );
      if (status !== 'offline' && pendingOfflinePayloads.size > 0) {
        for (const [turnId, item] of pendingOfflinePayloads.entries()) {
          pendingOfflinePayloads.delete(turnId);
          void deliverAssistantTurn(item.topicId, turnId, item.prompt, item.attachments);
        }
      }
    },

    async launchPluginSample(pluginId) {
      const plugin = registry?.listPlugins().find((p) => p.id === pluginId);
      if (!plugin?.createSample) return null;
      const sample = await plugin.createSample(nextWorkspaceId);
      if (isDisposed) return null;

      const assistantTurn: ConversationTurn = {
        id: nextWorkspaceId('turn-assistant'),
        role: 'assistant',
        createdAt: 'Just now',
        status: 'complete',
        blocks: [{ id: nextWorkspaceId('block'), kind: 'prose', data: sample.prose }, sample.artifact],
      };

      const current = store.getState();
      const targetTopicId = current.activeTopicId ?? nextWorkspaceId('topic');
      const titleText = sample.artifact.title ?? plugin.label;

      store.update((state) => {
        const existing = state.topics.find((t) => t.id === targetTopicId);
        const topics = existing
          ? state.topics.map((t) =>
              t.id === targetTopicId
                ? { ...t, dateLabel: 'Just now', turns: [...t.turns, assistantTurn] }
                : t
            )
          : [
              {
                id: targetTopicId,
                title: titleText,
                preview: sample.prose.replace(/\s+/g, ' ').slice(0, 140),
                dateLabel: 'Just now',
                sidebarIcon: 'doc' as const,
                pinnedInSidebar: true,
                listedOnHome: true,
                turns: [assistantTurn],
              },
              ...state.topics,
            ];

        return {
          ...state,
          activeSection: 'home',
          activeTopicId: targetTopicId,
          inspectedBlockId: plugin.placement === 'stage' ? sample.artifact.id : null,
          inspectedAnchor: sample.defaultAnchor ?? null,
          anchorPulse: sample.defaultAnchor ? state.anchorPulse + 1 : state.anchorPulse,
          topics,
        };
      });

      return targetTopicId;
    },

    submitPrompt(overridePrompt) {
      const current = store.getState();
      const rawPrompt = (overridePrompt ?? current.composerDraft).trim();
      const attached = current.attachments;

      if (!rawPrompt && attached.length === 0) return null;

      const effectivePrompt =
        rawPrompt || `Inspect ${attached.map((a) => a.filename ?? a.title ?? 'workpaper').join(', ')}`;

      const userBlocks: ContentBlock[] = [];
      if (rawPrompt) {
        userBlocks.push({ id: nextWorkspaceId('block'), kind: 'prose', data: rawPrompt });
      }
      for (const item of attached) {
        userBlocks.push(item);
      }

      const userTurn: ConversationTurn = {
        id: nextWorkspaceId('turn-user'),
        role: 'user',
        createdAt: 'Just now',
        status: 'complete',
        blocks: userBlocks,
      };

      const isOffline = current.networkStatus === 'offline';
      const assistantTurnId = nextWorkspaceId('turn-assistant');
      const assistantTurn: ConversationTurn = {
        id: assistantTurnId,
        role: 'assistant',
        createdAt: 'Just now',
        status: isOffline ? 'queued-offline' : 'streaming',
        blocks: [
          {
            id: nextWorkspaceId('block'),
            kind: 'prose',
            data: isOffline
              ? 'Connection offline — your request is queued locally and will execute automatically as soon as connectivity returns.'
              : 'Preparing workpaper…',
          },
        ],
      };

      const targetTopicId = current.activeTopicId ?? nextWorkspaceId('topic');

      store.update((state) => {
        const existingTopic = state.topics.find((t) => t.id === targetTopicId);
        let updatedTopics: ReadonlyArray<TopicThread>;

        if (existingTopic) {
          updatedTopics = state.topics.map((topic) =>
            topic.id === targetTopicId
              ? { ...topic, dateLabel: 'Just now', turns: [...topic.turns, userTurn, assistantTurn] }
              : topic
          );
        } else {
          const newTopic: TopicThread = {
            id: targetTopicId,
            title: effectivePrompt.slice(0, 72),
            sidebarTitle:
              effectivePrompt.length > 34 ? `${effectivePrompt.slice(0, 34)}...` : effectivePrompt,
            preview: effectivePrompt,
            dateLabel: 'Just now',
            sidebarIcon: 'doc',
            pinnedInSidebar: true,
            listedOnHome: true,
            turns: [userTurn, assistantTurn],
          };
          updatedTopics = [newTopic, ...state.topics];
        }

        return {
          ...state,
          activeSection: 'home',
          activeTopicId: targetTopicId,
          composerDraft: overridePrompt ? state.composerDraft : '',
          attachments: [],
          topics: updatedTopics,
          queuedTurnIds: isOffline
            ? [...state.queuedTurnIds, assistantTurnId]
            : state.queuedTurnIds,
        };
      });

      if (isOffline) {
        pendingOfflinePayloads.set(assistantTurnId, {
          topicId: targetTopicId,
          prompt: effectivePrompt,
          attachments: attached,
        });
      } else if (delayMs <= 0) {
        void deliverAssistantTurn(targetTopicId, assistantTurnId, effectivePrompt, attached);
      } else {
        const effectiveDelay = current.networkStatus === 'slow' ? delayMs * 2 : delayMs;
        const timer = setTimeout(() => {
          activeTimers.delete(timer);
          void deliverAssistantTurn(targetTopicId, assistantTurnId, effectivePrompt, attached);
        }, effectiveDelay);
        activeTimers.add(timer);
      }

      return targetTopicId;
    },

    dispose() {
      isDisposed = true;
      for (const timer of activeTimers) {
        clearTimeout(timer);
      }
      activeTimers.clear();
      pendingOfflinePayloads.clear();
    },
  };

  return controller;
}

export function selectHomeRecentTopics(state: WorkspaceState): ReadonlyArray<TopicThread> {
  return state.topics.filter((topic) => topic.listedOnHome);
}

export function selectSidebarRecentTopics(state: WorkspaceState): ReadonlyArray<TopicThread> {
  const q = state.searchQuery.trim().toLowerCase();
  const pinned = state.topics.filter((topic) => topic.pinnedInSidebar);
  const filtered = q
    ? pinned.filter(
        (t) => t.title.toLowerCase().includes(q) || t.preview.toLowerCase().includes(q)
      )
    : pinned;
  return state.showAllSidebarRecents || q ? filtered : filtered.slice(0, 5);
}

export function selectFilteredTopics(state: WorkspaceState): ReadonlyArray<TopicThread> {
  const q = state.searchQuery.trim().toLowerCase();
  if (!q) return state.topics;
  return state.topics.filter(
    (topic) =>
      topic.title.toLowerCase().includes(q) || topic.preview.toLowerCase().includes(q)
  );
}
