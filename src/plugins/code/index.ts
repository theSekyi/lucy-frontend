import type { ComponentChildren } from 'preact';
import type { RendererPlugin } from '../../core/renderers';
import type { CodeSnippetData } from '../../core/types';

export const codeWorkspacePlugin: RendererPlugin<ComponentChildren, CodeSnippetData> = {
  id: 'code-workspace',
  aliases: ['code'],
  label: 'ERP Validation Scripts',
  badge: 'CODE',
  category: 'data',
  accent: 'sky',
  ctaLabel: 'Open →',
  placement: 'stage',
  priority: 25,
  promptPattern: /\b(code|patch\w*|typescript|python|scripts?|validators?|snippets?)\b/i,
  sampleMenuLabel: 'ERP Validation Scripts',
  createSample: async (nextId) => {
    const { createEnterprisePresetTurn } = await import('../samples');
    return createEnterprisePresetTurn('code-workspace', nextId);
  },
  matches: (block) => block.kind === 'code-workspace',
  load: async () => (await import('./CodeRenderer')).codeRendererModule,
};

export const codeSnippetPlugin: RendererPlugin<ComponentChildren, CodeSnippetData> = {
  id: 'code',
  label: 'Code Snippet',
  badge: 'CODE',
  placement: 'inline',
  priority: 20,
  matches: (block) => block.kind === 'code',
  load: async () => (await import('./CodeRenderer')).codeRendererModule,
};
