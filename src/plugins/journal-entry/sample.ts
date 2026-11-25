import {
  ACME_AJE_GATE,
  buildAjeStrings,
  type JournalEntryGateData,
  type JournalLine,
} from '../../core/ledger';
import type { SampleTurnPayload } from '../../core/renderers';

export type { JournalEntryGateData, JournalLine };
export const AJE_GATE_SAMPLE: JournalEntryGateData = ACME_AJE_GATE;

export function buildJournalEntrySampleTurn(nextId: (p: string) => string): SampleTurnPayload {
  const strings = buildAjeStrings(ACME_AJE_GATE);
  return {
    prose: strings.prose,
    artifact: {
      id: nextId('block-aje'),
      kind: 'journal-entry',
      title: `${ACME_AJE_GATE.entryNumber} · NetSuite Posting Gate`,
      summary: strings.summary,
      data: ACME_AJE_GATE,
    },
  };
}
