import type { SampleTurnPayload } from '../../core/renderers';

export interface TaxAdjustmentLine {
  readonly id: string;
  readonly description: string;
  readonly type: 'permanent' | 'temporary';
  readonly ircSection: string;
  readonly formBox: string;
  readonly tbAccounts: string;
  readonly amount: number;
}

export interface PartnerK1Share {
  readonly partner: string;
  readonly ownershipPct: number;
  readonly entityType: string;
}

export interface TaxBridgeData {
  readonly taxYear: string;
  readonly formTitle: string;
  readonly bookNetIncome: number;
  readonly adjustments: ReadonlyArray<TaxAdjustmentLine>;
  readonly partners: ReadonlyArray<PartnerK1Share>;
}

export const TAX_BRIDGE_SAMPLE: TaxBridgeData = {
  taxYear: 'TY 2026 · Federal Form 1120 / 1065 Workpaper',
  formTitle: 'Schedule M-1 / M-3 Book-to-Tax Reconciliation',
  bookNetIncome: 1636500,
  adjustments: [
    {
      id: 'm1-1',
      description: '50% Disallowed Meals & Client Entertainment',
      type: 'permanent',
      ircSection: 'IRC §274(n)',
      formBox: 'Sch M-1, Line 5c',
      tbAccounts: '6425 · Client Meals ($36,800 gross)',
      amount: 18400,
    },
    {
      id: 'm1-2',
      description: 'Tax-Exempt Municipal Bond Interest',
      type: 'permanent',
      ircSection: 'IRC §103(a)',
      formBox: 'Sch M-1, Line 7a',
      tbAccounts: '7110 · Treasury Yield',
      amount: -24000,
    },
    {
      id: 'm1-3',
      description: 'MACRS Accelerated vs Book Straight-Line Depreciation',
      type: 'temporary',
      ircSection: 'IRC §168(k)',
      formBox: 'Form 4562 / M-1 Line 8a',
      tbAccounts: '1750 · Accumulated Depr / 6710 · Depr Exp',
      amount: -142000,
    },
    {
      id: 'm1-4',
      description: 'ASC 606 Deferred Revenue Advance Inclusion',
      type: 'temporary',
      ircSection: 'IRC §451(c)',
      formBox: 'Sch M-3, Part II Line 18',
      tbAccounts: '2400 · Deferred Revenue — Current',
      amount: 95000,
    },
    {
      id: 'm1-5',
      description: 'Accrued Bonus Unpaid Within 2.5 Months of Year-End',
      type: 'temporary',
      ircSection: 'IRC §404(a)(5)',
      formBox: 'Sch M-1, Line 5b',
      tbAccounts: '2140 · Accrued Bonus Payable',
      amount: 64500,
    },
  ],
  partners: [
    { partner: 'Founders Holdings LP', ownershipPct: 54.0, entityType: 'Partnership' },
    { partner: 'Northstar Growth Fund IV', ownershipPct: 31.5, entityType: 'Institutional LP' },
    { partner: 'Employee Equity Pool LLC', ownershipPct: 14.5, entityType: 'Profits Interest' },
  ],
};

export function buildTaxBridgeSampleTurn(nextId: (p: string) => string): SampleTurnPayload {
  return {
    prose:
      '**TY26 Schedule M-1 & K-1 Bridge**: Book net income **$1,636,500** reconciled via **-$5,600** permanent and **+$17,500** temporary differences to **$1,648,400** taxable income.',
    artifact: {
      id: nextId('block-tax'),
      kind: 'tax-bridge',
      title: 'TY26 Book-to-Tax Bridge (M-1 & K-1)',
      filename: 'TY2026_Schedule_M1_K1.tax',
      summary: 'Book $1.637M → Taxable $1.648M · 5 IRC citations & K-1 split',
      data: TAX_BRIDGE_SAMPLE,
    },
  };
}
