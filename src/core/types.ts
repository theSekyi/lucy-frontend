export type NavSection = 'home' | 'tasks';

export type SidebarIconKind = 'hash' | 'bot' | 'spinner';

export type NetworkStatus = 'online' | 'slow' | 'offline';

export type RenderPlacement = 'inline' | 'stage';

export type BadgeAccent = 'emerald' | 'amber' | 'violet' | 'sky' | 'rose' | 'neutral';

/**
 * Open-ended content envelope. Adding future formats (Excel, PDF, Redlines, SQL, DAGs, Slides)
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

export interface ContractClause {
  readonly section: string;
  readonly heading: string;
  readonly text: string;
  readonly riskLevel?: 'low' | 'watch' | 'high';
  readonly note?: string;
}

export interface CitedDocumentPage {
  readonly pageNumber: number;
  readonly header: string;
  readonly clauses: ReadonlyArray<ContractClause>;
}

export interface CitedDocumentData {
  readonly documentTitle: string;
  readonly partySummary: string;
  readonly totalPages: number;
  readonly pages: ReadonlyArray<CitedDocumentPage>;
}

export interface RedlineHunk {
  readonly id: string;
  readonly section: string;
  readonly rationale: string;
  readonly before: string;
  readonly after: string;
  readonly initialDecision?: 'pending' | 'accepted' | 'rejected';
}

export interface RedlineDocumentData {
  readonly documentName: string;
  readonly author: string;
  readonly hunks: ReadonlyArray<RedlineHunk>;
}

export interface SqlCanvasData {
  readonly warehouse: string;
  readonly executionMs: number;
  readonly scannedMb: number;
  readonly query: string;
  readonly labelColumn: string;
  readonly metricColumns: ReadonlyArray<string>;
  readonly columns: ReadonlyArray<string>;
  readonly rows: ReadonlyArray<ReadonlyArray<CellScalar>>;
}

export interface TopologyNode {
  readonly id: string;
  readonly label: string;
  readonly layer: number;
  readonly lane: number;
  readonly kind: 'source' | 'service' | 'warehouse' | 'policy';
  readonly status: 'healthy' | 'degraded' | 'impacted';
  readonly owner: string;
  readonly latency: string;
  readonly note: string;
}

export interface TopologyEdge {
  readonly from: string;
  readonly to: string;
  readonly label?: string;
}

export interface TopologyGraphData {
  readonly subtitle: string;
  readonly nodes: ReadonlyArray<TopologyNode>;
  readonly edges: ReadonlyArray<TopologyEdge>;
}

export interface ExecutiveSlide {
  readonly id: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly takeaway: string;
  readonly metrics?: ReadonlyArray<{ readonly label: string; readonly value: string; readonly delta?: string }>;
  readonly bullets: ReadonlyArray<string>;
}

export interface SlideDeckData {
  readonly deckTitle: string;
  readonly audience: string;
  readonly dateLabel: string;
  readonly slides: ReadonlyArray<ExecutiveSlide>;
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
  readonly inspectedAnchor: string | null;
  readonly anchorPulse: number;
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
