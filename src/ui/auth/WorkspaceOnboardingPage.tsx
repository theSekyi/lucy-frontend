import { useEffect, useState } from 'preact/hooks';
import {
  defaultFirmAdmin,
  type FirmAdminController,
  type FirmAdminState,
  type PracticeLine,
  type SigningAuthority,
} from '../../core/admin';
import { CONNECTOR_CATALOG } from '../../core/connectors';
import {
  defaultOnboarding,
  ONBOARDING_STEPS,
  type EnterpriseOnboardingController,
  type EnterpriseOnboardingState,
  type OnboardingFirmProfile,
  type OnboardingIdentityConfig,
  type OnboardingStepId,
} from '../../core/onboarding';
import type { AuthProviderId, NavSection } from '../../core/types';
import type { SignInCompletionPayload } from '../../core/workspace';
import { CONNECTOR_LOGOS } from '../connectors/connectorLogos';
import { LucyBrandMark } from '../icons';
import { SelectMenu, type SelectMenuOption } from '../primitives/SelectMenu';
import { EntraIdLogo, InviteEnvelopeIcon, OktaLogo } from './AuthIcons';
import './auth.css';

const REGULATORY_OPTIONS: ReadonlyArray<
  SelectMenuOption<OnboardingFirmProfile['regulatoryBody']>
> = [
  { value: 'ICAEW / FRC', label: 'ICAEW / FRC (UK)' },
  { value: 'ACCA', label: 'ACCA Chartered' },
  { value: 'AICPA / PCAOB', label: 'AICPA / PCAOB (US)' },
];

const FRAMEWORK_OPTIONS: ReadonlyArray<
  SelectMenuOption<OnboardingFirmProfile['framework']>
> = [
  { value: 'Dual UK & US GAAP', label: 'UK (FRS 102 / IFRS) & US GAAP' },
  { value: 'FRS 102 & IFRS', label: 'UK FRS 102 & IFRS' },
  { value: 'US GAAP (ASC)', label: 'US GAAP (ASC)' },
];

const MATERIALITY_OPTIONS: ReadonlyArray<
  SelectMenuOption<OnboardingFirmProfile['materialityBasis']>
> = [
  { value: '5.0% Pre-Tax Profit', label: '5.0% Pre-Tax Profit' },
  { value: '1.0% Total Revenue', label: '1.0% Total Revenue' },
  { value: '1.5% Gross Assets', label: '1.5% Gross Assets' },
];

const RESIDENCY_OPTIONS: ReadonlyArray<
  SelectMenuOption<OnboardingFirmProfile['residencyRegion']>
> = [
  { value: 'UK Sovereign (London)', label: 'UK (London)' },
  { value: 'EU Central (Frankfurt)', label: 'EU (Frankfurt)' },
  { value: 'US East (Virginia)', label: 'US (Virginia)' },
];

const SESSION_OPTIONS: ReadonlyArray<
  SelectMenuOption<OnboardingIdentityConfig['sessionDuration']>
> = [
  { value: '8 hours', label: '8 hours' },
  { value: '12 hours', label: '12 hours' },
  { value: '24 hours', label: '24 hours' },
];

const LEDGER_OPTIONS: ReadonlyArray<SelectMenuOption<string>> = [
  { value: 'Xero', label: 'Xero' },
  { value: 'NetSuite', label: 'Oracle NetSuite' },
  { value: 'QuickBooks', label: 'QuickBooks Online' },
  { value: 'Sage Intacct', label: 'Sage Intacct' },
];

const PRACTICE_OPTIONS: ReadonlyArray<SelectMenuOption<PracticeLine>> = [
  { value: 'Audit', label: 'Audit' },
  { value: 'Tax', label: 'Tax' },
  { value: 'Bookkeeping', label: 'Bookkeeping' },
];

const AUTHORITY_OPTIONS: ReadonlyArray<SelectMenuOption<SigningAuthority>> = [
  { value: 'Partner', label: 'Partner' },
  { value: 'Director', label: 'Director' },
  { value: 'Manager', label: 'Manager' },
  { value: 'Senior', label: 'Senior' },
  { value: 'Associate', label: 'Associate' },
];

const CORE_ONBOARDING_CONNECTOR_IDS: ReadonlyArray<string> = [
  'gmail',
  'outlook',
  'sharepoint',
  'onedrive',
  'xero',
  'netsuite',
  'quickbooks',
  'hmrc-mtd',
  'companies-house',
  'open-banking',
];

interface WorkspaceOnboardingPageProps {
  readonly onboarding?: EnterpriseOnboardingController;
  readonly firmAdmin?: FirmAdminController;
  readonly initialStep?: OnboardingStepId;
  readonly adminEmail: string;
  readonly connectedIds: ReadonlyArray<string>;
  readonly onStepChange?: (step: OnboardingStepId) => void;
  readonly onToggleConnector: (connectorId: string) => void;
  readonly onClientCountChange?: (count: number) => void;
  readonly onCompleteWorkspaceSetup: (payload: SignInCompletionPayload) => void;
  readonly onNavigate: (section: NavSection) => void;
}

export function WorkspaceOnboardingPage({
  onboarding = defaultOnboarding,
  firmAdmin = defaultFirmAdmin,
  initialStep,
  adminEmail,
  connectedIds,
  onStepChange,
  onToggleConnector,
  onClientCountChange,
  onCompleteWorkspaceSetup,
  onNavigate,
}: WorkspaceOnboardingPageProps) {
  const [state, setState] = useState<EnterpriseOnboardingState>(() =>
    onboarding.getState()
  );
  const [adminState, setAdminState] = useState<FirmAdminState>(() =>
    firmAdmin.getState()
  );

  const [newClientName, setNewClientName] = useState('');
  const [newClientLedger, setNewClientLedger] = useState('Xero');
  const [newClientYearEnd, setNewClientYearEnd] = useState('31 Dec');

  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLine, setInviteLine] = useState<PracticeLine>('Audit');
  const [inviteRole, setInviteRole] = useState<SigningAuthority>('Manager');

  useEffect(() => onboarding.subscribe(setState), [onboarding]);
  useEffect(() => firmAdmin.subscribe(setAdminState), [firmAdmin]);

  useEffect(() => {
    if (initialStep && initialStep !== onboarding.getState().currentStep) {
      onboarding.setStep(initialStep);
    }
  }, [initialStep, onboarding]);

  function selectStep(step: OnboardingStepId) {
    onboarding.setStep(step);
    onStepChange?.(step);
  }

  function goPreviousStep() {
    const prev = onboarding.previousStep();
    onStepChange?.(prev);
  }

  function goNextStep() {
    const next = onboarding.advanceStep();
    onStepChange?.(next);
  }

  const stepIndex = ONBOARDING_STEPS.findIndex((s) => s.id === state.currentStep);
  const coreConnectors = CORE_ONBOARDING_CONNECTOR_IDS.map((id) =>
    CONNECTOR_CATALOG.find((c) => c.id === id)
  ).filter((c): c is NonNullable<typeof c> => Boolean(c));

  function handleAddClient(e: Event) {
    e.preventDefault();
    const id = firmAdmin.addClient({
      name: newClientName,
      ledger: newClientLedger,
      yearEnd: newClientYearEnd,
    });
    if (!id) return;
    onClientCountChange?.(firmAdmin.getState().clients.length);
    setNewClientName('');
  }

  function handleStageInvite(e: Event) {
    e.preventDefault();
    const staged = onboarding.stageInvite({
      fullName: inviteName,
      email: inviteEmail,
      department: inviteLine,
      authority: inviteRole,
    });
    if (!staged) return;
    setInviteName('');
    setInviteEmail('');
  }

  function finishSetup() {
    for (const staged of state.stagedInvites) {
      const exists = firmAdmin
        .getState()
        .members.some((m) => m.email.toLowerCase() === staged.email.toLowerCase());
      if (!exists) {
        firmAdmin.addMember({
          fullName: staged.fullName,
          email: staged.email,
          department: staged.department,
          authority: staged.authority,
        });
      }
    }

    onboarding.completeProvisioning();

    const providerLabel =
      state.identity.primaryIdp === 'entra'
        ? `Microsoft Entra ID · ${state.identity.verifiedDomain}`
        : state.identity.primaryIdp === 'okta'
          ? `Okta SAML 2.0 · ${state.identity.tenantOrIssuer}`
          : `Verified Domain Invite · ${state.identity.verifiedDomain}`;

    onCompleteWorkspaceSetup({
      provider: state.identity.primaryIdp,
      email: adminEmail,
      firm: state.firm.firmName,
      organizationDomain: state.identity.verifiedDomain,
      ssoTenantLabel: providerLabel,
      nextSection: 'admin',
    });
  }

  function renderIdpOption(
    id: AuthProviderId,
    title: string,
    icon: preact.ComponentChildren
  ) {
    const selected = state.identity.primaryIdp === id;
    return (
      <button
        type="button"
        class={`onb-idp-card ${selected ? 'is-selected' : ''}`}
        onClick={() => onboarding.updateIdentity({ primaryIdp: id })}
      >
        {icon}
        <span class="onb-idp-title">{title}</span>
      </button>
    );
  }

  return (
    <div class="auth-viewport">
      <header class="auth-topbar">
        <button type="button" class="brand-button" onClick={() => onNavigate('home')}>
          <LucyBrandMark size={20} />
          <span class="brand-name">Lucy</span>
        </button>

        <div class="stage-subbar-group">
          <button
            type="button"
            class="conn-open-link"
            onClick={() => onNavigate('login')}
          >
            Sign in
          </button>
          <button
            type="button"
            class="conn-open-link"
            onClick={() => onNavigate('admin')}
          >
            Firm Admin
          </button>
        </div>
      </header>

      <div class="onb-layout">
        <aside class="onb-rail" aria-label="Workspace setup steps">
          <nav class="onb-step-list">
            {ONBOARDING_STEPS.map((s, idx) => {
              const isCurrent = s.id === state.currentStep;
              const isDone = idx < stepIndex || state.isProvisioned;
              return (
                <button
                  key={s.id}
                  type="button"
                  class={`onb-step-btn ${isCurrent ? 'is-current' : ''} ${
                    isDone ? 'is-done' : ''
                  }`}
                  onClick={() => selectStep(s.id)}
                >
                  <span class="onb-step-num">{isDone && !isCurrent ? '✓' : s.number}</span>
                  <span>{s.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <main class="onb-canvas">
          <div class="onb-panel">
            {state.currentStep === 'firm' && (
              <>
                <header class="onb-panel-head">
                  <h1 class="onb-title">Firm details</h1>
                </header>

                <div class="onb-grid-two">
                  <label class="profile-field onb-span-two">
                    <span class="profile-field-label">Practice name</span>
                    <input
                      type="text"
                      class="profile-input"
                      value={state.firm.firmName}
                      onInput={(e) =>
                        onboarding.updateFirm({
                          firmName: (e.currentTarget as HTMLInputElement).value,
                        })
                      }
                    />
                  </label>

                  <div class="profile-field">
                    <span class="profile-field-label">Regulatory body</span>
                    <SelectMenu
                      size="md"
                      fullWidth
                      ariaLabel="Regulatory body"
                      value={state.firm.regulatoryBody}
                      options={REGULATORY_OPTIONS}
                      onChange={(regulatoryBody) =>
                        onboarding.updateFirm({ regulatoryBody })
                      }
                    />
                  </div>

                  <div class="profile-field">
                    <span class="profile-field-label">Reporting framework</span>
                    <SelectMenu
                      size="md"
                      fullWidth
                      ariaLabel="Reporting framework"
                      value={state.firm.framework}
                      options={FRAMEWORK_OPTIONS}
                      onChange={(framework) => onboarding.updateFirm({ framework })}
                    />
                  </div>

                  <div class="profile-field">
                    <span class="profile-field-label">Materiality benchmark</span>
                    <SelectMenu
                      size="md"
                      fullWidth
                      ariaLabel="Materiality benchmark"
                      value={state.firm.materialityBasis}
                      options={MATERIALITY_OPTIONS}
                      onChange={(materialityBasis) =>
                        onboarding.updateFirm({ materialityBasis })
                      }
                    />
                  </div>

                  <div class="profile-field">
                    <span class="profile-field-label">Data residency</span>
                    <SelectMenu
                      size="md"
                      fullWidth
                      ariaLabel="Data residency"
                      value={state.firm.residencyRegion}
                      options={RESIDENCY_OPTIONS}
                      onChange={(residencyRegion) =>
                        onboarding.updateFirm({ residencyRegion })
                      }
                    />
                  </div>
                </div>
              </>
            )}

            {state.currentStep === 'identity' && (
              <>
                <header class="onb-panel-head">
                  <h1 class="onb-title">Single sign-on</h1>
                </header>

                <div class="onb-idp-grid">
                  {renderIdpOption('entra', 'Microsoft Entra', <EntraIdLogo size={17} />)}
                  {renderIdpOption('okta', 'Okta', <OktaLogo size={17} />)}
                  {renderIdpOption('invite', 'Email invite', <InviteEnvelopeIcon size={17} />)}
                </div>

                <div class="onb-grid-two">
                  <label class="profile-field">
                    <span class="profile-field-label">Verified email domain</span>
                    <input
                      type="text"
                      class="profile-input"
                      value={state.identity.verifiedDomain}
                      onInput={(e) =>
                        onboarding.updateIdentity({
                          verifiedDomain: (e.currentTarget as HTMLInputElement).value,
                        })
                      }
                    />
                  </label>

                  <label class="profile-field">
                    <span class="profile-field-label">
                      {state.identity.primaryIdp === 'okta' ? 'Okta domain' : 'Tenant domain'}
                    </span>
                    <input
                      type="text"
                      class="profile-input"
                      value={state.identity.tenantOrIssuer}
                      onInput={(e) =>
                        onboarding.updateIdentity({
                          tenantOrIssuer: (e.currentTarget as HTMLInputElement).value,
                        })
                      }
                    />
                  </label>

                  <div class="profile-field">
                    <span class="profile-field-label">Session timeout</span>
                    <SelectMenu
                      size="md"
                      fullWidth
                      ariaLabel="Session duration"
                      value={state.identity.sessionDuration}
                      options={SESSION_OPTIONS}
                      onChange={(sessionDuration) =>
                        onboarding.updateIdentity({ sessionDuration })
                      }
                    />
                  </div>

                  <div class="profile-field onb-check-align">
                    <label class="bk-task-check-label">
                      <input
                        type="checkbox"
                        class="bk-checkbox"
                        checked={state.identity.enforceScimSync}
                        onChange={() =>
                          onboarding.updateIdentity({
                            enforceScimSync: !state.identity.enforceScimSync,
                          })
                        }
                      />
                      <span class="bk-task-title">Automatic directory group sync</span>
                    </label>
                  </div>
                </div>
              </>
            )}

            {state.currentStep === 'stack' && (
              <>
                <header class="onb-panel-head">
                  <h1 class="onb-title">Accounting &amp; storage</h1>
                </header>

                <div class="conn-list-box">
                  {coreConnectors.map((item) => {
                    const isConnected = connectedIds.includes(item.id);
                    const Logo = CONNECTOR_LOGOS[item.id];
                    return (
                      <div key={item.id} class="conn-row">
                        <div class="conn-row-left">
                          <span class="conn-row-logo">{Logo && <Logo size={18} />}</span>
                          <span class="conn-row-name">{item.name}</span>
                        </div>

                        <div class="conn-row-right">
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
              </>
            )}

            {state.currentStep === 'templates' && (
              <>
                <header class="onb-panel-head">
                  <h1 class="onb-title">Monthly close &amp; clients</h1>
                </header>

                <div class="onb-close-sla-bar">
                  <span class="profile-field-label">Close target</span>
                  <div class="stage-subbar-group">
                    {(['WD+5', 'WD+7', 'WD+10'] as const).map((day) => (
                      <button
                        key={day}
                        type="button"
                        class={`conn-tab-btn ${
                          state.closeTemplate.targetCloseDay === day ? 'is-active' : ''
                        }`}
                        onClick={() => onboarding.setCloseDay(day)}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                <div class="conn-list-box">
                  {state.closeTemplate.checklistSteps.map((step) => (
                    <div key={step.id} class="conn-row">
                      <label class="bk-task-check-label">
                        <input
                          type="checkbox"
                          class="bk-checkbox"
                          checked={step.enabled}
                          onChange={() => onboarding.toggleChecklistStep(step.id)}
                        />
                        <span class={`bk-task-title ${step.enabled ? '' : 'is-done'}`}>
                          {step.title}
                        </span>
                      </label>
                    </div>
                  ))}
                </div>

                <div class="onb-subblock">
                  <span class="profile-field-label">
                    Clients ({adminState.clients.length})
                  </span>

                  <form class="onb-inline-row" onSubmit={handleAddClient}>
                    <input
                      type="text"
                      class="profile-input"
                      placeholder="Client entity name"
                      value={newClientName}
                      onInput={(e) =>
                        setNewClientName((e.currentTarget as HTMLInputElement).value)
                      }
                    />
                    <SelectMenu
                      size="md"
                      ariaLabel="Primary ledger"
                      value={newClientLedger}
                      options={LEDGER_OPTIONS}
                      onChange={setNewClientLedger}
                    />
                    <input
                      type="text"
                      class="profile-input onb-ye-input"
                      placeholder="31 Dec"
                      value={newClientYearEnd}
                      onInput={(e) =>
                        setNewClientYearEnd((e.currentTarget as HTMLInputElement).value)
                      }
                    />
                    <button type="submit" class="primary-action-pill is-sm">
                      Add
                    </button>
                  </form>

                  <div class="onb-chip-cloud">
                    {adminState.clients.map((c) => (
                      <span key={c.id} class="onb-entity-pill">
                        <span>{c.name}</span>
                        <span class="sheet-meta-count">· {c.ledger}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}

            {state.currentStep === 'team' && (
              <>
                <header class="onb-panel-head">
                  <h1 class="onb-title">Team &amp; permissions</h1>
                </header>

                <form class="onb-invite-row" onSubmit={handleStageInvite}>
                  <input
                    type="text"
                    class="profile-input"
                    placeholder="Full name"
                    value={inviteName}
                    onInput={(e) =>
                      setInviteName((e.currentTarget as HTMLInputElement).value)
                    }
                  />
                  <input
                    type="email"
                    class="profile-input"
                    placeholder="Work email"
                    value={inviteEmail}
                    onInput={(e) =>
                      setInviteEmail((e.currentTarget as HTMLInputElement).value)
                    }
                  />
                  <SelectMenu
                    size="md"
                    ariaLabel="Practice line"
                    value={inviteLine}
                    options={PRACTICE_OPTIONS}
                    onChange={setInviteLine}
                  />
                  <SelectMenu
                    size="md"
                    ariaLabel="Signing authority"
                    value={inviteRole}
                    options={AUTHORITY_OPTIONS}
                    onChange={setInviteRole}
                  />
                  <button type="submit" class="primary-action-pill">
                    Invite
                  </button>
                </form>

                <div class="conn-list-box">
                  {state.stagedInvites.map((inv) => {
                    const initials = inv.fullName
                      .trim()
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((p) => p[0]?.toUpperCase() ?? '')
                      .join('');
                    return (
                      <div key={inv.id} class="conn-row">
                        <div class="conn-row-left">
                          <span class="sidebar-avatar-sm">{initials || 'ST'}</span>
                          <span class="conn-row-name">{inv.fullName}</span>
                          <span class="sheet-meta-count">{inv.email}</span>
                        </div>
                        <div class="conn-row-right">
                          <span class="sheet-meta-count">
                            {inv.department} · {inv.authority}
                          </span>
                          <button
                            type="button"
                            class="conn-disconnect-btn"
                            onClick={() => onboarding.removeStagedInvite(inv.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {adminState.members.slice(0, 4).map((member) => (
                    <div key={member.id} class="conn-row">
                      <div class="conn-row-left">
                        <span class="sidebar-avatar-sm">{member.initials}</span>
                        <span class="conn-row-name">{member.fullName}</span>
                      </div>
                      <div class="conn-row-right">
                        <span class="sheet-meta-count">
                          {member.department} · {member.authority}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <footer class="onb-footer">
              {stepIndex > 0 ? (
                <button
                  type="button"
                  class="ghost-pill"
                  onClick={goPreviousStep}
                >
                  Back
                </button>
              ) : (
                <span />
              )}

              {stepIndex < ONBOARDING_STEPS.length - 1 ? (
                <button
                  type="button"
                  class="primary-action-pill"
                  onClick={goNextStep}
                >
                  Continue
                </button>
              ) : (
                <button
                  type="button"
                  class="primary-action-pill"
                  onClick={finishSetup}
                >
                  Finish setup
                </button>
              )}
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
