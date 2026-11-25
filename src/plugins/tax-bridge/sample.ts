import {
  buildTaxBridgeStrings,
  type PartnerK1Share,
  type TaxAdjustmentLine,
  type TaxBridgeData,
  VELA_TAX_BRIDGE,
} from '../../core/ledger';
import type { SampleTurnPayload } from '../../core/renderers';

export type { PartnerK1Share, TaxAdjustmentLine, TaxBridgeData };
export const TAX_BRIDGE_SAMPLE: TaxBridgeData = VELA_TAX_BRIDGE;

export function buildTaxBridgeSampleTurn(nextId: (p: string) => string): SampleTurnPayload {
  const strings = buildTaxBridgeStrings(VELA_TAX_BRIDGE);
  return {
    prose: strings.prose,
    artifact: {
      id: nextId('block-tax'),
      kind: 'tax-bridge',
      title: 'Vela Bio Systems — Schedule M-1 & K-1 Bridge',
      filename: 'TY2026_Schedule_M1_K1.tax',
      summary: strings.summary,
      data: VELA_TAX_BRIDGE,
    },
  };
}
