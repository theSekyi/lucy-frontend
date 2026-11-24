import type { ContentBlock, RenderPlacement } from './types';

export interface RendererContext<TData = unknown> {
  readonly block: ContentBlock<TData>;
  readonly isCompact?: boolean;
  readonly onInspect?: (blockId: string) => void;
}

export interface LoadedRenderer<TView, TData = unknown> {
  readonly render: (context: RendererContext<TData>) => TView;
}

export interface RendererPlugin<TView, TData = unknown> {
  readonly id: string;
  readonly label: string;
  readonly badge: string;
  readonly placement: RenderPlacement;
  readonly priority?: number;
  readonly matches: (block: ContentBlock) => boolean;
  readonly load: () => Promise<LoadedRenderer<TView, TData>>;
}

export interface RendererRegistry<TView> {
  register: <TData>(plugin: RendererPlugin<TView, TData>) => () => void;
  resolve: (block: ContentBlock) => RendererPlugin<TView>;
  loadRenderer: (block: ContentBlock) => Promise<LoadedRenderer<TView>>;
  getCachedRenderer: (pluginId: string) => LoadedRenderer<TView> | undefined;
  listPlugins: () => ReadonlyArray<RendererPlugin<TView>>;
}

/**
 * Capability-based renderer registry.
 * Heavy viewers (Excel workbooks, code diffs, charts, PDFs) register lightweight
 * match predicates upfront while deferring parser + UI code via dynamic `load()`.
 */
export function createRendererRegistry<TView>(
  fallbackPlugin: RendererPlugin<TView>
): RendererRegistry<TView> {
  const plugins = new Map<string, RendererPlugin<TView>>();
  const resolvedCache = new Map<string, LoadedRenderer<TView>>();
  const inflightLoads = new Map<string, Promise<LoadedRenderer<TView>>>();

  function sortedPlugins(): RendererPlugin<TView>[] {
    return [...plugins.values()].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  function resolve(block: ContentBlock): RendererPlugin<TView> {
    return sortedPlugins().find((plugin) => plugin.matches(block)) ?? fallbackPlugin;
  }

  async function loadPluginWithRetry(plugin: RendererPlugin<TView>): Promise<LoadedRenderer<TView>> {
    const cached = resolvedCache.get(plugin.id);
    if (cached) return cached;

    const existingPromise = inflightLoads.get(plugin.id);
    if (existingPromise) return existingPromise;

    const loadAttempt = plugin
      .load()
      .catch(async () => {
        // Single calm retry helps flaky/slow mobile connections recover seamlessly
        await new Promise((r) => setTimeout(r, 250));
        return plugin.load();
      })
      .then((loaded) => {
        resolvedCache.set(plugin.id, loaded);
        inflightLoads.delete(plugin.id);
        return loaded;
      })
      .catch(async () => {
        inflightLoads.delete(plugin.id);
        return fallbackPlugin.load();
      });

    inflightLoads.set(plugin.id, loadAttempt);
    return loadAttempt;
  }

  return {
    register(plugin) {
      plugins.set(plugin.id, plugin as RendererPlugin<TView>);
      return () => {
        plugins.delete(plugin.id);
        resolvedCache.delete(plugin.id);
      };
    },

    resolve,

    loadRenderer(block) {
      return loadPluginWithRetry(resolve(block));
    },

    getCachedRenderer(pluginId) {
      return resolvedCache.get(pluginId);
    },

    listPlugins: sortedPlugins,
  };
}
