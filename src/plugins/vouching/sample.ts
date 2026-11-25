import type { SampleTurnPayload } from '../../core/renderers';

export type TickmarkState = 'tied' | 'exception' | 'pbc';

export interface VouchSampleItem {
  readonly id: string;
  readonly sampleCode: string;
  readonly glDate: string;
  readonly vendor: string;
  readonly glAccount: string;
  readonly ledgerAmount: number;
  readonly docAmount: number;
  readonly invoiceNo: string;
  readonly invoiceDate: string;
  readonly taxAmount: number;
  readonly formType: string;
  readonly description: string;
  readonly tickmark: TickmarkState;
}

export interface VouchingWorkpaperData {
  readonly engagement: string;
  readonly sampleSize: string;
  readonly items: ReadonlyArray<VouchSampleItem>;
}

export const VOUCHING_SAMPLE: VouchingWorkpaperData = {
  engagement: 'FY26 Audit · AP & Operating Expense Substantive Vouching (WP E-40)',
  sampleSize: '5 High-Value Selections ($279,192.10 tested)',
  items: [
    {
      id: 'v-1',
      sampleCode: 'S-01',
      glDate: '2026-11-04',
      vendor: 'Amazon Web Services, Inc.',
      glAccount: '6110 · Cloud Infrastructure',
      ledgerAmount: 48250.0,
      docAmount: 48250.0,
      invoiceNo: 'INV-AWS-994120',
      invoiceDate: '2026-11-01',
      taxAmount: 0,
      formType: 'Vendor Invoice',
      description: 'Production cluster compute & S3 archival storage (Oct–Nov)',
      tickmark: 'tied',
    },
    {
      id: 'v-2',
      sampleCode: 'S-02',
      glDate: '2026-11-11',
      vendor: 'Brex Corporate Clearing (#4419)',
      glAccount: '6420 · Travel & Client Ops',
      ledgerAmount: 3442.1,
      docAmount: 3400.0,
      invoiceNo: 'RCPT-HTL-8821',
      invoiceDate: '2026-11-09',
      taxAmount: 312.0,
      formType: 'Expense Receipt',
      description: 'Q4 field audit lodging — $42.10 FX conversion fee unmapped to 6890',
      tickmark: 'exception',
    },
    {
      id: 'v-3',
      sampleCode: 'S-03',
      glDate: '2026-11-15',
      vendor: 'Baker McKenzie LLP',
      glAccount: '6510 · Outside Legal Counsel',
      ledgerAmount: 18500.0,
      docAmount: 18500.0,
      invoiceNo: 'BM-2026-7741',
      invoiceDate: '2026-11-12',
      taxAmount: 0,
      formType: '1099-NEC Eligible Invoice',
      description: 'EEA data-residency MSA review & SOC2 subprocessor addendum',
      tickmark: 'tied',
    },
    {
      id: 'v-4',
      sampleCode: 'S-04',
      glDate: '2026-11-18',
      vendor: 'Gusto Payroll Trust',
      glAccount: '6010 · Salaries & Wages',
      ledgerAmount: 194800.0,
      docAmount: 194800.0,
      invoiceNo: 'PR-2026-22B',
      invoiceDate: '2026-11-18',
      taxAmount: 14920.0,
      formType: 'Payroll Register',
      description: 'Semi-monthly payroll run + employer FICA tie-out',
      tickmark: 'tied',
    },
    {
      id: 'v-5',
      sampleCode: 'S-05',
      glDate: '2026-11-22',
      vendor: 'Hudson Yards Property LLC',
      glAccount: '6310 · Facilities Lease',
      ledgerAmount: 14200.0,
      docAmount: 14200.0,
      invoiceNo: 'LSE-NOV-2026',
      invoiceDate: '2026-11-01',
      taxAmount: 0,
      formType: 'Lease Statement',
      description: 'Suite 810 base rent — awaiting signed Q4 CAM escalation schedule',
      tickmark: 'pbc',
    },
  ],
};

export function buildVouchingSampleTurn(nextId: (p: string) => string): SampleTurnPayload {
  return {
    prose:
      '**WP E-40 Substantive Vouching** (`5` selections, **$279,192.10** tested): `3` agreed to source, `1` FX fee variance (`S-02`, **$42.10**), `1` open PBC (`S-05` CAM schedule).',
    artifact: {
      id: nextId('block-vouch'),
      kind: 'vouching',
      title: 'AP & OpEx Substantive Vouching (WP E-40)',
      filename: 'WP_E40_Vouching_TieOut.wp',
      summary: '5 selections ($279.2K) · 3 Tied · 1 Variance ($42.10) · 1 PBC',
      data: VOUCHING_SAMPLE,
    },
  };
}
