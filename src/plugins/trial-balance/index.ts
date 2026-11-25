import type { ComponentChildren } from 'preact';
import type { RendererPlugin } from '../../core/renderers';
import type { TrialBalanceData } from './sample';

export const trialBalancePlugin: RendererPlugin<ComponentChildren, TrialBalanceData> = {
  id: 'trial-balance',
  aliases: ['tb', 'flux'],
  label: 'Consolidated Trial Balance',
  badge: 'TB',
  category: 'accounting',
  accent: 'emerald',
  ctaLabel: 'Open →',
  placement: 'stage',
  priority: 38,
  promptPattern: /\b(trial\s*balanc\w*|flux|materialit\w*|unadjusted|consolidated\s*tb)\b/i,
  sampleMenuLabel: 'Consolidated Trial Balance',
  createSample: async (nextId) => (await import('./sample')).buildTrialBalanceSampleTurn(nextId),
  matches: (block) => block.kind === 'trial-balance' || /\.tb$/i.test(block.filename ?? ''),
  load: async () => (await import('./TrialBalanceRenderer')).trialBalanceRendererModule,
};
