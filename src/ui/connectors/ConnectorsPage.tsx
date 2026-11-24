import { useState } from 'preact/hooks';
import type { InboxProvider, NavSection } from '../../core/types';
import { CONNECTOR_LOGOS } from './connectorLogos';

type ConnectorCategory = 'email' | 'ledgers' | 'tax' | 'practice' | 'banking';

interface ConnectorDefinition {
  readonly id: string;
  readonly name: string;
  readonly category: ConnectorCategory;
  readonly tag: string;
  readonly inboxTarget?: InboxProvider;
}

const CATEGORY_GROUPS: ReadonlyArray<{
  readonly id: ConnectorCategory;
  readonly label: string;
}> = [
  { id: 'email', label: 'Email' },
  { id: 'ledgers', label: 'Ledgers & ERP' },
  { id: 'tax', label: 'Tax & HMRC' },
  { id: 'practice', label: 'Practice & Audit' },
  { id: 'banking', label: 'Banking & Payroll' },
];

const CONNECTORS: ReadonlyArray<ConnectorDefinition> = [
  {
    id: 'gmail',
    name: 'Google Workspace',
    category: 'email',
    tag: 'Gmail · Labels · Attachments',
    inboxTarget: 'gmail',
  },
  {
    id: 'outlook',
    name: 'Microsoft 365 Outlook',
    category: 'email',
    tag: 'Mail · Categories · Teams',
    inboxTarget: 'outlook',
  },
  {
    id: 'xero',
    name: 'Xero',
    category: 'ledgers',
    tag: 'GL · VAT · Manual journals',
  },
  {
    id: 'quickbooks',
    name: 'QuickBooks Online',
    category: 'ledgers',
    tag: 'Chart of accounts · AJEs',
  },
  {
    id: 'sage',
    name: 'Sage Intacct & 50',
    category: 'ledgers',
    tag: 'Multi-entity GL · UK VAT',
  },
  {
    id: 'netsuite',
    name: 'Oracle NetSuite',
    category: 'ledgers',
    tag: 'OneWorld · ASC 606 · Close',
  },
  {
    id: 'freeagent',
    name: 'FreeAgent',
    category: 'ledgers',
    tag: 'SMB ledger · CIS',
  },
  {
    id: 'hmrc-mtd',
    name: 'HMRC Making Tax Digital',
    category: 'tax',
    tag: 'VAT · CT600 · ITSA',
  },
  {
    id: 'companies-house',
    name: 'Companies House',
    category: 'tax',
    tag: 'iXBRL accounts · CS01',
  },
  {
    id: 'cch-axcess',
    name: 'Wolters Kluwer CCH Axcess',
    category: 'tax',
    tag: '1120 / 1065 · Schedule M-1',
  },
  {
    id: 'ultratax',
    name: 'Thomson Reuters UltraTax CS',
    category: 'tax',
    tag: 'Federal & state bridges',
  },
  {
    id: 'iris-tax',
    name: 'IRIS Elements',
    category: 'tax',
    tag: 'FRS 102 / 105 · UK tax',
  },
  {
    id: 'karbon',
    name: 'Karbon',
    category: 'practice',
    tag: 'Workflows · PBC tasks',
  },
  {
    id: 'caseware',
    name: 'Caseware Cloud',
    category: 'practice',
    tag: 'Audit binders · Lead schedules',
  },
  {
    id: 'dext',
    name: 'Dext Prepare',
    category: 'practice',
    tag: 'Invoice & receipt capture',
  },
  {
    id: 'ignition',
    name: 'Ignition',
    category: 'practice',
    tag: 'Engagement letters · Scope',
  },
  {
    id: 'open-banking',
    name: 'Open Banking UK / Plaid',
    category: 'banking',
    tag: 'Direct bank statement feeds',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    category: 'banking',
    tag: 'Payouts · Fees · Billing',
  },
  {
    id: 'gusto',
    name: 'Gusto',
    category: 'banking',
    tag: 'Payroll registers · Liabilities',
  },
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
  const [filterCat, setFilterCat] = useState<'all' | 'active' | ConnectorCategory>('all');
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();

  return (
    <div class="launchpad-scroll">
      <div class="connectors-sleek-wrap">
        <header class="connectors-sleek-header">
          <div class="connectors-title-row">
            <h1 class="hero-title">Connectors</h1>
            <span class="connectors-active-tally">
              {connectedIds.length} of {CONNECTORS.length} active
            </span>
          </div>

          <input
            type="search"
            class="connectors-minimal-search"
            placeholder="Filter…"
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
            class={`conn-tab-btn ${filterCat === 'active' ? 'is-active' : ''}`}
            onClick={() => setFilterCat('active')}
          >
            Active ({connectedIds.length})
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
            if (filterCat !== 'all' && filterCat !== 'active' && filterCat !== group.id) {
              return null;
            }

            const items = CONNECTORS.filter((item) => {
              if (item.category !== group.id) return false;
              if (filterCat === 'active' && !connectedIds.includes(item.id)) return false;
              if (
                q &&
                !item.name.toLowerCase().includes(q) &&
                !item.tag.toLowerCase().includes(q)
              ) {
                return false;
              }
              return true;
            });

            if (items.length === 0) return null;

            return (
              <section key={group.id} class="conn-group">
                <h2 class="conn-group-label">{group.label}</h2>

                <div class="conn-list-box">
                  {items.map((item) => {
                    const isOn = connectedIds.includes(item.id);
                    const Logo = CONNECTOR_LOGOS[item.id];

                    return (
                      <div key={item.id} class="conn-row">
                        <div class="conn-row-left">
                          <span class="conn-row-logo">
                            {Logo && <Logo size={18} />}
                          </span>
                          <span class="conn-row-name">{item.name}</span>
                          <span class="conn-row-tag">{item.tag}</span>
                        </div>

                        <div class="conn-row-right">
                          {item.inboxTarget && isOn && (
                            <button
                              type="button"
                              class="conn-open-link"
                              onClick={() => onOpenInboxProvider(item.inboxTarget!)}
                            >
                              Inbox ↗
                            </button>
                          )}

                          <button
                            type="button"
                            role="switch"
                            aria-checked={isOn}
                            aria-label={`Toggle ${item.name}`}
                            class={`conn-switch ${isOn ? 'is-on' : ''}`}
                            onClick={() => onToggleConnector(item.id)}
                          >
                            <span class="conn-switch-thumb" />
                          </button>
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
