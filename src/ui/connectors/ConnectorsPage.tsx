import { useState } from 'preact/hooks';
import type { InboxProvider, NavSection } from '../../core/types';
import { CONNECTOR_LOGOS } from './connectorLogos';

type ConnectorCategory = 'email' | 'storage' | 'ledgers' | 'tax' | 'practice' | 'banking';

interface ConnectorDefinition {
  readonly id: string;
  readonly name: string;
  readonly category: ConnectorCategory;
  readonly inboxTarget?: InboxProvider;
}

const CATEGORY_GROUPS: ReadonlyArray<{
  readonly id: ConnectorCategory;
  readonly label: string;
}> = [
  { id: 'email', label: 'Email' },
  { id: 'storage', label: 'Storage & Docs' },
  { id: 'ledgers', label: 'Ledgers' },
  { id: 'tax', label: 'Tax & HMRC' },
  { id: 'practice', label: 'Practice' },
  { id: 'banking', label: 'Banking & Payroll' },
];

const CONNECTORS: ReadonlyArray<ConnectorDefinition> = [
  { id: 'gmail', name: 'Google Workspace (Gmail)', category: 'email', inboxTarget: 'gmail' },
  { id: 'outlook', name: 'Microsoft 365 Outlook', category: 'email', inboxTarget: 'outlook' },
  { id: 'sharepoint', name: 'Microsoft SharePoint', category: 'storage' },
  { id: 'onedrive', name: 'Microsoft OneDrive', category: 'storage' },
  { id: 'gdrive', name: 'Google Drive', category: 'storage' },
  { id: 'xero', name: 'Xero', category: 'ledgers' },
  { id: 'quickbooks', name: 'QuickBooks Online', category: 'ledgers' },
  { id: 'sage', name: 'Sage Intacct & 50', category: 'ledgers' },
  { id: 'netsuite', name: 'Oracle NetSuite', category: 'ledgers' },
  { id: 'freeagent', name: 'FreeAgent', category: 'ledgers' },
  { id: 'hmrc-mtd', name: 'HMRC Making Tax Digital', category: 'tax' },
  { id: 'companies-house', name: 'Companies House', category: 'tax' },
  { id: 'cch-axcess', name: 'Wolters Kluwer CCH Axcess', category: 'tax' },
  { id: 'ultratax', name: 'Thomson Reuters UltraTax CS', category: 'tax' },
  { id: 'iris-tax', name: 'IRIS Elements', category: 'tax' },
  { id: 'karbon', name: 'Karbon', category: 'practice' },
  { id: 'caseware', name: 'Caseware Cloud', category: 'practice' },
  { id: 'dext', name: 'Dext Prepare', category: 'practice' },
  { id: 'ignition', name: 'Ignition', category: 'practice' },
  { id: 'open-banking', name: 'Open Banking UK / Plaid', category: 'banking' },
  { id: 'stripe', name: 'Stripe', category: 'banking' },
  { id: 'gusto', name: 'Gusto', category: 'banking' },
];

interface ConnectorsPageProps {
  readonly connectedIds: ReadonlyArray<string>;
  readonly onToggleConnector: (id: string) => void;
  readonly onOpenInboxProvider: (provider: InboxProvider) => void;
  readonly onNavigate?: (section: NavSection) => void;
}

export function ConnectorsPage({
  connectedIds,
  onToggleConnector,
  onOpenInboxProvider,
}: ConnectorsPageProps) {
  const [filterCat, setFilterCat] = useState<'all' | 'connected' | ConnectorCategory>('all');
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
          {CATEGORY_GROUPS.map((g) => (
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
          {CATEGORY_GROUPS.map((group) => {
            if (filterCat !== 'all' && filterCat !== 'connected' && filterCat !== group.id) {
              return null;
            }

            const items = CONNECTORS.filter((item) => {
              if (item.category !== group.id) return false;
              if (filterCat === 'connected' && !connectedIds.includes(item.id)) return false;
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
                            <button
                              type="button"
                              class="conn-oauth-btn"
                              onClick={() => onToggleConnector(item.id)}
                            >
                              Connect ↗
                            </button>
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
