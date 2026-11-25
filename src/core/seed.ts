import type {
  SpreadsheetWorkbook,
  TopicThread,
  WorkspaceState,
} from './types';

export const SAMPLE_FINANCIAL_WORKBOOK: SpreadsheetWorkbook = {
  sourceFormat: 'xlsx',
  sheets: [
    {
      name: 'Q4 Forecast',
      columns: ['Line Item', 'Oct', 'Nov', 'Dec', 'Q4 Total', 'YoY Delta'],
      rows: [
        ['Audit & Assurance Retainers', 420000, 455000, 498000, 1373000, '+28.4%'],
        ['Tax & Advisory Billings', 165000, 174000, 189000, 528000, '+19.1%'],
        ['Direct Subledger & Filing Costs', -84000, -88500, -92000, -264500, '-6.2%'],
        ['Net Practice Contribution', 501000, 540500, 595000, 1636500, '+31.0%'],
      ],
      formulas: {
        E2: '=SUM(B2:D2)',
        E3: '=SUM(B3:D3)',
        E4: '=SUM(B4:D4)',
        E5: '=B5+C5+D5',
      },
    },
    {
      name: 'Entity Breakdown',
      columns: ['Jurisdiction', 'Active Clients', 'Billings ($)', 'Realization', 'Close SLA'],
      rows: [
        ['United Kingdom (FRS 102)', 24, 1120000, '96.4%', 'WD+5'],
        ['US Subsidiaries (US GAAP)', 11, 620000, '94.8%', 'WD+6'],
        ['EU Consolidated Entities', 7, 415000, '95.2%', 'WD+6'],
      ],
    },
  ],
};

const INITIAL_TOPICS: ReadonlyArray<TopicThread> = [
  {
    id: 'topic-acme-tb-flux',
    title: 'Acme FY26 — Nov Trial Balance & Flux Review',
    preview:
      '3 accounts exceed $25,000 Performance Materiality; AJE-2026-042 ($60,058.00) clears ASC 606 cut-off.',
    dateLabel: 'Today',
    sidebarIcon: 'doc',
    pinnedInSidebar: true,
    listedOnHome: true,
    turns: [
      {
        id: 't1-u',
        role: 'user',
        createdAt: 'Today · 09:20',
        status: 'complete',
        blocks: [
          {
            id: 'b-t1-u',
            kind: 'prose',
            data: 'Summarize the November Consolidated Trial Balance flux exceptions for Acme Holdings Ltd.',
          },
        ],
      },
      {
        id: 't1-a',
        role: 'assistant',
        createdAt: 'Today · 09:20',
        status: 'complete',
        blocks: [
          {
            id: 'b-t1-a',
            kind: 'prose',
            data: '**November Close Check**\nTested Consolidated Trial Balance against **$25,000 Performance Materiality** (`5.0%` pre-tax benchmark).\n\n• `GL 2400 / 4010`: `$45,000.00` deferred revenue release tied to Q4 ASC 606 schedule.\n• `GL 6510 / 2120`: `$15,058.00` external audit accrual balanced in `AJE-2026-042`.',
          },
        ],
      },
    ],
  },
  {
    id: 'topic-msa-summary',
    title: 'MSA §4.2 — Liability Cap & Subprocessor Redlines',
    preview: '3x TTM super-cap on data protection (§4.2); 30-day prior written subprocessor notice (§2.4).',
    dateLabel: 'Yesterday',
    sidebarIcon: 'doc',
    pinnedInSidebar: true,
    listedOnHome: true,
    turns: [
      {
        id: 't2-a',
        role: 'assistant',
        createdAt: 'Yesterday · 14:18',
        status: 'complete',
        blocks: [
          {
            id: 'b-t2-a',
            kind: 'prose',
            data: 'Verified execution copy `Acme_Global_MSA_FY27.pdf`: Clause **§2.4** extends prior subprocessor notice from 14 to 30 calendar days, and Clause **§4.2** locks the data-protection super-cap at 3× trailing twelve-month fees.',
          },
        ],
      },
    ],
  },
  {
    id: 'topic-ct600-bridge',
    title: 'Acme CT600 — Schedule M-1 Tax Computation',
    preview: 'Book Net Income $1,636,500 reconciled to $1,648,400 taxable profit (UTR 4918204110).',
    dateLabel: 'Nov 23',
    sidebarIcon: 'hash',
    pinnedInSidebar: true,
    listedOnHome: true,
    turns: [
      {
        id: 't3-a',
        role: 'assistant',
        createdAt: 'Nov 23 · 16:40',
        status: 'complete',
        blocks: [
          {
            id: 'b-t3-a',
            kind: 'prose',
            data: 'Reconciled Book Net Income (`$1,636,500`) + permanent disallowances (`-$5,600` net) + temporary timing items (`+$17,500` net, including `-$142,000` capital allowances) = **`$1,648,400`** taxable profit.',
          },
        ],
      },
    ],
  },
  {
    id: 'topic-kensington-lease',
    title: 'Kensington Retail — ASC 842 Lease Remeasurement',
    preview: '3-year Regent Street extension reconciled at $98,500/quarter ROU amortization.',
    dateLabel: 'Nov 22',
    sidebarIcon: 'doc',
    pinnedInSidebar: true,
    listedOnHome: true,
    turns: [
      {
        id: 't4-a',
        role: 'assistant',
        createdAt: 'Nov 22 · 11:15',
        status: 'complete',
        blocks: [
          {
            id: 'b-t4-a',
            kind: 'prose',
            data: 'Updated Q1–Q4 ROU asset and lease liability rollforward for Kensington Retail Ltd following the 3-year Regent Street lease modification (`$98,500/quarter` run-rate).',
          },
        ],
      },
    ],
  },
  {
    id: 'topic-q4-forecast',
    title: 'Q4 Practice Revenue & Realization Model',
    preview: 'Net contribution +31.0% YoY ($1.64M) across UK, US, and EU client entities.',
    dateLabel: 'Nov 20',
    sidebarIcon: 'doc',
    pinnedInSidebar: true,
    listedOnHome: true,
    turns: [
      {
        id: 't5-a',
        role: 'assistant',
        createdAt: 'Nov 20 · 10:00',
        status: 'complete',
        blocks: [
          {
            id: 'b-t5-a',
            kind: 'prose',
            data: 'Q4 practice realization and entity forecast workbook. Net contribution reached **$1.64M (+31.0% YoY)**.',
          },
          {
            id: 'b-t5-sheet',
            kind: 'spreadsheet',
            title: 'Q4 Practice Revenue Model',
            filename: 'Q4_Revenue_Model.xlsx',
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            summary: '2 sheets · Q4 Forecast ($1.64M net) & Entity Breakdown',
            data: SAMPLE_FINANCIAL_WORKBOOK,
          },
        ],
      },
    ],
  },
  {
    id: 'topic-chase-cutoff',
    title: 'Chase #4821 — November Cash Cutoff Review',
    preview: '142 statement lines auto-matched; -$615.80 duplicate Datadog ACH flagged for recall.',
    dateLabel: 'Nov 19',
    sidebarIcon: 'spinner',
    pinnedInSidebar: true,
    listedOnHome: false,
    turns: [
      {
        id: 't6-a',
        role: 'assistant',
        createdAt: 'Nov 19 · 17:30',
        status: 'complete',
        blocks: [
          {
            id: 'b-t6-a',
            kind: 'prose',
            data: 'Chase Operating `#4821` matched `97.3%` (`$1,418,920.00`) against NetSuite `GL 1010`. Four open items remain (`$3,442.10` net variance), including a duplicate `-$615.80` Datadog ACH.',
          },
        ],
      },
    ],
  },
];

export function createInitialWorkspaceState(): WorkspaceState {
  return {
    activeSection: 'home',
    selectedClientId: null,
    selectedEngagementId: null,
    selectedMailId: null,
    inboxProvider: 'gmail',
    unreadInboxCount: 5,
    clientCount: 4,
    authSession: {
      isAuthenticated: true,
      provider: 'entra',
      organizationDomain: 'cartervance.co.uk',
      ssoTenantLabel: 'Microsoft Entra ID · Carter & Vance LLP',
      lastVerifiedAt: 'OIDC session active',
    },
    userProfile: {
      fullName: 'Elena Carter',
      initials: 'EC',
      role: 'Audit & Tax Partner',
      firm: 'Carter & Vance Chartered Accountants',
      credentials: 'ACA · CPA · ICAEW #084912 · PTIN P0194821',
      email: 'e.carter@cartervance.co.uk',
      jurisdiction: 'UK (FRS 102 / IFRS) & US GAAP',
      defaultCurrency: 'GBP (£)',
      materialityBasis: '5.0% Pre-Tax Profit',
    },
    connectedAppIds: [
      'gmail',
      'outlook',
      'sharepoint',
      'onedrive',
      'xero',
      'netsuite',
      'hmrc-mtd',
      'karbon',
      'dext',
    ],
    disconnectedAppIds: [
      'open-banking',
      'companies-house',
      'gdrive',
      'quickbooks',
    ],
    todayItems: [
      {
        id: 'td-mail-acme',
        kindLabel: 'Email',
        title: 'Marcus Vance — Approve Nov TB & AJE-2026-042 ($60,058)',
        metaLabel: '09:18',
        target: { kind: 'mail', mailId: 'mail-acme-cfo-tb' },
      },
      {
        id: 'td-tax-ct600',
        kindLabel: 'Tax',
        title: 'Sign off Acme CT600 & Schedule M-1 (UTR 4918204110)',
        metaLabel: '30 Nov',
        target: { kind: 'mail', mailId: 'mail-hmrc-ct600' },
      },
      {
        id: 'td-close-acme',
        kindLabel: 'Close',
        title: 'Acme Holdings — Finish Nov Trial Balance & VAT pack',
        metaLabel: '3/5 done',
        target: { kind: 'client', clientId: 'acme' },
      },
      {
        id: 'td-mail-kensington',
        kindLabel: 'Email',
        title: 'Sarah Jenkins — Regent St ASC 842 lease rollforward',
        metaLabel: '07:41',
        target: { kind: 'mail', mailId: 'mail-kensington-rollforward' },
      },
      {
        id: 'td-audit-vouch',
        kindLabel: 'Audit',
        title: 'Hannah Lin — Clear WP E-40 FX variance & Hudson Yards PBC',
        metaLabel: 'WP E-40',
        target: { kind: 'stage', pluginRoute: 'vouch' },
      },
    ],
    activeTopicId: null,
    inspectedBlockId: null,
    inspectedAnchor: null,
    anchorPulse: 0,
    isStageMaximized: false,
    isSidebarOpen: true,
    isRecentsOpen: true,
    showAllSidebarRecents: false,
    searchQuery: '',
    isSearchOpen: false,
    composerDraft: '',
    attachments: [],
    topics: [...INITIAL_TOPICS],
    networkStatus: 'online',
    queuedTurnIds: [],
  };
}
