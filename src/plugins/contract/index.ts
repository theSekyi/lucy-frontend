import type { ComponentChildren } from 'preact';
import type { RendererPlugin } from '../../core/renderers';
import type { CitedDocumentData } from '../../core/types';

export const contractPlugin: RendererPlugin<ComponentChildren, CitedDocumentData> = {
  id: 'cited-document',
  aliases: ['pdf', 'contract'],
  label: 'Contract Review',
  badge: 'PDF',
  category: 'documents',
  accent: 'amber',
  ctaLabel: 'Open →',
  placement: 'stage',
  priority: 35,
  promptPattern: /\b(contracts?|msa|soc2|clauses?|pdfs?|10-k|rfps?|indemnif\w*|liabilit\w*)\b/i,
  sampleMenuLabel: 'Contract Review (PDF)',
  createSample: async (nextId) => {
    const { createEnterprisePresetTurn } = await import('../samples');
    return createEnterprisePresetTurn('contract', nextId);
  },
  matches: (block) => block.kind === 'cited-document' || block.mimeType === 'application/pdf',
  load: async () => (await import('./ContractRenderer')).contractRendererModule,
};
