import type { RendererRegistry } from './renderers';
import { createInitialWorkspaceState } from './seed';
import { createStore, type ReadableStore } from './store';
import type {
  ContentBlock,
  ConversationTurn,
  NavSection,
  NetworkStatus,
  TopicThread,
  WorkspaceState,
} from './types';

export interface WorkspaceOptions<TView = unknown> {
  readonly initialState?: WorkspaceState;
  readonly responseDelayMs?: number;
  readonly registry?: RendererRegistry<TView>;
}

export interface WorkspaceController extends ReadableStore<WorkspaceState> {
  selectSection: (section: NavSection) => void;
  openTopic: (topicId: string) => void;
  returnHome: () => void;
  toggleSidebar: () => void;
  toggleRecents: () => void;
  toggleMoreSidebarRecents: () => void;
  stepDailyBrief: (delta: -1 | 1) => void;
  setSearchOpen: (isOpen: boolean) => void;
  setSearchQuery: (query: string) => void;
  updateDraft: (draft: string) => void;
  setMode: (modeId: string) => void;
  setModel: (modelId: string) => void;
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
}

let idSequence = 100;
export function nextWorkspaceId(prefix: string): string {
  idSequence += 1;
  return `${prefix}-${idSequence}`;
}

export function createWorkspace<TView = unknown>(
  options: WorkspaceOptions<TView> = {}
): WorkspaceController {
  const store = createStore<WorkspaceState>(options.initialState ?? createInitialWorkspaceState());
  const delayMs = options.responseDelayMs ?? 90;
  const registry = options.registry;

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
            data: `Opened **${attachedStage.filename ?? attachedStage.title ?? 'your artifact'}** in the side-by-side stage so you can inspect, filter, or verify details directly alongside our thread.`,
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
          data: `Understood — working on **"${prompt}"**.\n\n• Ask for a **contract review**, **redline diff**, **SQL cohort chart**, **incident lineage graph**, **QBR slide deck**, or **Excel forecast** anytime (or launch any renderer from the **+** button).`,
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
    const { blocks: generatedBlocks, defaultAnchor } = await resolveAssistantOutput(
      prompt,
      attachments
    );
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

    selectSection(section) {
      store.update((state) => ({
        ...state,
        activeSection: section,
        activeTopicId: section === 'home' ? null : state.activeTopicId,
        inspectedBlockId: section === 'home' ? null : state.inspectedBlockId,
        inspectedAnchor: null,
      }));
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

    toggleRecents() {
      store.update((state) => ({ ...state, isRecentsOpen: !state.isRecentsOpen }));
    },

    toggleMoreSidebarRecents() {
      store.update((state) => ({
        ...state,
        showAllSidebarRecents: !state.showAllSidebarRecents,
      }));
    },

    stepDailyBrief(delta) {
      store.update((state) => {
        const count = state.briefs.length;
        const nextIndex = (state.activeBriefIndex + delta + count) % count;
        return { ...state, activeBriefIndex: nextIndex };
      });
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

    setMode(modeId) {
      store.update((state) => ({ ...state, selectedModeId: modeId }));
    },

    setModel(modelId) {
      store.update((state) => ({ ...state, selectedModelId: modelId }));
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
        const artifactLabel = targetBlock?.filename ?? targetBlock?.title ?? 'artifact';
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
              data: `Saved ${changeSummary.length} revision${changeSummary.length === 1 ? '' : 's'} to **${artifactLabel}**. Thread state updated.`,
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
      store.update((state) => ({ ...state, networkStatus: status }));
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

      const userTurn: ConversationTurn = {
        id: nextWorkspaceId('turn-user'),
        role: 'user',
        createdAt: 'Just now',
        status: 'complete',
        blocks: [
          {
            id: nextWorkspaceId('block'),
            kind: 'prose',
            data: `Open ${plugin.sampleMenuLabel ?? plugin.label}`,
          },
        ],
      };

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
                ? { ...t, dateLabel: 'Just now', turns: [...t.turns, userTurn, assistantTurn] }
                : t
            )
          : [
              {
                id: targetTopicId,
                title: titleText,
                preview: sample.prose.replace(/\s+/g, ' ').slice(0, 140),
                dateLabel: 'Just now',
                sidebarIcon: 'bot' as const,
                pinnedInSidebar: true,
                listedOnHome: true,
                turns: [userTurn, assistantTurn],
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
        rawPrompt || `Inspect ${attached.map((a) => a.filename ?? a.title ?? 'artifact').join(', ')}`;

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
              ? 'Connection offline — your request is safely queued and will run automatically as soon as connectivity returns.'
              : 'Thinking…',
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
            sidebarIcon: 'bot',
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
        setTimeout(() => {
          void deliverAssistantTurn(targetTopicId, assistantTurnId, effectivePrompt, attached);
        }, effectiveDelay);
      }

      return targetTopicId;
    },
  };

  return controller;
}

export function selectHomeRecentTopics(state: WorkspaceState): ReadonlyArray<TopicThread> {
  return state.topics.filter((topic) => topic.listedOnHome);
}

export function selectHomeRecentTotalCount(state: WorkspaceState): number {
  return Math.max(0, state.topics.length - 1);
}

export function selectSidebarRecentTopics(state: WorkspaceState): ReadonlyArray<TopicThread> {
  const pinned = state.topics.filter((topic) => topic.pinnedInSidebar);
  return state.showAllSidebarRecents ? pinned : pinned.slice(0, 5);
}

export function selectFilteredTopics(state: WorkspaceState): ReadonlyArray<TopicThread> {
  const q = state.searchQuery.trim().toLowerCase();
  if (!q) return state.topics;
  return state.topics.filter(
    (topic) =>
      topic.title.toLowerCase().includes(q) || topic.preview.toLowerCase().includes(q)
  );
}
