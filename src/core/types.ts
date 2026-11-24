export type NavSection = 'home' | 'tasks' | 'pages';

export type SidebarIconKind = 'hash' | 'bot' | 'spinner';

export type NetworkStatus = 'online' | 'slow' | 'offline';

export type RenderPlacement = 'inline' | 'stage';

/**
 * Open-ended content envelope. Adding future formats (Excel, PDF, CAD, Charts)
 * never requires modifying core conversation types.
 */
export interface ContentBlock<TData = unknown> {
  readonly id: string;
  readonly kind: string;
  readonly title?: string;
  readonly filename?: string;
  readonly mimeType?: string;
  readonly summary?: string;
  readonly data: TData;
}

export type CellScalar = string | number | boolean | null;

export interface SpreadsheetSheet {
  readonly name: string;
  readonly columns: ReadonlyArray<string>;
  readonly rows: ReadonlyArray<ReadonlyArray<CellScalar>>;
  readonly formulas?: Readonly<Record<string, string>>;
}

export interface SpreadsheetWorkbook {
  readonly sheets: ReadonlyArray<SpreadsheetSheet>;
  readonly sourceFormat: 'xlsx' | 'csv' | 'workbook';
}

export interface CodeSnippetData {
  readonly language: string;
  readonly code: string;
}

export type TurnStatus = 'complete' | 'streaming' | 'queued-offline';

export interface ConversationTurn {
  readonly id: string;
  readonly role: 'user' | 'assistant';
  readonly createdAt: string;
  readonly status: TurnStatus;
  readonly blocks: ReadonlyArray<ContentBlock>;
}

export interface TopicThread {
  readonly id: string;
  readonly title: string;
  readonly sidebarTitle?: string;
  readonly preview: string;
  readonly dateLabel: string;
  readonly sidebarIcon?: SidebarIconKind;
  readonly pinnedInSidebar?: boolean;
  readonly listedOnHome?: boolean;
  readonly turns: ReadonlyArray<ConversationTurn>;
}

export interface DailyBriefSlide {
  readonly id: string;
  readonly subtitle: string;
  readonly body: string;
}

export interface ModelChoice {
  readonly id: string;
  readonly family: string;
  readonly tier: string;
}

export interface ComposerMode {
  readonly id: string;
  readonly label: string;
}

export interface WorkspaceState {
  readonly activeSection: NavSection;
  readonly activeTopicId: string | null;
  readonly inspectedBlockId: string | null;
  readonly isStageMaximized: boolean;
  readonly isSidebarOpen: boolean;
  readonly isRecentsOpen: boolean;
  readonly showAllSidebarRecents: boolean;
  readonly searchQuery: string;
  readonly isSearchOpen: boolean;
  readonly composerDraft: string;
  readonly attachments: ReadonlyArray<ContentBlock>;
  readonly selectedModeId: string;
  readonly selectedModelId: string;
  readonly activeBriefIndex: number;
  readonly briefs: ReadonlyArray<DailyBriefSlide>;
  readonly modes: ReadonlyArray<ComposerMode>;
  readonly models: ReadonlyArray<ModelChoice>;
  readonly topics: ReadonlyArray<TopicThread>;
  readonly networkStatus: NetworkStatus;
  readonly queuedTurnIds: ReadonlyArray<string>;
}
