import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  defaultFirmAdmin,
  type EngagementStage,
  type FirmAdminController,
  type FirmAdminState,
  type PracticeLine,
  type SigningAuthority,
} from '../../core/admin';
import type { UserProfile, WorkspaceNotification } from '../../core/types';
import type { DeepLinkTarget } from '../inbox/MailIntelligencePanel';
import { SelectMenu, type SelectMenuOption } from '../primitives/SelectMenu';
import './admin.css';

const STAGE_OPTIONS: ReadonlyArray<SelectMenuOption<EngagementStage>> = [
  { value: 'Intake', label: 'Intake' },
  { value: 'Fieldwork', label: 'Fieldwork' },
  { value: 'Review', label: 'Review' },
  { value: 'Sign-Off', label: 'Sign-Off' },
  { value: 'Complete', label: 'Complete' },
];

const PRACTICE_OPTIONS: ReadonlyArray<SelectMenuOption<PracticeLine>> = [
  { value: 'Bookkeeping', label: 'Bookkeeping' },
  { value: 'Audit', label: 'Audit' },
  { value: 'Tax', label: 'Tax' },
];

const AUTHORITY_OPTIONS: ReadonlyArray<SelectMenuOption<SigningAuthority>> = [
  { value: 'Partner', label: 'Partner' },
  { value: 'Director', label: 'Director' },
  { value: 'Manager', label: 'Manager' },
  { value: 'Senior', label: 'Senior' },
  { value: 'Associate', label: 'Associate' },
];

type AdminTab = 'engagements' | 'people';

function inferAuthorityFromRole(role: string): SigningAuthority {
  if (/partner/i.test(role)) return 'Partner';
  if (/director/i.test(role)) return 'Director';
  if (/manager/i.test(role)) return 'Manager';
  if (/senior/i.test(role)) return 'Senior';
  return 'Associate';
}

interface FirmAdminPageProps {
  readonly controller?: FirmAdminController;
  readonly currentUser?: UserProfile;
  readonly onNotify?: (
    input: Omit<WorkspaceNotification, 'id' | 'createdAtIso'>
  ) => void;
  readonly onOpenClientEngagement?: (clientId: string, engagementId: string) => void;
  readonly onOpenWorkpaper: (target: DeepLinkTarget) => void;
  readonly onOpenOnboarding?: () => void;
  readonly onClientCountChange?: (count: number) => void;
}

export function FirmAdminPage({
  controller = defaultFirmAdmin,
  currentUser,
  onNotify,
  onOpenClientEngagement,
  onOpenWorkpaper,
  onOpenOnboarding,
  onClientCountChange,
}: FirmAdminPageProps) {
  const [state, setState] = useState<FirmAdminState>(() => controller.getState());
  const [tab, setTab] = useState<AdminTab>('engagements');
  const [practiceFilter, setPracticeFilter] = useState<'All' | PracticeLine>('All');
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddEngagement, setShowAddEngagement] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const countRef = useRef(onClientCountChange);
  countRef.current = onClientCountChange;

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

  useEffect(() => {
    countRef.current?.(state.clients.length);
  }, [state.clients.length]);

  const memberOptions = useMemo<ReadonlyArray<SelectMenuOption<string>>>(
    () => state.members.map((m) => ({ value: m.id, label: m.fullName, meta: m.authority })),
    [state.members]
  );

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
    if (!newMember.fullName.trim()) {
      onNotify?.({ kind: 'warning', message: 'Enter the staff member’s full name.' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newMember.email.trim())) {
      onNotify?.({
        kind: 'warning',
        message: 'Enter a valid firm email address (e.g. name@cartervance.co.uk).',
      });
      return;
    }
    const created = controller.addMember(newMember);
    if (!created) return;
    onNotify?.({
      kind: 'success',
      message: `Added ${newMember.fullName.trim()} (${newMember.authority} · ${newMember.department}).`,
    });
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
    if (!newEng.clientName.trim() || !newEng.deliverable.trim()) {
      onNotify?.({
        kind: 'warning',
        message: 'Enter both a client entity name and deliverable title.',
      });
      return;
    }
    const created = controller.addEngagement(newEng);
    if (!created) return;
    onNotify?.({
      kind: 'success',
      message: `Assigned "${newEng.deliverable.trim()}" for ${newEng.clientName.trim()}.`,
    });
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

          <div class="stage-subbar-group">
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

            {onOpenOnboarding && (
              <button
                type="button"
                class="ghost-pill"
                onClick={onOpenOnboarding}
              >
                Workspace setup →
              </button>
            )}
          </div>
        </header>

        <section class="admin-pulse-grid" aria-label="Firm metrics">
          <div class="admin-pulse-card">
            <span class="admin-pulse-label">Active engagements</span>
            <strong class="admin-pulse-value">{openEngagements.length}</strong>
          </div>

          <div class="admin-pulse-card">
            <span class="admin-pulse-label">Awaiting sign-off</span>
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
          <nav class="connectors-tab-strip is-flush" role="tablist" aria-label="Firm Admin views">
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
                  placeholder="Client entity"
                  aria-label="Client entity name"
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
                  placeholder="Deliverable title"
                  aria-label="Deliverable title"
                  value={newEng.deliverable}
                  onInput={(e) =>
                    setNewEng((p) => ({
                      ...p,
                      deliverable: (e.currentTarget as HTMLInputElement).value,
                    }))
                  }
                />
                <SelectMenu
                  size="md"
                  fullWidth
                  ariaLabel="Practice line"
                  value={newEng.practice}
                  options={PRACTICE_OPTIONS}
                  onChange={(practice) => setNewEng((p) => ({ ...p, practice }))}
                />
                <SelectMenu
                  size="md"
                  fullWidth
                  ariaLabel="Engagement owner"
                  value={newEng.ownerId}
                  options={memberOptions}
                  onChange={(ownerId) => setNewEng((p) => ({ ...p, ownerId }))}
                />
                <input
                  type="text"
                  class="profile-input"
                  placeholder="Due date"
                  aria-label="Target due date"
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

            {filteredEngagements.length === 0 ? (
              <div class="dashboard-empty-box">
                <span>No engagements in {practiceFilter}.</span>
                <button
                  type="button"
                  class="ghost-pill"
                  onClick={() => setPracticeFilter('All')}
                >
                  Show all lines
                </button>
              </div>
            ) : (
              <div class="admin-table-box">
                <table class="admin-table">
                  <thead>
                    <tr>
                      <th scope="col">Client</th>
                      <th scope="col">Deliverable</th>
                      <th scope="col">Line</th>
                      <th scope="col">Progress</th>
                      <th scope="col">Owner</th>
                      <th scope="col">Stage</th>
                      <th scope="col" class="is-right">
                        Due
                      </th>
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
                            {(eng.workpaperId || eng.pluginRoute) && (
                              <button
                                type="button"
                                class="admin-workpaper-link"
                                onClick={() =>
                                  onOpenWorkpaper({
                                    workpaperId: eng.workpaperId,
                                    pluginRoute: eng.pluginRoute,
                                    anchor: eng.anchor,
                                  })
                                }
                              >
                                Open →
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
                          <SelectMenu
                            size="sm"
                            ariaLabel={`Owner for ${eng.deliverable}`}
                            value={eng.ownerId}
                            options={memberOptions}
                            onChange={(nextOwnerId) =>
                              controller.reassignEngagement(eng.id, nextOwnerId)
                            }
                          />
                        </td>
                        <td>
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
                                  message: `Moved "${eng.deliverable}" to ${nextStage}.`,
                                });
                              }
                            }}
                          />
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
            )}
          </>
        ) : (
          <>
            {showAddMember && (
              <form class="admin-inline-form" onSubmit={submitNewMember}>
                <input
                  type="text"
                  class="profile-input"
                  placeholder="Full name"
                  aria-label="Member full name"
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
                  aria-label="Member work email"
                  value={newMember.email}
                  onInput={(e) =>
                    setNewMember((p) => ({
                      ...p,
                      email: (e.currentTarget as HTMLInputElement).value,
                    }))
                  }
                />
                <SelectMenu
                  size="md"
                  fullWidth
                  ariaLabel="Department"
                  value={newMember.department}
                  options={PRACTICE_OPTIONS}
                  onChange={(department) =>
                    setNewMember((p) => ({ ...p, department }))
                  }
                />
                <SelectMenu
                  size="md"
                  fullWidth
                  ariaLabel="Signing authority"
                  value={newMember.authority}
                  options={AUTHORITY_OPTIONS}
                  onChange={(authority) =>
                    setNewMember((p) => ({ ...p, authority }))
                  }
                />
                <button type="submit" class="primary-action-pill is-sm">
                  Add
                </button>
              </form>
            )}

            {filteredMembers.length === 0 ? (
              <div class="dashboard-empty-box">
                <span>No staff members assigned to {practiceFilter}.</span>
                <button
                  type="button"
                  class="ghost-pill"
                  onClick={() => setPracticeFilter('All')}
                >
                  Show all staff
                </button>
              </div>
            ) : (
              <div class="admin-table-box">
                <table class="admin-table">
                  <thead>
                    <tr>
                      <th scope="col">Name</th>
                      <th scope="col">Line</th>
                      <th scope="col">Role</th>
                      <th scope="col">Engagements</th>
                      <th scope="col">Workpapers</th>
                      <th scope="col">Capacity</th>
                      <th scope="col" class="is-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map((member) => {
                      const activeCount = state.engagements.filter(
                        (e) => e.ownerId === member.id && e.stage !== 'Complete'
                      ).length;
                      const isConfirming = confirmRemoveId === member.id;

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
                            <SelectMenu
                              size="sm"
                              ariaLabel={`Role for ${member.fullName}`}
                              value={member.authority}
                              options={AUTHORITY_OPTIONS}
                              onChange={(authority) =>
                                controller.updateMemberAuthority(member.id, authority)
                              }
                            />
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
                            {isConfirming ? (
                              <div class="admin-confirm-actions">
                                <button
                                  type="button"
                                  class="admin-remove-btn is-confirm"
                                  onClick={() => {
                                    controller.removeMember(member.id);
                                    setConfirmRemoveId(null);
                                    onNotify?.({
                                      kind: 'info',
                                      message: `Removed ${member.fullName} and reassigned active engagements.`,
                                    });
                                  }}
                                >
                                  Confirm
                                </button>
                                <button
                                  type="button"
                                  class="ghost-pill"
                                  onClick={() => setConfirmRemoveId(null)}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                class="admin-remove-btn"
                                disabled={state.members.length <= 1}
                                onClick={() => setConfirmRemoveId(member.id)}
                              >
                                Remove
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
