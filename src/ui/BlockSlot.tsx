import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import type { LoadedRenderer, RendererRegistry } from '../core/renderers';
import type { ContentBlock } from '../core/types';

interface BlockSlotProps {
  readonly block: ContentBlock;
  readonly registry: RendererRegistry<ComponentChildren>;
  readonly isCompact?: boolean;
  readonly focusAnchor?: string | null;
  readonly anchorPulse?: number;
  readonly siblingArtifactId?: string | null;
  readonly onInspect?: (blockId: string, anchor?: string) => void;
}

export function BlockSlot({
  block,
  registry,
  isCompact,
  focusAnchor,
  anchorPulse,
  siblingArtifactId,
  onInspect,
}: BlockSlotProps) {
  const plugin = registry.resolve(block);

  // Zero-download compact summary card for stage artifacts inside conversation stream
  if (isCompact && plugin.placement === 'stage') {
    const accentClass = `accent-${plugin.accent ?? 'emerald'}`;
    return (
      <button
        type="button"
        class="artifact-inline-card"
        onClick={() => onInspect?.(block.id)}
      >
        <span class={`artifact-badge ${accentClass}`}>{plugin.badge}</span>
        <span class="artifact-card-body">
          <span class="artifact-card-title">
            {block.filename ?? block.title ?? plugin.label}
          </span>
          {block.summary && (
            <span class="artifact-card-summary">{block.summary}</span>
          )}
        </span>
        <span class="artifact-card-cta">{plugin.ctaLabel ?? 'Open stage →'}</span>
      </button>
    );
  }

  const [loadedEntry, setLoadedEntry] = useState<{
    readonly pluginId: string;
    readonly renderer: LoadedRenderer<ComponentChildren>;
  } | null>(() => {
    const cached = registry.getCachedRenderer(plugin.id);
    return cached ? { pluginId: plugin.id, renderer: cached } : null;
  });

  // Guard against stale renderer invocation when hot-swapping between different stage plugins
  const activeRenderer =
    registry.getCachedRenderer(plugin.id) ??
    (loadedEntry?.pluginId === plugin.id ? loadedEntry.renderer : undefined);

  useEffect(() => {
    let cancelled = false;
    const cached = registry.getCachedRenderer(plugin.id);
    if (cached) {
      setLoadedEntry({ pluginId: plugin.id, renderer: cached });
      return;
    }

    registry.loadRenderer(block).then((loaded) => {
      if (!cancelled) {
        setLoadedEntry({ pluginId: plugin.id, renderer: loaded });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [block, plugin.id, registry]);

  if (!activeRenderer) {
    return (
      <div class="renderer-skeleton" role="status" aria-live="polite">
        <span class={`artifact-badge accent-${plugin.accent ?? 'neutral'}`}>{plugin.badge}</span>
        <span>Loading {plugin.label.toLowerCase()}…</span>
      </div>
    );
  }

  return (
    <>
      {activeRenderer.render({
        block,
        isCompact,
        focusAnchor,
        anchorPulse,
        siblingArtifactId,
        onInspect,
      })}
    </>
  );
}
