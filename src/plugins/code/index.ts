import type { ComponentChildren } from 'preact';
import type { RendererPlugin } from '../../core/renderers';
import type { CodeSnippetData } from '../../core/types';

export const codeWorkspacePlugin: RendererPlugin<ComponentChildren, CodeSnippetData> = {
  id: 'code-workspace',
  aliases: ['code'],
  label: 'Code Workbench',
  badge: 'CODE',
  accent: 'sky',
  ctaLabel: 'Open files →',
  placement: 'stage',
  priority: 25,
  promptPattern: /\b(code|patch|typescript|python|refactor|function|snippet)\b/i,
  sampleMenuLabel: 'Code Workbench (.ts, .py, .sql, .yaml)',
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
