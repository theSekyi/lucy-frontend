import type { ComponentChildren } from 'preact';
import type { RendererPlugin } from '../../core/renderers';
import type { SqlCanvasData } from '../../core/types';

export const sqlCanvasPlugin: RendererPlugin<ComponentChildren, SqlCanvasData> = {
  id: 'sql-canvas',
  aliases: ['sql'],
  label: 'SQL & Cohort Workbench',
  badge: 'SQL',
  accent: 'sky',
  ctaLabel: 'Open workbench →',
  placement: 'stage',
  priority: 33,
  promptPattern: /\b(sql|snowflake|bigquery|warehouse|cohort|pivot|chart|query)\b/i,
  sampleMenuLabel: 'SQL + Chart + 2.4k-Row Grid',
  createSample: async (nextId) => {
    const { createEnterprisePresetTurn } = await import('../samples');
    return createEnterprisePresetTurn('sql-canvas', nextId);
  },
  matches: (block) => block.kind === 'sql-canvas' || /\.sql$/i.test(block.filename ?? ''),
  load: async () => (await import('./SqlCanvasRenderer')).sqlCanvasRendererModule,
};
