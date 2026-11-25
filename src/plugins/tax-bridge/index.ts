import type { ComponentChildren } from 'preact';
import type { RendererPlugin } from '../../core/renderers';
import type { TaxBridgeData } from './sample';

export const taxBridgePlugin: RendererPlugin<ComponentChildren, TaxBridgeData> = {
  id: 'tax-bridge',
  aliases: ['tax', 'm1', 'k1', 'ct600'],
  label: 'Schedule M-1 & K-1 Bridge',
  badge: 'TAX',
  category: 'accounting',
  accent: 'violet',
  ctaLabel: 'Open →',
  placement: 'stage',
  priority: 36,
  promptPattern: /\b(book-to-tax|ct600|m-1|m-3|k-1|1120|1065|tax\s*bridg\w*|apportionment)\b/i,
  sampleMenuLabel: 'Schedule M-1 & K-1 Bridge',
  createSample: async (nextId) => (await import('./sample')).buildTaxBridgeSampleTurn(nextId),
  matches: (block) => block.kind === 'tax-bridge' || /\.tax$/i.test(block.filename ?? ''),
  load: async () => (await import('./TaxBridgeRenderer')).taxBridgeRendererModule,
};
