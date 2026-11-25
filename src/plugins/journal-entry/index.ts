import type { ComponentChildren } from 'preact';
import type { RendererPlugin } from '../../core/renderers';
import type { JournalEntryGateData } from './sample';

export const journalEntryPlugin: RendererPlugin<ComponentChildren, JournalEntryGateData> = {
  id: 'journal-entry',
  aliases: ['aje', 'je'],
  label: 'Adjusting Journal Entry',
  badge: 'AJE',
  accent: 'emerald',
  placement: 'inline',
  priority: 40,
  promptPattern: /\b(aje|journal\s*entry|debit|credit|reclass|post\s*to\s*erp)\b/i,
  sampleMenuLabel: 'Adjusting Journal Entry',
  createSample: async (nextId) => (await import('./sample')).buildJournalEntrySampleTurn(nextId),
  matches: (block) => block.kind === 'journal-entry',
  load: async () => (await import('./JournalEntryRenderer')).journalEntryRendererModule,
};
