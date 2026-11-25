import type { ComponentChildren } from 'preact';
import type { LoadedRenderer, RendererRegistry } from '../core/renderers';
import type { ContentBlock } from '../core/types';
import { ErrorBoundary, reloadForUpdatedVersion } from './primitives/ErrorBoundary';
import { useAsyncResource } from './primitives/useAsyncResource';

interface BlockSlotProps {
  readonly block: ContentBlock;
  readonly registry: RendererRegistry<ComponentChildren>;
  readonly draft?: unknown;
  readonly actorName?: string;
  readonly isCompact?: boolean;
  readonly focusAnchor?: string | null;
  readonly anchorPulse?: number;
  readonly siblingArtifactId?: string | null;
  readonly onInspect?: (blockId: string, anchor?: string) => void;
  readonly onUpdateDraft?: (nextDraft: unknown) => void;
  readonly onClearDraft?: () => void;
  readonly onCommitRevision?: (nextData: unknown, changeSummary: ReadonlyArray<string>) => void;
}

function PluginRenderHost({
  renderer,
  context,
}: {
  readonly renderer: LoadedRenderer<ComponentChildren>;
  readonly context: Parameters<LoadedRenderer<ComponentChildren>['render']>[0];
}) {
  return <>{renderer.render(context)}</>;
}

export function BlockSlot({
  block,
  registry,
  draft,
  actorName,
  isCompact,
  focusAnchor,
  anchorPulse,
  siblingArtifactId,
  onInspect,
  onUpdateDraft,
  onClearDraft,
  onCommitRevision,
}: BlockSlotProps) {
  const plugin = registry.resolve(block);
  const renderCompactSummary = Boolean(isCompact && plugin.placement === 'stage');
  const cachedRenderer = registry.getCachedRenderer(plugin.id);

  // Unconditional hook order (WCAG / Rules of Hooks safe across compact <-> stage transitions)
  const { status, data, isVersionMismatch, retry } = useAsyncResource<
    LoadedRenderer<ComponentChildren>
  >(plugin.id, () => registry.loadRenderer(block), {
    enabled: !renderCompactSummary && !cachedRenderer,
    retries: 1,
    retryDelayMs: 220,
  });

  if (renderCompactSummary) {
    const accentClass = `accent-${plugin.accent ?? 'emerald'}`;
    const hasDraft = draft !== undefined;
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
            {hasDraft && <span class="draft-indicator-pill">Draft</span>}
          </span>
          {block.summary && <span class="artifact-card-summary">{block.summary}</span>}
        </span>
        <span class="artifact-card-cta">
          {plugin.ctaLabel ? plugin.ctaLabel.replace(/↗/g, '→') : 'Open stage →'}
        </span>
      </button>
    );
  }

  const activeRenderer = cachedRenderer ?? data;
  const label = block.filename ?? block.title ?? plugin.label;

  if (status === 'error' && !activeRenderer) {
    return (
      <div class="renderer-skeleton is-retry-box" role="alert">
        <div class="error-boundary-copy">
          <strong>
            {isVersionMismatch
              ? 'A new version of Lucy is available.'
              : `Unable to load ${label}.`}
          </strong>
          <span class="error-boundary-detail">
            {isVersionMismatch
              ? 'Reload to load the updated workpaper module.'
              : 'Other sections and workpapers remain unaffected.'}
          </span>
        </div>
        <div class="error-boundary-actions">
          {!isVersionMismatch && (
            <button type="button" class="ghost-pill" onClick={retry}>
              Retry
            </button>
          )}
          <button
            type="button"
            class="primary-action-pill is-sm"
            onClick={reloadForUpdatedVersion}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  if (!activeRenderer) {
    return (
      <div class="renderer-skeleton" role="status" aria-live="polite">
        <span class={`artifact-badge accent-${plugin.accent ?? 'neutral'}`}>{plugin.badge}</span>
        <span>Loading {plugin.label.toLowerCase()}…</span>
      </div>
    );
  }

  return (
    <ErrorBoundary
      boundaryKey={`${block.id}:${plugin.id}`}
      label={label}
      compact
    >
      <PluginRenderHost
        renderer={activeRenderer}
        context={{
          block,
          draft,
          actorName,
          isCompact,
          focusAnchor,
          anchorPulse,
          siblingArtifactId,
          onInspect,
          onUpdateDraft,
          onClearDraft,
          onCommitRevision,
        }}
      />
    </ErrorBoundary>
  );
}
