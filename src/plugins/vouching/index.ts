import type { ComponentChildren } from 'preact';
import type { RendererPlugin } from '../../core/renderers';
import type { VouchingWorkpaperData } from './sample';

export const vouchingPlugin: RendererPlugin<ComponentChildren, VouchingWorkpaperData> = {
  id: 'vouching',
  aliases: ['vouch', 'tickmark'],
  label: 'Vouching & Tickmark Inspector',
  badge: 'VOUCH',
  accent: 'amber',
  ctaLabel: 'Open workpaper →',
  placement: 'stage',
  priority: 39,
  promptPattern: /\b(vouch|vouching|tickmark|audit\s*sample|invoice\s*tie|1099|substantive)\b/i,
  sampleMenuLabel: 'Vouching & Tickmark Inspector (WP E-40)',
  createSample: async (nextId) => (await import('./sample')).buildVouchingSampleTurn(nextId),
  matches: (block) => block.kind === 'vouching' || /\.wp$/i.test(block.filename ?? ''),
  load: async () => (await import('./VouchingRenderer')).vouchingRendererModule,
};
