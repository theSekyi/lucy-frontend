import {
  buildRollforwardStrings,
  KENSINGTON_ROLLFORWARD,
  type RollforwardData,
  type RollforwardPeriod,
  type RollforwardSchedule,
} from '../../core/ledger';
import type { SampleTurnPayload } from '../../core/renderers';

export type { RollforwardData, RollforwardPeriod, RollforwardSchedule };
export const ROLLFORWARD_SAMPLE: RollforwardData = KENSINGTON_ROLLFORWARD;

export function buildRollforwardSampleTurn(nextId: (p: string) => string): SampleTurnPayload {
  const strings = buildRollforwardStrings(KENSINGTON_ROLLFORWARD);
  return {
    prose: strings.prose,
    artifact: {
      id: nextId('block-rf'),
      kind: 'rollforward',
      title: 'IFRS 15 & IFRS 16 Rollforward Schedules',
      filename: 'FY26_IFRS15_IFRS16_Rollforward.rf',
      summary: strings.summary,
      data: KENSINGTON_ROLLFORWARD,
    },
  };
}
