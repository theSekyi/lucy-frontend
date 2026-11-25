import type { ComponentChildren } from 'preact';
import type { RendererPlugin } from '../../core/renderers';
import type { CitedDocumentData } from '../../core/types';

export const contractPlugin: RendererPlugin<ComponentChildren, CitedDocumentData> = {
  id: 'cited-document',
  aliases: ['pdf', 'contract'],
  label: 'Contract Review',
  badge: 'PDF',
  accent: 'amber',
  ctaLabel: 'Open',
  placement: 'stage',
  priority: 35,
  promptPattern: /\b(contract|msa|soc2|clause|pdf|10-k|rfp|indemnif|liability)\b/i,
  sampleMenuLabel: 'Contract Review (PDF)',
  createSample: async (nextId) => {
    const { createEnterprisePresetTurn } = await import('../samples');
    return createEnterprisePresetTurn('contract', nextId);
  },
  matches: (block) => block.kind === 'cited-document' || block.mimeType === 'application/pdf',
  load: async () => (await import('./ContractRenderer')).contractRendererModule,
};
