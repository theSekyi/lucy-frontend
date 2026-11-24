import { useEffect, useState } from 'preact/hooks';
import {
  defaultFirmAdmin,
  type EngagementStage,
  type FirmAdminController,
  type FirmAdminState,
  type PracticeLine,
  type SigningAuthority,
} from '../../core/admin';
import type { DeepLinkTarget } from '../inbox/MailIntelligencePanel';
import './admin.css';

const STAGES: ReadonlyArray<EngagementStage> = [
  'PBC & Intake',
  'Fieldwork',
  'Manager Review',
  'Partner Sign-Off',
  'Filed / Complete',
];

const AUTHORITIES: ReadonlyArray<SigningAuthority> = [
  'Partner · ERP & HMRC Sign-Off',
  'Director · EQCR & Tax Filing',
  'Manager · Workpaper Review',
  'Senior · Preparer',
  'Associate · Preparer',
];

type AdminTab = 'engagements' | 'people' | 'activity';

interface FirmAdminPageProps {
  readonly controller?: FirmAdminController;
  readonly onOpenWorkpaper: (target: DeepLinkTarget) => void;
}

export function FirmAdminPage({
  controller = defaultFirmAdmin,
  onOpenWorkpaper,
}: FirmAdminPageProps) {
  const [state, setState] = useState<FirmAdminState>(() => controller.getState());
  const [tab, setTab] = useState<AdminTab>('engagements');
  const [practiceFilter, setPracticeFilter] = useState<'All' | PracticeLine>('All');
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddEngagement, setShowAddEngagement] = useState(false);

  const [newMember, setNewMember] = useState<{
    fullName: string;
    email: string;
    title: string;
    department: PracticeLine;
    authority: SigningAuthority;
  }>({
    fullName: '',
    email: '',
    title: '',
    department: 'Audit',
    authority: 'Senior · Preparer',
  });

  const [newEng, setNewEng] = useState<{
    clientName: string;
    deliverable: string;
    practice: PracticeLine;
    ownerId: string;
    dueDateLabel: string;
  }>({
    clientName: '',
    deliverable: '',
    practice: 'Audit',
    ownerId: state.members[0]?.id ?? '',
    dueDateLabel: '12 Dec',
  });

  useEffect(() => controller.subscribe(setState), [controller]);

  const openEngagements = state.engagements.filter((e) => e.stage !== 'Filed / Complete');
  const signOffQueueCount = state.engagements.filter(
    (e) => e.stage === 'Partner Sign-Off'
  ).length;
  const atRiskCount = openEngagements.filter((e) => e.atRisk).length;
  const avgUtil = state.members.length
    ? Math.round(
        state.members.reduce((sum, m) => sum + m.utilizationPct, 0) / state.members.length
      )
    : 0;
  const totalWorkpapers = state.members.reduce((sum, m) => sum + m.workpapersCompleted, 0);
  const totalAjes = state.members.reduce((sum, m) => sum + m.ajesStaged, 0);

  const filteredEngagements = state.engagements.filter(
    (e) => practiceFilter === 'All' || e.practice === practiceFilter
  );
  const filteredMembers = state.members.filter(
    (m) => practiceFilter === 'All' || m.department === practiceFilter
  );

  function submitNewMember(e: Event) {
    e.preventDefault();
    const created = controller.addMember(newMember);
    if (!created) return;
    setNewMember({
      fullName: '',
      email: '',
      title: '',
      department: 'Audit',
      authority: 'Senior · Preparer',
    });
    setShowAddMember(false);
  }

  function submitNewEngagement(e: Event) {
    e.preventDefault();
    const created = controller.addEngagement(newEng);
    if (!created) return;
    setNewEng({
      clientName: '',
      deliverable: '',
      practice: 'Audit',
      ownerId: state.members[0]?.id ?? '',
      dueDateLabel: '15 Dec',
    });
    setShowAddEngagement(false);
  }

  return (
    <div class="launchpad-scroll">
      <div class="admin-shell">
        <header class="admin-top-header">
          <div>
            <h1 class="hero-title">Firm Admin</h1>
            <p class="admin-subtitle">
              {state.firmName} · {state.periodLabel}
            </p>
          </div>

          <div class="admin-dept-pills" role="group" aria-label="Filter practice line">
            {(['All', 'Audit', 'Tax', 'CAS'] as const).map((dept) => (
              <button
                key={dept}
                type="button"
                class={`conn-tab-btn ${practiceFilter === dept ? 'is-active' : ''}`}
                onClick={() => setPracticeFilter(dept)}
              >
                {dept}
              </button>
            ))}
          </div>
        </header>

        <section class="admin-pulse-grid" aria-label="Firm metrics">
          <div class="admin-pulse-card">
            <span class="admin-pulse-label">Active Engagements</span>
            <strong class="admin-pulse-value">{openEngagements.length}</strong>
            <span class="admin-pulse-sub">
              {atRiskCount > 0 ? `${atRiskCount} statutory due < 5d` : 'All on schedule'}
            </span>
          </div>

          <div class="admin-pulse-card">
            <span class="admin-pulse-label">Partner Sign-Off Queue</span>
            <strong class="admin-pulse-value">{signOffQueueCount}</strong>
            <span class="admin-pulse-sub">Awaiting ERP / HMRC release</span>
          </div>

          <div class="admin-pulse-card">
            <span class="admin-pulse-label">Team Utilization</span>
            <strong class="admin-pulse-value">{avgUtil}%</strong>
            <span class="admin-pulse-sub">{state.members.length} staff across 3 lines</span>
          </div>

          <div class="admin-pulse-card">
            <span class="admin-pulse-label">Completed via Lucy</span>
            <strong class="admin-pulse-value">{totalWorkpapers}</strong>
            <span class="admin-pulse-sub">
              workpapers · {totalAjes} balanced AJEs
            </span>
          </div>
        </section>

        <div class="admin-subnav-row">
          <nav class="connectors-tab-strip is-flush" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'engagements'}
              class={`conn-tab-btn ${tab === 'engagements' ? 'is-active' : ''}`}
              onClick={() => setTab('engagements')}
            >
              Work & Engagements ({filteredEngagements.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'people'}
              class={`conn-tab-btn ${tab === 'people' ? 'is-active' : ''}`}
              onClick={() => setTab('people')}
            >
              People & Access ({filteredMembers.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'activity'}
              class={`conn-tab-btn ${tab === 'activity' ? 'is-active' : ''}`}
              onClick={() => setTab('activity')}
            >
              Activity & Controls
            </button>
          </nav>

          {tab === 'engagements' && (
            <button
              type="button"
              class="primary-action-pill is-sm"
              onClick={() => setShowAddEngagement((v) => !v)}
            >
              {showAddEngagement ? 'Cancel' : '+ Assign engagement'}
            </button>
          )}

          {tab === 'people' && (
            <button
              type="button"
              class="primary-action-pill is-sm"
              onClick={() => setShowAddMember((v) => !v)}
            >
              {showAddMember ? 'Cancel' : '+ Add member'}
            </button>
          )}
        </div>

        {tab === 'engagements' && (
          <>
            {showAddEngagement && (
              <form class="admin-inline-form" onSubmit={submitNewEngagement}>
                <input
                  type="text"
                  class="profile-input"
                  placeholder="Client (e.g. Meridian Partners)"
                  value={newEng.clientName}
                  onInput={(e) =>
                    setNewEng((p) => ({
                      ...p,
                      clientName: (e.currentTarget as HTMLInputElement).value,
                    }))
                  }
                />
                <input
                  type="text"
                  class="profile-input"
                  placeholder="Deliverable (e.g. FY26 1065 & K-1 Bridge)"
                  value={newEng.deliverable}
                  onInput={(e) =>
                    setNewEng((p) => ({
                      ...p,
                      deliverable: (e.currentTarget as HTMLInputElement).value,
                    }))
                  }
                />
                <select
                  class="profile-input"
                  value={newEng.practice}
                  onChange={(e) =>
                    setNewEng((p) => ({
                      ...p,
                      practice: (e.currentTarget as HTMLSelectElement).value as PracticeLine,
                    }))
                  }
                >
                  <option value="Audit">Audit</option>
                  <option value="Tax">Tax</option>
                  <option value="CAS">CAS</option>
                </select>
                <select
                  class="profile-input"
                  value={newEng.ownerId}
                  onChange={(e) =>
                    setNewEng((p) => ({
                      ...p,
                      ownerId: (e.currentTarget as HTMLSelectElement).value,
                    }))
                  }
                >
                  {state.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  class="profile-input"
                  placeholder="Due (e.g. 12 Dec)"
                  value={newEng.dueDateLabel}
                  onInput={(e) =>
                    setNewEng((p) => ({
                      ...p,
                      dueDateLabel: (e.currentTarget as HTMLInputElement).value,
                    }))
                  }
                />
                <button type="submit" class="primary-action-pill is-sm">
                  Create
                </button>
              </form>
            )}

            <div class="admin-table-box">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>Client & Deliverable</th>
                    <th>Line</th>
                    <th>Work Completed</th>
                    <th>Assigned Owner</th>
                    <th>Stage</th>
                    <th class="is-right">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEngagements.map((eng) => (
                    <tr key={eng.id}>
                      <td>
                        <div class="admin-cell-primary">{eng.clientName}</div>
                        <div class="admin-cell-sub-row">
                          <span>{eng.deliverable}</span>
                          {eng.pluginRoute && (
                            <button
                              type="button"
                              class="admin-workpaper-link"
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
                      </td>
                      <td>
                        <span class="admin-dept-badge">{eng.practice}</span>
                      </td>
                      <td class="admin-progress-cell">{eng.lucyProgress}</td>
                      <td>
                        <select
                          class="admin-inline-select"
                          aria-label={`Owner for ${eng.deliverable}`}
                          value={eng.ownerId}
                          onChange={(e) =>
                            controller.reassignEngagement(
                              eng.id,
                              (e.currentTarget as HTMLSelectElement).value
                            )
                          }
                        >
                          {state.members.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.fullName} ({m.utilizationPct}%)
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          class="admin-inline-select"
                          aria-label={`Stage for ${eng.deliverable}`}
                          value={eng.stage}
                          onChange={(e) =>
                            controller.updateEngagementStage(
                              eng.id,
                              (e.currentTarget as HTMLSelectElement).value as EngagementStage
                            )
                          }
                        >
                          {STAGES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td class="is-right">
                        <span class={`admin-due-label ${eng.atRisk ? 'is-urgent' : ''}`}>
                          {eng.dueDateLabel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'people' && (
          <>
            {showAddMember && (
              <form class="admin-inline-form" onSubmit={submitNewMember}>
                <input
                  type="text"
                  class="profile-input"
                  placeholder="Full name"
                  value={newMember.fullName}
                  onInput={(e) =>
                    setNewMember((p) => ({
                      ...p,
                      fullName: (e.currentTarget as HTMLInputElement).value,
                    }))
                  }
                />
                <input
                  type="email"
                  class="profile-input"
                  placeholder="Work email"
                  value={newMember.email}
                  onInput={(e) =>
                    setNewMember((p) => ({
                      ...p,
                      email: (e.currentTarget as HTMLInputElement).value,
                    }))
                  }
                />
                <input
                  type="text"
                  class="profile-input"
                  placeholder="Role title (e.g. Tax Senior)"
                  value={newMember.title}
                  onInput={(e) =>
                    setNewMember((p) => ({
                      ...p,
                      title: (e.currentTarget as HTMLInputElement).value,
                    }))
                  }
                />
                <select
                  class="profile-input"
                  value={newMember.department}
                  onChange={(e) =>
                    setNewMember((p) => ({
                      ...p,
                      department: (e.currentTarget as HTMLSelectElement).value as PracticeLine,
                    }))
                  }
                >
                  <option value="Audit">Audit</option>
                  <option value="Tax">Tax</option>
                  <option value="CAS">CAS</option>
                </select>
                <select
                  class="profile-input"
                  value={newMember.authority}
                  onChange={(e) =>
                    setNewMember((p) => ({
                      ...p,
                      authority: (e.currentTarget as HTMLSelectElement).value as SigningAuthority,
                    }))
                  }
                >
                  {AUTHORITIES.map((auth) => (
                    <option key={auth} value={auth}>
                      {auth}
                    </option>
                  ))}
                </select>
                <button type="submit" class="primary-action-pill is-sm">
                  Add
                </button>
              </form>
            )}

            <div class="admin-table-box">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Line</th>
                    <th>Signing Authority</th>
                    <th>Output & Load</th>
                    <th>Capacity</th>
                    <th class="is-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((member) => {
                    const activeCount = state.engagements.filter(
                      (e) => e.ownerId === member.id && e.stage !== 'Filed / Complete'
                    ).length;

                    return (
                      <tr key={member.id}>
                        <td>
                          <div class="admin-member-cell">
                            <span class="sidebar-avatar-sm">{member.initials}</span>
                            <div>
                              <div class="admin-cell-primary">{member.fullName}</div>
                              <div class="admin-cell-muted">
                                {member.title} · {member.lastActiveLabel}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span class="admin-dept-badge">{member.department}</span>
                        </td>
                        <td>
                          <select
                            class="admin-inline-select"
                            aria-label={`Authority for ${member.fullName}`}
                            value={member.authority}
                            onChange={(e) =>
                              controller.updateMemberAuthority(
                                member.id,
                                (e.currentTarget as HTMLSelectElement).value as SigningAuthority
                              )
                            }
                          >
                            {AUTHORITIES.map((auth) => (
                              <option key={auth} value={auth}>
                                {auth}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td class="admin-progress-cell">
                          {activeCount} open · {member.workpapersCompleted} WPs · {member.ajesStaged} AJEs
                        </td>
                        <td>
                          <div class="admin-util-wrap">
                            <div class="admin-util-track">
                              <span
                                class={`admin-util-fill ${member.utilizationPct >= 92 ? 'is-high' : ''}`}
                                style={{ width: `${Math.min(100, member.utilizationPct)}%` }}
                              />
                            </div>
                            <span class="admin-util-num">{member.utilizationPct}%</span>
                          </div>
                        </td>
                        <td class="is-right">
                          <button
                            type="button"
                            class="admin-remove-btn"
                            disabled={state.members.length <= 1}
                            onClick={() => controller.removeMember(member.id)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'activity' && (
          <div class="admin-activity-stack">
            <section>
              <h2 class="conn-group-label">Firm Governance Guardrails</h2>
              <div class="conn-list-box">
                {state.policies.map((pol) => (
                  <div key={pol.id} class="conn-row is-tall">
                    <div class="admin-policy-text">
                      <span class="conn-row-name">{pol.label}</span>
                      <span class="admin-cell-muted">{pol.detail}</span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={pol.enabled}
                      aria-label={pol.label}
                      class={`conn-switch ${pol.enabled ? 'is-on' : ''}`}
                      onClick={() => controller.togglePolicy(pol.id)}
                    >
                      <span class="conn-switch-thumb" />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 class="conn-group-label">Firm-Wide Workpaper & Filing Log</h2>
              <div class="admin-table-box">
                <table class="admin-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Member</th>
                      <th>Client</th>
                      <th>Action</th>
                      <th class="is-right">Artifact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.auditLog.map((entry) => (
                      <tr key={entry.id}>
                        <td class="admin-mono-muted">{entry.timestamp}</td>
                        <td class="admin-cell-primary">{entry.actorName}</td>
                        <td>{entry.clientName}</td>
                        <td class="admin-progress-cell">{entry.actionSummary}</td>
                        <td class="is-right">
                          {entry.pluginRoute ? (
                            <button
                              type="button"
                              class="admin-workpaper-link"
                              onClick={() =>
                                onOpenWorkpaper({
                                  pluginRoute: entry.pluginRoute,
                                  anchor: entry.anchor,
                                })
                              }
                            >
                              {entry.sourceLabel} ↗
                            </button>
                          ) : (
                            <span class="admin-cell-muted">{entry.sourceLabel}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
