import type { ComponentChildren } from 'preact';
import type { RendererPlugin } from '../../core/renderers';
import type { TopologyGraphData } from '../../core/types';

export const topologyPlugin: RendererPlugin<ComponentChildren, TopologyGraphData> = {
  id: 'topology',
  aliases: ['dag', 'lineage'],
  label: 'Consolidation Lineage',
  badge: 'DAG',
  category: 'data',
  accent: 'amber',
  ctaLabel: 'Open →',
  placement: 'stage',
  priority: 32,
  promptPattern: /\b(lineag\w*|topolog\w*|blast\s*radius|incidents?|dag|graphs?|dependenc\w*)\b/i,
  sampleMenuLabel: 'Consolidation Lineage',
  createSample: async (nextId) => {
    const { createEnterprisePresetTurn } = await import('../samples');
    return createEnterprisePresetTurn('topology', nextId);
  },
  matches: (block) => block.kind === 'topology' || /\.dag$/i.test(block.filename ?? ''),
  load: async () => (await import('./TopologyRenderer')).topologyRendererModule,
};
