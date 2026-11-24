import type { BadgeAccent, ContentBlock, RenderPlacement } from './types';

export interface SampleTurnPayload {
  readonly prose: string;
  readonly artifact: ContentBlock;
  readonly defaultAnchor?: string;
}

export interface RendererContext<TData = unknown> {
  readonly block: ContentBlock<TData>;
  readonly isCompact?: boolean;
  readonly focusAnchor?: string | null;
  readonly anchorPulse?: number;
  readonly siblingArtifactId?: string | null;
  readonly onInspect?: (blockId: string, anchor?: string) => void;
  readonly onCommitRevision?: (nextData: TData, changeSummary: ReadonlyArray<string>) => void;
}

export interface LoadedRenderer<TView, TData = unknown> {
  readonly render: (context: RendererContext<TData>) => TView;
}

export interface RendererPlugin<TView, TData = unknown> {
  readonly id: string;
  readonly label: string;
  readonly badge: string;
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
  resolve: (block: ContentBlock) => RendererPlugin<TView>;
  matchPromptPlugin: (prompt: string) => RendererPlugin<TView> | undefined;
  loadRenderer: (block: ContentBlock) => Promise<LoadedRenderer<TView>>;
  getCachedRenderer: (pluginId: string) => LoadedRenderer<TView> | undefined;
  listPlugins: () => ReadonlyArray<RendererPlugin<TView>>;
}

/**
 * Self-describing plug-and-play renderer registry.
 * Dropping a plugin descriptor into the registry automatically enables:
 * 1. Block matching & lazy chunk loading (with flaky-network retry)
 * 2. Zero-download inline summary cards for `stage` placement
 * 3. Optional prompt routing & `+` menu sample launching
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

  function matchPromptPlugin(prompt: string): RendererPlugin<TView> | undefined {
    return sortedPlugins().find((plugin) => plugin.promptPattern?.test(prompt));
  }

  async function loadPluginWithRetry(plugin: RendererPlugin<TView>): Promise<LoadedRenderer<TView>> {
    const cached = resolvedCache.get(plugin.id);
    if (cached) return cached;

    const existingPromise = inflightLoads.get(plugin.id);
    if (existingPromise) return existingPromise;

    const loadAttempt = plugin
      .load()
      .catch(async () => {
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
