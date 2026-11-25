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
  'Intake',
  'Fieldwork',
  'Review',
  'Sign-Off',
  'Complete',
];

const AUTHORITIES: ReadonlyArray<SigningAuthority> = [
  'Partner',
  'Director',
  'Manager',
  'Senior',
  'Associate',
];

type AdminTab = 'engagements' | 'people';

interface FirmAdminPageProps {
  readonly controller?: FirmAdminController;
  readonly onOpenClientEngagement?: (clientId: string, engagementId: string) => void;
  readonly onOpenWorkpaper: (target: DeepLinkTarget) => void;
}

export function FirmAdminPage({
  controller = defaultFirmAdmin,
  onOpenClientEngagement,
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
    department: PracticeLine;
    authority: SigningAuthority;
  }>({
    fullName: '',
    email: '',
    department: 'Audit',
    authority: 'Senior',
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

  const openEngagements = state.engagements.filter((e) => e.stage !== 'Complete');
  const signOffQueueCount = state.engagements.filter((e) => e.stage === 'Sign-Off').length;
  const avgUtil = state.members.length
    ? Math.round(
        state.members.reduce((sum, m) => sum + m.utilizationPct, 0) / state.members.length
      )
    : 0;
  const totalWorkpapers = state.members.reduce((sum, m) => sum + m.workpapersCompleted, 0);

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
      department: 'Audit',
      authority: 'Senior',
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
          <h1 class="hero-title">Firm Admin</h1>

          <div class="admin-dept-pills" role="group" aria-label="Filter practice line">
            {(['All', 'Bookkeeping', 'Audit', 'Tax'] as const).map((dept) => (
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
          </div>

          <div class="admin-pulse-card">
            <span class="admin-pulse-label">Awaiting Sign-Off</span>
            <strong class="admin-pulse-value">{signOffQueueCount}</strong>
          </div>

          <div class="admin-pulse-card">
            <span class="admin-pulse-label">Utilization</span>
            <strong class="admin-pulse-value">{avgUtil}%</strong>
          </div>

          <div class="admin-pulse-card">
            <span class="admin-pulse-label">Workpapers</span>
            <strong class="admin-pulse-value">{totalWorkpapers}</strong>
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
              Engagements ({filteredEngagements.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'people'}
              class={`conn-tab-btn ${tab === 'people' ? 'is-active' : ''}`}
              onClick={() => setTab('people')}
            >
              People ({filteredMembers.length})
            </button>
          </nav>

          {tab === 'engagements' ? (
            <button
              type="button"
              class="primary-action-pill is-sm"
              onClick={() => setShowAddEngagement((v) => !v)}
            >
              {showAddEngagement ? 'Cancel' : '+ Assign engagement'}
            </button>
          ) : (
            <button
              type="button"
              class="primary-action-pill is-sm"
              onClick={() => setShowAddMember((v) => !v)}
            >
              {showAddMember ? 'Cancel' : '+ Add member'}
            </button>
          )}
        </div>

        {tab === 'engagements' ? (
          <>
            {showAddEngagement && (
              <form class="admin-inline-form" onSubmit={submitNewEngagement}>
                <input
                  type="text"
                  class="profile-input"
                  placeholder="Client"
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
                  placeholder="Deliverable"
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
                  <option value="Bookkeeping">Bookkeeping</option>
                  <option value="Audit">Audit</option>
                  <option value="Tax">Tax</option>
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
                  placeholder="Due"
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
                    <th>Client</th>
                    <th>Deliverable</th>
                    <th>Line</th>
                    <th>Progress</th>
                    <th>Owner</th>
                    <th>Stage</th>
                    <th class="is-right">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEngagements.map((eng) => (
                    <tr key={eng.id}>
                      <td>
                        <button
                          type="button"
                          class="admin-client-jump-btn"
                          onClick={() =>
                            onOpenClientEngagement?.(eng.clientId, eng.id)
                          }
                        >
                          {eng.clientName}
                        </button>
                      </td>
                      <td>
                        <div class="admin-deliverable-cell">
                          <button
                            type="button"
                            class="admin-client-jump-btn is-normal"
                            onClick={() =>
                              onOpenClientEngagement?.(eng.clientId, eng.id)
                            }
                          >
                            {eng.deliverable}
                          </button>
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
                      <td>
                        <div class="admin-util-wrap">
                          <div class="admin-util-track">
                            <span
                              class="admin-util-fill"
                              style={{ width: `${eng.progressPct}%` }}
                            />
                          </div>
                          <span class="admin-util-num">{eng.progressPct}%</span>
                        </div>
                      </td>
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
                              {m.fullName}
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
        ) : (
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
                  placeholder="Email"
                  value={newMember.email}
                  onInput={(e) =>
                    setNewMember((p) => ({
                      ...p,
                      email: (e.currentTarget as HTMLInputElement).value,
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
                  <option value="Bookkeeping">Bookkeeping</option>
                  <option value="Audit">Audit</option>
                  <option value="Tax">Tax</option>
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
                    <th>Name</th>
                    <th>Line</th>
                    <th>Role</th>
                    <th>Engagements</th>
                    <th>Workpapers</th>
                    <th>Capacity</th>
                    <th class="is-right" />
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((member) => {
                    const activeCount = state.engagements.filter(
                      (e) => e.ownerId === member.id && e.stage !== 'Complete'
                    ).length;

                    return (
                      <tr key={member.id}>
                        <td>
                          <div class="admin-member-cell">
                            <span class="sidebar-avatar-sm">{member.initials}</span>
                            <span class="admin-cell-primary">{member.fullName}</span>
                          </div>
                        </td>
                        <td>
                          <span class="admin-dept-badge">{member.department}</span>
                        </td>
                        <td>
                          <select
                            class="admin-inline-select"
                            aria-label={`Role for ${member.fullName}`}
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
                        <td class="admin-mono-muted">{activeCount}</td>
                        <td class="admin-mono-muted">{member.workpapersCompleted}</td>
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
      </div>
    </div>
  );
}
