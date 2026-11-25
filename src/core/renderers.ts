import type { BadgeAccent, ContentBlock, RenderPlacement } from './types';

export type PluginCategory = 'accounting' | 'documents' | 'data';

export interface SampleTurnPayload {
  readonly prose: string;
  readonly artifact: ContentBlock;
  readonly defaultAnchor?: string;
}

export interface RendererContext<TData = unknown> {
  readonly block: ContentBlock<TData>;
  readonly draft?: TData;
  readonly actorName?: string;
  readonly isCompact?: boolean;
  readonly focusAnchor?: string | null;
  readonly anchorPulse?: number;
  readonly siblingArtifactId?: string | null;
  readonly onInspect?: (blockId: string, anchor?: string) => void;
  readonly onUpdateDraft?: (nextDraft: TData) => void;
  readonly onClearDraft?: () => void;
  readonly onCommitRevision?: (nextData: TData, changeSummary: ReadonlyArray<string>) => void;
}

export interface LoadedRenderer<TView, TData = unknown> {
  readonly render: (context: RendererContext<TData>) => TView;
}

export interface RendererPlugin<TView, TData = unknown> {
  readonly id: string;
  readonly aliases?: ReadonlyArray<string>;
  readonly label: string;
  readonly badge: string;
  readonly category?: PluginCategory;
  readonly accent?: BadgeAccent;
  readonly ctaLabel?: string;
  readonly placement: RenderPlacement;
  readonly priority?: number;
  readonly promptPattern?: RegExp;
  readonly sampleMenuLabel?: string;
  readonly createSample?: (nextId: (prefix: string) => string) => Promise<SampleTurnPayload>;
  readonly matches: (block: ContentBlock) => boolean;
  readonly load: () => Promise<LoadedRenderer<TView, TData>>;
}

export interface RendererRegistry<TView> {
  register: <TData>(plugin: RendererPlugin<TView, TData>) => () => void;
  subscribe: (listener: () => void) => () => void;
  resolve: (block: ContentBlock) => RendererPlugin<TView>;
  findByRoute: (routeKey: string) => RendererPlugin<TView> | undefined;
  matchPromptPlugin: (prompt: string) => RendererPlugin<TView> | undefined;
  loadRenderer: (block: ContentBlock) => Promise<LoadedRenderer<TView>>;
  getCachedRenderer: (pluginId: string) => LoadedRenderer<TView> | undefined;
  listPlugins: () => ReadonlyArray<RendererPlugin<TView>>;
}

export function isChunkVersionMismatchError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err ?? '');
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS/i.test(
    message
  );
}

/**
 * Resilient async loader with automatic backoff retry for flaky 2G/3G/train networks.
 * Shared across both block-level renderer chunks and route-level UI page chunks.
 */
export async function loadWithRetry<T>(
  loader: () => Promise<T>,
  retries = 1,
  retryDelayMs = 220
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await loader();
    } catch (err) {
      lastError = err;
      if (attempt < retries && retryDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }
  }
  throw lastError;
}

/**
 * Self-describing plug-and-play renderer registry.
 * Priority order is memoized and only recomputed when plugins register/unregister,
 * making `resolve()` O(N) over a stable array with zero per-render allocations.
 */
export function createRendererRegistry<TView>(
  fallbackPlugin: RendererPlugin<TView>
): RendererRegistry<TView> {
  const plugins = new Map<string, RendererPlugin<TView>>();
  const resolvedCache = new Map<string, LoadedRenderer<TView>>();
  const inflightLoads = new Map<string, Promise<LoadedRenderer<TView>>>();
  const listeners = new Set<() => void>();
  let cachedSorted: ReadonlyArray<RendererPlugin<TView>> | null = null;

  function notifyRegistryListeners() {
    for (const listener of [...listeners]) {
      listener();
    }
  }

  function sortedPlugins(): ReadonlyArray<RendererPlugin<TView>> {
    if (!cachedSorted) {
      cachedSorted = [...plugins.values()].sort(
        (a, b) => (b.priority ?? 0) - (a.priority ?? 0)
      );
    }
    return cachedSorted;
  }

  function resolve(block: ContentBlock): RendererPlugin<TView> {
    return sortedPlugins().find((plugin) => plugin.matches(block)) ?? fallbackPlugin;
  }

  function findByRoute(routeKey: string): RendererPlugin<TView> | undefined {
    const key = routeKey.trim().toLowerCase();
    return sortedPlugins().find(
      (p) => p.id === key || (p.aliases?.some((a) => a.toLowerCase() === key) ?? false)
    );
  }

  function matchPromptPlugin(prompt: string): RendererPlugin<TView> | undefined {
    return sortedPlugins().find((plugin) => plugin.promptPattern?.test(prompt));
  }

  async function loadPluginWithRetry(plugin: RendererPlugin<TView>): Promise<LoadedRenderer<TView>> {
    const cached = resolvedCache.get(plugin.id);
    if (cached) return cached;

    const existingPromise = inflightLoads.get(plugin.id);
    if (existingPromise) return existingPromise;

    const loadAttempt = loadWithRetry(() => plugin.load(), 1, 220)
      .then((loaded) => {
        resolvedCache.set(plugin.id, loaded);
        inflightLoads.delete(plugin.id);
        return loaded;
      })
      .catch((err) => {
        inflightLoads.delete(plugin.id);
        throw err;
      });

    inflightLoads.set(plugin.id, loadAttempt);
    return loadAttempt;
  }

  return {
    register(plugin) {
      plugins.set(plugin.id, plugin as RendererPlugin<TView>);
      cachedSorted = null;
      notifyRegistryListeners();
      return () => {
        plugins.delete(plugin.id);
        resolvedCache.delete(plugin.id);
        cachedSorted = null;
        notifyRegistryListeners();
      };
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    resolve,
    findByRoute,
    matchPromptPlugin,

    loadRenderer(block) {
      return loadPluginWithRetry(resolve(block));
    },

    getCachedRenderer(pluginId) {
      return resolvedCache.get(pluginId);
    },

    listPlugins: sortedPlugins,
  };
}
