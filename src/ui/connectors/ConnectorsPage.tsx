import { useState } from 'preact/hooks';
import type { InboxProvider, NavSection } from '../../core/types';
import { CONNECTOR_LOGOS } from './connectorLogos';

type ConnectorCategory = 'email' | 'ledgers' | 'tax' | 'practice' | 'banking';

interface ConnectorDefinition {
  readonly id: string;
  readonly name: string;
  readonly category: ConnectorCategory;
  readonly summary: string;
  readonly scopeLabel: string;
  readonly inboxTarget?: InboxProvider;
}

const CATEGORY_GROUPS: ReadonlyArray<{
  readonly id: ConnectorCategory;
  readonly shortTab: string;
  readonly title: string;
  readonly subtitle: string;
}> = [
  {
    id: 'email',
    shortTab: 'Email',
    title: 'Email & Client Communications',
    subtitle: 'Sync client threads, PBC attachments, HMRC notices, and engagement approvals.',
  },
  {
    id: 'ledgers',
    shortTab: 'Ledgers & ERP',
    title: 'General Ledgers & ERP',
    subtitle: 'Pull unadjusted trial balances, GL drill-downs, and stage balanced AJEs.',
  },
  {
    id: 'tax',
    shortTab: 'HMRC & Tax',
    title: 'HMRC, Tax & Statutory Authorities',
    subtitle: 'Making Tax Digital (VAT / ITSA / CT600), statutory accounts, and tax prep bridges.',
  },
  {
    id: 'practice',
    shortTab: 'Practice & Audit',
    title: 'Practice Management & Audit Workpapers',
    subtitle: 'Client workflows, engagement letters, OCR invoice capture, and audit binders.',
  },
  {
    id: 'banking',
    shortTab: 'Banking & Payroll',
    title: 'Open Banking, Payroll & Billing Feeds',
    subtitle: 'Direct bank statement cutoff feeds, merchant settlements, and payroll registers.',
  },
];

const CONNECTORS: ReadonlyArray<ConnectorDefinition> = [
  {
    id: 'gmail',
    name: 'Google Workspace (Gmail)',
    category: 'email',
    summary: 'Client mail threads, labels, and attachment ingestion.',
    scopeLabel: 'OAuth 2.0 · Read / Draft',
    inboxTarget: 'gmail',
  },
  {
    id: 'outlook',
    name: 'Microsoft Outlook (365)',
    category: 'email',
    summary: 'Focused/Other mail, categories, flags, and Teams filing deadlines.',
    scopeLabel: 'MS Graph · Mail & Calendar',
    inboxTarget: 'outlook',
  },
  {
    id: 'xero',
    name: 'Xero',
    category: 'ledgers',
    summary: 'Multi-currency ledger, VAT returns, bank feeds, and manual journals.',
    scopeLabel: 'Advisor API · Live Sync',
  },
  {
    id: 'quickbooks',
    name: 'Intuit QuickBooks Online',
    category: 'ledgers',
    summary: 'Chart of accounts, class tracking, subledgers, and AJE posting.',
    scopeLabel: 'QBO Accounting API',
  },
  {
    id: 'sage',
    name: 'Sage Intacct & Sage 50',
    category: 'ledgers',
    summary: 'Multi-entity dimensional GL, consolidations, and UK VAT.',
    scopeLabel: 'REST / XML Gateway',
  },
  {
    id: 'netsuite',
    name: 'Oracle NetSuite',
    category: 'ledgers',
    summary: 'OneWorld subsidiaries, ASC 606 revenue schedules, and close checklists.',
    scopeLabel: 'SuiteTalk · US & UK Subs',
  },
  {
    id: 'freeagent',
    name: 'FreeAgent',
    category: 'ledgers',
    summary: 'UK contractor & SMB bookkeeping, CIS, and self-assessment feeds.',
    scopeLabel: 'Practice Partner API',
  },
  {
    id: 'hmrc-mtd',
    name: 'HMRC Making Tax Digital',
    category: 'tax',
    summary: 'Direct MTD VAT obligations, Corporation Tax (CT600), and ITSA status.',
    scopeLabel: 'Gov.uk OAuth · Agent ASA',
  },
  {
    id: 'companies-house',
    name: 'Companies House (UK)',
    category: 'tax',
    summary: 'Confirmation statements (CS01), iXBRL accounts filing dates, and PSCs.',
    scopeLabel: 'CHS Streaming API',
  },
  {
    id: 'cch-axcess',
    name: 'Wolters Kluwer CCH Axcess',
    category: 'tax',
    summary: 'Corporate 1120 / partnership 1065 trial-balance import & M-1/K-1 export.',
    scopeLabel: 'Open Integration Kit',
  },
  {
    id: 'ultratax',
    name: 'Thomson Reuters UltraTax CS',
    category: 'tax',
    summary: 'Multi-state apportionment workpapers and federal tax bridges.',
    scopeLabel: 'CS Connect Bridge',
  },
  {
    id: 'iris-tax',
    name: 'IRIS Elements Tax & Accounts',
    category: 'tax',
    summary: 'FRS 102 / 105 accounts production and UK personal/corporate tax.',
    scopeLabel: 'IRIS OpenAPI',
  },
  {
    id: 'karbon',
    name: 'Karbon',
    category: 'practice',
    summary: 'Practice worklists, client tasks, PBC chasers, and partner sign-off.',
    scopeLabel: 'Webhooks + REST',
  },
  {
    id: 'caseware',
    name: 'Caseware Cloud',
    category: 'practice',
    summary: 'Audit engagement binders, lead schedules, materiality, and tickmarks.',
    scopeLabel: 'Working Papers Sync',
  },
  {
    id: 'dext',
    name: 'Dext Prepare',
    category: 'practice',
    summary: 'Optical supplier invoice & expense receipt extraction for vouching.',
    scopeLabel: 'Receipt Image + OCR',
  },
  {
    id: 'ignition',
    name: 'Ignition',
    category: 'practice',
    summary: 'Signed engagement letters, scope verification, and recurring billing.',
    scopeLabel: 'Engagement Scope API',
  },
  {
    id: 'open-banking',
    name: 'Open Banking UK / Plaid',
    category: 'banking',
    summary: 'Direct Barclays, HSBC, NatWest, Lloyds & Chase cutoff bank statements.',
    scopeLabel: 'FCA AIS · Read-Only',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    category: 'banking',
    summary: 'Gross-to-net payout batches, processing fees, and ASC 606 billing.',
    scopeLabel: 'Read-Only Balance API',
  },
  {
    id: 'gusto',
    name: 'Gusto Payroll',
    category: 'banking',
    summary: 'Payroll registers, employer tax liabilities, and accrued PTO.',
    scopeLabel: 'Payroll Journal API',
  },
];

interface ConnectorsPageProps {
  readonly connectedIds: ReadonlyArray<string>;
  readonly onToggleConnector: (id: string) => void;
  readonly onOpenInboxProvider: (provider: InboxProvider) => void;
  readonly onNavigate: (section: NavSection) => void;
}

export function ConnectorsPage({
  connectedIds,
  onToggleConnector,
  onOpenInboxProvider,
  onNavigate,
}: ConnectorsPageProps) {
  const [filterCat, setFilterCat] = useState<'all' | 'connected' | ConnectorCategory>('all');
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();

  return (
    <div class="launchpad-scroll">
      <div class="connectors-container">
        <header class="connectors-page-header">
          <div>
            <h1 class="hero-title">Connectors</h1>
            <p class="daily-brief-body" style={{ marginTop: '6px' }}>
              Connect client ledgers, HMRC gateways, practice tools, and firm mailboxes.
            </p>
          </div>

          <div class="stage-subbar-group">
            <span class="cell-pill tone-good">{connectedIds.length} Connected</span>
            <input
              type="search"
              class="connectors-search-input"
              placeholder="Filter software…"
              value={query}
              onInput={(e) => setQuery((e.currentTarget as HTMLInputElement).value)}
            />
          </div>
        </header>

        <div class="connectors-filter-bar" role="tablist">
          <button
            type="button"
            class={`metric-chip ${filterCat === 'all' ? 'is-active' : ''}`}
            onClick={() => setFilterCat('all')}
          >
            All ({CONNECTORS.length})
          </button>
          <button
            type="button"
            class={`metric-chip ${filterCat === 'connected' ? 'is-active' : ''}`}
            onClick={() => setFilterCat('connected')}
          >
            Connected ({connectedIds.length})
          </button>
          {CATEGORY_GROUPS.map((g) => (
            <button
              key={g.id}
              type="button"
              class={`metric-chip ${filterCat === g.id ? 'is-active' : ''}`}
              onClick={() => setFilterCat(g.id)}
            >
              {g.shortTab}
            </button>
          ))}
          <button
            type="button"
            class="ghost-pill"
            style={{ marginLeft: 'auto' }}
            onClick={() => onNavigate('profile')}
          >
            Firm Profile →
          </button>
        </div>

        {CATEGORY_GROUPS.map((group) => {
          if (filterCat !== 'all' && filterCat !== 'connected' && filterCat !== group.id) {
            return null;
          }

          const items = CONNECTORS.filter((item) => {
            if (item.category !== group.id) return false;
            if (filterCat === 'connected' && !connectedIds.includes(item.id)) return false;
            if (
              q &&
              !item.name.toLowerCase().includes(q) &&
              !item.summary.toLowerCase().includes(q)
            ) {
              return false;
            }
            return true;
          });

          if (items.length === 0) return null;

          return (
            <section key={group.id} class="connector-group-section">
              <div class="connector-group-heading">
                <h2 class="connector-group-title">{group.title}</h2>
                <span class="connector-group-sub">{group.subtitle}</span>
              </div>

              <div class="connector-cards-grid">
                {items.map((item) => {
                  const isConnected = connectedIds.includes(item.id);
                  const Logo = CONNECTOR_LOGOS[item.id];

                  return (
                    <article
                      key={item.id}
                      class={`connector-card ${isConnected ? 'is-connected' : ''}`}
                    >
                      <div class="connector-card-top">
                        <div class="connector-logo-box">
                          {Logo && <Logo size={24} />}
                        </div>
                        <div class="connector-title-wrap">
                          <strong class="connector-name">{item.name}</strong>
                          <span class="connector-scope">{item.scopeLabel}</span>
                        </div>
                        <span class={`conn-status-dot ${isConnected ? 'is-on' : ''}`} />
                      </div>

                      <p class="connector-desc">{item.summary}</p>

                      <div class="connector-card-footer">
                        {item.inboxTarget && isConnected ? (
                          <button
                            type="button"
                            class="ghost-pill"
                            onClick={() => onOpenInboxProvider(item.inboxTarget!)}
                          >
                            Open Inbox →
                          </button>
                        ) : (
                          <span class="sheet-meta-count">
                            {isConnected ? 'Synced · Read-only safe' : 'Not connected'}
                          </span>
                        )}

                        <button
                          type="button"
                          class={isConnected ? 'ghost-pill' : 'primary-action-pill is-sm'}
                          onClick={() => onToggleConnector(item.id)}
                        >
                          {isConnected ? 'Disconnect' : 'Connect'}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
