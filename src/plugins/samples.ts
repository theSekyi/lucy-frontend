import { SAMPLE_FINANCIAL_WORKBOOK } from '../core/seed';
import type {
  CitedDocumentData,
  ContentBlock,
  RedlineDocumentData,
  SlideDeckData,
  SqlCanvasData,
  TopologyGraphData,
} from '../core/types';

export type EnterpriseArtifactPreset =
  | 'spreadsheet'
  | 'contract'
  | 'redline'
  | 'sql-canvas'
  | 'topology'
  | 'slide-deck'
  | 'code-workspace';

export interface GeneratedEnterpriseTurn {
  readonly prose: string;
  readonly artifact: ContentBlock;
  readonly defaultAnchor?: string;
}

const CONTRACT_SAMPLE: CitedDocumentData = {
  documentTitle: 'Master Cloud Services Agreement — Acme Global Corp',
  partySummary: 'Between Lucy Enterprise Inc. ("Provider") and Acme Global ("Customer") · Effective Q4',
  totalPages: 42,
  pages: [
    {
      pageNumber: 12,
      header: 'SECTION 2 · DATA RESIDENCY & SUBPROCESSORS',
      clauses: [
        {
          section: '§2.1',
          heading: 'Primary EU & US Data Residency',
          riskLevel: 'low',
          text: 'Customer Content originating from EEA member states shall remain encrypted at rest (AES-256) within Frankfurt (eu-central-1) and Dublin (eu-west-1) regions unless explicitly routed by Customer.',
          note: 'Complies with SOC2 CC6.1 & GDPR Art. 44.',
        },
        {
          section: '§2.4',
          heading: 'Subprocessor Notice Window',
          riskLevel: 'watch',
          text: 'Provider shall provide fourteen (14) calendar days written notice prior to authorizing any new subprocessor handling Customer PII.',
          note: 'Standard enterprise threshold is 30 days.',
        },
      ],
    },
    {
      pageNumber: 19,
      header: 'SECTION 4 · INDEMNIFICATION & LIABILITY CAP',
      clauses: [
        {
          section: '§4.2',
          heading: 'Super-Cap Limitation of Liability',
          riskLevel: 'high',
          text: 'Aggregate liability for Data Protection or Confidentiality breaches shall not exceed three times (3x) the trailing twelve-month (TTM) Subscription Fees paid or payable under the applicable Order Form.',
          note: 'Key negotiation clause: Customer requested uncapped; 3x TTM is mutually market-standard.',
        },
        {
          section: '§4.5',
          heading: 'IP Infringement Indemnity',
          riskLevel: 'low',
          text: 'Provider shall defend Customer against third-party intellectual property claims arising directly from unmodified use of the Platform.',
        },
      ],
    },
    {
      pageNumber: 34,
      header: 'SECTION 7 · SECURITY INCIDENT SLA',
      clauses: [
        {
          section: '§7.4',
          heading: 'Breach Notification Window',
          riskLevel: 'low',
          text: 'Provider will notify Customer Security Operations without undue delay and in no event later than thirty-six (36) hours after confirming unauthorized access to Customer Data.',
          note: 'Beats 72-hour regulatory baseline.',
        },
      ],
    },
  ],
};

const REDLINE_SAMPLE: RedlineDocumentData = {
  documentName: 'Acme_MSA_v4_Legal_Redline.diff',
  author: 'General Counsel Review · 3 Clauses Proposed',
  hunks: [
    {
      id: 'hunk-1',
      section: '§2.4 Subprocessor Notice Period',
      rationale: 'Aligns subprocessor notice period with Acme procurement policy (30 days vs 14 days).',
      before: 'Provider shall provide fourteen (14) calendar days written notice prior to authorizing any new subprocessor.',
      after: 'Provider shall provide thirty (30) calendar days prior written notice and an objection window before authorizing any new subprocessor.',
      initialDecision: 'pending',
    },
    {
      id: 'hunk-2',
      section: '§4.2 Aggregate Liability Super-Cap',
      rationale: 'Caps enhanced data-breach liability at 3x annual fees instead of uncapped exposure.',
      before: 'Liability for breaches of Section 2 (Confidentiality & Data Protection) shall be unlimited.',
      after: 'Aggregate liability for breaches of Section 2 shall not exceed three times (3x) the trailing twelve-month (TTM) Fees.',
      initialDecision: 'accepted',
    },
    {
      id: 'hunk-3',
      section: '§9.1 Renewal Price Uplift Cap',
      rationale: 'Prevents uncapped CPI adjustments on multi-year enterprise seats.',
      before: 'Renewal Subscription Fees may increase at Provider’s then-current list price.',
      after: 'Renewal Subscription Fees shall not increase by more than five percent (5%) over the prior term’s per-unit rate.',
      initialDecision: 'pending',
    },
  ],
};

const SQL_CANVAS_SAMPLE: SqlCanvasData = {
  warehouse: 'Snowflake · PROD_FINANCE.MART_ARR',
  executionMs: 184,
  scannedMb: 42.6,
  labelColumn: 'Quarter',
  metricColumns: ['Enterprise ARR ($K)', 'Expansion ($K)'],
  columns: ['Quarter', 'Enterprise ARR ($K)', 'Expansion ($K)', 'Net Retention (%)', 'Gross Margin (%)'],
  rows: [
    ['Q1 26', 3420, 480, 118.4, 81.2],
    ['Q2 26', 3980, 610, 121.0, 82.5],
    ['Q3 26', 4690, 790, 124.6, 83.8],
    ['Q4 26', 5640, 1050, 128.2, 85.1],
  ],
  query: `SELECT
  fiscal_quarter                        AS "Quarter",
  ROUND(SUM(enterprise_arr) / 1000, 0)  AS "Enterprise ARR ($K)",
  ROUND(SUM(expansion_arr) / 1000, 0)   AS "Expansion ($K)",
  ROUND(AVG(net_dollar_retention), 1)   AS "Net Retention (%)",
  ROUND(AVG(gross_margin_pct), 1)       AS "Gross Margin (%)"
FROM prod_finance.mart_arr_cohorts
WHERE segment = 'Enterprise'
  AND fiscal_year = 2026
GROUP BY 1
ORDER BY 1 ASC;`,
};

const TOPOLOGY_SAMPLE: TopologyGraphData = {
  subtitle: 'Incident & Data Lineage · Real-time blast radius across 6 production nodes',
  nodes: [
    {
      id: 'edge-gw',
      label: 'Edge Gateway',
      layer: 0,
      lane: 1,
      kind: 'source',
      status: 'healthy',
      owner: 'Platform Net',
      latency: '9 ms p95',
      note: 'TLS termination & regional WAF routing; 0% packet drop.',
    },
    {
      id: 'auth-sso',
      label: 'OIDC / SAML Auth',
      layer: 1,
      lane: 0,
      kind: 'service',
      status: 'degraded',
      owner: 'Identity Core',
      latency: '214 ms p95',
      note: 'Token introspection cache miss spike after IdP key rotation; auto-mitigation active.',
    },
    {
      id: 'policy-opa',
      label: 'RBAC Policy Engine',
      layer: 1,
      lane: 2,
      kind: 'policy',
      status: 'healthy',
      owner: 'Security Eng',
      latency: '4 ms p95',
      note: 'Row-level tenant isolation & PII redaction rules enforced.',
    },
    {
      id: 'lucy-orch',
      label: 'Lucy Orchestrator',
      layer: 2,
      lane: 1,
      kind: 'service',
      status: 'impacted',
      owner: 'Core Services',
      latency: '260 ms p95',
      note: 'Inherits +180 ms upstream auth tail latency on uncached session handshakes.',
    },
    {
      id: 'snowflake-dw',
      label: 'Snowflake Warehouse',
      layer: 3,
      lane: 0,
      kind: 'warehouse',
      status: 'healthy',
      owner: 'Data Platform',
      latency: '184 ms p95',
      note: 'Read-only service principal with query result caching.',
    },
    {
      id: 'audit-lake',
      label: 'SOC2 Audit Ledger',
      layer: 3,
      lane: 2,
      kind: 'warehouse',
      status: 'healthy',
      owner: 'Compliance',
      latency: '18 ms p95',
      note: 'Immutable append-only provenance stream (7-year retention).',
    },
  ],
  edges: [
    { from: 'edge-gw', to: 'auth-sso', label: 'JWT verify' },
    { from: 'edge-gw', to: 'policy-opa', label: 'Tenant ACL' },
    { from: 'auth-sso', to: 'lucy-orch', label: '+180ms tail' },
    { from: 'policy-opa', to: 'lucy-orch', label: 'Scoped claims' },
    { from: 'lucy-orch', to: 'snowflake-dw', label: 'SQL read' },
    { from: 'lucy-orch', to: 'audit-lake', label: 'Audit emit' },
  ],
};

const SLIDE_DECK_SAMPLE: SlideDeckData = {
  deckTitle: 'Q4 Enterprise Business Review & FY27 Plan',
  audience: 'Executive Staff & Board of Directors',
  dateLabel: 'Nov 2026 · Confidential',
  slides: [
    {
      id: 'slide-1',
      eyebrow: '01 · EXECUTIVE SUMMARY',
      title: 'Enterprise ARR Reached $5.64M (+65% YoY) With Best-in-Class Efficiency',
      takeaway: 'Net Dollar Retention expanded 980 bps to 128.2% driven by multi-department seat adoption.',
      metrics: [
        { label: 'Ending ARR', value: '$5.64M', delta: '+65% YoY' },
        { label: 'Net Dollar Retention', value: '128.2%', delta: '+9.8 pts' },
        { label: 'Gross Margin', value: '85.1%', delta: '+3.9 pts' },
      ],
      bullets: [
        'Closed 14 new Fortune-1000 logos with average initial deployment under 11 days.',
        'Zero Sev-1 compliance or data-residency incidents across EU & US sovereign regions.',
      ],
    },
    {
      id: 'slide-2',
      eyebrow: '02 · PRODUCT VELOCITY',
      title: 'Modular Stage Architecture Cut Low-Bandwidth Load Time by 5.9×',
      takeaway: 'APAC & emerging-market field teams saw +27% weekly active usage after shipping <19 KB boot shell.',
      metrics: [
        { label: 'Initial Boot Payload', value: '18.6 KB', delta: 'Brotli' },
        { label: 'Slow-3G Interactive', value: '1.19 s', delta: '4.5× faster' },
        { label: 'Lazy Plugin Overhead', value: '0 KB', delta: 'Until opened' },
      ],
      bullets: [
        '6 enterprise stage renderers (Excel, Contracts, Redlines, SQL BI, Lineage, Decks) load on demand.',
        'Offline outbox guarantees zero lost prompts for traveling executives and field ops.',
      ],
    },
    {
      id: 'slide-3',
      eyebrow: '03 · FY27 CAPITAL ALLOCATION',
      title: 'Focused Investment in Regulated Verticals & Transactional Connectors',
      takeaway: 'Targeting $12.5M ARR by Q4 FY27 while maintaining positive free cash flow.',
      metrics: [
        { label: 'FY27 ARR Target', value: '$12.5M', delta: '2.2×' },
        { label: 'CAC Payback', value: '9.4 mos', delta: '-2.1 mos' },
        { label: 'Security Certs', value: 'SOC2 + ISO', delta: 'FedRAMP Q2' },
      ],
      bullets: [
        'Expand governed write-back approvals across Salesforce, Jira, Coupa, and Snowflake.',
        'Maintain strict zero-bloat performance budget in CI on every pull request.',
      ],
    },
  ],
};

export function createEnterprisePresetTurn(
  preset: EnterpriseArtifactPreset,
  idFactory: (prefix: string) => string
): GeneratedEnterpriseTurn {
  switch (preset) {
    case 'contract':
      return {
        defaultAnchor: '§4.2',
        prose:
          'I reviewed the **Acme Global Master Cloud Services Agreement** (42 pages). Click any section citation to jump straight to the verified clause on the page:\n\n• **Data Residency** [§2.1] locks EEA customer data to Frankfurt & Dublin with AES-256 encryption, while subprocessor notice in [§2.4] is currently 14 days (watch item).\n• **Liability Cap** [§4.2] sets a **3× TTM super-cap** on data protection breaches — flagged as the primary negotiation clause.\n• **Incident SLA** [§7.4] commits to a **36-hour breach notice**, beating the 72-hour baseline.',
        artifact: {
          id: idFactory('block-contract'),
          kind: 'cited-document',
          title: 'Acme Master Cloud Services Agreement',
          filename: 'Acme_Global_MSA_FY27.pdf',
          mimeType: 'application/pdf',
          summary: '42 pages · 5 grounded clauses indexed ([§2.1], [§2.4], [§4.2], [§7.4])',
          data: CONTRACT_SAMPLE,
        },
      };

    case 'redline':
      return {
        prose:
          'Prepared **3 surgical contract redlines** on `Acme_MSA_v4` ready for General Counsel sign-off.\n\n• Extended subprocessor notice from 14 → **30 calendar days** (`§2.4`).\n• Capped data-protection super-cap at **3× TTM fees** (`§4.2`).\n• Added a **5% renewal uplift cap** (`§9.1`).\n\nUse **Accept** / **Reject** on each hunk in the redline stage to finalize the audit log.',
        artifact: {
          id: idFactory('block-redline'),
          kind: 'redline',
          title: 'Acme MSA v4 Legal Redline',
          filename: 'Acme_MSA_v4_Legal_Redline.diff',
          summary: '3 clause diffs · Per-section Accept / Reject with live decision tally',
          data: REDLINE_SAMPLE,
        },
      };

    case 'sql-canvas':
      return {
        prose:
          'Queried `PROD_FINANCE.MART_ARR` in **184 ms** (42.6 MB scanned).\n\n• **Enterprise ARR grew +64.9% across FY26** ($3.42M → **$5.64M**), while Net Retention climbed to **128.2%**.\n• Switch between **Chart**, **Data Grid**, and **SQL Query** in the stage to verify the cohort aggregation.',
        artifact: {
          id: idFactory('block-sql'),
          kind: 'sql-canvas',
          title: 'FY26 Enterprise ARR Cohort Query',
          filename: 'enterprise_arr_cohorts.sql',
          summary: 'Snowflake · 4 quarters · Chart + Grid + Verified SQL (184 ms)',
          data: SQL_CANVAS_SAMPLE,
        },
      };

    case 'topology':
      return {
        defaultAnchor: 'auth-sso',
        prose:
          'Mapped the live **service & data lineage blast radius** across 6 production nodes.\n\n• Root cause isolated to **OIDC / SAML Auth** (`214 ms p95` after IdP key rotation), adding `+180 ms` tail latency to **Lucy Orchestrator** while **Snowflake Warehouse** and **SOC2 Audit Ledger** remain healthy.\n• Pan, zoom, or click any node in the topology stage to inspect its owner, SLA, and downstream dependencies.',
        artifact: {
          id: idFactory('block-topology'),
          kind: 'topology',
          title: 'Auth Latency Blast Radius & Lineage',
          filename: 'prod_service_lineage.dag',
          summary: '6 nodes · 6 edges · 1 degraded upstream (OIDC Auth) impacting orchestrator',
          data: TOPOLOGY_SAMPLE,
        },
      };

    case 'slide-deck':
      return {
        prose:
          'Drafted the **Q4 Enterprise Business Review & FY27 Plan** as a 3-slide executive deck.\n\n• Formatted in crisp `16:9` presentation layout with headline KPIs, board takeaways, and `Export Brief` support.',
        artifact: {
          id: idFactory('block-deck'),
          kind: 'slide-deck',
          title: 'Q4 Enterprise Business Review',
          filename: 'Q4_Enterprise_Board_Deck.pptx',
          summary: '3 slides · 16:9 Executive QBR ($5.64M ARR, 128.2% NDR, FY27 Plan)',
          data: SLIDE_DECK_SAMPLE,
        },
      };

    case 'code-workspace':
      return {
        prose:
          'Prepared the **4-file ERP webhook & reconciliation validation patch** across TypeScript, Python QA checks, SQL telemetry, and canary rollout config.',
        artifact: {
          id: idFactory('block-code-ws'),
          kind: 'code-workspace',
          title: 'ERP Webhook & Batch Validator',
          filename: 'erp-sync-patch (4 files)',
          summary: 'TS · PY · SQL · YAML — Ledger normalizer, validator & canary config',
          data: {
            files: [
              {
                filename: 'normalizeJournalBatch.ts',
                filepath: 'packages/erp-sync/src/normalizeJournalBatch.ts',
                language: 'typescript',
                code: `// Enforce zero-variance double-entry invariant before ERP write-back\nexport interface JournalLine {\n  readonly accountCode: string;\n  readonly debitCents: number;\n  readonly creditCents: number;\n}\n\nexport function isBalancedBatch(lines: ReadonlyArray<JournalLine>): boolean {\n  const net = lines.reduce((sum, l) => sum + l.debitCents - l.creditCents, 0);\n  return lines.length > 0 && net === 0;\n}`,
              },
              {
                filename: 'reconcile_subledger.py',
                filepath: 'scripts/audit/reconcile_subledger.py',
                language: 'python',
                code: `# Tie payout settlement batches to general ledger clearing account\ndef check_cutoff_variance(bank_cents: int, gl_cents: int, ctt_cents: int = 125000) -> str:\n    diff = abs(bank_cents - gl_cents)\n    if diff == 0:\n        return "TIED"\n    return "TRIVIAL_FX" if diff <= ctt_cents else "EXCEPTION"`,
              },
              {
                filename: 'unmatched_payouts.sql',
                filepath: 'audit/queries/unmatched_payouts.sql',
                language: 'sql',
                code: `-- Open bank-to-NetSuite clearing items exceeding cutoff window\nSELECT\n  entity_code,\n  gl_account,\n  SUM(statement_amount - gl_amount) AS variance_usd\nFROM prod_audit.bank_clearing_nov26\nWHERE match_status = 'UNMATCHED'\nGROUP BY 1, 2\nORDER BY ABS(SUM(statement_amount - gl_amount)) DESC;`,
              },
              {
                filename: 'netsuite-sync.yaml',
                filepath: 'deploy/connectors/netsuite-sync.yaml',
                language: 'yaml',
                code: `# Dual-control ERP journal posting policy\nconnector: oracle-netsuite\npostingGate:\n  requirePartnerSignOff: true\n  maxImbalanceCents: 0\n  retryBackoffMs: 250`,
              },
            ],
          },
        },
      };

    case 'spreadsheet':
    default:
      return {
        prose:
          'Here is the structured Q4 financial & regional latency workbook. Key takeaway: **Net Contribution grew +31.0% YoY ($1.64M)** while APAC low-bandwidth retention led all regions at **127%**.\n\nClick any cell to inspect formulas (`=SUM(B2:D2)`) or sort columns.',
        artifact: {
          id: idFactory('block-sheet'),
          kind: 'spreadsheet',
          title: 'Q4 Revenue & Regional Model',
          filename: 'Q4_Revenue_Model.xlsx',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          summary: '2 sheets · Q4 Forecast ($1.64M net, +31% YoY) & Region Breakdown',
          data: SAMPLE_FINANCIAL_WORKBOOK,
        },
      };
  }
}
