import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { isChunkVersionMismatchError, loadWithRetry } from '../../core/renderers';

export interface UseAsyncResourceOptions {
  readonly cache?: Map<string, unknown>;
  readonly enabled?: boolean;
  readonly retries?: number;
  readonly retryDelayMs?: number;
}

export interface AsyncResourceResult<T> {
  readonly status: 'loading' | 'ready' | 'error';
  readonly data: T | null;
  readonly error: Error | null;
  readonly isVersionMismatch: boolean;
  readonly retry: () => void;
}

/**
 * Keyed async loader that guarantees data or errors from an older key can never
 * leak into a newly selected key (eliminating stale-module crashes on navigation).
 */
export function useAsyncResource<T>(
  key: string,
  loader: () => Promise<T>,
  options: UseAsyncResourceOptions = {}
): AsyncResourceResult<T> {
  const { cache, enabled = true, retries = 1, retryDelayMs = 200 } = options;
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const [entry, setEntry] = useState<{
    readonly key: string;
    readonly data?: T;
    readonly error?: Error;
  } | null>(() => {
    const cached = cache?.get(key) as T | undefined;
    return cached !== undefined ? { key, data: cached } : null;
  });
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    cache?.delete(key);
    setEntry(null);
    setAttempt((n) => n + 1);
  }, [cache, key]);

  useEffect(() => {
    if (!enabled) return;

    const cached = cache?.get(key) as T | undefined;
    if (cached !== undefined) {
      setEntry({ key, data: cached });
      return;
    }

    let cancelled = false;

    loadWithRetry(() => loaderRef.current(), retries, retryDelayMs)
      .then((value) => {
        cache?.set(key, value);
        if (!cancelled) {
          setEntry({ key, data: value });
        }
      })
      .catch((rawErr) => {
        if (!cancelled) {
          const error =
            rawErr instanceof Error ? rawErr : new Error(String(rawErr ?? 'Load failed'));
          setEntry({ key, error });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [attempt, cache, enabled, key, retries, retryDelayMs]);

  const cachedValue = cache?.get(key) as T | undefined;
  const matchedData =
    cachedValue !== undefined ? cachedValue : entry?.key === key ? (entry.data ?? null) : null;
  const matchedError =
    matchedData !== null ? null : entry?.key === key ? (entry.error ?? null) : null;

  useEffect(() => {
    if (!matchedError || typeof window === 'undefined') return;
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  }, [matchedError, retry]);

  if (matchedData !== null) {
    return {
      status: 'ready',
      data: matchedData,
      error: null,
      isVersionMismatch: false,
      retry,
    };
  }

  if (matchedError !== null) {
    const online = typeof navigator === 'undefined' ? true : navigator.onLine;
    return {
      status: 'error',
      data: null,
      error: matchedError,
      isVersionMismatch: online && isChunkVersionMismatchError(matchedError),
      retry,
    };
  }

  return {
    status: 'loading',
    data: null,
    error: null,
    isVersionMismatch: false,
    retry,
  };
}
