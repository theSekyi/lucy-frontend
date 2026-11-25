import type { SampleTurnPayload } from '../../core/renderers';

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
  readonly autoMatchedCount: number;
  readonly autoMatchedVolume: number;
  readonly exceptions: ReadonlyArray<ReconExceptionItem>;
}

export const RECON_SAMPLE: ReconciliationData = {
  accountName: 'Chase Operating #4821 ↔ NetSuite GL 1010 (Nov 2026)',
  autoMatchedCount: 142,
  autoMatchedVolume: 1418920,
  exceptions: [
    {
      id: 'rx-1',
      date: '2026-11-28',
      sourceRef: 'WIRE-9982',
      counterparty: 'Global Corp Q4 Retainer',
      bankAmount: 12500.0,
      glAmount: 0,
      variance: 12500.0,
      reason: 'Customer wire cleared bank Nov 28; AR cash receipt unposted in GL.',
      status: 'open',
    },
    {
      id: 'rx-2',
      date: '2026-11-29',
      sourceRef: 'STRP-8810',
      counterparty: 'Stripe Settlement Batch',
      bankAmount: 44957.9,
      glAmount: 45000.0,
      variance: -42.1,
      reason: 'Merchant processing fee ($42.10) netted from payout; needs AJE to 6890.',
      status: 'open',
    },
    {
      id: 'rx-3',
      date: '2026-11-30',
      sourceRef: 'DEP-4402',
      counterparty: 'Lockbox Check Deposit',
      bankAmount: 0,
      glAmount: 8400.0,
      variance: -8400.0,
      reason: 'Deposit in transit — recorded Nov 30, cleared Chase Dec 1.',
      status: 'open',
    },
    {
      id: 'rx-4',
      date: '2026-11-24',
      sourceRef: 'ACH-3109',
      counterparty: 'Datadog Monitoring',
      bankAmount: -1231.6,
      glAmount: -615.8,
      variance: -615.8,
      reason: 'Duplicate vendor ACH debit; refund confirmation requested from vendor.',
      status: 'open',
    },
  ],
};

export function buildReconSampleTurn(nextId: (p: string) => string): SampleTurnPayload {
  return {
    prose:
      '**Chase Operating #4821 ↔ NetSuite GL 1010**: `142` transactions ($1.42M) matched; `4` open items (**$3,442.10** net variance).',
    artifact: {
      id: nextId('block-recon'),
      kind: 'reconciliation',
      title: 'Chase #4821 Two-Way Reconciliation',
      filename: 'Chase_4821_Nov2026.recon',
      summary: '142 auto-matched (collapsed) · 4 exceptions ($3,442.10 net variance)',
      data: RECON_SAMPLE,
    },
  };
}
