import type {
  ComposerMode,
  DailyBriefSlide,
  ModelChoice,
  SpreadsheetWorkbook,
  TopicThread,
  WorkspaceState,
} from './types';

export const SAMPLE_TRIAGE_WORKBOOK: SpreadsheetWorkbook = {
  sourceFormat: 'xlsx',
  sheets: [
    {
      name: 'Issue Triage (26)',
      columns: ['Issue', 'Area', 'Severity', 'Owner', 'Est. Hours', 'Status'],
      rows: [
        ['#14652', 'Seedance Video Ref', 'High', 'Media Core', 6, 'In Review'],
        ['#14580', 'MCP Stdio Pre-check', 'Critical', 'Runtime', 4, 'Assigned'],
        ['#14450', 'Azure Image Gen URL', 'Medium', 'Providers', 3, 'Patch Ready'],
        ['#14412', 'Web/API Auth Refresh', 'High', 'Identity', 8, 'Investigating'],
        ['#14389', 'Streaming Token Flush', 'Medium', 'UI Shell', 2.5, 'Verified'],
        ['#14340', 'Offline Queue Replay', 'Low', 'Sync Engine', 5, 'Scheduled'],
      ],
      formulas: {
        E8: '=SUM(E2:E7)',
      },
    },
    {
      name: 'Q4 Capacity Model',
      columns: ['Squad', 'Weekly Velocity', 'Open Queue', 'Clearance Weeks', 'Health'],
      rows: [
        ['Runtime & MCP', 18, 9, 0.5, 'On Track'],
        ['Providers & Media', 22, 11, 0.5, 'On Track'],
        ['Identity & Auth', 12, 6, 0.5, 'Watch'],
      ],
    },
  ],
};

export const SAMPLE_FINANCIAL_WORKBOOK: SpreadsheetWorkbook = {
  sourceFormat: 'xlsx',
  sheets: [
    {
      name: 'Q4 Forecast',
      columns: ['Line Item', 'Oct', 'Nov', 'Dec', 'Q4 Total', 'YoY Delta'],
      rows: [
        ['Enterprise Subscriptions', 420000, 455000, 498000, 1373000, '+28.4%'],
        ['Self-Serve Pro', 165000, 174000, 189000, 528000, '+19.1%'],
        ['Inference & Edge Compute', -84000, -88500, -92000, -264500, '-6.2%'],
        ['Net Contribution', 501000, 540500, 595000, 1636500, '+31.0%'],
      ],
      formulas: {
        E2: '=SUM(B2:D2)',
        E3: '=SUM(B3:D3)',
        E4: '=SUM(B4:D4)',
        E5: '=B5+C5+D5',
      },
    },
    {
      name: 'Region Breakdown',
      columns: ['Region', 'Active Teams', 'ARR ($)', 'Net Retention', 'Latency P95'],
      rows: [
        ['North America', 640, 1120000, '124%', '38 ms'],
        ['Europe', 410, 620000, '119%', '44 ms'],
        ['APAC & Emerging (Low-BW)', 385, 415000, '127%', '112 ms'],
      ],
    },
  ],
};

const INITIAL_BRIEFS: ReadonlyArray<DailyBriefSlide> = [
  {
    id: 'brief-today',
    subtitle: 'Nothing to decide — just a glance',
    body: 'Nothing new yet today.',
  },
  {
    id: 'brief-triage',
    subtitle: 'Overnight verification summary',
    body: '3 pull requests passed latency and bundle budgets (< 14 KB initial payload).',
  },
  {
    id: 'brief-artifacts',
    subtitle: 'Workspace capabilities',
    body: 'Drop any .xlsx or .csv file into the composer to inspect sheets side-by-side.',
  },
];

const INITIAL_MODES: ReadonlyArray<ComposerMode> = [
  { id: 'agent', label: 'Agent' },
  { id: 'chat', label: 'Chat' },
  { id: 'plan', label: 'Plan' },
];

const INITIAL_MODELS: ReadonlyArray<ModelChoice> = [
  { id: 'deepseek-v4.1-flash-high', family: 'DeepSeek V4.1 Flash', tier: 'High' },
  { id: 'claude-4.5-sonnet', family: 'Claude 4.5 Sonnet', tier: 'High' },
  { id: 'gemini-3-pro', family: 'Gemini 3.0 Pro', tier: 'High' },
  { id: 'gemini-3-flash', family: 'Gemini 3.0 Flash', tier: 'Fast' },
  { id: 'gpt-5-mini', family: 'GPT-5 Mini', tier: 'Fast' },
];

const INITIAL_TOPICS: ReadonlyArray<TopicThread> = [
  {
    id: 'topic-slack-bug-rule',
    title: 'Slack bug-routing rule for #engineering-bugs',
    sidebarTitle: 'Slack bug-routing rule for #engineer...',
    preview:
      'Slack webhook active (id: 57878d5f); Discord connector remains unconfigured.',
    dateLabel: 'May 12',
    sidebarIcon: 'hash',
    pinnedInSidebar: true,
    listedOnHome: true,
    turns: [
      {
        id: 't1-u',
        role: 'user',
        createdAt: 'May 12 · 14:10',
        status: 'complete',
        blocks: [
          {
            id: 'b-t1-u',
            kind: 'prose',
            data: 'Route messages mentioning "bug" to the issue triage queue and post a summary.',
          },
        ],
      },
      {
        id: 't1-a',
        role: 'assistant',
        createdAt: 'May 12 · 14:10',
        status: 'complete',
        blocks: [
          {
            id: 'b-t1-a',
            kind: 'prose',
            data: '**Configuration status**\nSlack connector is active (id: `57878d5f-92a1`); no Discord connector is configured.\n\n• Trigger rule staged on `#engineering-bugs`.\n• Automated test-log noise excluded from matching.',
          },
        ],
      },
    ],
  },
  {
    id: 'topic-github-triage',
    title: 'Weekly issue triage — lucy/workspace (26 open)',
    preview:
      'Grouped 26 open repository issues across Runtime, Media Core, and Identity (28.5 est. hours).',
    dateLabel: 'May 12',
    listedOnHome: true,
    turns: [
      {
        id: 't2-u',
        role: 'user',
        createdAt: 'May 12 · 11:24',
        status: 'complete',
        blocks: [
          {
            id: 'b-t2-u',
            kind: 'prose',
            data: 'Organize the 26 open issues from lucy/workspace into a weekly triage workbook.',
          },
        ],
      },
      {
        id: 't2-a',
        role: 'assistant',
        createdAt: 'May 12 · 11:25',
        status: 'complete',
        blocks: [
          {
            id: 'b-t2-a1',
            kind: 'prose',
            data: 'Grouped 26 open issues from `lucy/workspace` by severity, squad capacity, and estimated clearance hours.',
          },
          {
            id: 'b-t2-sheet',
            kind: 'spreadsheet',
            title: 'Weekly Issue Triage Plan',
            filename: 'Weekly_Issue_Triage_26_Issues.xlsx',
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            summary: '2 sheets · 6 priority issues mapped across Runtime, Media Core, and Identity',
            data: SAMPLE_TRIAGE_WORKBOOK,
          },
        ],
      },
    ],
  },
  {
    id: 'topic-seedance-14652',
    title: 'Fix #14652: Seedance video reference frame alignment',
    sidebarTitle: 'Fix #14652: Seedance video reference...',
    preview: 'Normalized aspect-ratio metadata before uploading keyframe buffers; regression suite green.',
    dateLabel: 'May 11',
    sidebarIcon: 'bot',
    pinnedInSidebar: true,
    listedOnHome: false,
    turns: [
      {
        id: 't3-a',
        role: 'assistant',
        createdAt: 'May 11 · 18:02',
        status: 'complete',
        blocks: [
          {
            id: 'b-t3-a',
            kind: 'prose',
            data: 'Resolved #14652 by normalizing keyframe aspect-ratio headers prior to presigned upload. Verified on slow 3G upload simulation with chunk resumption.',
          },
          {
            id: 'b-t3-code',
            kind: 'code-workspace',
            title: 'Media Frame Alignment Patch',
            filename: 'media-frame-patch (4 files)',
            summary: 'TS · PY · SQL · YAML — Keyframe aspect normalizer, validator & canary config',
            data: {
              files: [
                {
                  filename: 'normalizeReferenceFrame.ts',
                  filepath: 'packages/media-core/src/normalizeReferenceFrame.ts',
                  language: 'typescript',
                  code: `// Clamp frame buffers to even codec macroblocks\nexport interface FrameSize {\n  readonly width: number;\n  readonly height: number;\n}\n\nexport function clampEvenDimensions(width: number, height: number): FrameSize {\n  return {\n    width: Math.max(2, width - (width % 2)),\n    height: Math.max(2, height - (height % 2)),\n  };\n}`,
                },
                {
                  filename: 'verify_keyframes.py',
                  filepath: 'scripts/qa/verify_keyframes.py',
                  language: 'python',
                  code: `# Verify stream aspect metadata across edge buckets\ndef validate_aspect(width: int, height: int) -> bool:\n    if width <= 0 or height <= 0:\n        return False\n    return (width % 2 == 0) and (height % 2 == 0)\n\ndef summarize_batch(frames: list) -> dict:\n    valid = sum(1 for w, h in frames if validate_aspect(w, h))\n    return {"checked": len(frames), "valid": valid}`,
                },
                {
                  filename: 'frame_upload_failures.sql',
                  filepath: 'analytics/queries/frame_upload_failures.sql',
                  language: 'sql',
                  code: `-- Post-deploy 24h retry rate across regional POPs\nSELECT\n  codec,\n  region,\n  COUNT(*) AS retry_events\nFROM media_telemetry.upload_events\nWHERE status = 'RETRY' AND hours_ago <= 24\nGROUP BY 1, 2\nORDER BY 3 DESC\nLIMIT 25;`,
                },
                {
                  filename: 'transcoder-rollout.yaml',
                  filepath: 'deploy/canary/transcoder-rollout.yaml',
                  language: 'yaml',
                  code: `# Progressive canary rollout gate\nservice: media-transcoder\nrollout:\n  stage: "canary-25"\n  maxErrorPct: 0.05\n  healthProbeMs: 1500\n  autoRollback: true`,
                },
              ],
            },
          },
        ],
      },
    ],
  },
  {
    id: 'topic-azure-14450',
    title: 'Fix #14450: Azure image generation url api-version query',
    sidebarTitle: 'Fix #14450: Azure image generation u...',
    preview: 'Preserved deployment query params when constructing Azure OpenAI image endpoints.',
    dateLabel: 'May 10',
    sidebarIcon: 'bot',
    pinnedInSidebar: true,
    listedOnHome: false,
    turns: [
      {
        id: 't4-a',
        role: 'assistant',
        createdAt: 'May 10 · 16:40',
        status: 'complete',
        blocks: [
          {
            id: 'b-t4-a',
            kind: 'prose',
            data: 'Fixed URL builder in Azure image provider so `api-version` is retained across custom proxy endpoints.',
          },
        ],
      },
    ],
  },
  {
    id: 'topic-mcp-14580',
    title: 'Fix #14580: MCP stdio pre-check timeout on cold boot',
    sidebarTitle: 'Fix #14580: MCP stdio pre-check time...',
    preview: 'Replaced fixed 1.5s timeout with progressive readiness probe and clean cancellation.',
    dateLabel: 'May 9',
    sidebarIcon: 'bot',
    pinnedInSidebar: true,
    listedOnHome: false,
    turns: [
      {
        id: 't5-a',
        role: 'assistant',
        createdAt: 'May 9 · 09:15',
        status: 'complete',
        blocks: [
          {
            id: 'b-t5-a',
            kind: 'prose',
            data: 'Updated MCP stdio handshake to use exponential readiness probing, cutting false-positive cold-start timeouts to zero.',
          },
        ],
      },
    ],
  },
  {
    id: 'topic-q4-forecast',
    title: 'Q4 revenue & regional latency forecast',
    preview: 'Net contribution +31.0% YoY ($1.64M) across North America, Europe, and APAC.',
    dateLabel: 'May 6',
    listedOnHome: true,
    turns: [
      {
        id: 't6-a',
        role: 'assistant',
        createdAt: 'May 6 · 10:00',
        status: 'complete',
        blocks: [
          {
            id: 'b-t6-a',
            kind: 'prose',
            data: 'Q4 revenue and regional retention workbook. Net contribution reached **$1.64M (+31.0% YoY)**.',
          },
          {
            id: 'b-t6-sheet',
            kind: 'spreadsheet',
            title: 'Q4 Revenue & Regional Model',
            filename: 'Q4_Revenue_Model.xlsx',
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            summary: '2 sheets · Q4 Forecast ($1.64M net) & Region Breakdown',
            data: SAMPLE_FINANCIAL_WORKBOOK,
          },
        ],
      },
    ],
  },
  {
    id: 'topic-msa-summary',
    title: 'Acme Global MSA — subprocessor & liability notes',
    preview: '3x TTM super-cap on data protection (§4.2); 14-day subprocessor notice flagged for 30-day redline.',
    dateLabel: 'May 2',
    listedOnHome: true,
    turns: [
      {
        id: 't7-a',
        role: 'assistant',
        createdAt: 'May 2 · 09:42',
        status: 'complete',
        blocks: [
          {
            id: 'b-t7-a',
            kind: 'prose',
            data: 'Summary of open negotiation items on `Acme_Global_MSA_FY27.pdf`: extend subprocessor notice from 14 to 30 days and cap §4.2 at 3× TTM fees.',
          },
        ],
      },
    ],
  },
  {
    id: 'topic-arr-reconciliation',
    title: 'FY26 enterprise ARR cohort tie-out',
    preview: 'Ending Q4 ARR reconciled at $5.64M with 128.2% net dollar retention across 2,400 accounts.',
    dateLabel: 'Apr 29',
    listedOnHome: true,
    turns: [
      {
        id: 't8-a',
        role: 'assistant',
        createdAt: 'Apr 29 · 15:18',
        status: 'complete',
        blocks: [
          {
            id: 'b-t8-a',
            kind: 'prose',
            data: 'Reconciled `PROD_FINANCE.MART_ARR` against billing subledger: ending Q4 ARR tied out to **$5.64M** (`128.2%` NDR).',
          },
        ],
      },
    ],
  },
];

export const EXTRA_SIDEBAR_INVESTIGATION: TopicThread = {
  id: 'topic-auth-investigation',
  title: 'Investigation: Web/API/Auth Issues',
  sidebarTitle: 'Investigation: Web/API/Auth Issues',
  preview: 'Tracing cookie SameSite behavior across embedded webviews and edge proxies.',
  dateLabel: 'Today',
  sidebarIcon: 'spinner',
  pinnedInSidebar: true,
  listedOnHome: false,
  turns: [
    {
      id: 't9-a',
      role: 'assistant',
      createdAt: 'Today · 13:20',
      status: 'complete',
      blocks: [
        {
          id: 'b-t9-a',
          kind: 'prose',
          data: 'Active investigation: tracing session refresh rotation under high-latency edge connections. Token lease extension prevents premature sign-outs during packet loss.',
        },
      ],
    },
  ],
};

export function createInitialWorkspaceState(): WorkspaceState {
  return {
    activeSection: 'home',
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
    selectedModeId: 'agent',
    selectedModelId: 'deepseek-v4.1-flash-high',
    activeBriefIndex: 0,
    briefs: INITIAL_BRIEFS,
    modes: INITIAL_MODES,
    models: INITIAL_MODELS,
    topics: [...INITIAL_TOPICS, EXTRA_SIDEBAR_INVESTIGATION],
    networkStatus: 'online',
    queuedTurnIds: [],
  };
}
