import {
  ACME_TRIAL_BALANCE,
  buildTrialBalanceStrings,
  type TrialBalanceAccount,
  type TrialBalanceData,
} from '../../core/ledger';
import type { SampleTurnPayload } from '../../core/renderers';

export type { TrialBalanceAccount, TrialBalanceData };
export const TRIAL_BALANCE_SAMPLE: TrialBalanceData = ACME_TRIAL_BALANCE;

export function buildTrialBalanceSampleTurn(nextId: (p: string) => string): SampleTurnPayload {
  const strings = buildTrialBalanceStrings(ACME_TRIAL_BALANCE);
  return {
    prose: strings.prose,
    artifact: {
      id: nextId('block-tb'),
      kind: 'trial-balance',
      title: 'Consolidated Trial Balance & Flux',
      filename: 'Nov2026_Consolidated_TB.tb',
      summary: strings.summary,
      data: ACME_TRIAL_BALANCE,
    },
  };
}
