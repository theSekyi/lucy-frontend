import type { ComponentChildren } from 'preact';
import {
  createRendererRegistry,
  type RendererPlugin,
  type RendererRegistry,
} from '../core/renderers';
import { codeSnippetPlugin, codeWorkspacePlugin } from './code';
import { contractPlugin } from './contract';
import { slideDeckPlugin } from './deck';
import { journalEntryPlugin } from './journal-entry';
import { pbcTrackerPlugin } from './pbc-tracker';
import { prosePlugin } from './prose';
import { reconciliationPlugin } from './reconciliation';
import { redlinePlugin } from './redline';
import { rollforwardPlugin } from './rollforward';
import { spreadsheetPlugin } from './spreadsheet';
import { sqlCanvasPlugin } from './sql-canvas';
import { taxBridgePlugin } from './tax-bridge';
import { topologyPlugin } from './topology';
import { trialBalancePlugin } from './trial-balance';
import { vouchingPlugin } from './vouching';

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
        <div class="artifact-inline-card">
          <span class="artifact-badge">{block.kind.toUpperCase()}</span>
          <span class="artifact-card-body">
            <span class="artifact-card-title">
              {block.filename ?? block.title ?? 'Structured record'}
            </span>
            {block.summary && <span class="artifact-card-summary">{block.summary}</span>}
          </span>
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
  // Accounting & Audit Suite (5 Stage Workpapers + 2 Inline ERP Controls)
  vouchingPlugin,
  trialBalancePlugin,
  reconciliationPlugin,
  taxBridgePlugin,
  rollforwardPlugin,
  journalEntryPlugin,
  pbcTrackerPlugin,
  // Enterprise General Suite
  contractPlugin,
  redlinePlugin,
  sqlCanvasPlugin,
  topologyPlugin,
  slideDeckPlugin,
  spreadsheetPlugin,
  codeWorkspacePlugin,
  codeSnippetPlugin,
];

export function createDefaultRendererRegistry(): RendererRegistry<ComponentChildren> {
  const registry = createRendererRegistry<ComponentChildren>(fallbackPlugin);
  for (const plugin of BUILTIN_PLUGINS) {
    registry.register(plugin);
  }
  void registry.loadRenderer({ id: 'prime', kind: 'prose', data: '' });
  return registry;
}
