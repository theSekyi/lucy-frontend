import type { ComponentChildren } from 'preact';
import type { RendererPlugin } from '../../core/renderers';
import type { TopologyGraphData } from '../../core/types';

export const topologyPlugin: RendererPlugin<ComponentChildren, TopologyGraphData> = {
  id: 'topology',
  aliases: ['dag', 'lineage'],
  label: 'Service Lineage Graph',
  badge: 'DAG',
  accent: 'amber',
  ctaLabel: 'Open graph →',
  placement: 'stage',
  priority: 32,
  promptPattern: /\b(lineage|topology|blast\s*radius|incident|dag|graph|mermaid|dependency)\b/i,
  sampleMenuLabel: 'Service Lineage & Outage Graph',
  createSample: async (nextId) => {
    const { createEnterprisePresetTurn } = await import('../samples');
    return createEnterprisePresetTurn('topology', nextId);
  },
  matches: (block) => block.kind === 'topology' || /\.dag$/i.test(block.filename ?? ''),
  load: async () => (await import('./TopologyRenderer')).topologyRendererModule,
};
