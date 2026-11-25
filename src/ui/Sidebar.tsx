import type {
  NavSection,
  NetworkStatus,
  SidebarIconKind,
  TopicThread,
  UserProfile,
} from '../core/types';
import {
  AdminIcon,
  BellIcon,
  ClientsIcon,
  ConnectorsIcon,
  DocumentItemIcon,
  HomeIcon,
  InboxIcon,
  LucyBrandMark,
  PanelToggleIcon,
  SearchIcon,
  SpinnerItemIcon,
} from './icons';

interface SidebarProps {
  readonly isOpen: boolean;
  readonly activeSection: NavSection;
  readonly activeTopicId: string | null;
  readonly unreadInboxCount: number;
  readonly clientCount: number;
  readonly connectedCount: number;
  readonly userProfile: UserProfile;
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
  return <DocumentItemIcon />;
}

export function Sidebar({
  isOpen,
  activeSection,
  activeTopicId,
  unreadInboxCount,
  clientCount,
  connectedCount,
  userProfile,
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
  function closeOnMobile() {
    if (typeof window !== 'undefined' && window.innerWidth <= 860 && isOpen) {
      onToggleSidebar();
    }
  }

  function navigateSection(section: NavSection) {
    onSelectSection(section);
    closeOnMobile();
  }

  if (!isOpen) {
    return (
      <aside class="sidebar is-collapsed" aria-label="Collapsed navigation">
        <button
          type="button"
          class="icon-action-btn sidebar-expand-trigger"
          aria-label="Expand sidebar"
          onClick={onToggleSidebar}
        >
          <PanelToggleIcon />
        </button>
      </aside>
    );
  }

  const isHomeActive = activeSection === 'home' && activeTopicId === null;
  const isInboxActive = activeSection === 'inbox' && activeTopicId === null;
  const isClientsActive = activeSection === 'clients' && activeTopicId === null;
  const isConnectorsActive = activeSection === 'connectors' && activeTopicId === null;
  const isAdminActive = activeSection === 'admin' && activeTopicId === null;
  const isProfileActive = activeSection === 'profile' && activeTopicId === null;

  return (
    <>
      <div
        class="sidebar-mobile-scrim"
        aria-hidden="true"
        onClick={onToggleSidebar}
      />

      <aside class="sidebar" aria-label="Workspace navigation">
        <div class="sidebar-top-bar">
          <button
            type="button"
            class="brand-button"
            onClick={() => navigateSection('home')}
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
            <button
              type="button"
              class="icon-action-btn"
              aria-label="Inbox alerts"
              onClick={() => navigateSection('inbox')}
            >
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
                placeholder="Filter workpapers… (Esc)"
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
            onClick={() => navigateSection('home')}
          >
            <HomeIcon />
            <span>Home</span>
          </button>

          <button
            type="button"
            class={`nav-row ${isInboxActive ? 'is-active' : ''}`}
            onClick={() => navigateSection('inbox')}
          >
            <InboxIcon />
            <span>Inbox</span>
            {unreadInboxCount > 0 && (
              <span class="nav-count-badge is-unread">{unreadInboxCount}</span>
            )}
          </button>

          <button
            type="button"
            class={`nav-row ${isClientsActive ? 'is-active' : ''}`}
            onClick={() => navigateSection('clients')}
          >
            <ClientsIcon />
            <span>Clients</span>
            <span class="nav-count-badge">{clientCount}</span>
          </button>

          <button
            type="button"
            class={`nav-row ${isConnectorsActive ? 'is-active' : ''}`}
            onClick={() => navigateSection('connectors')}
          >
            <ConnectorsIcon />
            <span>Connectors</span>
            <span class="nav-count-badge">{connectedCount}</span>
          </button>

          <button
            type="button"
            class={`nav-row ${isAdminActive ? 'is-active' : ''}`}
            onClick={() => navigateSection('admin')}
          >
            <AdminIcon />
            <span>Firm Admin</span>
          </button>
        </nav>

        <section class="sidebar-section" aria-label="Recent workpapers">
          <button
            type="button"
            class="sidebar-section-header"
            aria-expanded={isRecentsOpen}
            onClick={onToggleRecents}
          >
            <span>Workpapers</span>
            <span class="section-caret">{isRecentsOpen ? '▾' : '▸'}</span>
          </button>

          {isRecentsOpen && (
            <div class="sidebar-recents-list">
              {recentTopics.map((topic) => (
                <button
                  key={topic.id}
                  type="button"
                  class={`recent-sidebar-item ${activeTopicId === topic.id ? 'is-active' : ''}`}
                  onClick={() => {
                    onOpenTopic(topic.id);
                    closeOnMobile();
                  }}
                  title={topic.title}
                >
                  <span class="recent-item-icon">{renderRecentPrefix(topic.sidebarIcon)}</span>
                  <span class="recent-item-label">{topic.title}</span>
                </button>
              ))}

              {!searchQuery && (
                <button
                  type="button"
                  class="recent-sidebar-item is-more"
                  onClick={onToggleMoreRecents}
                >
                  <span class="recent-dots">•••</span>
                  <span>{showAllRecents ? 'Less' : 'More'}</span>
                </button>
              )}
            </div>
          )}
        </section>

        <div class="sidebar-bottom-stack">
          {networkStatus !== 'online' && (
            <div class="sidebar-network-pill" role="status">
              <span class={`net-dot is-${networkStatus}`} />
              <span>
                {networkStatus === 'offline'
                  ? `Offline${queuedCount > 0 ? ` · ${queuedCount} queued` : ''}`
                  : 'Low-bandwidth mode'}
              </span>
            </div>
          )}

          <button
            type="button"
            class={`sidebar-profile-footer ${isProfileActive ? 'is-active' : ''}`}
            onClick={() => navigateSection('profile')}
          >
            <span class="sidebar-avatar-sm" aria-hidden="true">
              {userProfile.initials}
            </span>
            <span class="sidebar-profile-text">
              <span class="sidebar-profile-name">{userProfile.fullName}</span>
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
