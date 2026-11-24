import type { ComponentChildren } from 'preact';
import type { RendererPlugin } from '../../core/renderers';
import type { TaxBridgeData } from './sample';

export const taxBridgePlugin: RendererPlugin<ComponentChildren, TaxBridgeData> = {
  id: 'tax-bridge',
  aliases: ['tax', 'm1', 'k1'],
  label: 'Book-to-Tax Bridge (M-1 / K-1)',
  badge: 'TAX',
  accent: 'violet',
  ctaLabel: 'Open tax bridge →',
  placement: 'stage',
  priority: 36,
  promptPattern: /\b(book-to-tax|m-1|m-3|k-1|1120|1065|tax\s*bridge|apportionment)\b/i,
  sampleMenuLabel: 'Book-to-Tax Bridge (M-1 & K-1)',
  createSample: async (nextId) => (await import('./sample')).buildTaxBridgeSampleTurn(nextId),
  matches: (block) => block.kind === 'tax-bridge' || /\.tax$/i.test(block.filename ?? ''),
  load: async () => (await import('./TaxBridgeRenderer')).taxBridgeRendererModule,
};
