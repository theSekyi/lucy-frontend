import type { ComponentChildren } from 'preact';
import type { RendererPlugin } from '../../core/renderers';
import type { TrialBalanceData } from './sample';

export const trialBalancePlugin: RendererPlugin<ComponentChildren, TrialBalanceData> = {
  id: 'trial-balance',
  aliases: ['tb', 'flux'],
  label: 'Trial Balance & Flux Workpaper',
  badge: 'TB',
  accent: 'emerald',
  ctaLabel: 'Open TB →',
  placement: 'stage',
  priority: 38,
  promptPattern: /\b(trial\s*balance|flux|materiality|unadjusted|consolidated\s*tb)\b/i,
  sampleMenuLabel: 'Trial Balance & Flux Workpaper',
  createSample: async (nextId) => (await import('./sample')).buildTrialBalanceSampleTurn(nextId),
  matches: (block) => block.kind === 'trial-balance' || /\.tb$/i.test(block.filename ?? ''),
  load: async () => (await import('./TrialBalanceRenderer')).trialBalanceRendererModule,
};
