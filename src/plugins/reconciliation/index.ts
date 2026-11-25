import type { ComponentChildren } from 'preact';
import type { RendererPlugin } from '../../core/renderers';
import type { ReconciliationData } from './sample';

export const reconciliationPlugin: RendererPlugin<ComponentChildren, ReconciliationData> = {
  id: 'reconciliation',
  aliases: ['recon', 'bank-rec'],
  label: 'Bank Reconciliation',
  badge: 'RECON',
  category: 'accounting',
  accent: 'sky',
  ctaLabel: 'Open →',
  placement: 'stage',
  priority: 37,
  promptPattern: /\b(reconcil\w*|bank\s*rec\w*|subledger\w*|unmatched|clearing)\b/i,
  sampleMenuLabel: 'Bank Reconciliation',
  createSample: async (nextId) => (await import('./sample')).buildReconSampleTurn(nextId),
  matches: (block) => block.kind === 'reconciliation' || /\.recon$/i.test(block.filename ?? ''),
  load: async () => (await import('./ReconciliationRenderer')).reconciliationRendererModule,
};
