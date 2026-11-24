import type { ComponentChildren } from 'preact';
import type { RendererPlugin } from '../../core/renderers';
import type { ReconciliationData } from './sample';

export const reconciliationPlugin: RendererPlugin<ComponentChildren, ReconciliationData> = {
  id: 'reconciliation',
  aliases: ['recon', 'bank-rec'],
  label: 'Two-Way Reconciliation',
  badge: 'RECON',
  accent: 'sky',
  ctaLabel: 'Open recon →',
  placement: 'stage',
  priority: 37,
  promptPattern: /\b(reconcil|bank\s*rec|subledger|unmatched|clearing)\b/i,
  sampleMenuLabel: 'Two-Way Bank Reconciliation',
  createSample: async (nextId) => (await import('./sample')).buildReconSampleTurn(nextId),
  matches: (block) => block.kind === 'reconciliation' || /\.recon$/i.test(block.filename ?? ''),
  load: async () => (await import('./ReconciliationRenderer')).reconciliationRendererModule,
};
