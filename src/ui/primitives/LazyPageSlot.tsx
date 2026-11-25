import type { ComponentChildren } from 'preact';
import { ErrorBoundary, reloadForUpdatedVersion } from './ErrorBoundary';
import { useAsyncResource } from './useAsyncResource';

const resolvedPageCache = new Map<string, unknown>();

export function clearResolvedPageCache(): void {
  resolvedPageCache.clear();
}

interface LazyPageSlotProps<TModule> {
  readonly slotKey: string;
  readonly label: string;
  readonly loader: () => Promise<TModule>;
  readonly render: (loaded: TModule) => ComponentChildren;
}

export function LazyPageSlot<TModule>({
  slotKey,
  label,
  loader,
  render,
}: LazyPageSlotProps<TModule>) {
  const { status, data, isVersionMismatch, retry } = useAsyncResource<TModule>(
    slotKey,
    loader,
    {
      cache: resolvedPageCache,
      retries: 1,
      retryDelayMs: 220,
    }
  );

  if (status === 'ready' && data !== null) {
    return (
      <ErrorBoundary boundaryKey={slotKey} label={label}>
        {render(data)}
      </ErrorBoundary>
    );
  }

  if (status === 'error') {
    return (
      <div class="launchpad-scroll">
        <div class="renderer-skeleton is-retry-box" role="alert">
          <div class="error-boundary-copy">
            <strong>
              {isVersionMismatch
                ? 'A new version of Lucy is available.'
                : `Connection interrupted while loading ${label.toLowerCase()}.`}
            </strong>
            <span class="error-boundary-detail">
              {isVersionMismatch
                ? 'Reload to finish updating your workspace assets.'
                : 'Your saved drafts remain intact. Retry when online or reload the page.'}
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
      </div>
    );
  }

  return (
    <div class="launchpad-scroll">
      <div class="renderer-skeleton" role="status" aria-live="polite">
        <span>Loading {label.toLowerCase()}…</span>
      </div>
    </div>
  );
}
