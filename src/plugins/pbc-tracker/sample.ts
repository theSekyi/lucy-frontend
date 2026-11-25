import {
  ACME_PBC_TRACKER,
  type PbcItem,
  type PbcStatus,
  type PbcTrackerData,
} from '../../core/ledger';
import type { SampleTurnPayload } from '../../core/renderers';

export type { PbcItem, PbcStatus, PbcTrackerData };
export const PBC_SAMPLE: PbcTrackerData = ACME_PBC_TRACKER;

export function buildPbcSampleTurn(nextId: (p: string) => string): SampleTurnPayload {
  const openCount = ACME_PBC_TRACKER.items.filter((i) => i.status !== 'received').length;
  const receivedCount = ACME_PBC_TRACKER.items.length - openCount;
  const overdueCount = ACME_PBC_TRACKER.items.filter((i) => i.status === 'overdue').length;
  return {
    prose: `**${ACME_PBC_TRACKER.engagementName} PBC Request List** (\`${openCount}\` open, \`${receivedCount}\` received):`,
    artifact: {
      id: nextId('block-pbc'),
      kind: 'pbc-tracker',
      title: 'PBC Open-Item Tracker',
      summary: `${openCount} open requests (${overdueCount} overdue) · ${receivedCount} received`,
      data: ACME_PBC_TRACKER,
    },
  };
}
