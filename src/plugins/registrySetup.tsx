import type { ComponentChildren } from 'preact';
import {
  createRendererRegistry,
  type RendererPlugin,
  type RendererRegistry,
} from '../core/renderers';
import { codeSnippetPlugin, codeWorkspacePlugin } from './code';
import { contractPlugin } from './contract';
import { slideDeckPlugin } from './deck';
import { prosePlugin } from './prose';
import { redlinePlugin } from './redline';
import { spreadsheetPlugin } from './spreadsheet';
import { sqlCanvasPlugin } from './sql-canvas';
import { topologyPlugin } from './topology';

const fallbackPlugin: RendererPlugin<ComponentChildren> = {
  id: 'fallback-inspector',
  label: 'Structured Payload',
  badge: 'DATA',
  accent: 'neutral',
  placement: 'inline',
  matches: () => true,
  load: async () => ({
    render({ block }) {
      return (
        <div class="fallback-block">
          <div class="fallback-header">
            <span class="artifact-badge">{block.kind.toUpperCase()}</span>
            <span>{block.filename ?? block.title ?? 'Unhandled content block'}</span>
          </div>
          {block.summary && <p class="fallback-summary">{block.summary}</p>}
        </div>
      );
    },
  }),
};

/**
 * Pure plug-and-play manifest table: each capability lives in its own isolated
 * package folder (`src/plugins/<name>/index.ts`).
 */
export const BUILTIN_PLUGINS: ReadonlyArray<RendererPlugin<ComponentChildren, any>> = [
  prosePlugin,
  codeWorkspacePlugin,
  codeSnippetPlugin,
  spreadsheetPlugin,
  contractPlugin,
  redlinePlugin,
  sqlCanvasPlugin,
  topologyPlugin,
  slideDeckPlugin,
];

export function createDefaultRendererRegistry(): RendererRegistry<ComponentChildren> {
  const registry = createRendererRegistry<ComponentChildren>(fallbackPlugin);
  for (const plugin of BUILTIN_PLUGINS) {
    registry.register(plugin);
  }
  void registry.loadRenderer({ id: 'prime', kind: 'prose', data: '' });
  return registry;
}
