import { useEffect, useState } from 'preact/hooks';
import {
  defaultFirmAdmin,
  selectClientEngagementGroups,
  type EngagementStage,
  type FirmAdminController,
  type FirmAdminState,
} from '../../core/admin';
import type { DeepLinkTarget } from '../inbox/MailIntelligencePanel';

const STAGES: ReadonlyArray<EngagementStage> = [
  'Intake',
  'Fieldwork',
  'Review',
  'Sign-Off',
  'Complete',
];

interface ClientsPageProps {
  readonly controller?: FirmAdminController;
  readonly selectedClientId: string | null;
  readonly selectedEngagementId: string | null;
  readonly onSelectClient: (clientId: string | null, engagementId?: string | null) => void;
  readonly onOpenWorkpaper: (target: DeepLinkTarget) => void;
}

export function ClientsPage({
  controller = defaultFirmAdmin,
  selectedClientId,
  selectedEngagementId,
  onSelectClient,
  onOpenWorkpaper,
}: ClientsPageProps) {
  const [state, setState] = useState<FirmAdminState>(() => controller.getState());
  const [filter, setFilter] = useState<'all' | 'active' | 'complete'>('all');
  const [query, setQuery] = useState('');
  const [detailTab, setDetailTab] = useState<'bookkeeping' | 'engagements'>('bookkeeping');
  const [expandedEngId, setExpandedEngId] = useState<string | null>(selectedEngagementId);

  useEffect(() => controller.subscribe(setState), [controller]);

  useEffect(() => {
    if (selectedEngagementId) {
      setDetailTab('engagements');
      setExpandedEngId(selectedEngagementId);
    } else {
      setDetailTab('bookkeeping');
      setExpandedEngId(null);
    }
  }, [selectedClientId, selectedEngagementId]);

  const allGroups = selectClientEngagementGroups(state);
  const activeClient = selectedClientId
    ? allGroups.find((c) => c.clientId === selectedClientId) ?? null
    : null;

  if (activeClient) {
    const memberMap = new Map(state.members.map((m) => [m.id, m]));
    const activePeriod =
      activeClient.periods.find((p) => p.monthKey === activeClient.activeMonthKey) ??
      activeClient.periods[10]!;
    const doneTasks = activePeriod.tasks.filter((t) => t.done).length;
    const totalTasks = activePeriod.tasks.length;
    const openEngId =
      expandedEngId === '__none__'
        ? null
        : (expandedEngId ?? activeClient.engagements[0]?.id ?? null);

    return (
      <div class="launchpad-scroll">
        <div class="clients-page-wrap">
          <div class="page-top-breadcrumb">
            <button
              type="button"
              class="back-home-btn"
              onClick={() => onSelectClient(null)}
            >
              <span>←</span>
              <span>Clients</span>
            </button>

            <div class="client-detail-badges">
              <span class="client-meta-pill">{activeClient.ledger}</span>
              <span class="client-meta-pill">YE {activeClient.yearEnd}</span>
            </div>
          </div>

          <header class="client-detail-header">
            <h1 class="hero-title">{activeClient.clientName}</h1>

            <div class="client-progress-inline">
              <div class="client-progress-track">
                <span
                  class="client-progress-fill"
                  style={{ width: `${activeClient.averageProgressPct}%` }}
                />
              </div>
              <span class="client-progress-pct">{activeClient.averageProgressPct}%</span>
            </div>
          </header>

          <nav class="connectors-tab-strip" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={detailTab === 'bookkeeping'}
              class={`conn-tab-btn ${detailTab === 'bookkeeping' ? 'is-active' : ''}`}
              onClick={() => setDetailTab('bookkeeping')}
            >
              Monthly Bookkeeping
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={detailTab === 'engagements'}
              class={`conn-tab-btn ${detailTab === 'engagements' ? 'is-active' : ''}`}
              onClick={() => setDetailTab('engagements')}
            >
              Engagements ({activeClient.engagements.length})
            </button>
          </nav>

          {detailTab === 'bookkeeping' ? (
            <div class="bk-workspace">
              <div class="bk-month-strip" role="tablist" aria-label="Bookkeeping months">
                {activeClient.periods.map((p) => {
                  const isSelected = p.monthKey === activePeriod.monthKey;
                  return (
                    <button
                      key={p.monthKey}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      class={`bk-month-pill status-${p.status} ${isSelected ? 'is-selected' : ''}`}
                      onClick={() =>
                        controller.setActiveBookkeepingMonth(
                          activeClient.clientId,
                          p.monthKey
                        )
                      }
                    >
                      <span>{p.shortLabel}</span>
                      <span class={`bk-month-dot is-${p.status}`} />
                    </button>
                  );
                })}
              </div>

              <div class="bk-period-bar">
                <div class="bk-period-left">
                  <strong class="bk-period-title">{activePeriod.fullLabel}</strong>
                  <span class={`bk-status-tag is-${activePeriod.status}`}>
                    {activePeriod.status === 'closed'
                      ? 'Closed'
                      : activePeriod.status === 'in-progress'
                        ? 'In Progress'
                        : 'Upcoming'}
                  </span>
                  <span class="bk-period-stat">
                    {doneTasks}/{totalTasks} tasks
                  </span>
                  {activePeriod.status !== 'upcoming' && (
                    <span class="bk-period-stat">
                      Bank {activePeriod.bankMatchPct}% matched
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  class={
                    activePeriod.status === 'closed'
                      ? 'ghost-pill'
                      : 'primary-action-pill is-sm'
                  }
                  onClick={() =>
                    controller.toggleBookkeepingMonthLock(
                      activeClient.clientId,
                      activePeriod.monthKey
                    )
                  }
                >
                  {activePeriod.status === 'closed'
                    ? 'Reopen month'
                    : `Close ${activePeriod.shortLabel} books`}
                </button>
              </div>

              <div class="conn-list-box">
                {activePeriod.tasks.map((task) => {
                  const owner = memberMap.get(task.ownerId);
                  return (
                    <div key={task.id} class="bk-task-row">
                      <label class="bk-task-check-label">
                        <input
                          type="checkbox"
                          class="bk-checkbox"
                          checked={task.done}
                          onChange={() =>
                            controller.toggleBookkeepingTask(
                              activeClient.clientId,
                              activePeriod.monthKey,
                              task.id
                            )
                          }
                        />
                        <span class={`bk-task-title ${task.done ? 'is-done' : ''}`}>
                          {task.title}
                        </span>
                      </label>

                      <div class="bk-task-right">
                        <span class="bk-task-metric">{task.metric}</span>
                        {owner && (
                          <span class="bk-task-owner">{owner.fullName}</span>
                        )}
                        {task.pluginRoute && (
                          <button
                            type="button"
                            class="client-open-btn"
                            onClick={() =>
                              onOpenWorkpaper({ pluginRoute: task.pluginRoute })
                            }
                          >
                            Workpaper ↗
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div class="clients-groups-stack">
              {activeClient.engagements.map((eng) => {
                const isExpanded = openEngId === eng.id;
                const completedSteps = eng.tasks.filter((t) => t.done).length;

                return (
                  <section key={eng.id} class="client-group-card">
                    <button
                      type="button"
                      class="eng-accordion-header"
                      aria-expanded={isExpanded}
                      onClick={() =>
                        setExpandedEngId(isExpanded ? '__none__' : eng.id)
                      }
                    >
                      <div class="eng-header-left">
                        <span class="eng-caret">{isExpanded ? '▾' : '▸'}</span>
                        <span class="client-group-name">{eng.deliverable}</span>
                        <span class="client-meta-pill">{eng.practice}</span>
                      </div>

                      <div class="eng-header-right">
                        <span class="client-owner-name">{eng.ownerName}</span>
                        <span class={`client-due-tag ${eng.atRisk ? 'is-urgent' : ''}`}>
                          {eng.dueDateLabel}
                        </span>
                        <div class="client-progress-inline is-sm">
                          <div class="client-progress-track">
                            <span
                              class="client-progress-fill"
                              style={{ width: `${eng.progressPct}%` }}
                            />
                          </div>
                          <span class="client-progress-pct">{eng.progressPct}%</span>
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div class="eng-detail-body">
                        <div class="eng-detail-controls">
                          <span class="bk-period-stat">
                            {completedSteps}/{eng.tasks.length} steps complete
                          </span>

                          <div class="stage-subbar-group">
                            <select
                              class="client-stage-select"
                              aria-label={`Stage for ${eng.deliverable}`}
                              value={eng.stage}
                              onChange={(e) =>
                                controller.updateEngagementStage(
                                  eng.id,
                                  (e.currentTarget as HTMLSelectElement)
                                    .value as EngagementStage
                                )
                              }
                            >
                              {STAGES.map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>

                            {eng.pluginRoute && (
                              <button
                                type="button"
                                class="primary-action-pill is-sm"
                                onClick={() =>
                                  onOpenWorkpaper({
                                    pluginRoute: eng.pluginRoute,
                                    anchor: eng.anchor,
                                  })
                                }
                              >
                                Open workpaper ↗
                              </button>
                            )}
                          </div>
                        </div>

                        <div class="eng-checklist-list">
                          {eng.tasks.map((step) => (
                            <div key={step.id} class="bk-task-row">
                              <label class="bk-task-check-label">
                                <input
                                  type="checkbox"
                                  class="bk-checkbox"
                                  checked={step.done}
                                  onChange={() =>
                                    controller.toggleEngagementTask(eng.id, step.id)
                                  }
                                />
                                <span class={`bk-task-title ${step.done ? 'is-done' : ''}`}>
                                  {step.title}
                                </span>
                              </label>

                              {step.pluginRoute && (
                                <button
                                  type="button"
                                  class="client-open-btn"
                                  onClick={() =>
                                    onOpenWorkpaper({
                                      pluginRoute: step.pluginRoute,
                                      anchor: step.anchor,
                                    })
                                  }
                                >
                                  Open ↗
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  const q = query.trim().toLowerCase();
  const visibleGroups = allGroups.filter((group) => {
    const isComplete =
      group.completedCount === group.totalCount &&
      group.currentMonthStatus === 'closed';
    if (filter === 'active' && isComplete) return false;
    if (filter === 'complete' && !isComplete) return false;
    if (
      q &&
      !group.clientName.toLowerCase().includes(q) &&
      !group.ledger.toLowerCase().includes(q) &&
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
            All ({allGroups.length})
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
            Closed
          </button>
        </nav>

        <div class="conn-list-box">
          {visibleGroups.map((client) => (
            <button
              key={client.clientId}
              type="button"
              class="client-directory-row"
              onClick={() => onSelectClient(client.clientId)}
            >
              <div class="client-dir-left">
                <span class="client-dir-name">{client.clientName}</span>
                <span class="client-meta-pill">{client.ledger}</span>
              </div>

              <div class="client-dir-right">
                <span class={`bk-status-tag is-${client.currentMonthStatus}`}>
                  {client.currentMonthStatus === 'closed'
                    ? 'Nov Closed'
                    : `Nov · ${client.currentMonthProgressPct}%`}
                </span>

                <span class="client-dir-eng-count">
                  {client.totalCount} {client.totalCount === 1 ? 'engagement' : 'engagements'}
                </span>

                <div class="client-progress-inline is-sm">
                  <div class="client-progress-track">
                    <span
                      class="client-progress-fill"
                      style={{ width: `${client.averageProgressPct}%` }}
                    />
                  </div>
                  <span class="client-progress-pct">{client.averageProgressPct}%</span>
                </div>

                <span class="client-dir-chevron" aria-hidden="true">
                  ›
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
