import type { ComponentChildren } from 'preact';
import type { RendererPlugin } from '../../core/renderers';
import type { PbcTrackerData } from './sample';

export const pbcTrackerPlugin: RendererPlugin<ComponentChildren, PbcTrackerData> = {
  id: 'pbc-tracker',
  aliases: ['pbc'],
  label: 'PBC Request List',
  badge: 'PBC',
  accent: 'amber',
  placement: 'inline',
  priority: 41,
  promptPattern: /\b(pbc|client\s*request|open\s*items|missing\s*support|fieldwork)\b/i,
  sampleMenuLabel: 'PBC Request List',
  createSample: async (nextId) => (await import('./sample')).buildPbcSampleTurn(nextId),
  matches: (block) => block.kind === 'pbc-tracker',
  load: async () => (await import('./PbcTrackerRenderer')).pbcTrackerRendererModule,
};
