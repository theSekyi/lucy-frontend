import type { SampleTurnPayload } from '../../core/renderers';

export interface TrialBalanceAccount {
  readonly code: string;
  readonly name: string;
  readonly category: 'Assets' | 'Liabilities & Equity' | 'Revenue' | 'Operating Expenses';
  readonly unadjusted: number;
  readonly aje: number;
  readonly priorPeriod: number;
  readonly drilldown: ReadonlyArray<string>;
}

export interface TrialBalanceData {
  readonly entity: string;
  readonly period: string;
  readonly materialityThreshold: number;
  readonly accounts: ReadonlyArray<TrialBalanceAccount>;
}

export const TRIAL_BALANCE_SAMPLE: TrialBalanceData = {
  entity: 'Acme Holdings Consolidated (USD)',
  period: 'Period Ending Nov 30, 2026',
  materialityThreshold: 25000,
  accounts: [
    {
      code: '1010',
      name: 'Cash — Chase Operating #4821',
      category: 'Assets',
      unadjusted: 1418920,
      aje: 3442,
      priorPeriod: 1190400,
      drilldown: ['Nov 28 Wire #9982 +$12,500', 'Nov 30 Deposit in transit -$8,400'],
    },
    {
      code: '1200',
      name: 'Accounts Receivable — Enterprise',
      category: 'Assets',
      unadjusted: 842000,
      aje: -18500,
      priorPeriod: 785000,
      drilldown: ['INV-4410 Global Corp $210,000', 'AJE-04 Allowance reserve -$18,500'],
    },
    {
      code: '2400',
      name: 'Deferred Revenue — Current (ASC 606)',
      category: 'Liabilities & Equity',
      unadjusted: -960000,
      aje: 45000,
      priorPeriod: -820000,
      drilldown: ['Nov earned SaaS amortization release +$45,000'],
    },
    {
      code: '3100',
      name: 'Retained Earnings & Common Stock',
      category: 'Liabilities & Equity',
      unadjusted: -790920,
      aje: 0,
      priorPeriod: -790920,
      drilldown: ['Opening audited equity rollforward'],
    },
    {
      code: '4010',
      name: 'Enterprise Subscription Revenue',
      category: 'Revenue',
      unadjusted: -1120000,
      aje: -45000,
      priorPeriod: -945000,
      drilldown: ['ASC 606 waterfall release -$45,000 (Credit)', '14 new enterprise seats'],
    },
    {
      code: '6010',
      name: 'Engineering & Cloud Operations',
      category: 'Operating Expenses',
      unadjusted: 412000,
      aje: 0,
      priorPeriod: 398000,
      drilldown: ['AWS Production INV-994120 $48,250', 'Payroll Trust $194,800'],
    },
    {
      code: '6510',
      name: 'Legal, Audit & Professional Fees',
      category: 'Operating Expenses',
      unadjusted: 198000,
      aje: 15058,
      priorPeriod: 182520,
      drilldown: ['Baker McKenzie LLP $18,500', 'Year-end audit accrual +$15,058'],
    },
  ],
};

export function buildTrialBalanceSampleTurn(nextId: (p: string) => string): SampleTurnPayload {
  return {
    prose:
      'Prepared the **November Consolidated Trial Balance & Flux Workpaper** (`Net TB = $0`).\n\n• **Performance Materiality (`PM`)** set at **$25,000** — 4 accounts exceed PM and are flagged for flux commentary.\n• Adjust any `AJE Dr/(Cr)` cell or lower the PM threshold in the header to recalculate Adjusted TB and materiality flags live.',
    artifact: {
      id: nextId('block-tb'),
      kind: 'trial-balance',
      title: 'Consolidated Trial Balance & Flux',
      filename: 'Nov2026_Consolidated_TB.tb',
      summary: '7 accounts · Net TB $0 balanced · PM $25,000 flux flags',
      data: TRIAL_BALANCE_SAMPLE,
    },
  };
}
