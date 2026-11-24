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
    title: 'If "bug" is mentioned, tag <mention name="Issue Agent"> in channel',
    sidebarTitle: 'If "bug" is mentioned, tag <mention n...',
    preview:
      "Here's what I've discovered and the situation: ⚠️ Setup Blockers No Discord bot is configured. Your agent only has a Slack bot connected (botId: 57878d5...",
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
            data: 'If "bug" is mentioned, tag <mention name="Issue Agent"> automatically and post a triage summary.',
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
            data: "Here's what I've discovered and the situation:\n\n⚠️ Setup Blockers\nNo Discord bot is configured. Your workspace currently has a Slack bot connected (botId: 57878d5f-92a1).\n\n• Slack trigger rule is ready to activate on #engineering-bugs.\n• Keyword matcher filters out automated test logs to keep noise low.",
          },
        ],
      },
    ],
  },
  {
    id: 'topic-github-triage',
    title: 'I need to analyze GitHub issues from the lucy/workspace repository',
     preview:
      "All tasks are created and assigned. Here's the complete summary: ✅ Weekly Issue Triage Plan Created I analyzed 26 open issues from lucy/workspace (...",
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
            data: 'I need to analyze GitHub issues from the lucy/workspace repository and organize a weekly triage sheet.',
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
            data: "All tasks are created and assigned. Here's the complete summary:\n\n✅ Weekly Issue Triage Plan Created\nI analyzed 26 open issues from lucy/workspace and grouped the highest-leverage items into an interactive workbook so you can sort by severity or owner without cluttering this thread.",
          },
          {
            id: 'b-t2-sheet',
            kind: 'spreadsheet',
            title: 'Weekly Issue Triage Plan',
            filename: 'Weekly_Issue_Triage_26_Issues.xlsx',
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            summary: '2 sheets · 6 priority issues mapped across Runtime, Media Core, and Identity (28.5 est. hours)',
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
            kind: 'code',
            title: 'normalizeReferenceFrame.ts',
            summary: 'TypeScript · Clamps non-even dimensions before encoder handoff',
            data: {
              language: 'typescript',
              code: `// Clamp frame buffers to even codec macroblocks\nexport function clampEvenDimensions(width: number, height: number) {\n  return {\n    width: Math.max(2, width - (width % 2)),\n    height: Math.max(2, height - (height % 2)),\n  };\n}`,
            },
          },
          {
            id: 'b-t3-code-py',
            kind: 'code',
            title: 'verify_keyframes.py',
            summary: 'Python · Validates uploaded stream aspect headers',
            data: {
              language: 'python',
              code: `# Verify stream aspect metadata across edge buckets\ndef validate_aspect(width: int, height: int) -> bool:\n    if width <= 0 or height <= 0:\n        return False\n    return (width % 2 == 0) and (height % 2 == 0)`,
            },
          },
          {
            id: 'b-t3-code-sql',
            kind: 'code',
            title: 'frame_upload_failures.sql',
            summary: 'SQL · Counts 24h transcode retries by codec',
            data: {
              language: 'sql',
              code: `-- Check post-deploy failure rate\nSELECT codec, COUNT(*) AS retries\nFROM media_telemetry.upload_events\nWHERE status = 'RETRY' AND hours_ago <= 24\nGROUP BY 1 ORDER BY 2 DESC;`,
            },
          },
          {
            id: 'b-t3-code-yaml',
            kind: 'code',
            title: 'transcoder-rollout.yaml',
            summary: 'YAML · Canary rollout thresholds',
            data: {
              language: 'yaml',
              code: `# Progressive canary gate\nrollout:\n  stage: "canary-25"\n  maxErrorPct: 0.05\n  autoRollback: true`,
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
    id: 'topic-greeting-1',
    title: 'Lucy bot greeting',
    preview: 'Hi! 👋 How can I help you today?',
    dateLabel: 'May 2',
    listedOnHome: true,
    turns: [
      {
        id: 't6-a',
        role: 'assistant',
        createdAt: 'May 2 · 10:00',
        status: 'complete',
        blocks: [{ id: 'b-t6-a', kind: 'prose', data: 'Hi! 👋 How can I help you today?' }],
      },
    ],
  },
  {
    id: 'topic-greeting-2',
    title: 'Local Hello from Lucy Bot',
    preview: 'Hi! 👋 How can I help you today?',
    dateLabel: 'May 2',
    listedOnHome: true,
    turns: [
      {
        id: 't7-a',
        role: 'assistant',
        createdAt: 'May 2 · 09:42',
        status: 'complete',
        blocks: [{ id: 'b-t7-a', kind: 'prose', data: 'Hi! 👋 How can I help you today?' }],
      },
    ],
  },
  {
    id: 'topic-greeting-3',
    title: 'Greeting from Lucy bot',
    preview: 'Hi! 👋 Ready whenever you want to start a task or inspect a file.',
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
            data: 'Hi! 👋 Ready whenever you want to start a task or inspect a file.',
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
