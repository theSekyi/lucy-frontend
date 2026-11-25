import { useState } from 'preact/hooks';
import {
  CONNECTOR_CATALOG,
  CONNECTOR_GROUPS,
  type ConnectorCategory,
} from '../../core/connectors';
import type { InboxProvider, NavSection } from '../../core/types';
import { CONNECTOR_LOGOS } from './connectorLogos';

interface ConnectorsPageProps {
  readonly connectedIds: ReadonlyArray<string>;
  readonly disconnectedIds?: ReadonlyArray<string>;
  readonly onToggleConnector: (id: string) => void;
  readonly onOpenInboxProvider: (provider: InboxProvider) => void;
  readonly onNavigate?: (section: NavSection) => void;
}

export function ConnectorsPage({
  connectedIds,
  disconnectedIds = [],
  onToggleConnector,
  onOpenInboxProvider,
}: ConnectorsPageProps) {
  const [filterCat, setFilterCat] = useState<
    'all' | 'connected' | 'disconnected' | ConnectorCategory
  >('all');
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();

  return (
    <div class="launchpad-scroll">
      <div class="connectors-sleek-wrap">
        <header class="connectors-sleek-header">
          <h1 class="hero-title">Connectors</h1>

          <input
            type="search"
            class="connectors-minimal-search"
            placeholder="Search…"
            value={query}
            onInput={(e) => setQuery((e.currentTarget as HTMLInputElement).value)}
          />
        </header>

        <nav class="connectors-tab-strip" aria-label="Filter integrations">
          <button
            type="button"
            class={`conn-tab-btn ${filterCat === 'all' ? 'is-active' : ''}`}
            onClick={() => setFilterCat('all')}
          >
            All
          </button>
          <button
            type="button"
            class={`conn-tab-btn ${filterCat === 'connected' ? 'is-active' : ''}`}
            onClick={() => setFilterCat('connected')}
          >
            Connected ({connectedIds.length})
          </button>
          {disconnectedIds.length > 0 && (
            <button
              type="button"
              class={`conn-tab-btn ${filterCat === 'disconnected' ? 'is-active' : ''}`}
              onClick={() => setFilterCat('disconnected')}
            >
              Disconnected ({disconnectedIds.length})
            </button>
          )}
          {CONNECTOR_GROUPS.map((g) => (
            <button
              key={g.id}
              type="button"
              class={`conn-tab-btn ${filterCat === g.id ? 'is-active' : ''}`}
              onClick={() => setFilterCat(g.id)}
            >
              {g.label}
            </button>
          ))}
        </nav>

        <div class="connectors-groups-stack">
          {CONNECTOR_GROUPS.map((group) => {
            if (
              filterCat !== 'all' &&
              filterCat !== 'connected' &&
              filterCat !== 'disconnected' &&
              filterCat !== group.id
            ) {
              return null;
            }

            const items = CONNECTOR_CATALOG.filter((item) => {
              if (item.category !== group.id) return false;
              if (filterCat === 'connected' && !connectedIds.includes(item.id)) return false;
              if (filterCat === 'disconnected' && !disconnectedIds.includes(item.id)) {
                return false;
              }
              if (q && !item.name.toLowerCase().includes(q)) return false;
              return true;
            });

            if (items.length === 0) return null;

            return (
              <section key={group.id} class="conn-group">
                <h2 class="conn-group-label">{group.label}</h2>

                <div class="conn-list-box">
                  {items.map((item) => {
                    const isConnected = connectedIds.includes(item.id);
                    const wasDisconnected = disconnectedIds.includes(item.id);
                    const Logo = CONNECTOR_LOGOS[item.id];

                    return (
                      <div key={item.id} class="conn-row">
                        <div class="conn-row-left">
                          <span class="conn-row-logo">
                            {Logo && <Logo size={18} />}
                          </span>
                          <span class="conn-row-name">{item.name}</span>
                        </div>

                        <div class="conn-row-right">
                          {item.inboxTarget && isConnected && (
                            <button
                              type="button"
                              class="conn-open-link"
                              onClick={() => onOpenInboxProvider(item.inboxTarget!)}
                            >
                              Inbox ↗
                            </button>
                          )}

                          {isConnected ? (
                            <div class="conn-connected-actions">
                              <span class="conn-connected-badge">Connected</span>
                              <button
                                type="button"
                                class="conn-disconnect-btn"
                                onClick={() => onToggleConnector(item.id)}
                              >
                                Disconnect
                              </button>
                            </div>
                          ) : (
                            <div class="conn-connected-actions">
                              {wasDisconnected && (
                                <span class="conn-disconnected-badge">Disconnected</span>
                              )}
                              <button
                                type="button"
                                class="conn-oauth-btn"
                                onClick={() => onToggleConnector(item.id)}
                              >
                                {wasDisconnected ? 'Reconnect ↗' : 'Connect ↗'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
