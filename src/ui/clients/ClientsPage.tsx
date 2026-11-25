import { useEffect, useState } from 'preact/hooks';
import {
  defaultFirmAdmin,
  selectClientEngagementGroups,
  type FirmAdminController,
  type FirmAdminState,
} from '../../core/admin';
import type { DeepLinkTarget } from '../inbox/MailIntelligencePanel';

interface ClientsPageProps {
  readonly controller?: FirmAdminController;
  readonly onOpenWorkpaper: (target: DeepLinkTarget) => void;
}

export function ClientsPage({
  controller = defaultFirmAdmin,
  onOpenWorkpaper,
}: ClientsPageProps) {
  const [state, setState] = useState<FirmAdminState>(() => controller.getState());
  const [filter, setFilter] = useState<'all' | 'active' | 'complete'>('all');
  const [query, setQuery] = useState('');

  useEffect(() => controller.subscribe(setState), [controller]);

  const q = query.trim().toLowerCase();
  const groups = selectClientEngagementGroups(state).filter((group) => {
    const isAllComplete = group.completedCount === group.totalCount;
    if (filter === 'active' && isAllComplete) return false;
    if (filter === 'complete' && !isAllComplete) return false;
    if (
      q &&
      !group.clientName.toLowerCase().includes(q) &&
      !group.engagements.some((e) => e.deliverable.toLowerCase().includes(q))
    ) {
      return false;
    }
    return true;
  });

  return (
    <div class="launchpad-scroll">
      <div class="clients-page-wrap">
        <header class="connectors-sleek-header">
          <h1 class="hero-title">Clients</h1>

          <input
            type="search"
            class="connectors-minimal-search"
            placeholder="Search clients…"
            value={query}
            onInput={(e) => setQuery((e.currentTarget as HTMLInputElement).value)}
          />
        </header>

        <nav class="connectors-tab-strip" aria-label="Filter clients">
          <button
            type="button"
            class={`conn-tab-btn ${filter === 'all' ? 'is-active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            type="button"
            class={`conn-tab-btn ${filter === 'active' ? 'is-active' : ''}`}
            onClick={() => setFilter('active')}
          >
            Active
          </button>
          <button
            type="button"
            class={`conn-tab-btn ${filter === 'complete' ? 'is-active' : ''}`}
            onClick={() => setFilter('complete')}
          >
            Complete
          </button>
        </nav>

        <div class="clients-groups-stack">
          {groups.map((client) => (
            <section key={client.clientName} class="client-group-card">
              <header class="client-group-header">
                <div class="client-group-title-wrap">
                  <h2 class="client-group-name">{client.clientName}</h2>
                  <span class="client-group-count">
                    {client.completedCount}/{client.totalCount} complete
                  </span>
                </div>

                <div class="client-progress-inline">
                  <div class="client-progress-track">
                    <span
                      class="client-progress-fill"
                      style={{ width: `${client.averageProgressPct}%` }}
                    />
                  </div>
                  <span class="client-progress-pct">{client.averageProgressPct}%</span>
                </div>
              </header>

              <div class="client-engagements-list">
                {client.engagements.map((eng) => (
                  <div key={eng.id} class="client-eng-row">
                    <div class="client-eng-main">
                      <span class="client-eng-title">{eng.deliverable}</span>
                      {eng.pluginRoute && (
                        <button
                          type="button"
                          class="client-open-btn"
                          onClick={() =>
                            onOpenWorkpaper({
                              pluginRoute: eng.pluginRoute,
                              anchor: eng.anchor,
                            })
                          }
                        >
                          Open ↗
                        </button>
                      )}
                    </div>

                    <div class="client-eng-meta">
                      <span class="client-meta-pill">{eng.practice}</span>
                      <span class="client-owner-name">{eng.ownerName}</span>
                      <span class="client-stage-label">{eng.stage}</span>

                      <div class="client-progress-inline is-sm">
                        <div class="client-progress-track">
                          <span
                            class="client-progress-fill"
                            style={{ width: `${eng.progressPct}%` }}
                          />
                        </div>
                        <span class="client-progress-pct">{eng.progressPct}%</span>
                      </div>

                      <span class={`client-due-tag ${eng.atRisk ? 'is-urgent' : ''}`}>
                        {eng.dueDateLabel}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
