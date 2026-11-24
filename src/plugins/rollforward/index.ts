import type { ComponentChildren } from 'preact';
import type { RendererPlugin } from '../../core/renderers';
import type { RollforwardData } from './sample';

export const rollforwardPlugin: RendererPlugin<ComponentChildren, RollforwardData> = {
  id: 'rollforward',
  aliases: ['asc606', 'asc842', 'waterfall'],
  label: 'ASC 606 / 842 Rollforward',
  badge: 'ASC',
  accent: 'emerald',
  ctaLabel: 'Open schedule →',
  placement: 'stage',
  priority: 35,
  promptPattern: /\b(rollforward|asc\s*606|asc\s*842|deferred\s*revenue|amortization|lease\s*schedule)\b/i,
  sampleMenuLabel: 'ASC 606 & 842 Rollforward Schedules',
  createSample: async (nextId) => (await import('./sample')).buildRollforwardSampleTurn(nextId),
  matches: (block) => block.kind === 'rollforward' || /\.rf$/i.test(block.filename ?? ''),
  load: async () => (await import('./RollforwardRenderer')).rollforwardRendererModule,
};
