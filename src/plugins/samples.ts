import {
  ACME_AUDIT_DECK,
  ACME_CODE_FILES,
  ACME_CONTRACT_FOLIO,
  ACME_REDLINE_DIFF,
  ACME_SQL_COHORTS,
  ACME_TOPOLOGY_GRAPH,
  FIRM_PRACTICE_WORKBOOK,
} from '../core/ledger';
import type { ContentBlock } from '../core/types';

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
          data: ACME_CONTRACT_FOLIO,
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
          data: ACME_REDLINE_DIFF,
        },
      };

    case 'sql-canvas':
      return {
        prose:
          'Extracted `GL_REVENUE_COHORTS` (`4` quarters, `2,400` subledger rows):\n\n• **Q4 recognized revenue** reached **£5,640K** (+20.3% QoQ) with **85.1%** gross margin, reconciling to £17,730K FY26 total.',
        artifact: {
          id: idFactory('block-sql'),
          kind: 'sql-canvas',
          title: 'FY26 Recognized Revenue Cohorts',
          filename: 'gl_4010_revenue_cohorts.sql',
          summary: 'Snowflake · 4 quarters · 2,400 subledger rows (£17,730K)',
          data: ACME_SQL_COHORTS,
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
          data: ACME_TOPOLOGY_GRAPH,
        },
      };

    case 'slide-deck':
      return {
        prose:
          '**Acme Holdings Ltd — Q4 Audit Committee Close Pack** (3 slides: Financial Summary, Substantive Testing, and UK Corporation Tax).',
        artifact: {
          id: idFactory('block-deck'),
          kind: 'slide-deck',
          title: 'Audit Committee Q4 Close Pack',
          filename: 'Audit_Committee_Q4_Deck.pptx',
          summary: '3 slides · Financial Summary, WP E-40 & HMRC CT600',
          data: ACME_AUDIT_DECK,
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
          data: ACME_CODE_FILES,
        },
      };

    case 'spreadsheet':
    default:
      return {
        prose:
          '**Q4 Practice Revenue & Client Recovery Workbook** (`=SUM(B2:D2)`): Net contribution **£1.64M** (+31.0% YoY) across Audit, Tax, and Advisory lines.',
        artifact: {
          id: idFactory('block-sheet'),
          kind: 'spreadsheet',
          title: 'Q4 Practice Revenue & Recovery Model',
          filename: 'Q4_Revenue_Model.xlsx',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          summary: '2 sheets · Q4 Forecast (£1.64M net) & Entity Breakdown',
          data: FIRM_PRACTICE_WORKBOOK,
        },
      };
  }
}
