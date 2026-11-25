import {
  formatAccountingNumber,
  formatMoney,
  formatMoneyMinor,
  sumMajorViaMinor,
  toMinorUnits,
  type CurrencyCode,
} from './money';
import type {
  CellScalar,
  CitedDocumentData,
  CodeFileEntry,
  RedlineDocumentData,
  SlideDeckData,
  SpreadsheetWorkbook,
  SqlCanvasData,
  TopologyGraphData,
} from './types';

// ============================================================================
// 1. CANONICAL WORKPAPER DATA TYPES (Shared across Core & Plugins)
// ============================================================================

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
  readonly currency: CurrencyCode;
  readonly period: string;
  readonly materialityThreshold: number;
  readonly accounts: ReadonlyArray<TrialBalanceAccount>;
}

export interface JournalLine {
  readonly id: string;
  readonly account: string;
  readonly entity: string;
  readonly debit: number;
  readonly credit: number;
  readonly memo: string;
}

export interface JournalEntryGateData {
  readonly entryNumber: string;
  readonly currency: CurrencyCode;
  readonly erpTarget: string;
  readonly effectiveDate: string;
  readonly preparer: string;
  readonly posted?: boolean;
  readonly approvedBy?: string;
  readonly approvedAt?: string;
  readonly lines: ReadonlyArray<JournalLine>;
}

export type ReconResolution = 'open' | 'matched' | 'aje-drafted' | 'pbc';

export interface ReconExceptionItem {
  readonly id: string;
  readonly date: string;
  readonly sourceRef: string;
  readonly counterparty: string;
  readonly bankAmount: number;
  readonly glAmount: number;
  readonly variance: number;
  readonly reason: string;
  readonly status: ReconResolution;
}

export interface ReconciliationData {
  readonly accountName: string;
  readonly currency: CurrencyCode;
  readonly autoMatchedCount: number;
  readonly autoMatchedVolume: number;
  readonly exceptions: ReadonlyArray<ReconExceptionItem>;
}

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
  readonly currency: CurrencyCode;
  readonly clearlyTrivialThreshold: number;
  readonly signedOffBy?: string;
  readonly signedOffAt?: string;
  readonly items: ReadonlyArray<VouchSampleItem>;
}

export type PbcStatus = 'overdue' | 'pending' | 'received';

export interface PbcItem {
  readonly id: string;
  readonly code: string;
  readonly requestTitle: string;
  readonly clientOwner: string;
  readonly dueDateIso: string;
  readonly aging: string;
  readonly status: PbcStatus;
}

export interface PbcTrackerData {
  readonly engagementName: string;
  readonly clientName: string;
  readonly lastRemindedAt?: string;
  readonly items: ReadonlyArray<PbcItem>;
}

export interface RollforwardPeriod {
  readonly period: string;
  readonly additions: number;
  readonly recognized: number;
}

export interface RollforwardSchedule {
  readonly id: string;
  readonly standard: string;
  readonly accountPair: string;
  readonly openingBalance: number;
  readonly glControlEnding: number;
  readonly periods: ReadonlyArray<RollforwardPeriod>;
}

export interface RollforwardData {
  readonly entity: string;
  readonly currency: CurrencyCode;
  readonly schedules: ReadonlyArray<RollforwardSchedule>;
}

export interface TaxAdjustmentLine {
  readonly id: string;
  readonly description: string;
  readonly type: 'permanent' | 'temporary';
  readonly ircSection: string;
  readonly formBox: string;
  readonly tbAccounts: string;
  readonly amount: number;
  readonly baselineAmount: number;
}

export interface PartnerK1Share {
  readonly partner: string;
  readonly ownershipPct: number;
  readonly entityType: string;
}

export interface TaxBridgeData {
  readonly clientName: string;
  readonly currency: CurrencyCode;
  readonly taxRatePct: number;
  readonly taxYear: string;
  readonly formTitle: string;
  readonly bookNetIncome: number;
  readonly adjustments: ReadonlyArray<TaxAdjustmentLine>;
  readonly partners: ReadonlyArray<PartnerK1Share>;
}

// ============================================================================
// 2. PURE TIE-OUT & INVARIANT EVALUATORS (Exact Integer Minor Units)
// ============================================================================

export function evaluateTrialBalanceTieOut(
  tb: TrialBalanceData,
  ajeOverrides?: Readonly<Record<string, number>>,
  pmOverride?: number
) {
  const pmMinor = toMinorUnits(pmOverride ?? tb.materialityThreshold);
  const netUnadjustedMinor = sumMajorViaMinor(tb.accounts.map((a) => a.unadjusted));
  const netAjeMinor = sumMajorViaMinor(
    tb.accounts.map((a) => (ajeOverrides ? (ajeOverrides[a.code] ?? a.aje) : a.aje))
  );
  const netAdjustedMinor = sumMajorViaMinor(
    tb.accounts.map(
      (a) => a.unadjusted + (ajeOverrides ? (ajeOverrides[a.code] ?? a.aje) : a.aje)
    )
  );

  let flaggedCount = 0;
  let revenueMinor = 0;
  let expenseMinor = 0;

  for (const acct of tb.accounts) {
    const ajeVal = ajeOverrides ? (ajeOverrides[acct.code] ?? acct.aje) : acct.aje;
    const adjustedMinor = toMinorUnits(acct.unadjusted) + toMinorUnits(ajeVal);
    const fluxMinor = adjustedMinor - toMinorUnits(acct.priorPeriod);
    if (Math.abs(fluxMinor) >= pmMinor) {
      flaggedCount += 1;
    }
    if (acct.category === 'Revenue') {
      revenueMinor += -adjustedMinor;
    } else if (acct.category === 'Operating Expenses') {
      expenseMinor += adjustedMinor;
    }
  }

  return {
    isBalanced: netAdjustedMinor === 0,
    netUnadjustedMinor,
    netAjeMinor,
    netAdjustedMinor,
    pmMinor,
    flaggedCount,
    netProfitMinor: revenueMinor - expenseMinor,
  };
}

export function evaluateJournalEntryTieOut(lines: ReadonlyArray<JournalLine>) {
  const totalDebitMinor = sumMajorViaMinor(lines.map((l) => l.debit));
  const totalCreditMinor = sumMajorViaMinor(lines.map((l) => l.credit));
  const imbalanceMinor = totalDebitMinor - totalCreditMinor;
  return {
    totalDebitMinor,
    totalCreditMinor,
    imbalanceMinor,
    isBalanced: imbalanceMinor === 0 && totalDebitMinor > 0,
  };
}

export function evaluateReconciliationTieOut(
  data: ReconciliationData,
  resolutions?: Readonly<Record<string, ReconResolution>>
) {
  const getStatus = (item: ReconExceptionItem): ReconResolution =>
    resolutions?.[item.id] ?? item.status;

  // Only 'matched' (timing verified) and 'aje-drafted' clear unreconciled bank variance;
  // 'open' and 'pbc' remain unresolved until evidence/entry is posted.
  const unresolvedItems = data.exceptions.filter((e) => {
    const st = getStatus(e);
    return st === 'open' || st === 'pbc';
  });
  const openCount = data.exceptions.filter((e) => getStatus(e) === 'open').length;
  const pbcCount = data.exceptions.filter((e) => getStatus(e) === 'pbc').length;
  const clearedCount = data.exceptions.length - unresolvedItems.length;
  const remainingVarianceMinor = sumMajorViaMinor(unresolvedItems.map((e) => e.variance));

  return {
    isReconciled: unresolvedItems.length === 0 && remainingVarianceMinor === 0,
    openCount,
    pbcCount,
    unresolvedCount: unresolvedItems.length,
    clearedCount,
    totalMatchedCount: data.autoMatchedCount + clearedCount,
    remainingVarianceMinor,
  };
}

export function evaluateVouchingTieOut(
  wp: VouchingWorkpaperData,
  tickOverrides?: Readonly<Record<string, TickmarkState>>
) {
  const getTick = (item: VouchSampleItem): TickmarkState =>
    tickOverrides?.[item.id] ?? item.tickmark;

  const totalLedgerMinor = sumMajorViaMinor(wp.items.map((i) => i.ledgerAmount));
  const tiedCount = wp.items.filter((i) => getTick(i) === 'tied').length;
  const exceptionCount = wp.items.filter((i) => getTick(i) === 'exception').length;
  const pbcCount = wp.items.filter((i) => getTick(i) === 'pbc').length;
  const canSignOff = exceptionCount === 0 && pbcCount === 0;

  return {
    totalLedgerMinor,
    tiedCount,
    exceptionCount,
    pbcCount,
    canSignOff,
    blockerReason: !canSignOff
      ? `Clear ${[
          exceptionCount > 0 ? `${exceptionCount} variance${exceptionCount > 1 ? 's' : ''}` : '',
          pbcCount > 0 ? `${pbcCount} open PBC item${pbcCount > 1 ? 's' : ''}` : '',
        ]
          .filter(Boolean)
          .join(' and ')} before partner sign-off.`
      : null,
  };
}

export function evaluateRollforwardTieOut(
  schedule: RollforwardSchedule,
  periodsOverride?: ReadonlyArray<RollforwardPeriod>
) {
  const periods = periodsOverride ?? schedule.periods;
  let runningMinor = toMinorUnits(schedule.openingBalance);
  const rows = periods.map((p) => {
    const openMinor = runningMinor;
    const addMinor = toMinorUnits(p.additions);
    const recMinor = toMinorUnits(p.recognized);
    const endingMinor = openMinor + addMinor - recMinor;
    runningMinor = endingMinor;
    return {
      period: p.period,
      openMinor,
      addMinor,
      recMinor,
      endingMinor,
    };
  });

  const endingMinor = rows[rows.length - 1]?.endingMinor ?? toMinorUnits(schedule.openingBalance);
  const controlMinor = toMinorUnits(schedule.glControlEnding);
  const deltaMinor = endingMinor - controlMinor;

  return {
    rows,
    endingMinor,
    controlMinor,
    deltaMinor,
    isTiedToGl: deltaMinor === 0,
  };
}

export function evaluateTaxBridgeTieOut(
  data: TaxBridgeData,
  amountOverrides?: Readonly<Record<string, number>>
) {
  const getAmt = (adj: TaxAdjustmentLine) =>
    amountOverrides ? (amountOverrides[adj.id] ?? adj.amount) : adj.amount;

  const bookMinor = toMinorUnits(data.bookNetIncome);
  const permMinor = sumMajorViaMinor(
    data.adjustments.filter((a) => a.type === 'permanent').map(getAmt)
  );
  const tempMinor = sumMajorViaMinor(
    data.adjustments.filter((a) => a.type === 'temporary').map(getAmt)
  );
  const taxableMinor = bookMinor + permMinor + tempMinor;
  const estTaxMinor = Math.max(0, Math.round((taxableMinor * data.taxRatePct) / 100));

  const modifiedIds = data.adjustments
    .filter((a) => toMinorUnits(getAmt(a)) !== toMinorUnits(a.baselineAmount))
    .map((a) => a.id);

  return {
    bookMinor,
    permMinor,
    tempMinor,
    taxableMinor,
    estTaxMinor,
    modifiedIds,
    isTiedToBaselineTb: modifiedIds.length === 0,
  };
}

// ============================================================================
// 3. CANONICAL SINGLE-SOURCE FIXTURES (Acme UK GBP, Kensington UK GBP, Vela US USD, Northstar UK GBP)
// ============================================================================

export const ACME_TRIAL_BALANCE: TrialBalanceData = {
  entity: 'Acme Holdings Ltd (UK Consolidated · GBP)',
  currency: 'GBP',
  period: 'Period Ending 30 Nov 2026',
  materialityThreshold: 25000,
  accounts: [
    {
      code: '1010',
      name: 'Cash — Barclays Operating #4821',
      category: 'Assets',
      unadjusted: 1418920,
      aje: 3442,
      priorPeriod: 1190400,
      drilldown: ['28 Nov Wire #9982 +£12,500', '30 Nov Deposit in transit -£8,400'],
    },
    {
      code: '1200',
      name: 'Trade Debtors — Enterprise',
      category: 'Assets',
      unadjusted: 842000,
      aje: -18500,
      priorPeriod: 785000,
      drilldown: ['INV-4410 Global Corp £210,000', 'AJE-04 Bad debt provision -£18,500'],
    },
    {
      code: '2400',
      name: 'Deferred Income — Current (IFRS 15)',
      category: 'Liabilities & Equity',
      unadjusted: -960000,
      aje: 45000,
      priorPeriod: -820000,
      drilldown: ['Nov earned subscription release +£45,000'],
    },
    {
      code: '3100',
      name: 'Share Capital & Retained Earnings',
      category: 'Liabilities & Equity',
      unadjusted: -760978,
      aje: 0,
      priorPeriod: -760978,
      drilldown: ['Opening audited equity rollforward'],
    },
    {
      code: '4010',
      name: 'Enterprise Subscription Revenue',
      category: 'Revenue',
      unadjusted: -1150000,
      aje: -45000,
      priorPeriod: -975000,
      drilldown: ['IFRS 15 waterfall release -£45,000 (Credit)', '14 enterprise renewals'],
    },
    {
      code: '6010',
      name: 'Engineering & Cloud Operations',
      category: 'Operating Expenses',
      unadjusted: 412000,
      aje: 0,
      priorPeriod: 398000,
      drilldown: ['AWS UK INV-994120 £48,250', 'UK Payroll Trust £194,800'],
    },
    {
      code: '6510',
      name: 'Legal, Audit & Professional Fees',
      category: 'Operating Expenses',
      unadjusted: 198058,
      aje: 15058,
      priorPeriod: 182578,
      drilldown: ['Baker McKenzie LLP £18,500', 'FY26 statutory audit accrual +£15,058'],
    },
  ],
};

export const ACME_TB_SUMMARY = evaluateTrialBalanceTieOut(ACME_TRIAL_BALANCE);

// UK CT600 computation derived directly from Acme's Adjusted Trial Balance Net Profit (£569,884)
export const ACME_UK_CT600 = {
  utr: '4918204110',
  bookProfitMinor: ACME_TB_SUMMARY.netProfitMinor, // £569,884.00 (56988400)
  ctaDisallowancesMinor: 1211600, // +£12,116.00 client entertaining (CTA 2009 s.1298)
  aiaCapitalAllowancesMinor: -4200000, // -£42,000.00 Annual Investment Allowance
  taxableProfitMinor: ACME_TB_SUMMARY.netProfitMinor + 1211600 - 4200000, // £540,000.00
  ctRatePct: 25,
  corporationTaxMinor: Math.round(
    ((ACME_TB_SUMMARY.netProfitMinor + 1211600 - 4200000) * 25) / 100
  ), // £135,000.00
} as const;

export const ACME_AJE_GATE: JournalEntryGateData = {
  entryNumber: 'AJE-2026-042',
  currency: 'GBP',
  erpTarget: 'NetSuite · Acme Holdings Ltd',
  effectiveDate: '2026-11-30',
  preparer: 'Marcus Chen (Audit Manager)',
  posted: false,
  lines: [
    {
      id: 'jl-1',
      account: '2400 · Deferred Income — Current',
      entity: 'Acme Holdings Ltd',
      debit: 45000.0,
      credit: 0,
      memo: 'Nov IFRS 15 earned subscription release',
    },
    {
      id: 'jl-2',
      account: '4010 · Enterprise Subscription Revenue',
      entity: 'Acme Holdings Ltd',
      debit: 0,
      credit: 45000.0,
      memo: 'Nov IFRS 15 earned subscription release',
    },
    {
      id: 'jl-3',
      account: '6510 · Legal, Audit & Professional Fees',
      entity: 'Acme Holdings Ltd',
      debit: 15058.0,
      credit: 0,
      memo: 'Accrue Q4 statutory audit fieldwork billing',
    },
    {
      id: 'jl-4',
      account: '2120 · Accrued Expenses',
      entity: 'Acme Holdings Ltd',
      debit: 0,
      credit: 15058.0,
      memo: 'Accrue Q4 statutory audit fieldwork billing',
    },
  ],
};

export const ACME_AJE_SUMMARY = evaluateJournalEntryTieOut(ACME_AJE_GATE.lines);

export const ACME_RECONCILIATION: ReconciliationData = {
  accountName: 'Barclays Operating #4821 ↔ NetSuite GL 1010 (Nov 2026)',
  currency: 'GBP',
  autoMatchedCount: 142,
  autoMatchedVolume: 1418920,
  exceptions: [
    {
      id: 'rx-1',
      date: '2026-11-28',
      sourceRef: 'CHAPS-9982',
      counterparty: 'Global Corp Q4 Retainer',
      bankAmount: 12500.0,
      glAmount: 0,
      variance: 12500.0,
      reason: 'Customer CHAPS cleared bank 28 Nov; trade debtor receipt unposted in GL.',
      status: 'open',
    },
    {
      id: 'rx-2',
      date: '2026-11-29',
      sourceRef: 'STRP-8810',
      counterparty: 'Stripe UK Settlement Batch',
      bankAmount: 44957.9,
      glAmount: 45000.0,
      variance: -42.1,
      reason: 'Merchant processing fee (£42.10) netted from payout; needs AJE to 6890.',
      status: 'open',
    },
    {
      id: 'rx-3',
      date: '2026-11-30',
      sourceRef: 'BACS-4402',
      counterparty: 'Clearing Remittance Batch',
      bankAmount: 0,
      glAmount: 8400.0,
      variance: -8400.0,
      reason: 'Deposit in transit — recorded 30 Nov, cleared Barclays 01 Dec.',
      status: 'open',
    },
    {
      id: 'rx-4',
      date: '2026-11-24',
      sourceRef: 'DD-3109',
      counterparty: 'Datadog Cloud Monitoring',
      bankAmount: -1231.6,
      glAmount: -615.8,
      variance: -615.8,
      reason: 'Duplicate direct debit; refund confirmation requested from supplier.',
      status: 'open',
    },
  ],
};

export const ACME_RECON_SUMMARY = evaluateReconciliationTieOut(ACME_RECONCILIATION);

export const ACME_VOUCHING: VouchingWorkpaperData = {
  engagement: 'FY26 Audit · AP & Operating Expense Substantive Vouching (WP E-40)',
  currency: 'GBP',
  clearlyTrivialThreshold: 1250,
  items: [
    {
      id: 'v-1',
      sampleCode: 'S-01',
      glDate: '2026-11-04',
      vendor: 'Amazon Web Services UK Ltd',
      glAccount: '6010 · Engineering & Cloud Ops',
      ledgerAmount: 48250.0,
      docAmount: 48250.0,
      invoiceNo: 'INV-AWS-994120',
      invoiceDate: '2026-11-01',
      taxAmount: 8041.67,
      formType: 'VAT Invoice',
      description: 'Production London cluster compute & S3 archival storage (Oct–Nov)',
      tickmark: 'tied',
    },
    {
      id: 'v-2',
      sampleCode: 'S-02',
      glDate: '2026-11-11',
      vendor: 'Corporate Card Clearing (#4419)',
      glAccount: '6420 · Travel & Client Ops',
      ledgerAmount: 3442.1,
      docAmount: 3400.0,
      invoiceNo: 'RCPT-HTL-8821',
      invoiceDate: '2026-11-09',
      taxAmount: 566.67,
      formType: 'Expense Receipt',
      description: 'Q4 field audit lodging — £42.10 FX conversion fee unmapped to 6890',
      tickmark: 'exception',
    },
    {
      id: 'v-3',
      sampleCode: 'S-03',
      glDate: '2026-11-15',
      vendor: 'Baker McKenzie LLP (London)',
      glAccount: '6510 · Legal, Audit & Professional Fees',
      ledgerAmount: 18500.0,
      docAmount: 18500.0,
      invoiceNo: 'BM-2026-7741',
      invoiceDate: '2026-11-12',
      taxAmount: 3083.33,
      formType: 'Solicitor Fee Note',
      description: 'UK/EEA data-residency MSA review & subprocessor addendum',
      tickmark: 'tied',
    },
    {
      id: 'v-4',
      sampleCode: 'S-04',
      glDate: '2026-11-18',
      vendor: 'PAYE & Payroll Clearing Trust',
      glAccount: '6010 · Engineering & Cloud Ops',
      ledgerAmount: 194800.0,
      docAmount: 194800.0,
      invoiceNo: 'PR-2026-22B',
      invoiceDate: '2026-11-18',
      taxAmount: 24920.0,
      formType: 'Payroll Register',
      description: 'Monthly UK payroll run + employer NIC tie-out',
      tickmark: 'tied',
    },
    {
      id: 'v-5',
      sampleCode: 'S-05',
      glDate: '2026-11-22',
      vendor: 'Canary Wharf Estates Ltd',
      glAccount: '6310 · Facilities Lease & Service Charge',
      ledgerAmount: 34500.0,
      docAmount: 34500.0,
      invoiceNo: 'LSE-NOV-2026',
      invoiceDate: '2026-11-01',
      taxAmount: 5750.0,
      formType: 'Service Charge Demand',
      description: 'Suite 810 quarterly occupancy & CAM — awaiting signed landlord certificate',
      tickmark: 'pbc',
    },
  ],
};

export const ACME_VOUCHING_SUMMARY = evaluateVouchingTieOut(ACME_VOUCHING);

export const ACME_PBC_TRACKER: PbcTrackerData = {
  engagementName: 'FY26 Statutory Audit & Nov Close',
  clientName: 'Acme Holdings Ltd',
  items: [
    {
      id: 'pbc-1',
      code: 'PBC-04',
      requestTitle: 'Barclays #4821 01–05 Dec Cutoff Bank Statement',
      clientOwner: 'Financial Controller',
      dueDateIso: '2026-11-21',
      aging: 'Overdue 4d',
      status: 'overdue',
    },
    {
      id: 'pbc-2',
      code: 'PBC-09',
      requestTitle: 'Signed Canary Wharf Suite 810 Service Charge Certificate (£34,500)',
      clientOwner: 'Head of Workplace',
      dueDateIso: '2026-11-27',
      aging: 'Due in 2d',
      status: 'pending',
    },
    {
      id: 'pbc-3',
      code: 'PBC-12',
      requestTitle: 'Board Minutes Approving Q4 Share Option Grants',
      clientOwner: 'General Counsel',
      dueDateIso: '2026-11-23',
      aging: 'Overdue 2d',
      status: 'overdue',
    },
    {
      id: 'pbc-4',
      code: 'PBC-15',
      requestTitle: 'Executed Baker McKenzie Audit Legal Inquiry Letter',
      clientOwner: 'External Counsel',
      dueDateIso: '2026-11-22',
      aging: 'Verified 22 Nov',
      status: 'received',
    },
  ],
};

export const KENSINGTON_ROLLFORWARD: RollforwardData = {
  entity: 'Kensington Retail Ltd & Acme IFRS Schedules (GBP)',
  currency: 'GBP',
  schedules: [
    {
      id: 'ifrs-15',
      standard: 'IFRS 15 · Deferred Income Waterfall',
      accountPair: 'Dr 2400 Deferred Income / Cr 4010 Subscription Revenue',
      openingBalance: 820000,
      glControlEnding: 1185000,
      periods: [
        { period: 'Q1 26', additions: 490000, recognized: 410000 },
        { period: 'Q2 26', additions: 540000, recognized: 465000 },
        { period: 'Q3 26', additions: 615000, recognized: 530000 },
        { period: 'Q4 26', additions: 710000, recognized: 585000 },
      ],
    },
    {
      id: 'ifrs-16',
      standard: 'IFRS 16 · Regent Street Flagship Lease Liability',
      accountPair: 'Dr 2610 Lease Liability / Cr 1010 Cash (5.2% IBR)',
      openingBalance: 980000,
      glControlEnding: 981000,
      periods: [
        { period: 'Q1 26', additions: 0, recognized: 98500 },
        { period: 'Q2 26', additions: 395000, recognized: 98500 },
        { period: 'Q3 26', additions: 0, recognized: 98500 },
        { period: 'Q4 26', additions: 0, recognized: 98500 },
      ],
    },
  ],
};

export const KENSINGTON_RF_DEFERRED_SUMMARY = evaluateRollforwardTieOut(
  KENSINGTON_ROLLFORWARD.schedules[0]!
);
export const KENSINGTON_RF_LEASE_SUMMARY = evaluateRollforwardTieOut(
  KENSINGTON_ROLLFORWARD.schedules[1]!
);

// Pure US Federal Tax Bridge assigned to Vela Bio Systems Inc. (Delaware Corp · USD $)
export const VELA_TAX_BRIDGE: TaxBridgeData = {
  clientName: 'Vela Bio Systems Inc.',
  currency: 'USD',
  taxRatePct: 21,
  taxYear: 'TY 2026 · US Federal Form 1120 / 1065 Workpaper',
  formTitle: 'Schedule M-1 Book-to-Tax Reconciliation (USD)',
  bookNetIncome: 1420000,
  adjustments: [
    {
      id: 'm1-1',
      description: '50% Disallowed Meals & Scientific Symposium Hospitality',
      type: 'permanent',
      ircSection: 'IRC §274(n)',
      formBox: 'Sch M-1, Line 5c',
      tbAccounts: '6425 · Meals & Conferences ($36,800 gross)',
      amount: 18400,
      baselineAmount: 18400,
    },
    {
      id: 'm1-2',
      description: 'Tax-Exempt Municipal Treasury Interest',
      type: 'permanent',
      ircSection: 'IRC §103(a)',
      formBox: 'Sch M-1, Line 7a',
      tbAccounts: '7110 · Short-Term Treasury Yield',
      amount: -24000,
      baselineAmount: -24000,
    },
    {
      id: 'm1-3',
      description: 'MACRS Bonus Depreciation vs Book Lab Equipment Straight-Line',
      type: 'temporary',
      ircSection: 'IRC §168(k)',
      formBox: 'Form 4562 / M-1 Line 8a',
      tbAccounts: '1750 · Lab Equipment Accum Depr',
      amount: -142000,
      baselineAmount: -142000,
    },
    {
      id: 'm1-4',
      description: 'ASC 606 Deferred Collaboration Grant Inclusion',
      type: 'temporary',
      ircSection: 'IRC §451(c)',
      formBox: 'Sch M-3, Part II Line 18',
      tbAccounts: '2400 · Deferred Grant Revenue',
      amount: 95000,
      baselineAmount: 95000,
    },
    {
      id: 'm1-5',
      description: 'Accrued Clinical Bonus Unpaid Within 2.5 Months of Year-End',
      type: 'temporary',
      ircSection: 'IRC §404(a)(5)',
      formBox: 'Sch M-1, Line 5b',
      tbAccounts: '2140 · Accrued Bonus Payable',
      amount: 64500,
      baselineAmount: 64500,
    },
  ],
  partners: [
    { partner: 'Vela Founders Holdings LP', ownershipPct: 54.0, entityType: 'Delaware LP' },
    { partner: 'Cambridge Life Sciences Fund IV', ownershipPct: 31.5, entityType: 'Institutional LP' },
    { partner: 'Employee Equity Pool LLC', ownershipPct: 14.5, entityType: 'Profits Interest' },
  ],
};

export const VELA_TAX_SUMMARY = evaluateTaxBridgeTieOut(VELA_TAX_BRIDGE);

export const FIRM_PRACTICE_WORKBOOK: SpreadsheetWorkbook = {
  sourceFormat: 'xlsx',
  sheets: [
    {
      name: 'Q4 Forecast (GBP)',
      columns: ['Line Item', 'Oct (£)', 'Nov (£)', 'Dec (£)', 'Q4 Total (£)', 'YoY Delta'],
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
      columns: ['Jurisdiction', 'Active Clients', 'Billings (£)', 'Realization', 'Close Target'],
      rows: [
        ['United Kingdom (FRS 102)', 24, 1120000, '96.4%', 'WD+5'],
        ['US Subsidiaries (US GAAP)', 11, 620000, '94.8%', 'WD+6'],
        ['EU Consolidated Entities', 7, 415000, '95.2%', 'WD+6'],
      ],
    },
  ],
};

export const ACME_CONTRACT_FOLIO: CitedDocumentData = {
  documentTitle: 'MASTER CLOUD SERVICES AGREEMENT — ACME HOLDINGS LTD (EXECUTED v4)',
  partySummary: 'Between CloudHost Europe GmbH ("Vendor") and Acme Holdings Ltd ("Client")',
  totalPages: 42,
  pages: [
    {
      pageNumber: 12,
      header: 'SECTION 2 · DATA RESIDENCY & SUBPROCESSORS',
      clauses: [
        {
          section: '§2.1',
          heading: 'UK & EEA Sovereign Data Residency',
          riskLevel: 'low',
          text: 'All Client Personal Data and financial ledger records shall remain stored exclusively within sovereign data centers located in London (UK-South), Frankfurt (eu-central-1), and Dublin (eu-west-1).',
        },
        {
          section: '§2.4',
          heading: 'Subprocessor Prior Written Notice (Amended v4)',
          riskLevel: 'low',
          text: 'Vendor shall provide thirty (30) calendar days prior written notice and a formal contractual objection window before authorizing any new third-party subprocessor.',
          note: 'Amended from 14 days to 30 calendar days per General Counsel v4 redline.',
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
          riskLevel: 'watch',
          text: 'Aggregate liability for Data Protection or Confidentiality breaches under Section 2 shall not exceed three times (3x) the trailing twelve-month (TTM) Subscription Fees paid or payable under the applicable Order Form.',
          note: 'Verified in permanent audit file: 3x TTM super-cap agreed by Audit Committee.',
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
          note: 'Within 72-hour UK GDPR / ICO statutory reporting window.',
        },
      ],
    },
  ],
};

export const ACME_REDLINE_DIFF: RedlineDocumentData = {
  documentName: 'Acme_MSA_v4_Legal_Redline.diff',
  author: 'Claire Dubois (General Counsel) · 3 Clauses',
  hunks: [
    {
      id: 'hunk-1',
      section: '§2.4 Subprocessor Notice Period',
      rationale: 'Aligns subprocessor notice period with procurement policy (30 days vs 14 days).',
      before:
        'Vendor shall provide fourteen (14) calendar days written notice prior to authorizing any new subprocessor.',
      after:
        'Vendor shall provide thirty (30) calendar days prior written notice and a formal contractual objection window before authorizing any new third-party subprocessor.',
      initialDecision: 'accepted',
    },
    {
      id: 'hunk-2',
      section: '§4.2 Aggregate Liability Super-Cap',
      rationale: 'Caps enhanced data-breach liability at 3x annual fees instead of uncapped exposure.',
      before:
        'Liability for breaches of Section 2 (Confidentiality & Data Protection) shall be unlimited.',
      after:
        'Aggregate liability for breaches of Section 2 shall not exceed three times (3x) the trailing twelve-month (TTM) Subscription Fees.',
      initialDecision: 'accepted',
    },
    {
      id: 'hunk-3',
      section: '§9.1 Renewal Price Uplift Cap',
      rationale: 'Caps annual renewal rate increases at 5% on multi-year commitments.',
      before:
        'Renewal Subscription Fees may increase at Vendor’s then-current list price.',
      after:
        'Renewal Subscription Fees shall not increase by more than five percent (5%) over the prior term’s per-unit rate.',
      initialDecision: 'pending',
    },
  ],
};

export const ACME_SQL_COHORTS: SqlCanvasData = {
  warehouse: 'Snowflake · GL_REVENUE_COHORTS (GBP)',
  executionMs: 142,
  scannedMb: 38.4,
  labelColumn: 'Quarter',
  metricColumns: ['Recognized (£K)', 'Deferred (£K)'],
  columns: ['Quarter', 'Recognized (£K)', 'Deferred (£K)', 'Retention (%)', 'Margin (%)'],
  rows: [
    ['Q1 26', 3420, 480, 118.4, 81.2],
    ['Q2 26', 3980, 610, 121.0, 82.5],
    ['Q3 26', 4690, 790, 124.6, 83.8],
    ['Q4 26', 5640, 1050, 128.2, 85.1],
  ],
  query: `SELECT
  fiscal_quarter                        AS "Quarter",
  ROUND(SUM(recognized_gbp) / 1000, 0)  AS "Recognized (£K)",
  ROUND(SUM(deferred_add_gbp) / 1000, 0) AS "Deferred (£K)",
  ROUND(AVG(net_retention_pct), 1)      AS "Retention (%)",
  ROUND(AVG(gross_margin_pct), 1)       AS "Margin (%)"
FROM prod_audit.gl_4010_revenue_cohorts
WHERE entity_group = 'Acme Holdings Ltd'
  AND fiscal_year = 2026
GROUP BY 1
ORDER BY 1 ASC;`,
};

/**
 * Expands the 4 quarterly cohort totals into 2,400 subledger rows (600 per quarter)
 * whose exact mathematical sum equals the 4-quarter chart total (£17,730K recognized, £2,930K deferred).
 */
export function expandReconciledSqlSubledgerRows(
  baseRows: ReadonlyArray<ReadonlyArray<CellScalar>>
): ReadonlyArray<ReadonlyArray<CellScalar>> {
  if (baseRows.length > 50) return baseRows;
  const segments = ['Financial Services', 'Healthcare', 'Global Retail', 'Cloud Infra', 'Public Sector'];
  const regions = ['UK-London', 'UK-North', 'EEA-Frankfurt', 'EEA-Dublin'];
  const perQuarter = 600;
  const out: CellScalar[][] = [];

  baseRows.forEach((qRow, qIdx) => {
    const qLabel = String(qRow[0] ?? `Q${qIdx + 1} 26`);
    const targetRecCents = Math.round(Number(qRow[1] ?? 0) * 100);
    const targetDefCents = Math.round(Number(qRow[2] ?? 0) * 100);
    const baseRet = Number(qRow[3] ?? 120);
    const baseMargin = Number(qRow[4] ?? 83);

    const recBase = Math.floor(targetRecCents / perQuarter);
    const recRem = targetRecCents - recBase * perQuarter;
    const defBase = Math.floor(targetDefCents / perQuarter);
    const defRem = targetDefCents - defBase * perQuarter;

    for (let i = 0; i < perQuarter; i += 1) {
      const globalIdx = qIdx * perQuarter + i + 1;
      const recCents = recBase + (i < recRem ? 1 : 0);
      const defCents = defBase + (i < defRem ? 1 : 0);
      const retDelta = ((i % 5) - 2) * 0.4;
      out.push([
        `${qLabel} · ${segments[i % segments.length]} #${globalIdx} (${regions[i % regions.length]})`,
        Number((recCents / 100).toFixed(2)),
        Number((defCents / 100).toFixed(2)),
        Number((baseRet + retDelta).toFixed(1)),
        baseMargin,
      ]);
    }
  });

  return out;
}

export const ACME_SQL_SUMMARY = {
  q4RecognizedK: Number(ACME_SQL_COHORTS.rows[3]![1]), // 5,640 (£5.64M)
  fyRecognizedK: ACME_SQL_COHORTS.rows.reduce((s, r) => s + Number(r[1] ?? 0), 0), // 17,730 (£17.73M)
  q4MarginPct: Number(ACME_SQL_COHORTS.rows[3]![4]), // 85.1%
} as const;

export const ACME_TOPOLOGY_GRAPH: TopologyGraphData = {
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
      note: `Barclays #4821 & NatWest statement ingestion; ${ACME_RECONCILIATION.autoMatchedCount} transactions matched.`,
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
      note: `Awaiting token refresh before posting ${ACME_AJE_GATE.entryNumber} (${formatMoneyMinor(ACME_AJE_SUMMARY.totalDebitMinor, { currency: 'GBP' })}).`,
    },
    {
      id: 'snowflake-dw',
      label: 'Snowflake Subledger',
      layer: 3,
      lane: 0,
      kind: 'warehouse',
      status: 'healthy',
      owner: 'Data Audit',
      latency: 'Tied £0',
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
      note: 'Immutable workpaper revision log (ICAEW / FRC retention).',
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

export const ACME_AUDIT_DECK: SlideDeckData = {
  deckTitle: 'Acme Holdings Ltd — Q4 Audit Committee Close Pack',
  audience: 'Audit Committee & Statutory Directors',
  dateLabel: '25 Nov 2026 · Draft',
  slides: [
    {
      id: 'slide-1',
      eyebrow: '01 · FINANCIAL SUMMARY',
      title: 'Q4 Recognized Revenue Reached £5.64M (£17.73M FY26) With £0 TB Imbalance',
      takeaway: `IFRS 15 deferred income (${formatMoneyMinor(KENSINGTON_RF_DEFERRED_SUMMARY.endingMinor, { currency: 'GBP', decimals: 0 })} ending) and Barclays #4821 cash tie to the Consolidated Trial Balance.`,
      metrics: [
        { label: 'Q4 Recognized Rev', value: '£5.64M', delta: '£17.73M FY26' },
        {
          label: 'Performance Mat.',
          value: formatMoney(ACME_TRIAL_BALANCE.materialityThreshold, { currency: 'GBP', decimals: 0 }),
          delta: `${ACME_TB_SUMMARY.flaggedCount} accounts > PM`,
        },
        { label: 'Gross Margin', value: `${ACME_SQL_SUMMARY.q4MarginPct}%`, delta: '+1.3 pts QoQ' },
      ],
      bullets: [
        `${ACME_AJE_GATE.entryNumber} (${formatMoneyMinor(ACME_AJE_SUMMARY.totalDebitMinor, { currency: 'GBP' })}) balanced for November earned revenue release and statutory audit accrual.`,
        `Adjusted Trial Balance Net Profit of ${formatMoneyMinor(ACME_TB_SUMMARY.netProfitMinor, { currency: 'GBP', decimals: 0 })} ties directly to the UK CT600 computation.`,
      ],
    },
    {
      id: 'slide-2',
      eyebrow: '02 · SUBSTANTIVE TESTING',
      title: 'WP E-40 Vouching & Bank Cutoff Exceptions Isolated Ahead of Sign-Off',
      takeaway: `${ACME_RECONCILIATION.exceptions.length} cash items (${formatMoneyMinor(ACME_RECON_SUMMARY.remainingVarianceMinor, { currency: 'GBP', signed: true })} net) and 1 card FX variance (£42.10) tracked.`,
      metrics: [
        {
          label: 'OpEx Vouched',
          value: formatMoneyMinor(ACME_VOUCHING_SUMMARY.totalLedgerMinor, { currency: 'GBP', decimals: 0 }),
          delta: `${ACME_VOUCHING.items.length} selections`,
        },
        { label: 'Card FX Variance', value: '£42.10', delta: 'Below £1,250 CTT' },
        {
          label: 'Open PBC Items',
          value: String(ACME_PBC_TRACKER.items.filter((i) => i.status !== 'received').length),
          delta: '2 overdue',
        },
      ],
      bullets: [
        'Awaiting signed Canary Wharf Suite 810 service charge certificate (£34,500) prior to final WP E-40 sign-off.',
        'Barclays #4821 01–05 December cutoff bank statement requested from Financial Controller.',
      ],
    },
    {
      id: 'slide-3',
      eyebrow: '03 · UK CORPORATION TAX (CT600)',
      title: `HMRC CT600 Taxable Profit Reconciled at ${formatMoneyMinor(ACME_UK_CT600.taxableProfitMinor, { currency: 'GBP', decimals: 0 })} (25% CT)`,
      takeaway: `Book profit (${formatMoneyMinor(ACME_UK_CT600.bookProfitMinor, { currency: 'GBP', decimals: 0 })}) + CTA disallowances (+£12,116) − AIA capital allowances (-£42,000).`,
      metrics: [
        {
          label: 'Book Net Profit',
          value: formatMoneyMinor(ACME_UK_CT600.bookProfitMinor, { currency: 'GBP', decimals: 0 }),
          delta: 'Adjusted TB',
        },
        {
          label: 'CT600 Tax Due',
          value: formatMoneyMinor(ACME_UK_CT600.corporationTaxMinor, { currency: 'GBP', decimals: 0 }),
          delta: '25% UK Main Rate',
        },
        { label: 'Filing Deadline', value: '30 Nov', delta: `UTR ${ACME_UK_CT600.utr}` },
      ],
      bullets: [
        'HMRC Making Tax Digital iXBRL computation validated and queued for Partner sign-off.',
        'Separate US Form 1120 Schedule M-1 ($1,431,900 taxable) tracked under Vela Bio Systems Inc.',
      ],
    },
  ],
};

export const ACME_CODE_FILES: ReadonlyArray<CodeFileEntry> = [
  {
    filename: 'normalizeJournalBatch.ts',
    filepath: 'packages/erp-sync/src/normalizeJournalBatch.ts',
    language: 'typescript',
    code: `// Enforce zero-variance double-entry invariant in integer minor units before ERP write-back\nexport interface JournalLine {\n  readonly accountCode: string;\n  readonly debitMinor: number;\n  readonly creditMinor: number;\n}\n\nexport function isBalancedBatch(lines: ReadonlyArray<JournalLine>): boolean {\n  const net = lines.reduce((sum, l) => sum + l.debitMinor - l.creditMinor, 0);\n  return lines.length > 0 && net === 0;\n}`,
  },
  {
    filename: 'reconcile_subledger.py',
    filepath: 'scripts/audit/reconcile_subledger.py',
    language: 'python',
    code: `# Tie payout settlement batches to general ledger clearing account\ndef check_cutoff_variance(bank_pence: int, gl_pence: int, ctt_pence: int = 125000) -> str:\n    diff = abs(bank_pence - gl_pence)\n    if diff == 0:\n        return "TIED"\n    return "TRIVIAL_FX" if diff <= ctt_pence else "EXCEPTION"`,
  },
  {
    filename: 'unmatched_payouts.sql',
    filepath: 'audit/queries/unmatched_payouts.sql',
    language: 'sql',
    code: `-- Open bank-to-NetSuite clearing items exceeding cutoff window\nSELECT\n  entity_code,\n  gl_account,\n  SUM(statement_pence - gl_pence) / 100.0 AS variance_gbp\nFROM prod_audit.bank_clearing_nov26\nWHERE match_status = 'UNMATCHED'\nGROUP BY 1, 2\nORDER BY ABS(SUM(statement_pence - gl_pence)) DESC;`,
  },
  {
    filename: 'netsuite-sync.yaml',
    filepath: 'deploy/connectors/netsuite-sync.yaml',
    language: 'yaml',
    code: `# Dual-control ERP journal posting policy\nconnector: oracle-netsuite\npostingGate:\n  requirePartnerSignOff: true\n  maxImbalanceMinorUnits: 0\n  retryBackoffMs: 250`,
  },
];

// ============================================================================
// 4. COMPUTED PROSE & CARD SUMMARIES (Zero Hand-Typed Numbers!)
// ============================================================================

export function buildTrialBalanceStrings(tb: TrialBalanceData = ACME_TRIAL_BALANCE) {
  const s = evaluateTrialBalanceTieOut(tb);
  const pm = formatMoneyMinor(s.pmMinor, { currency: tb.currency, decimals: 0 });
  const net = formatMoneyMinor(s.netAdjustedMinor, { currency: tb.currency, decimals: 0 });
  return {
    prose: `**November Consolidated Trial Balance** (\`Net TB = ${net}\`, Performance Materiality **${pm}**): \`${s.flaggedCount}\` accounts flagged above PM threshold.`,
    summary: `${tb.accounts.length} accounts · Net TB ${net} balanced · ${s.flaggedCount} flux flags > ${pm} PM`,
    metricNote: `${s.flaggedCount} flux lines > ${pm} materiality`,
  };
}

export function buildAjeStrings(entry: JournalEntryGateData = ACME_AJE_GATE) {
  const s = evaluateJournalEntryTieOut(entry.lines);
  const total = formatMoneyMinor(s.totalDebitMinor, { currency: entry.currency });
  return {
    prose: `Adjusting journal **\`${entry.entryNumber}\`** (**${total}** ${s.isBalanced ? 'balanced' : 'unbalanced'} across \`GL 2400\`, \`4010\`, \`6510\`, \`2120\`):`,
    summary: `${entry.lines.length} lines · ${total} ${entry.posted ? 'posted to ERP' : s.isBalanced ? 'balanced' : 'imbalanced'}`,
  };
}

export function buildReconStrings(recon: ReconciliationData = ACME_RECONCILIATION) {
  const s = evaluateReconciliationTieOut(recon);
  const vol = formatMoney(recon.autoMatchedVolume, { currency: recon.currency, decimals: 0 });
  const rem = formatMoneyMinor(s.remainingVarianceMinor, {
    currency: recon.currency,
    signed: true,
  });
  return {
    prose: `**${recon.accountName}**: \`${s.totalMatchedCount}\` transactions (${vol}) matched; \`${s.unresolvedCount}\` open items (**${rem}** net variance).`,
    summary: `${s.totalMatchedCount} matched · ${s.unresolvedCount} unresolved (${rem} variance)`,
  };
}

export function buildVouchingStrings(wp: VouchingWorkpaperData = ACME_VOUCHING) {
  const s = evaluateVouchingTieOut(wp);
  const total = formatMoneyMinor(s.totalLedgerMinor, { currency: wp.currency });
  return {
    prose: `**WP E-40 Substantive Vouching** (\`${wp.items.length}\` selections, **${total}** tested): \`${s.tiedCount}\` agreed to source, \`${s.exceptionCount}\` FX fee variance (\`S-02\`, **£42.10**), \`${s.pbcCount}\` open PBC (\`S-05\`, **£34,500.00** Canary Wharf CAM).`,
    summary: `${wp.items.length} selections (${total}) · ${s.tiedCount} Agreed · ${s.exceptionCount} Variance · ${s.pbcCount} PBC`,
  };
}

export function buildRollforwardStrings(rf: RollforwardData = KENSINGTON_ROLLFORWARD) {
  const def = evaluateRollforwardTieOut(rf.schedules[0]!);
  const lease = evaluateRollforwardTieOut(rf.schedules[1]!);
  const defEnd = formatMoneyMinor(def.endingMinor, { currency: rf.currency, decimals: 0 });
  const leaseEnd = formatMoneyMinor(lease.endingMinor, { currency: rf.currency, decimals: 0 });
  return {
    prose: `**IFRS 15 Deferred Income & IFRS 16 Lease Rollforwards** (\`Q1 26\`–\`Q4 26\` ending **${defEnd}** deferred income and **${leaseEnd}** lease liability).`,
    summary: `IFRS 15 Deferred Income (${defEnd} ending) & IFRS 16 Lease (${leaseEnd} ending)`,
  };
}

export function buildTaxBridgeStrings(tax: TaxBridgeData = VELA_TAX_BRIDGE) {
  const s = evaluateTaxBridgeTieOut(tax);
  const book = formatMoneyMinor(s.bookMinor, { currency: tax.currency, decimals: 0 });
  const perm = formatMoneyMinor(s.permMinor, { currency: tax.currency, decimals: 0, signed: true });
  const temp = formatMoneyMinor(s.tempMinor, { currency: tax.currency, decimals: 0, signed: true });
  const taxable = formatMoneyMinor(s.taxableMinor, { currency: tax.currency, decimals: 0 });
  const estTax = formatMoneyMinor(s.estTaxMinor, { currency: tax.currency, decimals: 0 });
  return {
    prose: `**${tax.clientName} — Schedule M-1 & K-1 Bridge**: Book net income **${book}** reconciled via **${perm}** permanent and **${temp}** temporary differences to **${taxable}** taxable income (${tax.taxRatePct}% est. tax **${estTax}**).`,
    summary: `${tax.clientName} · Book ${book} → Taxable ${taxable} (${tax.adjustments.length} IRC adjustments)`,
  };
}

export { formatAccountingNumber };
