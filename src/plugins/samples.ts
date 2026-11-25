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
  documentTitle: 'Master Cloud Services Agreement — Acme Holdings Ltd',
  partySummary: 'Between CloudHost Europe GmbH ("Vendor") and Acme Holdings Ltd ("Client") · FY27',
  totalPages: 42,
  pages: [
    {
      pageNumber: 12,
      header: 'SECTION 2 · DATA RESIDENCY & SUBPROCESSORS',
      clauses: [
        {
          section: '§2.1',
          heading: 'Primary EU & UK Data Residency',
          riskLevel: 'low',
          text: 'Client Content originating from UK and EEA entities shall remain encrypted at rest (AES-256) within London, Frankfurt, and Dublin regions unless explicitly instructed in writing.',
          note: 'Meets GDPR Art. 44 & ICAEW tech assurance guidance.',
        },
        {
          section: '§2.4',
          heading: 'Subprocessor Notice Window',
          riskLevel: 'watch',
          text: 'Vendor shall provide fourteen (14) calendar days written notice prior to authorizing any new subprocessor handling Client financial records.',
          note: 'Firm policy threshold is 30 calendar days.',
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
          note: 'Flagged for disclosure review: 3x TTM cap vs uncapped indemnity request.',
        },
        {
          section: '§4.5',
          heading: 'IP Infringement Indemnity',
          riskLevel: 'low',
          text: 'Vendor shall defend Client against third-party intellectual property claims arising directly from unmodified use of the hosted service.',
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
          text: 'Vendor will notify Client Finance & Security Operations without undue delay and no later than thirty-six (36) hours after confirming unauthorized access.',
          note: 'Within 72-hour statutory reporting window.',
        },
      ],
    },
  ],
};

const REDLINE_SAMPLE: RedlineDocumentData = {
  documentName: 'Acme_MSA_v4_Legal_Redline.diff',
  author: 'General Counsel Review · 3 Clauses',
  hunks: [
    {
      id: 'hunk-1',
      section: '§2.4 Subprocessor Notice Period',
      rationale: 'Aligns subprocessor notice period with procurement policy (30 days vs 14 days).',
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
      rationale: 'Caps annual renewal rate increases at 5% on multi-year commitments.',
      before: 'Renewal Subscription Fees may increase at Provider’s then-current list price.',
      after: 'Renewal Subscription Fees shall not increase by more than five percent (5%) over the prior term’s per-unit rate.',
      initialDecision: 'pending',
    },
  ],
};

const SQL_CANVAS_SAMPLE: SqlCanvasData = {
  warehouse: 'Snowflake · GL_REVENUE_COHORTS',
  executionMs: 142,
  scannedMb: 38.4,
  labelColumn: 'Quarter',
  metricColumns: ['Recognized ($K)', 'Deferred ($K)'],
  columns: ['Quarter', 'Recognized ($K)', 'Deferred ($K)', 'Retention (%)', 'Margin (%)'],
  rows: [
    ['Q1 26', 3420, 480, 118.4, 81.2],
    ['Q2 26', 3980, 610, 121.0, 82.5],
    ['Q3 26', 4690, 790, 124.6, 83.8],
    ['Q4 26', 5640, 1050, 128.2, 85.1],
  ],
  query: `SELECT
  fiscal_quarter                        AS "Quarter",
  ROUND(SUM(recognized_rev) / 1000, 0)  AS "Recognized ($K)",
  ROUND(SUM(deferred_add) / 1000, 0)    AS "Deferred ($K)",
  ROUND(AVG(net_retention_pct), 1)      AS "Retention (%)",
  ROUND(AVG(gross_margin_pct), 1)       AS "Margin (%)"
FROM prod_audit.gl_4010_revenue_cohorts
WHERE entity_group = 'Acme Consolidated'
  AND fiscal_year = 2026
GROUP BY 1
ORDER BY 1 ASC;`,
};

const TOPOLOGY_SAMPLE: TopologyGraphData = {
  subtitle: 'Subledger & Consolidation Feed Lineage · 6 systems',
  nodes: [
    {
      id: 'edge-gw',
      label: 'Open Banking Feeds',
      layer: 0,
      lane: 1,
      kind: 'source',
      status: 'healthy',
      owner: 'Treasury',
      latency: 'Daily 06:00',
      note: 'Chase #4821 & NatWest statement ingestion; 142 transactions matched.',
    },
    {
      id: 'auth-sso',
      label: 'OIDC / SAML Auth',
      layer: 1,
      lane: 0,
      kind: 'service',
      status: 'degraded',
      owner: 'IT Controls',
      latency: 'Delayed 18m',
      note: 'Certificate rotation pending on secondary ERP connector token.',
    },
    {
      id: 'policy-opa',
      label: 'Approval Matrix',
      layer: 1,
      lane: 2,
      kind: 'policy',
      status: 'healthy',
      owner: 'Assurance',
      latency: 'Enforced',
      note: 'Dual-control partner sign-off required prior to GL posting.',
    },
    {
      id: 'erp-consol',
      label: 'NetSuite Consolidation',
      layer: 2,
      lane: 1,
      kind: 'service',
      status: 'impacted',
      owner: 'Controllership',
      latency: 'Sync queued',
      note: 'Awaiting token refresh before posting AJE-2026-042 ($60,058.00).',
    },
    {
      id: 'snowflake-dw',
      label: 'Snowflake Subledger',
      layer: 3,
      lane: 0,
      kind: 'warehouse',
      status: 'healthy',
      owner: 'Data Audit',
      latency: 'Tied $0',
      note: 'Read-only audit extract reconciled to November Trial Balance.',
    },
    {
      id: 'audit-lake',
      label: 'Statutory Audit Trail',
      layer: 3,
      lane: 2,
      kind: 'warehouse',
      status: 'healthy',
      owner: 'Compliance',
      latency: '7-yr lock',
      note: 'Immutable workpaper revision log (ICAEW /PCAOB retention).',
    },
  ],
  edges: [
    { from: 'edge-gw', to: 'auth-sso', label: 'OAuth token' },
    { from: 'edge-gw', to: 'policy-opa', label: 'Rule check' },
    { from: 'auth-sso', to: 'erp-consol', label: 'Delayed' },
    { from: 'policy-opa', to: 'erp-consol', label: 'Dual sign-off' },
    { from: 'erp-consol', to: 'snowflake-dw', label: 'GL extract' },
    { from: 'erp-consol', to: 'audit-lake', label: 'Audit log' },
  ],
};

const SLIDE_DECK_SAMPLE: SlideDeckData = {
  deckTitle: 'Acme Holdings Ltd — Q4 Audit Committee Close Pack',
  audience: 'Audit Committee & Statutory Directors',
  dateLabel: 'Nov 2026 · Draft',
  slides: [
    {
      id: 'slide-1',
      eyebrow: '01 · FINANCIAL SUMMARY',
      title: 'FY26 Consolidated Revenue Reached $5.64M With $0 Unreconciled TB Variance',
      takeaway: 'ASC 606 deferred revenue waterfall and Chase #4821 cash accounts tie to the Consolidated Trial Balance.',
      metrics: [
        { label: 'Q4 Recognized Rev', value: '$5.64M', delta: '+20.3% QoQ' },
        { label: 'Performance Mat.', value: '$25,000', delta: '5% Pre-Tax' },
        { label: 'Gross Margin', value: '85.1%', delta: '+1.3 pts' },
      ],
      bullets: [
        'AJE-2026-042 ($60,058.00) recorded for November earned revenue release and external audit accrual.',
        'All UK & EEA subsidiary ledgers translated at closing spot rates under FRS 102 / ASC 830.',
      ],
    },
    {
      id: 'slide-2',
      eyebrow: '02 · SUBSTANTIVE TESTING',
      title: 'AP Vouching & Bank Cutoff Exceptions Below Clearly Trivial Threshold',
      takeaway: '4 cash timing differences ($3,442.10 net) and 1 FX receipt variance ($42.10) isolated on WP E-40.',
      metrics: [
        { label: 'OpEx Vouched', value: '$279.2K', delta: '5 selections' },
        { label: 'Receipt Variance', value: '$42.10', delta: 'Below $1.25K CTT' },
        { label: 'Open PBC Items', value: '3', delta: '2 overdue' },
      ],
      bullets: [
        'Awaiting signed Hudson Yards Suite 810 CAM escalation notice ($14,200) prior to final sign-off.',
        'Chase #4821 December 1–5 cutoff bank statement requested from Controller.',
      ],
    },
    {
      id: 'slide-3',
      eyebrow: '03 · TAX & FILINGS',
      title: 'CT600 & Schedule M-1 Taxable Income Reconciled at $1,648,400',
      takeaway: 'Permanent (-$5,600) and temporary (+$17,500) book-to-tax adjustments traced to Trial Balance accounts.',
      metrics: [
        { label: 'Book Net Income', value: '$1.637M', delta: 'Audited TB' },
        { label: 'Taxable Income', value: '$1.648M', delta: 'Sch M-1' },
        { label: 'Filing Deadline', value: '30 Nov', delta: 'UTR 4918204110' },
      ],
      bullets: [
        'HMRC Making Tax Digital CT600 computation validated and queued for Partner EQCR sign-off.',
        'Partner K-1 allocations reconciled across all 3 institutional and founder capital accounts.',
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
          '**Acme Holdings Ltd — CloudHost MSA** (42 pages):\n\n• **Data residency** [§2.1] restricts storage to London, Frankfurt, and Dublin; subprocessor notice in [§2.4] is 14 days vs 30-day policy.\n• **Liability super-cap** [§4.2] limits data-protection claims to **3× TTM fees**; breach notice in [§7.4] is **36 hours**.',
        artifact: {
          id: idFactory('block-contract'),
          kind: 'cited-document',
          title: 'Acme Master Cloud Services Agreement',
          filename: 'Acme_Global_MSA_FY27.pdf',
          mimeType: 'application/pdf',
          summary: '42 pages · Clauses [§2.1], [§2.4], [§4.2], [§7.4]',
          data: CONTRACT_SAMPLE,
        },
      };

    case 'redline':
      return {
        prose:
          '**Acme_MSA_v4** legal redline (3 clauses):\n\n• Extended subprocessor notice from 14 to **30 calendar days** (`§2.4`).\n• Capped data-protection liability at **3× TTM fees** (`§4.2`) and renewal uplift at **5%** (`§9.1`).',
        artifact: {
          id: idFactory('block-redline'),
          kind: 'redline',
          title: 'Acme MSA v4 Legal Redline',
          filename: 'Acme_MSA_v4_Legal_Redline.diff',
          summary: '3 clause diffs · 1 accepted, 2 pending',
          data: REDLINE_SAMPLE,
        },
      };

    case 'sql-canvas':
      return {
        prose:
          'Extracted `GL_REVENUE_COHORTS` (`4` quarters, `2,400` subledger rows):\n\n• **Q4 recognized revenue** reached **$5,640K** (+20.3% QoQ) with **85.1%** gross margin.',
        artifact: {
          id: idFactory('block-sql'),
          kind: 'sql-canvas',
          title: 'FY26 Recognized Revenue Cohorts',
          filename: 'gl_4010_revenue_cohorts.sql',
          summary: 'Snowflake · 4 quarters · 2,400 subledger rows',
          data: SQL_CANVAS_SAMPLE,
        },
      };

    case 'topology':
      return {
        defaultAnchor: 'auth-sso',
        prose:
          '**Subledger & ERP consolidation lineage** (6 nodes):\n\n• **OIDC / SAML Auth** token rotation is delayed (`18m`), holding **NetSuite Consolidation** batch sync while **Snowflake Subledger** and **Statutory Audit Trail** remain tied.',
        artifact: {
          id: idFactory('block-topology'),
          kind: 'topology',
          title: 'Subledger & Consolidation Lineage',
          filename: 'erp_consolidation_lineage.dag',
          summary: '6 systems · 1 delayed connector holding ERP batch',
          data: TOPOLOGY_SAMPLE,
        },
      };

    case 'slide-deck':
      return {
        prose:
          '**Acme Holdings Ltd — Q4 Audit Committee Close Pack** (3 slides: Financial Summary, Substantive Testing, and Tax & Filings).',
        artifact: {
          id: idFactory('block-deck'),
          kind: 'slide-deck',
          title: 'Audit Committee Q4 Close Pack',
          filename: 'Audit_Committee_Q4_Deck.pptx',
          summary: '3 slides · Financial Summary, WP E-40 & CT600 / M-1',
          data: SLIDE_DECK_SAMPLE,
        },
      };

    case 'code-workspace':
      return {
        prose:
          '**ERP journal batch validator & subledger tie-out scripts** (`normalizeJournalBatch.ts`, `reconcile_subledger.py`, `unmatched_payouts.sql`, `netsuite-sync.yaml`).',
        artifact: {
          id: idFactory('block-code-ws'),
          kind: 'code-workspace',
          title: 'ERP Webhook & Batch Validator',
          filename: 'erp-sync-patch (4 files)',
          summary: 'TS · PY · SQL · YAML — Journal validator & subledger scripts',
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
          '**Q4 Practice Revenue & Regional Workbook** (`=SUM(B2:D2)`): Net contribution **$1.64M** (+31.0% YoY) across Audit, Tax, and Subledger lines.',
        artifact: {
          id: idFactory('block-sheet'),
          kind: 'spreadsheet',
          title: 'Q4 Revenue & Regional Model',
          filename: 'Q4_Revenue_Model.xlsx',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          summary: '2 sheets · Q4 Forecast ($1.64M net) & Entity Breakdown',
          data: SAMPLE_FINANCIAL_WORKBOOK,
        },
      };
  }
}
