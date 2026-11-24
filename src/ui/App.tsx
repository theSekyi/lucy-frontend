import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import type { RendererRegistry } from '../core/renderers';
import type { WorkspaceState } from '../core/types';
import {
  selectFilteredTopics,
  selectHomeRecentTopics,
  selectHomeRecentTotalCount,
  selectSidebarRecentTopics,
  type WorkspaceController,
} from '../core/workspace';
import { Launchpad } from './Launchpad';
import { Sidebar } from './Sidebar';
import type { ThreadView as ThreadViewComponent } from './ThreadView';

interface AppProps {
  readonly workspace: WorkspaceController;
  readonly registry: RendererRegistry<ComponentChildren>;
  readonly onIngestFile: (file: File) => void;
}

export function App({ workspace, registry, onIngestFile }: AppProps) {
  const [state, setState] = useState<WorkspaceState>(() => workspace.getState());
  const [ThreadViewLoaded, setThreadViewLoaded] = useState<typeof ThreadViewComponent | null>(null);

  useEffect(() => workspace.subscribe(setState), [workspace]);

  useEffect(() => {
    async function applyUrlParams() {
      const params = new URLSearchParams(window.location.search);
      const rawStage = params.get('stage')?.trim().toLowerCase();
      const anchor = params.get('anchor');
      if (!rawStage) return;

      const matchedPlugin = registry.findByRoute(rawStage);
      if (!matchedPlugin) return;

      const topicId = await workspace.launchPluginSample(matchedPlugin.id);
      if (topicId && anchor) {
        const blockId = workspace.getState().inspectedBlockId;
        if (blockId) workspace.inspectArtifact(blockId, anchor);
      }
    }

    void applyUrlParams();
    window.addEventListener('popstate', applyUrlParams);
    return () => window.removeEventListener('popstate', applyUrlParams);
  }, [registry, workspace]);

  useEffect(() => {
    const topic = state.topics.find((t) => t.id === state.activeTopicId);
    if (!topic) {
      if (window.location.search.includes('stage=')) {
        window.history.replaceState(null, '', window.location.pathname);
      }
      return;
    }
    const block = topic.turns.flatMap((t) => t.blocks).find((b) => b.id === state.inspectedBlockId);
    if (!block) return;
    const pluginId = registry.resolve(block).id;
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set('stage', pluginId);
    if (state.inspectedAnchor) nextUrl.searchParams.set('anchor', state.inspectedAnchor);
    else nextUrl.searchParams.delete('anchor');
    window.history.replaceState(null, '', `${nextUrl.pathname}?${nextUrl.searchParams.toString()}`);
  }, [registry, state.activeTopicId, state.inspectedAnchor, state.inspectedBlockId, state.topics]);

  useEffect(() => {
    if (state.activeTopicId && !ThreadViewLoaded) {
      void import('./ThreadView').then((mod) => setThreadViewLoaded(() => mod.ThreadView));
      return;
    }
    if (state.networkStatus === 'online' && !ThreadViewLoaded) {
      const timer = setTimeout(() => {
        void import('./ThreadView').then((mod) => setThreadViewLoaded(() => mod.ThreadView));
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [state.activeTopicId, state.networkStatus, ThreadViewLoaded]);

  useEffect(() => {
    function syncConnectivity() {
      if (!navigator.onLine) {
        workspace.setNetworkStatus('offline');
        return;
      }
      const conn = (navigator as Navigator & { connection?: { effectiveType?: string } })
        .connection;
      const isSlow =
        conn?.effectiveType === 'slow-2g' ||
        conn?.effectiveType === '2g' ||
        conn?.effectiveType === '3g';
      workspace.setNetworkStatus(isSlow ? 'slow' : 'online');
    }

    syncConnectivity();
    window.addEventListener('online', syncConnectivity);
    window.addEventListener('offline', syncConnectivity);
    return () => {
      window.removeEventListener('online', syncConnectivity);
      window.removeEventListener('offline', syncConnectivity);
    };
  }, [workspace]);

  useEffect(() => {
    function handleGlobalKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        workspace.setSearchOpen(!workspace.getState().isSearchOpen);
      } else if (event.key === 'Escape') {
        const current = workspace.getState();
        if (current.inspectedBlockId) {
          workspace.inspectArtifact(null);
        } else if (current.activeTopicId) {
          workspace.returnHome();
        }
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [workspace]);

  const activeTopic = state.topics.find((t) => t.id === state.activeTopicId) ?? null;
  const activeBrief = state.briefs[state.activeBriefIndex] ?? state.briefs[0]!;
  const sidebarRecents = selectSidebarRecentTopics(state);
  const homeTopics = state.searchQuery.trim()
    ? selectFilteredTopics(state)
    : selectHomeRecentTopics(state);

  return (
    <div class="app-frame">
      <Sidebar
        isOpen={state.isSidebarOpen}
        activeSection={state.activeSection}
        activeTopicId={state.activeTopicId}
        isRecentsOpen={state.isRecentsOpen}
        showAllRecents={state.showAllSidebarRecents}
        isSearchOpen={state.isSearchOpen}
        searchQuery={state.searchQuery}
        recentTopics={sidebarRecents}
        networkStatus={state.networkStatus}
        queuedCount={state.queuedTurnIds.length}
        onToggleSidebar={() => workspace.toggleSidebar()}
        onSelectSection={(sec) => workspace.selectSection(sec)}
        onToggleSearch={() => workspace.setSearchOpen(!state.isSearchOpen)}
        onSearchChange={(q) => workspace.setSearchQuery(q)}
        onToggleRecents={() => workspace.toggleRecents()}
        onToggleMoreRecents={() => workspace.toggleMoreSidebarRecents()}
        onOpenTopic={(id) => workspace.openTopic(id)}
      />

      <main class="main-surface">
        {activeTopic ? (
          ThreadViewLoaded ? (
            <ThreadViewLoaded
              topic={activeTopic}
              registry={registry}
              inspectedBlockId={state.inspectedBlockId}
              inspectedAnchor={state.inspectedAnchor}
              anchorPulse={state.anchorPulse}
              isStageMaximized={state.isStageMaximized}
              draft={state.composerDraft}
              attachments={state.attachments}
              models={state.models}
              selectedModelId={state.selectedModelId}
              onReturnHome={() => workspace.returnHome()}
              onInspectBlock={(id, anchor) => workspace.inspectArtifact(id, anchor)}
              onCommitRevision={(blockId, nextData, summary) =>
                workspace.commitArtifactRevision(blockId, nextData, summary)
              }
              onToggleMaximizeStage={() => workspace.toggleStageMaximize()}
              onDraftChange={(text) => workspace.updateDraft(text)}
              onModelChange={(id) => workspace.setModel(id)}
              onIngestFile={onIngestFile}
              onRemoveAttachment={(id) => workspace.removeAttachment(id)}
              onLaunchPluginSample={(pluginId) => void workspace.launchPluginSample(pluginId)}
              onSubmit={() => workspace.submitPrompt()}
            />
          ) : (
            <div class="launchpad-scroll">
              <div class="renderer-skeleton">Loading view…</div>
            </div>
          )
        ) : state.activeSection === 'tasks' ? (
          <div class="launchpad-scroll">
            <div class="launchpad-column section-overview">
              <div class="section-header-row">
                <h1 class="hero-title">Tasks</h1>
                <button
                  type="button"
                  class="ghost-pill"
                  onClick={() => workspace.returnHome()}
                >
                  ← Back to Home
                </button>
              </div>
              <p class="daily-brief-body">
                Active engineering issues and automated workflows.
              </p>
              <div class="recent-topics-list">
                {state.topics
                  .filter((t) => t.pinnedInSidebar)
                  .map((topic) => (
                    <button
                      key={topic.id}
                      type="button"
                      class="topic-row"
                      onClick={() => workspace.openTopic(topic.id)}
                    >
                      <div class="topic-row-content">
                        <div class="topic-row-top">
                          <span class="topic-row-title">{topic.title}</span>
                          <span class="topic-row-date">{topic.dateLabel}</span>
                        </div>
                        <div class="topic-row-preview">{topic.preview}</div>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        ) : (
          <Launchpad
            brief={activeBrief}
            recentTopics={homeTopics}
            totalRecentCount={selectHomeRecentTotalCount(state)}
            draft={state.composerDraft}
            attachments={state.attachments}
            models={state.models}
            selectedModelId={state.selectedModelId}
            registry={registry}
            searchQuery={state.searchQuery}
            onDraftChange={(text) => workspace.updateDraft(text)}
            onModelChange={(id) => workspace.setModel(id)}
            onIngestFile={onIngestFile}
            onRemoveAttachment={(id) => workspace.removeAttachment(id)}
            onLaunchPluginSample={(pluginId) => void workspace.launchPluginSample(pluginId)}
            onSubmit={() => workspace.submitPrompt()}
            onStepBrief={(delta) => workspace.stepDailyBrief(delta)}
            onOpenTopic={(id) => workspace.openTopic(id)}
          />
        )}
      </main>
    </div>
  );
}
