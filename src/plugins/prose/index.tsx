import type { ComponentChildren } from 'preact';
import type { RendererPlugin } from '../../core/renderers';

export { proseRendererModule } from './ProseRenderer';

export const prosePlugin: RendererPlugin<ComponentChildren, string> = {
  id: 'prose',
  label: 'Text',
  badge: 'TEXT',
  placement: 'inline',
  priority: 10,
  matches: (block) => block.kind === 'prose' || block.mimeType === 'text/plain',
  load: () => import('./ProseRenderer').then((m) => m.proseRendererModule),
};
