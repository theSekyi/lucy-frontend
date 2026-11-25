import type { MailThreadItem } from './inbox';
import { formatAuditTimestamp } from './money';
import { PERSISTENCE_KEYS, type StorageBackend } from './persistence';
import type { RendererRegistry } from './renderers';
import { resolveSeededWorkpaperId } from './routes';
import { createInitialWorkspaceState } from './seed';
import { createStore, type ReadableStore } from './store';
import type {
  ArtifactRevision,
  AuditLogEntry,
  AuthProviderId,
  ContentBlock,
  ConversationTurn,
  InboxProvider,
  NavSection,
  NetworkStatus,
  QueuedOfflinePrompt,
  TopicThread,
  UserProfile,
  WorkspaceNotification,
  WorkspaceState,
} from './types';

export interface WorkspaceOptions<TView = unknown> {
  readonly initialState?: WorkspaceState;
  readonly responseDelayMs?: number;
  readonly registry?: RendererRegistry<TView>;
  readonly persistence?: StorageBackend;
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

export interface SendMailResult {
  readonly ok: boolean;
  readonly sentId?: string;
  readonly error?: string;
}

export interface WorkspaceController extends ReadableStore<WorkspaceState> {
  selectSection: (section: NavSection) => void;
  openClient: (clientId: string | null, engagementId?: string | null) => void;
  openMailThread: (mailId: string | null, provider?: InboxProvider) => void;
  setInboxProvider: (provider: InboxProvider) => void;
  setUnreadInboxCount: (count: number) => void;
  setClientCount: (count: number) => void;
  toggleMailStar: (mailId: string) => void;
  toggleMailFlag: (mailId: string) => void;
  markMailRead: (mailId: string, unread: boolean) => void;
  archiveMailThread: (mailId: string) => void;
  sendMail: (to: string, subject: string, body: string) => SendMailResult;
  undoSentMail: (sentMailId: string) => boolean;
  updateUserProfile: (patch: Partial<UserProfile>) => void;
  completeSignIn: (payload: SignInCompletionPayload) => void;
  signOut: () => void;
  toggleConnector: (connectorId: string) => void;
  openTopic: (topicId: string, anchor?: string | null) => void;
  openWorkpaper: (routeOrWorkpaperId: string, anchor?: string | null) => string | null;
  findBlockById: (blockId: string) => ContentBlock | null;
  returnHome: () => void;
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  toggleRecents: () => void;
  toggleMoreSidebarRecents: () => void;
  setSearchOpen: (isOpen: boolean) => void;
  setSearchQuery: (query: string) => void;
  setCommandPaletteOpen: (isOpen: boolean) => void;
  updateDraft: (draft: string) => void;
  attachContent: (block: ContentBlock) => void;
  removeAttachment: (blockId: string) => void;
  inspectArtifact: (blockId: string | null, anchor?: string | null) => void;
  updateArtifactDraft: <TData>(blockId: string, draftData: TData) => void;
  clearArtifactDraft: (blockId: string) => void;
  commitArtifactRevision: <TData>(
    blockId: string,
    nextData: TData,
    changeSummary: ReadonlyArray<string>
  ) => string | null;
  undoRevision: (revisionId: string) => boolean;
  notify: (input: {
    readonly kind: WorkspaceNotification['kind'];
    readonly message: string;
    readonly undoRevisionId?: string;
    readonly undoSentMailId?: string;
    readonly actionLabel?: string;
  }) => string;
  dismissNotification: (notificationId: string) => void;
  toggleStageMaximize: () => void;
  setNetworkStatus: (status: NetworkStatus) => void;
  ensureInboxHydrated: () => Promise<void>;
  ensureWorkpapersHydrated: () => Promise<void>;
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

function countUnreadInbox(threads: ReadonlyArray<MailThreadItem>): number {
  return threads.filter((t) => t.folder === 'inbox' && t.unread).length;
}

interface PersistedWorkspaceSlice {
  readonly authSession: WorkspaceState['authSession'];
  readonly userProfile: WorkspaceState['userProfile'];
  readonly connectedAppIds: WorkspaceState['connectedAppIds'];
  readonly disconnectedAppIds: WorkspaceState['disconnectedAppIds'];
  readonly mailThreads: WorkspaceState['mailThreads'];
  readonly composerDraft: string;
  readonly topics: WorkspaceState['topics'];
  readonly artifactDrafts: WorkspaceState['artifactDrafts'];
  readonly revisions: WorkspaceState['revisions'];
  readonly auditLog: WorkspaceState['auditLog'];
  readonly queuedPrompts: WorkspaceState['queuedPrompts'];
  readonly queuedTurnIds: WorkspaceState['queuedTurnIds'];
}

function extractPersistedSlice(state: WorkspaceState): PersistedWorkspaceSlice {
  return {
    authSession: state.authSession,
    userProfile: state.userProfile,
    connectedAppIds: state.connectedAppIds,
    disconnectedAppIds: state.disconnectedAppIds,
    mailThreads: state.mailThreads,
    composerDraft: state.composerDraft,
    topics: state.topics,
    artifactDrafts: state.artifactDrafts,
    revisions: state.revisions,
    auditLog: state.auditLog,
    queuedPrompts: state.queuedPrompts,
    queuedTurnIds: state.queuedTurnIds,
  };
}

function mergeHydratedSlice(
  base: WorkspaceState,
  saved: Partial<PersistedWorkspaceSlice> | null | undefined
): WorkspaceState {
  if (!saved || !saved.topics?.length) return base;
  const hasSavedMail = Boolean(saved.mailThreads && saved.mailThreads.length > 0);
  const mailThreads = hasSavedMail ? saved.mailThreads! : base.mailThreads;
  return {
    ...base,
    authSession: saved.authSession ?? base.authSession,
    userProfile: saved.userProfile ?? base.userProfile,
    connectedAppIds: saved.connectedAppIds ?? base.connectedAppIds,
    disconnectedAppIds: saved.disconnectedAppIds ?? base.disconnectedAppIds,
    mailThreads,
    unreadInboxCount: hasSavedMail ? countUnreadInbox(mailThreads) : base.unreadInboxCount,
    composerDraft: saved.composerDraft ?? base.composerDraft,
    topics: saved.topics,
    artifactDrafts: saved.artifactDrafts ?? {},
    revisions: saved.revisions ?? [],
    auditLog: saved.auditLog ?? [],
    queuedPrompts: saved.queuedPrompts ?? [],
    queuedTurnIds: saved.queuedTurnIds ?? [],
  };
}

export function createWorkspace<TView = unknown>(
  options: WorkspaceOptions<TView> = {}
): WorkspaceController {
  const baseInitial = options.initialState ?? createInitialWorkspaceState();
  const syncSaved = options.persistence?.readSync<PersistedWorkspaceSlice>(
    PERSISTENCE_KEYS.workspace
  );
  const store = createStore<WorkspaceState>(mergeHydratedSlice(baseInitial, syncSaved));

  const delayMs = options.responseDelayMs ?? 90;
  const registry = options.registry;
  const activeTimers = new Set<ReturnType<typeof setTimeout>>();
  const inflightTurns = new Set<string>();
  let isDisposed = false;
  let inboxHydrationPromise: Promise<void> | null = null;
  let workpaperHydrationPromise: Promise<void> | null = null;

  function hydrateInboxIfNeeded(): Promise<void> {
    if (store.getState().mailThreads.length > 0) {
      return Promise.resolve();
    }
    if (!inboxHydrationPromise) {
      inboxHydrationPromise = import('./inbox')
        .then(({ INITIAL_MAIL_THREADS }) => {
          if (isDisposed) return;
          store.update((state) => {
            if (state.mailThreads.length > 0) return state;
            const seeded = state.selectedMailId
              ? INITIAL_MAIL_THREADS.map((t) =>
                  t.id === state.selectedMailId ? { ...t, unread: false } : t
                )
              : [...INITIAL_MAIL_THREADS];
            return {
              ...state,
              mailThreads: seeded,
              unreadInboxCount: countUnreadInbox(seeded),
            };
          });
        })
        .finally(() => {
          inboxHydrationPromise = null;
        });
    }
    return inboxHydrationPromise;
  }

  function hydrateWorkpapersIfNeeded(): Promise<void> {
    const hasStub = store.getState().topics.some((t) => t.turns.length === 0);
    if (!hasStub) return Promise.resolve();

    if (!workpaperHydrationPromise) {
      workpaperHydrationPromise = import('./seedWorkpapers')
        .then(({ buildHydratedSeededTopics }) => {
          if (isDisposed) return;
          const hydratedMap = new Map(buildHydratedSeededTopics().map((t) => [t.id, t]));
          store.update((state) => {
            let changed = false;
            const nextTopics = state.topics.map((topic) => {
              if (topic.turns.length > 0) return topic;
              const full = hydratedMap.get(topic.id);
              if (!full) return topic;
              changed = true;
              return full;
            });
            if (!changed) return state;

            const active = state.activeTopicId
              ? nextTopics.find((t) => t.id === state.activeTopicId)
              : null;
            const defaultStageId =
              active && !state.inspectedBlockId
                ? findFirstStageArtifact(active.turns.flatMap((turn) => turn.blocks))
                : state.inspectedBlockId;

            return {
              ...state,
              topics: nextTopics,
              inspectedBlockId: defaultStageId,
            };
          });
        })
        .finally(() => {
          workpaperHydrationPromise = null;
        });
    }
    return workpaperHydrationPromise;
  }

  if (options.persistence) {
    void options.persistence
      .readAsync<PersistedWorkspaceSlice>(PERSISTENCE_KEYS.workspace)
      .then((asyncSaved) => {
        if (isDisposed || !asyncSaved?.topics?.length) return;
        store.update((curr) => ({
          ...mergeHydratedSlice(curr, asyncSaved),
          activeSection: curr.activeSection,
          activeTopicId: curr.activeTopicId,
          inspectedBlockId: curr.inspectedBlockId,
          inspectedAnchor: curr.inspectedAnchor,
          selectedClientId: curr.selectedClientId,
          selectedEngagementId: curr.selectedEngagementId,
          selectedMailId: curr.selectedMailId,
          inboxProvider: curr.inboxProvider,
        }));
      });

    store.subscribe((next) => {
      if (isDisposed) return;
      void options.persistence!.writeAsync(
        PERSISTENCE_KEYS.workspace,
        extractPersistedSlice(next)
      );
    });
  }

  function isStageBlock(block: ContentBlock): boolean {
    if (registry && registry.listPlugins().length > 0) {
      return registry.resolve(block).placement === 'stage';
    }
    return (
      block.kind !== 'prose' &&
      block.kind !== 'code' &&
      block.kind !== 'journal-entry' &&
      block.kind !== 'pbc-tracker'
    );
  }

  function findFirstStageArtifact(blocks: ReadonlyArray<ContentBlock>): string | null {
    return blocks.find(isStageBlock)?.id ?? null;
  }

  function pushNotification(
    state: WorkspaceState,
    entry: Omit<WorkspaceNotification, 'id' | 'createdAtIso'>
  ): { nextNotifications: ReadonlyArray<WorkspaceNotification>; id: string } {
    const id = nextWorkspaceId('toast');
    const created: WorkspaceNotification = {
      id,
      createdAtIso: new Date().toISOString(),
      ...entry,
    };
    return {
      id,
      nextNotifications: [created, ...state.notifications].slice(0, 3),
    };
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
          data: `No matching workpaper schedule found for **"${prompt}"**. Try naming a workpaper (e.g. *Trial Balance*, *Bank Reconciliation*, *Schedule M-1*, *IFRS 16 Rollforward*, *WP E-40 Vouching*, or *MSA Redline*), or click **+** to open a schedule or import an \`.xlsx\` / \`.csv\` file.`,
        },
      ],
    };
  }

  async function deliverAssistantTurn(item: QueuedOfflinePrompt) {
    if (isDisposed || inflightTurns.has(item.turnId)) return;
    inflightTurns.add(item.turnId);

    try {
      const { blocks: generatedBlocks, defaultAnchor } = await resolveAssistantOutput(
        item.prompt,
        item.attachments
      );
      if (isDisposed) return;
      const stageArtifactId = findFirstStageArtifact(generatedBlocks);

      // Remove from durable queue ONLY after delivery succeeds (fixes B5)
      store.update((state) => ({
        ...state,
        inspectedBlockId: stageArtifactId ?? state.inspectedBlockId,
        inspectedAnchor: defaultAnchor ?? null,
        anchorPulse: defaultAnchor ? state.anchorPulse + 1 : state.anchorPulse,
        queuedTurnIds: state.queuedTurnIds.filter((id) => id !== item.turnId),
        queuedPrompts: state.queuedPrompts.filter((q) => q.turnId !== item.turnId),
        topics: state.topics.map((topic) => {
          if (topic.id !== item.topicId) return topic;
          const firstProse = generatedBlocks.find((b) => b.kind === 'prose');
          const previewText =
            typeof firstProse?.data === 'string'
              ? firstProse.data.replace(/\s+/g, ' ').slice(0, 140)
              : topic.preview;

          return {
            ...topic,
            preview: previewText,
            turns: topic.turns.map((turn) =>
              turn.id === item.turnId
                ? { ...turn, status: 'complete', blocks: generatedBlocks }
                : turn
            ),
          };
        }),
      }));
    } catch {
      if (isDisposed) return;
      store.update((state) => ({
        ...state,
        topics: state.topics.map((topic) =>
          topic.id !== item.topicId
            ? topic
            : {
                ...topic,
                turns: topic.turns.map((turn) =>
                  turn.id === item.turnId
                    ? {
                        ...turn,
                        status: 'failed',
                        blocks: [
                          {
                            id: nextWorkspaceId('block'),
                            kind: 'prose',
                            data: 'Failed to load workpaper schedule. Check your connection and retry.',
                          },
                        ],
                      }
                    : turn
                ),
              }
        ),
      }));
    } finally {
      inflightTurns.delete(item.turnId);
    }
  }

  const controller: WorkspaceController = {
    getState: store.getState,
    subscribe: store.subscribe,
    getListenerCount: store.getListenerCount,

    selectSection(section) {
      store.update((state) => {
        if (!state.authSession.isAuthenticated && section !== 'login' && section !== 'onboarding') {
          return {
            ...state,
            activeSection: 'login',
            activeTopicId: null,
            inspectedBlockId: null,
            inspectedAnchor: null,
          };
        }
        return {
          ...state,
          activeSection: section,
          selectedClientId: section === 'clients' ? null : state.selectedClientId,
          selectedEngagementId: null,
          selectedMailId: section === 'inbox' ? state.selectedMailId : null,
          activeTopicId: null,
          inspectedBlockId: null,
          inspectedAnchor: null,
        };
      });
      if (section === 'inbox') {
        void hydrateInboxIfNeeded();
      }
    },

    openClient(clientId, engagementId = null) {
      store.update((state) => {
        if (!state.authSession.isAuthenticated) {
          return { ...state, activeSection: 'login', activeTopicId: null };
        }
        return {
          ...state,
          activeSection: 'clients',
          selectedClientId: clientId,
          selectedEngagementId: engagementId,
          activeTopicId: null,
          inspectedBlockId: null,
          inspectedAnchor: null,
        };
      });
    },

    openMailThread(mailId, provider) {
      store.update((state) => {
        if (!state.authSession.isAuthenticated) {
          return { ...state, activeSection: 'login', activeTopicId: null };
        }
        const nextThreads =
          mailId && state.mailThreads.length > 0
            ? state.mailThreads.map((t) => (t.id === mailId ? { ...t, unread: false } : t))
            : state.mailThreads;
        return {
          ...state,
          activeSection: 'inbox',
          inboxProvider: provider ?? state.inboxProvider,
          selectedMailId: mailId,
          mailThreads: nextThreads,
          unreadInboxCount:
            nextThreads.length > 0 ? countUnreadInbox(nextThreads) : state.unreadInboxCount,
          activeTopicId: null,
          inspectedBlockId: null,
          inspectedAnchor: null,
        };
      });
      void hydrateInboxIfNeeded();
    },

    setInboxProvider(provider) {
      store.update((state) => {
        if (!state.authSession.isAuthenticated) {
          return { ...state, activeSection: 'login', activeTopicId: null };
        }
        if (
          state.activeSection === 'inbox' &&
          state.inboxProvider === provider &&
          state.activeTopicId === null
        ) {
          return state;
        }
        return {
          ...state,
          activeSection: 'inbox',
          inboxProvider: provider,
          activeTopicId: null,
        };
      });
      void hydrateInboxIfNeeded();
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

    toggleMailStar(mailId) {
      store.update((state) => ({
        ...state,
        mailThreads: state.mailThreads.map((t) =>
          t.id === mailId ? { ...t, starred: !t.starred } : t
        ),
      }));
    },

    toggleMailFlag(mailId) {
      store.update((state) => ({
        ...state,
        mailThreads: state.mailThreads.map((t) =>
          t.id === mailId ? { ...t, flagged: !t.flagged } : t
        ),
      }));
    },

    markMailRead(mailId, unread) {
      store.update((state) => {
        const mailThreads = state.mailThreads.map((t) =>
          t.id === mailId ? { ...t, unread } : t
        );
        return {
          ...state,
          mailThreads,
          unreadInboxCount: countUnreadInbox(mailThreads),
        };
      });
    },

    archiveMailThread(mailId) {
      store.update((state) => {
        const target = state.mailThreads.find((t) => t.id === mailId);
        if (!target) return state;
        const mailThreads = state.mailThreads.map((t) =>
          t.id === mailId ? { ...t, folder: 'archive' as const, unread: false } : t
        );
        const { nextNotifications } = pushNotification(state, {
          kind: 'info',
          message: `Archived "${target.subject.slice(0, 48)}"`,
        });
        return {
          ...state,
          mailThreads,
          unreadInboxCount: countUnreadInbox(mailThreads),
          selectedMailId: state.selectedMailId === mailId ? null : state.selectedMailId,
          notifications: nextNotifications,
        };
      });
    },

    sendMail(to, subject, body) {
      const cleanTo = to.trim();
      const cleanSubject = subject.trim();
      const cleanBody = body.trim();

      if (!cleanTo || !cleanTo.includes('@')) {
        const error = 'Enter a valid recipient email address before sending.';
        this.notify({ kind: 'error', message: error });
        return { ok: false, error };
      }
      if (!cleanBody) {
        const error = 'Message body cannot be empty.';
        this.notify({ kind: 'error', message: error });
        return { ok: false, error };
      }

      const nowIso = new Date().toISOString();
      const sentId = nextWorkspaceId('sent');

      store.update((state) => {
        const sentItem: MailThreadItem = {
          id: sentId,
          folder: 'sent',
          senderName: state.userProfile.fullName,
          senderInitials: state.userProfile.initials,
          senderEmail: state.userProfile.email,
          avatarColor: '#374151',
          toList: cleanTo,
          subject: cleanSubject || '(No subject)',
          snippet: cleanBody.replace(/\s+/g, ' ').slice(0, 120),
          bodyParagraphs: cleanBody.split('\n\n'),
          sentAtIso: nowIso,
          timeShort: formatAuditTimestamp(nowIso),
          fullTimestamp: formatAuditTimestamp(nowIso),
          dateGroup: 'Today',
          unread: false,
          starred: false,
          flagged: false,
          gmailCategory: 'primary',
          outlook: { bucket: 'focused' },
          attachments: [],
        };

        const auditEntry: AuditLogEntry = {
          id: nextWorkspaceId('audit'),
          actorName: state.userProfile.fullName,
          actorRole: state.userProfile.role,
          createdAtIso: nowIso,
          action: 'mail.send',
          targetLabel: cleanTo,
          detail: `Sent "${sentItem.subject}"`,
        };

        const { nextNotifications } = pushNotification(state, {
          kind: 'success',
          message: `Sent message to ${cleanTo}`,
          undoSentMailId: sentId,
          actionLabel: 'Undo',
        });

        return {
          ...state,
          mailThreads: [sentItem, ...state.mailThreads],
          auditLog: [auditEntry, ...state.auditLog],
          notifications: nextNotifications,
        };
      });

      return { ok: true, sentId };
    },

    undoSentMail(sentMailId) {
      const current = store.getState();
      const target = current.mailThreads.find((m) => m.id === sentMailId);
      if (!target) return false;

      store.update((state) => {
        const { nextNotifications } = pushNotification(state, {
          kind: 'info',
          message: `Recalled message to ${target.toList}`,
        });
        return {
          ...state,
          mailThreads: state.mailThreads.filter((m) => m.id !== sentMailId),
          notifications: nextNotifications.filter((n) => n.undoSentMailId !== sentMailId),
        };
      });
      return true;
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
      const nowIso = new Date().toISOString();
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
            lastVerifiedAt: formatAuditTimestamp(nowIso),
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
      // Clear runtime Service Worker caches on sign-out so cached responses never persist across sessions (fixes S5)
      const cachesApi = (globalThis as { caches?: CacheStorage }).caches;
      if (cachesApi && typeof cachesApi.keys === 'function') {
        void cachesApi.keys().then((keys) => Promise.all(keys.map((k) => cachesApi.delete(k))));
      }

      store.update((state) => ({
        ...state,
        activeSection: 'login',
        activeTopicId: null,
        inspectedBlockId: null,
        inspectedAnchor: null,
        isCommandPaletteOpen: false,
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
        const { nextNotifications } = pushNotification(state, {
          kind: 'info',
          message: isCurrentlyConnected
            ? `Disconnected ${connectorId}`
            : `Connected ${connectorId}`,
        });
        if (isCurrentlyConnected) {
          return {
            ...state,
            connectedAppIds: state.connectedAppIds.filter((id) => id !== connectorId),
            disconnectedAppIds: state.disconnectedAppIds.includes(connectorId)
              ? state.disconnectedAppIds
              : [connectorId, ...state.disconnectedAppIds],
            notifications: nextNotifications,
          };
        }
        return {
          ...state,
          connectedAppIds: [...state.connectedAppIds, connectorId],
          disconnectedAppIds: state.disconnectedAppIds.filter((id) => id !== connectorId),
          notifications: nextNotifications,
        };
      });
    },

    openTopic(topicId, anchor = null) {
      let needsHydration = false;
      store.update((state) => {
        if (!state.authSession.isAuthenticated) {
          return { ...state, activeSection: 'login', activeTopicId: null };
        }
        const topic = state.topics.find((item) => item.id === topicId);
        if (!topic) return state;

        needsHydration = topic.turns.length === 0;
        const allBlocks = topic.turns.flatMap((turn) => turn.blocks);
        const defaultArtifact = findFirstStageArtifact(allBlocks);

        return {
          ...state,
          activeSection: 'home',
          activeTopicId: topicId,
          inspectedBlockId: defaultArtifact,
          inspectedAnchor: anchor,
          anchorPulse: anchor ? state.anchorPulse + 1 : state.anchorPulse,
          isSearchOpen: false,
          isCommandPaletteOpen: false,
        };
      });
      if (needsHydration) {
        void hydrateWorkpapersIfNeeded();
      }
    },

    openWorkpaper(routeOrWorkpaperId, anchor = null) {
      const current = store.getState();
      if (!current.authSession.isAuthenticated) {
        this.selectSection('login');
        return null;
      }
      const directTopic = current.topics.find((t) => t.id === routeOrWorkpaperId);
      const resolvedId = directTopic?.id ?? resolveSeededWorkpaperId(routeOrWorkpaperId);
      if (!resolvedId) return null;

      const targetTopic = current.topics.find((t) => t.id === resolvedId);
      if (!targetTopic) return null;

      this.openTopic(targetTopic.id, anchor);
      return targetTopic.id;
    },

    findBlockById(blockId) {
      const state = store.getState();
      for (const topic of state.topics) {
        for (const turn of topic.turns) {
          const found = turn.blocks.find((b) => b.id === blockId);
          if (found) return found;
        }
      }
      return null;
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

    setCommandPaletteOpen(isOpen) {
      store.update((state) =>
        state.isCommandPaletteOpen === isOpen
          ? state
          : { ...state, isCommandPaletteOpen: isOpen }
      );
      if (isOpen) {
        void hydrateInboxIfNeeded();
      }
    },

    updateDraft(draft) {
      store.update((state) =>
        state.composerDraft === draft ? state : { ...state, composerDraft: draft }
      );
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

    updateArtifactDraft(blockId, draftData) {
      store.update((state) => ({
        ...state,
        artifactDrafts: {
          ...state.artifactDrafts,
          [blockId]: draftData,
        },
      }));
    },

    clearArtifactDraft(blockId) {
      store.update((state) => {
        if (!(blockId in state.artifactDrafts)) return state;
        const nextDrafts = { ...state.artifactDrafts };
        delete nextDrafts[blockId];
        return {
          ...state,
          artifactDrafts: nextDrafts,
        };
      });
    },

    commitArtifactRevision(blockId, nextData, changeSummary) {
      if (changeSummary.length === 0) return null;

      let createdRevisionId: string | null = null;
      const nowIso = new Date().toISOString();
      const formattedTime = formatAuditTimestamp(nowIso);

      store.update((state) => {
        const targetTopic = state.topics.find((t) =>
          t.turns.some((turn) => turn.blocks.some((b) => b.id === blockId))
        );
        if (!targetTopic) return state;

        const targetBlock = targetTopic.turns
          .flatMap((t) => t.blocks)
          .find((b) => b.id === blockId);
        if (!targetBlock) return state;

        const artifactLabel = targetBlock.filename ?? targetBlock.title ?? 'workpaper';
        const bulletLines = changeSummary.map((line) => `• ${line}`).join('\n');
        const actorName = state.userProfile.fullName;
        const actorRole = state.userProfile.role;

        const revisionId = nextWorkspaceId('rev');
        createdRevisionId = revisionId;

        const revision: ArtifactRevision = {
          id: revisionId,
          blockId,
          topicId: targetTopic.id,
          artifactLabel,
          actorName,
          actorRole,
          createdAtIso: nowIso,
          summary: [...changeSummary],
          beforeData: targetBlock.data,
          afterData: nextData,
        };

        const auditEntry: AuditLogEntry = {
          id: nextWorkspaceId('audit'),
          actorName,
          actorRole,
          createdAtIso: nowIso,
          action: 'workpaper.commit',
          targetLabel: artifactLabel,
          detail: changeSummary.join(' · '),
        };

        const userRevisionTurn: ConversationTurn = {
          id: nextWorkspaceId('turn-user-rev'),
          role: 'user',
          actorName,
          createdAt: `${actorName} · ${formattedTime}`,
          createdAtIso: nowIso,
          status: 'complete',
          blocks: [
            {
              id: nextWorkspaceId('block'),
              kind: 'prose',
              data: `**${actorName}** (${actorRole}) saved ${changeSummary.length} change${changeSummary.length === 1 ? '' : 's'} to **${artifactLabel}** (${formattedTime}):\n\n${bulletLines}`,
            },
          ],
        };

        const assistantAckTurn: ConversationTurn = {
          id: nextWorkspaceId('turn-assistant-rev'),
          role: 'assistant',
          createdAt: formattedTime,
          createdAtIso: nowIso,
          status: 'complete',
          blocks: [
            {
              id: nextWorkspaceId('block'),
              kind: 'prose',
              data: `Revision \`${revisionId}\` recorded in the audit log for **${artifactLabel}**.`,
            },
          ],
        };

        const nextDrafts = { ...state.artifactDrafts };
        delete nextDrafts[blockId];

        const { nextNotifications } = pushNotification(state, {
          kind: 'success',
          message: `Saved ${artifactLabel} (${changeSummary.length} change${changeSummary.length === 1 ? '' : 's'})`,
          undoRevisionId: revisionId,
          actionLabel: 'Undo',
        });

        return {
          ...state,
          artifactDrafts: nextDrafts,
          revisions: [revision, ...state.revisions],
          auditLog: [auditEntry, ...state.auditLog],
          notifications: nextNotifications,
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
              dateLabel: formattedTime,
              updatedAtIso: nowIso,
              preview: `${actorName}: ${changeSummary[0]}`,
              turns: [...updatedTurns, userRevisionTurn, assistantAckTurn],
            };
          }),
        };
      });

      return createdRevisionId;
    },

    undoRevision(revisionId) {
      const current = store.getState();
      const rev = current.revisions.find((r) => r.id === revisionId);
      if (!rev) return false;

      const nowIso = new Date().toISOString();
      const formattedTime = formatAuditTimestamp(nowIso);

      store.update((state) => {
        const nextDrafts = { ...state.artifactDrafts };
        delete nextDrafts[rev.blockId];

        const auditEntry: AuditLogEntry = {
          id: nextWorkspaceId('audit'),
          actorName: state.userProfile.fullName,
          actorRole: state.userProfile.role,
          createdAtIso: nowIso,
          action: 'workpaper.undo',
          targetLabel: rev.artifactLabel,
          detail: `Reverted revision ${rev.id}`,
        };

        const undoTurn: ConversationTurn = {
          id: nextWorkspaceId('turn-undo'),
          role: 'assistant',
          createdAt: formattedTime,
          createdAtIso: nowIso,
          status: 'complete',
          blocks: [
            {
              id: nextWorkspaceId('block'),
              kind: 'prose',
              data: `Reverted revision \`${rev.id}\` on **${rev.artifactLabel}** (${state.userProfile.fullName} · ${formattedTime}).`,
            },
          ],
        };

        const { nextNotifications } = pushNotification(state, {
          kind: 'info',
          message: `Undid changes to ${rev.artifactLabel}`,
        });

        return {
          ...state,
          artifactDrafts: nextDrafts,
          revisions: state.revisions.filter((r) => r.id !== revisionId),
          auditLog: [auditEntry, ...state.auditLog],
          notifications: nextNotifications.filter((n) => n.undoRevisionId !== revisionId),
          topics: state.topics.map((topic) => {
            if (topic.id !== rev.topicId) return topic;
            const restoredTurns = topic.turns.map((turn) => ({
              ...turn,
              blocks: turn.blocks.map((b) =>
                b.id === rev.blockId ? { ...b, data: rev.beforeData } : b
              ),
            }));
            return {
              ...topic,
              dateLabel: formattedTime,
              updatedAtIso: nowIso,
              turns: [...restoredTurns, undoTurn],
            };
          }),
        };
      });

      return true;
    },

    notify(input) {
      let toastId = '';
      store.update((state) => {
        const res = pushNotification(state, input);
        toastId = res.id;
        return {
          ...state,
          notifications: res.nextNotifications,
        };
      });
      return toastId;
    },

    dismissNotification(notificationId) {
      store.update((state) => ({
        ...state,
        notifications: state.notifications.filter((n) => n.id !== notificationId),
      }));
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
      if (status !== 'offline') {
        const pending = store.getState().queuedPrompts;
        for (const item of pending) {
          void deliverAssistantTurn(item);
        }
      }
    },

    ensureInboxHydrated() {
      return hydrateInboxIfNeeded();
    },

    ensureWorkpapersHydrated() {
      return hydrateWorkpapersIfNeeded();
    },

    async launchPluginSample(pluginId) {
      const plugin = registry?.listPlugins().find((p) => p.id === pluginId);
      if (!plugin?.createSample) return null;
      const sample = await plugin.createSample(nextWorkspaceId);
      if (isDisposed) return null;

      const nowIso = new Date().toISOString();
      const formattedTime = formatAuditTimestamp(nowIso);

      const assistantTurn: ConversationTurn = {
        id: nextWorkspaceId('turn-assistant'),
        role: 'assistant',
        createdAt: formattedTime,
        createdAtIso: nowIso,
        status: 'complete',
        blocks: [{ id: nextWorkspaceId('block'), kind: 'prose', data: sample.prose }, sample.artifact],
      };

      const current = store.getState();
      const targetTopicId = current.activeTopicId ?? nextWorkspaceId('wp');
      const titleText = sample.artifact.title ?? plugin.label;

      store.update((state) => {
        const existing = state.topics.find((t) => t.id === targetTopicId);
        const topics = existing
          ? state.topics.map((t) =>
              t.id === targetTopicId
                ? {
                    ...t,
                    dateLabel: formattedTime,
                    updatedAtIso: nowIso,
                    turns: [...t.turns, assistantTurn],
                  }
                : t
            )
          : [
              {
                id: targetTopicId,
                title: titleText,
                preview: sample.prose.replace(/\s+/g, ' ').slice(0, 140),
                dateLabel: formattedTime,
                updatedAtIso: nowIso,
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

      const nowIso = new Date().toISOString();
      const formattedTime = formatAuditTimestamp(nowIso);

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
        actorName: current.userProfile.fullName,
        createdAt: `${current.userProfile.fullName} · ${formattedTime}`,
        createdAtIso: nowIso,
        status: 'complete',
        blocks: userBlocks,
      };

      const isOffline = current.networkStatus === 'offline';
      const assistantTurnId = nextWorkspaceId('turn-assistant');
      const assistantTurn: ConversationTurn = {
        id: assistantTurnId,
        role: 'assistant',
        createdAt: formattedTime,
        createdAtIso: nowIso,
        status: isOffline ? 'queued-offline' : 'streaming',
        blocks: [
          {
            id: nextWorkspaceId('block'),
            kind: 'prose',
            data: isOffline
              ? 'Connection offline — your request is saved locally and will run automatically as soon as connectivity returns.'
              : 'Loading workpaper…',
          },
        ],
      };

      const targetTopicId = current.activeTopicId ?? nextWorkspaceId('wp');
      const queueEntry: QueuedOfflinePrompt = {
        turnId: assistantTurnId,
        topicId: targetTopicId,
        prompt: effectivePrompt,
        attachments: attached,
        createdAtIso: nowIso,
      };

      store.update((state) => {
        const existingTopic = state.topics.find((t) => t.id === targetTopicId);
        let updatedTopics: ReadonlyArray<TopicThread>;

        if (existingTopic) {
          updatedTopics = state.topics.map((topic) =>
            topic.id === targetTopicId
              ? {
                  ...topic,
                  dateLabel: formattedTime,
                  updatedAtIso: nowIso,
                  turns: [...topic.turns, userTurn, assistantTurn],
                }
              : topic
          );
        } else {
          const newTopic: TopicThread = {
            id: targetTopicId,
            title: effectivePrompt.slice(0, 72),
            sidebarTitle:
              effectivePrompt.length > 34 ? `${effectivePrompt.slice(0, 34)}...` : effectivePrompt,
            preview: effectivePrompt,
            dateLabel: formattedTime,
            updatedAtIso: nowIso,
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
          queuedPrompts: isOffline
            ? [...state.queuedPrompts, queueEntry]
            : state.queuedPrompts,
        };
      });

      if (!isOffline) {
        if (delayMs <= 0) {
          void deliverAssistantTurn(queueEntry);
        } else {
          const effectiveDelay = current.networkStatus === 'slow' ? delayMs * 2 : delayMs;
          const timer = setTimeout(() => {
            activeTimers.delete(timer);
            void deliverAssistantTurn(queueEntry);
          }, effectiveDelay);
          activeTimers.add(timer);
        }
      }

      return targetTopicId;
    },

    dispose() {
      isDisposed = true;
      for (const timer of activeTimers) {
        clearTimeout(timer);
      }
      activeTimers.clear();
      inflightTurns.clear();
    },
  };

  // Flush any persisted offline prompts if booting online
  if (store.getState().networkStatus !== 'offline' && store.getState().queuedPrompts.length > 0) {
    for (const item of store.getState().queuedPrompts) {
      void deliverAssistantTurn(item);
    }
  }

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
