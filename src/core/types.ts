import type { MailThreadItem } from './inbox';

export type NavSection =
  | 'home'
  | 'inbox'
  | 'clients'
  | 'connectors'
  | 'admin'
  | 'profile'
  | 'login'
  | 'onboarding';

export type InboxProvider = 'gmail' | 'outlook';

export type AuthProviderId = 'entra' | 'okta' | 'invite';

export interface AuthSession {
  readonly isAuthenticated: boolean;
  readonly provider: AuthProviderId;
  readonly organizationDomain: string;
  readonly ssoTenantLabel: string;
  readonly lastVerifiedAt: string;
}

export interface UserProfile {
  readonly fullName: string;
  readonly initials: string;
  readonly role: string;
  readonly firm: string;
  readonly credentials: string;
  readonly email: string;
  readonly jurisdiction: string;
  readonly defaultCurrency: 'GBP (£)' | 'USD ($)' | 'EUR (€)';
  readonly materialityBasis: string;
}

export type SidebarIconKind = 'doc' | 'hash' | 'spinner';

export type NetworkStatus = 'online' | 'slow' | 'offline';

export type RenderPlacement = 'inline' | 'stage';

export type BadgeAccent = 'emerald' | 'amber' | 'violet' | 'sky' | 'rose' | 'neutral';

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
  /** Maps row index in `rows` to original 1-based Excel worksheet row number (e.g. 2 for first data row). */
  readonly sourceRowNumbers?: ReadonlyArray<number>;
}

export interface SpreadsheetWorkbook {
  readonly sheets: ReadonlyArray<SpreadsheetSheet>;
  readonly sourceFormat: 'xlsx' | 'csv' | 'workbook';
}

export interface CodeFileEntry {
  readonly filename: string;
  readonly filepath?: string;
  readonly language: string;
  readonly code: string;
}

export interface CodeSnippetData {
  readonly language?: string;
  readonly code?: string;
  readonly filepath?: string;
  readonly files?: ReadonlyArray<CodeFileEntry>;
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
  readonly metrics?: ReadonlyArray<{
    readonly label: string;
    readonly value: string;
    readonly delta?: string;
  }>;
  readonly bullets: ReadonlyArray<string>;
}

export interface SlideDeckData {
  readonly deckTitle: string;
  readonly audience: string;
  readonly dateLabel: string;
  readonly slides: ReadonlyArray<ExecutiveSlide>;
}

export type TurnStatus = 'complete' | 'streaming' | 'queued-offline' | 'failed';

export interface ConversationTurn {
  readonly id: string;
  readonly role: 'user' | 'assistant';
  readonly actorName?: string;
  readonly createdAt: string;
  readonly createdAtIso?: string;
  readonly status: TurnStatus;
  readonly blocks: ReadonlyArray<ContentBlock>;
}

export interface TopicThread {
  readonly id: string;
  readonly title: string;
  readonly sidebarTitle?: string;
  readonly preview: string;
  readonly dateLabel: string;
  readonly updatedAtIso?: string;
  readonly sidebarIcon?: SidebarIconKind;
  readonly pinnedInSidebar?: boolean;
  readonly listedOnHome?: boolean;
  readonly turns: ReadonlyArray<ConversationTurn>;
}

export interface TodayWorkItem {
  readonly id: string;
  readonly kindLabel: 'Email' | 'Tax' | 'Close' | 'Audit';
  readonly title: string;
  readonly metaLabel: string;
  readonly target:
    | { readonly kind: 'mail'; readonly mailId: string }
    | { readonly kind: 'client'; readonly clientId: string; readonly engagementId?: string }
    | {
        readonly kind: 'workpaper';
        readonly workpaperId: string;
        readonly pluginRoute?: string;
        readonly anchor?: string;
      };
}

export interface ArtifactRevision<TData = unknown> {
  readonly id: string;
  readonly blockId: string;
  readonly topicId: string;
  readonly artifactLabel: string;
  readonly actorName: string;
  readonly actorRole: string;
  readonly createdAtIso: string;
  readonly summary: ReadonlyArray<string>;
  readonly beforeData: TData;
  readonly afterData: TData;
}

export interface AuditLogEntry {
  readonly id: string;
  readonly actorName: string;
  readonly actorRole: string;
  readonly createdAtIso: string;
  readonly action: string;
  readonly targetLabel: string;
  readonly detail: string;
}

export interface WorkspaceNotification {
  readonly id: string;
  readonly kind: 'info' | 'success' | 'warning' | 'error';
  readonly message: string;
  readonly createdAtIso: string;
  readonly undoRevisionId?: string;
  readonly undoSentMailId?: string;
  readonly actionLabel?: string;
}

export interface QueuedOfflinePrompt {
  readonly turnId: string;
  readonly topicId: string;
  readonly prompt: string;
  readonly attachments: ReadonlyArray<ContentBlock>;
  readonly createdAtIso: string;
}

export interface WorkspaceState {
  readonly activeSection: NavSection;
  readonly selectedClientId: string | null;
  readonly selectedEngagementId: string | null;
  readonly selectedMailId: string | null;
  readonly inboxProvider: InboxProvider;
  readonly unreadInboxCount: number;
  readonly clientCount: number;
  readonly authSession: AuthSession;
  readonly userProfile: UserProfile;
  readonly connectedAppIds: ReadonlyArray<string>;
  readonly disconnectedAppIds: ReadonlyArray<string>;
  readonly todayItems: ReadonlyArray<TodayWorkItem>;
  readonly mailThreads: ReadonlyArray<MailThreadItem>;
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
  readonly isCommandPaletteOpen: boolean;
  readonly composerDraft: string;
  readonly attachments: ReadonlyArray<ContentBlock>;
  readonly topics: ReadonlyArray<TopicThread>;
  readonly artifactDrafts: Readonly<Record<string, unknown>>;
  readonly revisions: ReadonlyArray<ArtifactRevision>;
  readonly auditLog: ReadonlyArray<AuditLogEntry>;
  readonly notifications: ReadonlyArray<WorkspaceNotification>;
  readonly queuedPrompts: ReadonlyArray<QueuedOfflinePrompt>;
  readonly networkStatus: NetworkStatus;
  readonly queuedTurnIds: ReadonlyArray<string>;
}
