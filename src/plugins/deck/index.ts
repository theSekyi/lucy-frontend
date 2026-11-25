import type { ComponentChildren } from 'preact';
import type { RendererPlugin } from '../../core/renderers';
import type { SlideDeckData } from '../../core/types';

export const slideDeckPlugin: RendererPlugin<ComponentChildren, SlideDeckData> = {
  id: 'slide-deck',
  aliases: ['deck', 'slides'],
  label: 'Audit Committee Deck',
  badge: 'DECK',
  category: 'documents',
  accent: 'neutral',
  ctaLabel: 'Open →',
  placement: 'stage',
  priority: 31,
  promptPattern: /\b(slides?|decks?|pptx|qbr|board\s*memos?|presentations?|audit\s*committee)\b/i,
  sampleMenuLabel: 'Audit Committee Deck',
  createSample: async (nextId) => {
    const { createEnterprisePresetTurn } = await import('../samples');
    return createEnterprisePresetTurn('slide-deck', nextId);
  },
  matches: (block) => block.kind === 'slide-deck' || /\.pptx$/i.test(block.filename ?? ''),
  load: async () => (await import('./SlideDeckRenderer')).slideDeckRendererModule,
};
