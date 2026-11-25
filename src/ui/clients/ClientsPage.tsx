import { useEffect, useRef, useState } from 'preact/hooks';
import {
  defaultFirmAdmin,
  evaluateMonthCloseGuard,
  formatSignOffStamp,
  selectClientEngagementGroups,
  type EngagementStage,
  type FirmAdminController,
  type FirmAdminState,
  type SigningAuthority,
} from '../../core/admin';
import type { UserProfile, WorkspaceNotification } from '../../core/types';
import type { DeepLinkTarget } from '../inbox/MailIntelligencePanel';
import { SelectMenu, type SelectMenuOption } from '../primitives/SelectMenu';
import './clients.css';

const STAGE_OPTIONS: ReadonlyArray<SelectMenuOption<EngagementStage>> = [
  { value: 'Intake', label: 'Intake' },
  { value: 'Fieldwork', label: 'Fieldwork' },
  { value: 'Review', label: 'Review' },
  { value: 'Sign-Off', label: 'Sign-Off' },
  { value: 'Complete', label: 'Complete' },
];

function inferAuthorityFromRole(role: string): SigningAuthority {
  if (/partner/i.test(role)) return 'Partner';
  if (/director/i.test(role)) return 'Director';
  if (/manager/i.test(role)) return 'Manager';
  if (/senior/i.test(role)) return 'Senior';
  return 'Associate';
}

interface ClientsPageProps {
  readonly controller?: FirmAdminController;
  readonly selectedClientId: string | null;
  readonly selectedEngagementId: string | null;
  readonly currentUser?: UserProfile;
  readonly onNotify?: (
    input: Omit<WorkspaceNotification, 'id' | 'createdAtIso'>
  ) => void;
  readonly onSelectClient: (clientId: string | null, engagementId?: string | null) => void;
  readonly onOpenWorkpaper: (target: DeepLinkTarget) => void;
  readonly onClientCountChange?: (count: number) => void;
}

export function ClientsPage({
  controller = defaultFirmAdmin,
  selectedClientId,
  selectedEngagementId,
  currentUser,
  onNotify,
  onSelectClient,
  onOpenWorkpaper,
  onClientCountChange,
}: ClientsPageProps) {
  const [state, setState] = useState<FirmAdminState>(() => controller.getState());
  const [filter, setFilter] = useState<'all' | 'active' | 'complete'>('all');
  const [query, setQuery] = useState('');
  const [detailTab, setDetailTab] = useState<'bookkeeping' | 'engagements'>('bookkeeping');
  const [expandedEngId, setExpandedEngId] = useState<string | null>(selectedEngagementId);

  const countRef = useRef(onClientCountChange);
  countRef.current = onClientCountChange;

  useEffect(() => controller.subscribe(setState), [controller]);

  useEffect(() => {
    countRef.current?.(state.clients.length);
  }, [state.clients.length]);

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
    const closeGuard = evaluateMonthCloseGuard(activePeriod);
    const isClosed = activePeriod.status === 'closed';
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
              <span class="client-meta-pill">{activeClient.jurisdiction} · {activeClient.currency}</span>
              <span class="client-meta-pill">{activeClient.ledger}</span>
              <span class="client-meta-pill" title="Financial year-end">
                Year-end {activeClient.yearEnd}
              </span>
            </div>
          </div>

          <header class="client-detail-header">
            <h1 class="hero-title">{activeClient.clientName}</h1>

            <div
              class="client-progress-inline"
              title="Average engagement completion across statutory deliverables"
            >
              <span class="sheet-meta-count">Engagements</span>
              <div class="client-progress-track">
                <span
                  class="client-progress-fill"
                  style={{ width: `${activeClient.averageProgressPct}%` }}
                />
              </div>
              <span class="client-progress-pct">{activeClient.averageProgressPct}%</span>
            </div>
          </header>

          <nav class="connectors-tab-strip" role="tablist" aria-label="Client views">
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
                    {isClosed
                      ? 'Closed'
                      : activePeriod.status === 'in-progress'
                        ? 'In progress'
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
                  {isClosed && activePeriod.closedBy && (
                    <span class="bk-period-stat">
                      {formatSignOffStamp(activePeriod.closedBy, activePeriod.closedAtIso)}
                    </span>
                  )}
                </div>

                <div class="stage-subbar-group">
                  {!isClosed && !closeGuard.ok && closeGuard.reason && (
                    <span class="guard-reason-hint">{closeGuard.reason}</span>
                  )}
                  <button
                    type="button"
                    class={isClosed ? 'ghost-pill' : 'primary-action-pill is-sm'}
                    disabled={!isClosed && !closeGuard.ok}
                    onClick={() => {
                      const result = controller.toggleBookkeepingMonthLock(
                        activeClient.clientId,
                        activePeriod.monthKey,
                        {
                          actorName: currentUser?.fullName ?? 'Elena Carter',
                          requireTasksComplete: !isClosed,
                        }
                      );
                      if (!result.ok && result.reason) {
                        onNotify?.({ kind: 'warning', message: result.reason });
                      } else {
                        onNotify?.({
                          kind: 'success',
                          message: isClosed
                            ? `Reopened ${activePeriod.fullLabel} books for ${activeClient.clientName}.`
                            : `Closed and locked ${activePeriod.fullLabel} books for ${activeClient.clientName}.`,
                        });
                      }
                    }}
                  >
                    {isClosed
                      ? 'Reopen month'
                      : `Close ${activePeriod.shortLabel} books`}
                  </button>
                </div>
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
                        {(task.workpaperId || task.pluginRoute) && (
                          <button
                            type="button"
                            class="client-open-btn"
                            onClick={() =>
                              onOpenWorkpaper({
                                workpaperId: task.workpaperId,
                                pluginRoute: task.pluginRoute,
                              })
                            }
                          >
                            Workpaper →
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
                const signStamp = formatSignOffStamp(eng.signedOffBy, eng.signedOffAtIso);

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
                          <div class="stage-subbar-group">
                            <span class="bk-period-stat">
                              {completedSteps}/{eng.tasks.length} steps complete
                            </span>
                            {signStamp && (
                              <span class="bk-period-stat">{signStamp}</span>
                            )}
                          </div>

                          <div class="stage-subbar-group">
                            <SelectMenu
                              size="sm"
                              align="right"
                              ariaLabel={`Stage for ${eng.deliverable}`}
                              value={eng.stage}
                              options={STAGE_OPTIONS}
                              onChange={(nextStage) => {
                                const res = controller.updateEngagementStage(
                                  eng.id,
                                  nextStage,
                                  currentUser
                                    ? {
                                        fullName: currentUser.fullName,
                                        authority: inferAuthorityFromRole(currentUser.role),
                                      }
                                    : undefined
                                );
                                if (!res.ok && res.reason) {
                                  onNotify?.({ kind: 'warning', message: res.reason });
                                } else {
                                  onNotify?.({
                                    kind: 'success',
                                    message: `Updated "${eng.deliverable}" to ${nextStage}.`,
                                  });
                                }
                              }}
                            />

                            {(eng.workpaperId || eng.pluginRoute) && (
                              <button
                                type="button"
                                class="primary-action-pill is-sm"
                                onClick={() =>
                                  onOpenWorkpaper({
                                    workpaperId: eng.workpaperId,
                                    pluginRoute: eng.pluginRoute,
                                    anchor: eng.anchor,
                                  })
                                }
                              >
                                Open workpaper →
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

                              {(step.workpaperId || step.pluginRoute) && (
                                <button
                                  type="button"
                                  class="client-open-btn"
                                  onClick={() =>
                                    onOpenWorkpaper({
                                      workpaperId: step.workpaperId,
                                      pluginRoute: step.pluginRoute,
                                      anchor: step.anchor,
                                    })
                                  }
                                >
                                  Open →
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
            aria-label="Search clients"
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

        {visibleGroups.length === 0 ? (
          <div class="dashboard-empty-box">
            <span>
              {q
                ? `No clients match “${query}”.`
                : filter === 'complete'
                  ? 'No clients have closed both monthly books and all statutory engagements yet.'
                  : 'No clients match this filter.'}
            </span>
            {(q || filter !== 'all') && (
              <button
                type="button"
                class="ghost-pill"
                onClick={() => {
                  setQuery('');
                  setFilter('all');
                }}
              >
                Show all clients
              </button>
            )}
          </div>
        ) : (
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
                  <span class="client-meta-pill">{client.currency}</span>
                </div>

                <div class="client-dir-right">
                  <span
                    class={`bk-status-tag is-${client.currentMonthStatus}`}
                    title="November monthly bookkeeping close progress"
                  >
                    {client.currentMonthStatus === 'closed'
                      ? 'Nov closed'
                      : `Nov close · ${client.currentMonthProgressPct}%`}
                  </span>

                  <span class="client-dir-eng-count">
                    {client.totalCount} {client.totalCount === 1 ? 'engagement' : 'engagements'}
                  </span>

                  <div
                    class="client-progress-inline is-sm"
                    title="Overall statutory engagement completion"
                  >
                    <div class="client-progress-track">
                      <span
                        class="client-progress-fill"
                        style={{ width: `${client.averageProgressPct}%` }}
                      />
                    </div>
                    <span class="client-progress-pct">
                      Overall {client.averageProgressPct}%
                    </span>
                  </div>

                  <span class="client-dir-chevron" aria-hidden="true">
                    →
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
