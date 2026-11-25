import type { ComponentChildren } from 'preact';
import type { RendererPlugin } from '../../core/renderers';
import type { VouchingWorkpaperData } from './sample';

export const vouchingPlugin: RendererPlugin<ComponentChildren, VouchingWorkpaperData> = {
  id: 'vouching',
  aliases: ['vouch', 'tickmark'],
  label: 'Substantive Vouching',
  badge: 'VOUCH',
  category: 'accounting',
  accent: 'amber',
  ctaLabel: 'Open →',
  placement: 'stage',
  priority: 39,
  promptPattern: /\b(vouch\w*|tickmark\w*|audit\s*sampl\w*|invoice\s*tie\w*|substantive)\b/i,
  sampleMenuLabel: 'Substantive Vouching (WP E-40)',
  createSample: async (nextId) => (await import('./sample')).buildVouchingSampleTurn(nextId),
  matches: (block) => block.kind === 'vouching' || /\.wp$/i.test(block.filename ?? ''),
  load: async () => (await import('./VouchingRenderer')).vouchingRendererModule,
};
