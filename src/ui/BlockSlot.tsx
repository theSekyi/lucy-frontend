import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import type { LoadedRenderer, RendererRegistry } from '../core/renderers';
import type { ContentBlock } from '../core/types';

interface BlockSlotProps {
  readonly block: ContentBlock;
  readonly registry: RendererRegistry<ComponentChildren>;
  readonly isCompact?: boolean;
  readonly onInspect?: (blockId: string) => void;
}

export function BlockSlot({ block, registry, isCompact, onInspect }: BlockSlotProps) {
  const plugin = registry.resolve(block);
  const [renderer, setRenderer] = useState<LoadedRenderer<ComponentChildren> | undefined>(() =>
    registry.getCachedRenderer(plugin.id)
  );

  useEffect(() => {
    let cancelled = false;
    const cached = registry.getCachedRenderer(plugin.id);
    if (cached) {
      setRenderer(cached);
      return;
    }

    registry.loadRenderer(block).then((loaded) => {
      if (!cancelled) setRenderer(loaded);
    });

    return () => {
      cancelled = true;
    };
  }, [block, plugin.id, registry]);

  if (!renderer) {
    return (
      <div class="renderer-skeleton" role="status" aria-live="polite">
        <span class="artifact-badge">{plugin.badge}</span>
        <span>Loading {plugin.label.toLowerCase()}…</span>
      </div>
    );
  }

  return <>{renderer.render({ block, isCompact, onInspect })}</>;
}
