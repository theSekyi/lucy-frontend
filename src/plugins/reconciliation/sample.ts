import {
  ACME_RECONCILIATION,
  buildReconStrings,
  type ReconciliationData,
  type ReconExceptionItem,
  type ReconResolution,
} from '../../core/ledger';
import type { SampleTurnPayload } from '../../core/renderers';

export type { ReconciliationData, ReconExceptionItem, ReconResolution };
export const RECON_SAMPLE: ReconciliationData = ACME_RECONCILIATION;

export function buildReconSampleTurn(nextId: (p: string) => string): SampleTurnPayload {
  const strings = buildReconStrings(ACME_RECONCILIATION);
  return {
    prose: strings.prose,
    artifact: {
      id: nextId('block-recon'),
      kind: 'reconciliation',
      title: 'Barclays #4821 Two-Way Reconciliation',
      filename: 'Barclays_4821_Nov2026.recon',
      summary: strings.summary,
      data: ACME_RECONCILIATION,
    },
  };
}
