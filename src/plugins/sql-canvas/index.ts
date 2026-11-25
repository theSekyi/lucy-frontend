import type { ComponentChildren } from 'preact';
import type { RendererPlugin } from '../../core/renderers';
import type { SqlCanvasData } from '../../core/types';

export const sqlCanvasPlugin: RendererPlugin<ComponentChildren, SqlCanvasData> = {
  id: 'sql-canvas',
  aliases: ['sql'],
  label: 'Revenue Subledger Query',
  badge: 'SQL',
  category: 'data',
  accent: 'sky',
  ctaLabel: 'Open →',
  placement: 'stage',
  priority: 33,
  promptPattern: /\b(sql|snowflake|bigquery|warehous\w*|cohorts?|pivots?|charts?|quer(?:y|ies))\b/i,
  sampleMenuLabel: 'Revenue Subledger Query',
  createSample: async (nextId) => {
    const { createEnterprisePresetTurn } = await import('../samples');
    return createEnterprisePresetTurn('sql-canvas', nextId);
  },
  matches: (block) => block.kind === 'sql-canvas' || /\.sql$/i.test(block.filename ?? ''),
  load: async () => (await import('./SqlCanvasRenderer')).sqlCanvasRendererModule,
};
