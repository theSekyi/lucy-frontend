import type { ComponentChildren } from 'preact';
import type { RendererPlugin } from '../../core/renderers';
import type { RollforwardData } from './sample';

export const rollforwardPlugin: RendererPlugin<ComponentChildren, RollforwardData> = {
  id: 'rollforward',
  aliases: ['asc606', 'asc842', 'ifrs15', 'ifrs16', 'waterfall'],
  label: 'IFRS 15 & 16 Rollforwards',
  badge: 'IFRS',
  category: 'accounting',
  accent: 'emerald',
  ctaLabel: 'Open →',
  placement: 'stage',
  priority: 35,
  promptPattern: /\b(rollforwards?|ifrs\s*15|ifrs\s*16|asc\s*606|asc\s*842|deferred\s*revenue|amortiz\w*|lease\s*schedul\w*)\b/i,
  sampleMenuLabel: 'IFRS 15 & 16 Rollforwards',
  createSample: async (nextId) => (await import('./sample')).buildRollforwardSampleTurn(nextId),
  matches: (block) => block.kind === 'rollforward' || /\.rf$/i.test(block.filename ?? ''),
  load: async () => (await import('./RollforwardRenderer')).rollforwardRendererModule,
};
