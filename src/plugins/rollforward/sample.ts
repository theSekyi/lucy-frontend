import type { SampleTurnPayload } from '../../core/renderers';

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
  readonly periods: ReadonlyArray<RollforwardPeriod>;
}

export interface RollforwardData {
  readonly schedules: ReadonlyArray<RollforwardSchedule>;
}

export const ROLLFORWARD_SAMPLE: RollforwardData = {
  schedules: [
    {
      id: 'asc-606',
      standard: 'ASC 606 · Deferred Revenue Waterfall',
      accountPair: 'Dr 2400 Deferred Revenue / Cr 4010 Subscription Revenue',
      openingBalance: 820000,
      periods: [
        { period: 'Q1 26', additions: 490000, recognized: 410000 },
        { period: 'Q2 26', additions: 540000, recognized: 465000 },
        { period: 'Q3 26', additions: 615000, recognized: 530000 },
        { period: 'Q4 26', additions: 710000, recognized: 585000 },
      ],
    },
    {
      id: 'asc-842',
      standard: 'ASC 842 · Operating Lease ROU Liability',
      accountPair: 'Dr 2610 Lease Liability / Cr 1010 Cash (5.2% IBR)',
      openingBalance: 640000,
      periods: [
        { period: 'Q1 26', additions: 0, recognized: 42600 },
        { period: 'Q2 26', additions: 120000, recognized: 48900 },
        { period: 'Q3 26', additions: 0, recognized: 49500 },
        { period: 'Q4 26', additions: 0, recognized: 50100 },
      ],
    },
  ],
};

export function buildRollforwardSampleTurn(nextId: (p: string) => string): SampleTurnPayload {
  return {
    prose:
      '**ASC 606 Deferred Revenue & ASC 842 Lease Rollforwards** (`Q1 26`–`Q4 26` ending **$1,185,000** deferred revenue).',
    artifact: {
      id: nextId('block-rf'),
      kind: 'rollforward',
      title: 'ASC 606 & ASC 842 Rollforward Schedules',
      filename: 'FY26_ASC606_ASC842_Rollforward.rf',
      summary: 'ASC 606 Deferred Rev ($1.075M ending) & ASC 842 Lease Liability',
      data: ROLLFORWARD_SAMPLE,
    },
  };
}
