import type { ComponentChildren } from 'preact';
import { useCallback, useEffect, useState } from 'preact/hooks';
import { loadWithRetry } from '../../core/renderers';

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
  const [loadedModule, setLoadedModule] = useState<TModule | null>(() => {
    return (resolvedPageCache.get(slotKey) as TModule | undefined) ?? null;
  });
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setFailed(false);
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    const cached = resolvedPageCache.get(slotKey) as TModule | undefined;
    if (cached) {
      setLoadedModule(() => cached);
      setFailed(false);
      return;
    }

    let cancelled = false;
    setLoadedModule(null);
    setFailed(false);

    loadWithRetry(loader, 2, 220)
      .then((mod) => {
        resolvedPageCache.set(slotKey, mod);
        if (!cancelled) {
          setLoadedModule(() => mod);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [slotKey, loader, attempt]);

  useEffect(() => {
    if (!failed) return;
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  }, [failed, retry]);

  const active = (resolvedPageCache.get(slotKey) as TModule | undefined) ?? loadedModule;

  if (active) {
    return <>{render(active)}</>;
  }

  if (failed) {
    return (
      <div class="launchpad-scroll">
        <div class="renderer-skeleton is-retry-box" role="alert">
          <span>Connection interrupted while loading {label.toLowerCase()}.</span>
          <button type="button" class="primary-action-pill is-sm" onClick={retry}>
            Retry
          </button>
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
