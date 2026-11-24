import { SAMPLE_FINANCIAL_WORKBOOK, createInitialWorkspaceState } from './seed';
import { createStore, type ReadableStore } from './store';
import type {
  ContentBlock,
  ConversationTurn,
  NavSection,
  NetworkStatus,
  TopicThread,
  WorkspaceState,
} from './types';

export interface WorkspaceOptions {
  readonly initialState?: WorkspaceState;
  readonly responseDelayMs?: number;
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
  inspectArtifact: (blockId: string | null) => void;
  toggleStageMaximize: () => void;
  setNetworkStatus: (status: NetworkStatus) => void;
  submitPrompt: (overridePrompt?: string) => string | null;
}

let idSequence = 100;
function nextId(prefix: string): string {
  idSequence += 1;
  return `${prefix}-${idSequence}`;
}

function asksForSpreadsheet(prompt: string, attachments: ReadonlyArray<ContentBlock>): boolean {
  if (attachments.some((item) => item.kind === 'spreadsheet')) return true;
  return /\b(excel|xlsx|csv|spreadsheet|sheet|table|budget|forecast|revenue|metrics|financial)\b/i.test(
    prompt
  );
}

function buildAssistantBlocks(
  prompt: string,
  userAttachments: ReadonlyArray<ContentBlock>
): ReadonlyArray<ContentBlock> {
  const uploadedSheet = userAttachments.find((item) => item.kind === 'spreadsheet');

  if (uploadedSheet) {
    return [
      {
        id: nextId('block'),
        kind: 'prose',
        data: `I parsed **${uploadedSheet.filename ?? uploadedSheet.title ?? 'your workbook'}** and opened it in the side-by-side stage so you can sort columns, inspect cell formulas, or switch sheets while we discuss it.`,
      },
      uploadedSheet,
    ];
  }

  if (asksForSpreadsheet(prompt, userAttachments)) {
    return [
      {
        id: nextId('block'),
        kind: 'prose',
        data: 'Here is the structured Q4 financial & regional latency workbook. Key takeaway: **Net Contribution grew +31.0% YoY ($1.64M)** while APAC low-bandwidth retention led all regions at **127%**.\n\nClick the workbook card or use the side stage to inspect formulas and sort rows.',
      },
      {
        id: nextId('block'),
        kind: 'spreadsheet',
        title: 'Q4 Revenue & Regional Model',
        filename: 'Q4_Revenue_Model.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        summary: '2 sheets · Q4 Forecast ($1.64M net, +31% YoY) & Region Breakdown',
        data: SAMPLE_FINANCIAL_WORKBOOK,
      },
    ];
  }

  return [
    {
      id: nextId('block'),
      kind: 'prose',
      data: `Understood — working on **"${prompt}"**.\n\n• Scope isolated into clear steps so everything stays verifiable.\n• You can continue refining right here, press Esc to return Home, or attach an Excel (.xlsx / .csv) file anytime with the + button.`,
    },
  ];
}

export function createWorkspace(options: WorkspaceOptions = {}): WorkspaceController {
  const store = createStore<WorkspaceState>(options.initialState ?? createInitialWorkspaceState());
  const delayMs = options.responseDelayMs ?? 140;

  function findFirstStageArtifact(blocks: ReadonlyArray<ContentBlock>): string | null {
    return blocks.find((b) => b.kind === 'spreadsheet')?.id ?? null;
  }

  function deliverAssistantTurn(topicId: string, assistantTurnId: string, prompt: string, attachments: ReadonlyArray<ContentBlock>) {
    const generatedBlocks = buildAssistantBlocks(prompt, attachments);
    const stageArtifactId = findFirstStageArtifact(generatedBlocks);

    store.update((state) => ({
      ...state,
      inspectedBlockId: stageArtifactId ?? state.inspectedBlockId,
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

  return {
    getState: store.getState,
    subscribe: store.subscribe,

    selectSection(section) {
      store.update((state) => ({
        ...state,
        activeSection: section,
        activeTopicId: section === 'home' ? null : state.activeTopicId,
        inspectedBlockId: section === 'home' ? null : state.inspectedBlockId,
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

    inspectArtifact(blockId) {
      store.update((state) => ({
        ...state,
        inspectedBlockId: blockId,
        isStageMaximized: blockId === null ? false : state.isStageMaximized,
      }));
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
          deliverAssistantTurn(item.topicId, turnId, item.prompt, item.attachments);
        }
      }
    },

    submitPrompt(overridePrompt) {
      const current = store.getState();
      const rawPrompt = (overridePrompt ?? current.composerDraft).trim();
      const attached = current.attachments;

      if (!rawPrompt && attached.length === 0) return null;

      const effectivePrompt =
        rawPrompt || `Inspect ${attached.map((a) => a.filename ?? a.title ?? 'file').join(', ')}`;

      const userBlocks: ContentBlock[] = [];
      if (rawPrompt) {
        userBlocks.push({ id: nextId('block'), kind: 'prose', data: rawPrompt });
      }
      for (const item of attached) {
        userBlocks.push(item);
      }

      const userTurn: ConversationTurn = {
        id: nextId('turn-user'),
        role: 'user',
        createdAt: 'Just now',
        status: 'complete',
        blocks: userBlocks,
      };

      const isOffline = current.networkStatus === 'offline';
      const assistantTurnId = nextId('turn-assistant');
      const assistantTurn: ConversationTurn = {
        id: assistantTurnId,
        role: 'assistant',
        createdAt: 'Just now',
        status: isOffline ? 'queued-offline' : 'streaming',
        blocks: [
          {
            id: nextId('block'),
            kind: 'prose',
            data: isOffline
              ? 'Connection offline — your request is safely queued and will run automatically as soon as connectivity returns.'
              : 'Thinking…',
          },
        ],
      };

      const targetTopicId = current.activeTopicId ?? nextId('topic');

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
        deliverAssistantTurn(targetTopicId, assistantTurnId, effectivePrompt, attached);
      } else {
        const effectiveDelay = current.networkStatus === 'slow' ? delayMs * 2 : delayMs;
        setTimeout(() => {
          deliverAssistantTurn(targetTopicId, assistantTurnId, effectivePrompt, attached);
        }, effectiveDelay);
      }

      return targetTopicId;
    },
  };
}

export function selectHomeRecentTopics(state: WorkspaceState): ReadonlyArray<TopicThread> {
  return state.topics.filter((topic) => topic.listedOnHome);
}

export function selectHomeRecentTotalCount(state: WorkspaceState): number {
  // Matches the 8-topic count in the reference workspace plus any newly started threads
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
