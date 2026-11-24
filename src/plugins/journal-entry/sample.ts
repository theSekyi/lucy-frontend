import type { SampleTurnPayload } from '../../core/renderers';

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
  readonly erpTarget: string;
  readonly effectiveDate: string;
  readonly preparer: string;
  readonly lines: ReadonlyArray<JournalLine>;
}

export const AJE_GATE_SAMPLE: JournalEntryGateData = {
  entryNumber: 'AJE-2026-042',
  erpTarget: 'NetSuite · US Parent',
  effectiveDate: '2026-11-30',
  preparer: 'Senior Associate · Close Package',
  lines: [
    {
      id: 'jl-1',
      account: '2400 · Deferred Revenue — Current',
      entity: 'US Parent',
      debit: 45000.0,
      credit: 0,
      memo: 'Nov ASC 606 earned subscription release',
    },
    {
      id: 'jl-2',
      account: '4010 · Enterprise Subscription Revenue',
      entity: 'US Parent',
      debit: 0,
      credit: 45000.0,
      memo: 'Nov ASC 606 earned subscription release',
    },
    {
      id: 'jl-3',
      account: '6510 · Legal & Audit Fees',
      entity: 'US Parent',
      debit: 15058.0,
      credit: 0,
      memo: 'Accrue Q4 external audit fieldwork progress billing',
    },
    {
      id: 'jl-4',
      account: '2120 · Accrued Expenses',
      entity: 'US Parent',
      debit: 0,
      credit: 15058.0,
      memo: 'Accrue Q4 external audit fieldwork progress billing',
    },
  ],
};

export function buildJournalEntrySampleTurn(nextId: (p: string) => string): SampleTurnPayload {
  return {
    prose:
      'Staged adjusting journal entry **`AJE-2026-042`** for NetSuite review. Approval is mathematically locked unless `∑ Debits = ∑ Credits` (`$0.00` variance) — try editing any Debit or Credit cell to test the out-of-balance guard:',
    artifact: {
      id: nextId('block-aje'),
      kind: 'journal-entry',
      title: 'AJE-2026-042 · NetSuite Posting Gate',
      summary: '4 lines · $60,058.00 balanced',
      data: AJE_GATE_SAMPLE,
    },
  };
}
