import type { ComponentChildren } from 'preact';
import type { RendererPlugin } from '../../core/renderers';
import type { SpreadsheetWorkbook } from '../../core/types';

export const spreadsheetPlugin: RendererPlugin<ComponentChildren, SpreadsheetWorkbook> = {
  id: 'spreadsheet',
  aliases: ['excel', 'xlsx', 'csv'],
  label: 'Financial Workbook',
  badge: 'XLSX',
  category: 'data',
  accent: 'emerald',
  ctaLabel: 'Open →',
  placement: 'stage',
  priority: 30,
  promptPattern: /\b(excel|xlsx|csv|tsv|spreadsheets?|sheets?|budgets?|forecasts?|workbooks?|models?)\b/i,
  sampleMenuLabel: 'Financial Workbook',
  createSample: async (nextId) => {
    const { createEnterprisePresetTurn } = await import('../samples');
    return createEnterprisePresetTurn('spreadsheet', nextId);
  },
  matches: (block) =>
    block.kind === 'spreadsheet' ||
    block.mimeType === 'text/csv' ||
    block.mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    /\.(xlsx|csv|tsv)$/i.test(block.filename ?? ''),
  load: async () => (await import('./SpreadsheetRenderer')).spreadsheetRendererModule,
};
