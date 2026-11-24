import type { NavSection, NetworkStatus, SidebarIconKind, TopicThread } from '../core/types';
import {
  BellIcon,
  BotItemIcon,
  HomeIcon,
  LucyBrandMark,
  PanelToggleIcon,
  SearchIcon,
  SpinnerItemIcon,
  TasksIcon,
} from './icons';

interface SidebarProps {
  readonly isOpen: boolean;
  readonly activeSection: NavSection;
  readonly activeTopicId: string | null;
  readonly isRecentsOpen: boolean;
  readonly showAllRecents: boolean;
  readonly isSearchOpen: boolean;
  readonly searchQuery: string;
  readonly recentTopics: ReadonlyArray<TopicThread>;
  readonly networkStatus: NetworkStatus;
  readonly queuedCount: number;
  readonly onToggleSidebar: () => void;
  readonly onSelectSection: (section: NavSection) => void;
  readonly onToggleSearch: () => void;
  readonly onSearchChange: (query: string) => void;
  readonly onToggleRecents: () => void;
  readonly onToggleMoreRecents: () => void;
  readonly onOpenTopic: (topicId: string) => void;
}

function renderRecentPrefix(kind?: SidebarIconKind) {
  if (kind === 'hash') return <span class="recent-hash-glyph">#</span>;
  if (kind === 'spinner') return <SpinnerItemIcon />;
  return <BotItemIcon />;
}

export function Sidebar({
  isOpen,
  activeSection,
  activeTopicId,
  isRecentsOpen,
  showAllRecents,
  isSearchOpen,
  searchQuery,
  recentTopics,
  networkStatus,
  queuedCount,
  onToggleSidebar,
  onSelectSection,
  onToggleSearch,
  onSearchChange,
  onToggleRecents,
  onToggleMoreRecents,
  onOpenTopic,
}: SidebarProps) {
  if (!isOpen) {
    return (
      <aside class="sidebar is-collapsed" aria-label="Collapsed navigation">
        <button
          type="button"
          class="icon-action-btn"
          aria-label="Expand sidebar"
          onClick={onToggleSidebar}
        >
          <PanelToggleIcon />
        </button>
      </aside>
    );
  }

  const isHomeActive = activeSection === 'home' && activeTopicId === null;

  return (
    <aside class="sidebar" aria-label="Workspace navigation">
      <div class="sidebar-top-bar">
        <button
          type="button"
          class="brand-button"
          onClick={() => onSelectSection('home')}
        >
          <LucyBrandMark />
          <span class="brand-name">Lucy</span>
        </button>

        <div class="sidebar-top-actions">
          <button
            type="button"
            class="icon-action-btn"
            aria-label="Collapse sidebar"
            onClick={onToggleSidebar}
          >
            <PanelToggleIcon />
          </button>
          <button type="button" class="icon-action-btn" aria-label="Notifications">
            <BellIcon />
          </button>
        </div>
      </div>

      <nav class="sidebar-primary-nav" aria-label="Main sections">
        {isSearchOpen ? (
          <div class="sidebar-search-box">
            <SearchIcon />
            <input
              type="search"
              class="sidebar-search-input"
              placeholder="Filter topics… (Esc)"
              value={searchQuery}
              autoFocus
              onInput={(e) => onSearchChange((e.currentTarget as HTMLInputElement).value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') onToggleSearch();
              }}
            />
          </div>
        ) : (
          <button type="button" class="nav-row" onClick={onToggleSearch}>
            <SearchIcon />
            <span>Search</span>
          </button>
        )}

        <button
          type="button"
          class={`nav-row ${isHomeActive ? 'is-active' : ''}`}
          onClick={() => onSelectSection('home')}
        >
          <HomeIcon />
          <span>Home</span>
        </button>

        <button
          type="button"
          class={`nav-row ${activeSection === 'tasks' ? 'is-active' : ''}`}
          onClick={() => onSelectSection('tasks')}
        >
          <TasksIcon />
          <span>Tasks</span>
        </button>
      </nav>

      {/* Agents section intentionally omitted per architecture brief to reduce cognitive load */}
      <section class="sidebar-section" aria-label="Recent threads">
        <button
          type="button"
          class="sidebar-section-header"
          aria-expanded={isRecentsOpen}
          onClick={onToggleRecents}
        >
          <span>Recents</span>
          <span class="section-caret">{isRecentsOpen ? '▾' : '▸'}</span>
        </button>

        {isRecentsOpen && (
          <div class="sidebar-recents-list">
            {recentTopics.map((topic) => (
              <button
                key={topic.id}
                type="button"
                class={`recent-sidebar-item ${activeTopicId === topic.id ? 'is-active' : ''}`}
                onClick={() => onOpenTopic(topic.id)}
                title={topic.title}
              >
                <span class="recent-item-icon">{renderRecentPrefix(topic.sidebarIcon)}</span>
                <span class="recent-item-label">{topic.title}</span>
              </button>
            ))}

            <button
              type="button"
              class="recent-sidebar-item is-more"
              onClick={onToggleMoreRecents}
            >
              <span class="recent-dots">•••</span>
              <span>{showAllRecents ? 'Less' : 'More'}</span>
            </button>
          </div>
        )}
      </section>

      {networkStatus !== 'online' && (
        <div class="sidebar-network-pill" role="status">
          <span class={`net-dot is-${networkStatus}`} />
          <span>
            {networkStatus === 'offline'
              ? `Offline mode${queuedCount > 0 ? ` · ${queuedCount} queued` : ''}`
              : 'Low-bandwidth mode active'}
          </span>
        </div>
      )}
    </aside>
  );
}
