import type { ComponentChildren } from 'preact';
import type { RendererPlugin } from '../../core/renderers';
import type { RedlineDocumentData } from '../../core/types';

export const redlinePlugin: RendererPlugin<ComponentChildren, RedlineDocumentData> = {
  id: 'redline',
  aliases: ['diff'],
  label: 'Contract Redline',
  badge: 'DIFF',
  accent: 'rose',
  ctaLabel: 'Open',
  placement: 'stage',
  priority: 34,
  promptPattern: /\b(redline|diff|iam|terraform|accept|reject|amendment)\b/i,
  sampleMenuLabel: 'Contract Redline',
  createSample: async (nextId) => {
    const { createEnterprisePresetTurn } = await import('../samples');
    return createEnterprisePresetTurn('redline', nextId);
  },
  matches: (block) => block.kind === 'redline' || /\.diff$/i.test(block.filename ?? ''),
  load: async () => (await import('./RedlineRenderer')).redlineRendererModule,
};
