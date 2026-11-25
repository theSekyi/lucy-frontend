import {
  ACME_VOUCHING,
  buildVouchingStrings,
  type TickmarkState,
  type VouchingWorkpaperData,
  type VouchSampleItem,
} from '../../core/ledger';
import type { SampleTurnPayload } from '../../core/renderers';

export type { TickmarkState, VouchingWorkpaperData, VouchSampleItem };
export const VOUCHING_SAMPLE: VouchingWorkpaperData = ACME_VOUCHING;

export function buildVouchingSampleTurn(nextId: (p: string) => string): SampleTurnPayload {
  const strings = buildVouchingStrings(ACME_VOUCHING);
  return {
    prose: strings.prose,
    artifact: {
      id: nextId('block-vouch'),
      kind: 'vouching',
      title: 'AP & OpEx Substantive Vouching (WP E-40)',
      filename: 'WP_E40_Vouching_TieOut.wp',
      summary: strings.summary,
      data: ACME_VOUCHING,
    },
  };
}
