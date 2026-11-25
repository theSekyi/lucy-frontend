import { createStore, type ReadableStore } from './store';
import type { PracticeLine, SigningAuthority } from './admin';
import type { AuthProviderId } from './types';

export type OnboardingStepId = 'firm' | 'identity' | 'stack' | 'templates' | 'team';

export interface OnboardingFirmProfile {
  readonly firmName: string;
  readonly regulatoryBody: 'ICAEW / FRC' | 'ACCA' | 'AICPA / PCAOB';
  readonly framework: 'FRS 102 & IFRS' | 'US GAAP (ASC)' | 'Dual UK & US GAAP';
  readonly materialityBasis: '5.0% Pre-Tax Profit' | '1.0% Total Revenue' | '1.5% Gross Assets';
  readonly residencyRegion: 'UK Sovereign (London)' | 'EU Central (Frankfurt)' | 'US East (Virginia)';
}

export interface OnboardingIdentityConfig {
  readonly primaryIdp: AuthProviderId;
  readonly verifiedDomain: string;
  readonly tenantOrIssuer: string;
  readonly enforceScimSync: boolean;
  readonly sessionDuration: '8 hours' | '12 hours' | '24 hours';
}

export interface OnboardingCloseTemplate {
  readonly targetCloseDay: 'WD+5' | 'WD+7' | 'WD+10';
  readonly checklistSteps: ReadonlyArray<{
    readonly id: string;
    readonly title: string;
    readonly enabled: boolean;
  }>;
}

export interface PendingTeamInvite {
  readonly id: string;
  readonly fullName: string;
  readonly email: string;
  readonly department: PracticeLine;
  readonly authority: SigningAuthority;
}

export interface EnterpriseOnboardingState {
  readonly currentStep: OnboardingStepId;
  readonly completedSteps: ReadonlyArray<OnboardingStepId>;
  readonly firm: OnboardingFirmProfile;
  readonly identity: OnboardingIdentityConfig;
  readonly closeTemplate: OnboardingCloseTemplate;
  readonly stagedInvites: ReadonlyArray<PendingTeamInvite>;
  readonly isProvisioned: boolean;
}

export interface EnterpriseOnboardingController
  extends ReadableStore<EnterpriseOnboardingState> {
  setStep: (step: OnboardingStepId) => void;
  advanceStep: () => OnboardingStepId;
  previousStep: () => OnboardingStepId;
  updateFirm: (patch: Partial<OnboardingFirmProfile>) => void;
  updateIdentity: (patch: Partial<OnboardingIdentityConfig>) => void;
  setCloseDay: (day: OnboardingCloseTemplate['targetCloseDay']) => void;
  toggleChecklistStep: (stepId: string) => void;
  stageInvite: (invite: Omit<PendingTeamInvite, 'id'>) => string | null;
  removeStagedInvite: (inviteId: string) => void;
  completeProvisioning: () => void;
}

export const ONBOARDING_STEPS: ReadonlyArray<{
  readonly id: OnboardingStepId;
  readonly number: string;
  readonly label: string;
}> = [
  { id: 'firm', number: '01', label: 'Firm & Jurisdiction' },
  { id: 'identity', number: '02', label: 'Identity & SSO' },
  { id: 'stack', number: '03', label: 'Accounting Stack' },
  { id: 'templates', number: '04', label: 'Close Standards' },
  { id: 'team', number: '05', label: 'Team & Roles' },
];

export function createInitialOnboardingState(): EnterpriseOnboardingState {
  return {
    currentStep: 'firm',
    completedSteps: ['firm'],
    firm: {
      firmName: 'Carter & Vance Chartered Accountants',
      regulatoryBody: 'ICAEW / FRC',
      framework: 'Dual UK & US GAAP',
      materialityBasis: '5.0% Pre-Tax Profit',
      residencyRegion: 'UK Sovereign (London)',
    },
    identity: {
      primaryIdp: 'entra',
      verifiedDomain: 'cartervance.co.uk',
      tenantOrIssuer: '72f988bf-86f1-41af-91ab-cartervance',
      enforceScimSync: true,
      sessionDuration: '12 hours',
    },
    closeTemplate: {
      targetCloseDay: 'WD+5',
      checklistSteps: [
        { id: 'tpl-bank', title: 'Bank & credit card feed reconciliation', enabled: true },
        { id: 'tpl-ap', title: 'Supplier invoice OCR & AP coding', enabled: true },
        { id: 'tpl-aje', title: 'Payroll, prepayments & recurring accruals', enabled: true },
        { id: 'tpl-tb', title: 'Trial balance & materiality flux sign-off', enabled: true },
        { id: 'tpl-vat', title: 'MTD VAT & monthly management pack', enabled: true },
      ],
    },
    stagedInvites: [
      {
        id: 'inv-1',
        fullName: 'Claire Whitfield',
        email: 'c.whitfield@cartervance.co.uk',
        department: 'Audit',
        authority: 'Director',
      },
      {
        id: 'inv-2',
        fullName: 'Daniel Osei',
        email: 'd.osei@cartervance.co.uk',
        department: 'Bookkeeping',
        authority: 'Senior',
      },
    ],
    isProvisioned: false,
  };
}

let inviteSeq = 10;

export function createOnboardingController(
  initialState: EnterpriseOnboardingState = createInitialOnboardingState()
): EnterpriseOnboardingController {
  const store = createStore<EnterpriseOnboardingState>(initialState);

  function markStepVisited(
    completed: ReadonlyArray<OnboardingStepId>,
    step: OnboardingStepId
  ): ReadonlyArray<OnboardingStepId> {
    return completed.includes(step) ? completed : [...completed, step];
  }

  return {
    getState: store.getState,
    subscribe: store.subscribe,
    getListenerCount: store.getListenerCount,

    setStep(step) {
      store.update((state) => ({
        ...state,
        currentStep: step,
        completedSteps: markStepVisited(state.completedSteps, step),
      }));
    },

    advanceStep() {
      const current = store.getState().currentStep;
      const idx = ONBOARDING_STEPS.findIndex((s) => s.id === current);
      const next = ONBOARDING_STEPS[Math.min(ONBOARDING_STEPS.length - 1, idx + 1)]!.id;
      store.update((state) => ({
        ...state,
        currentStep: next,
        completedSteps: markStepVisited(state.completedSteps, next),
      }));
      return next;
    },

    previousStep() {
      const current = store.getState().currentStep;
      const idx = ONBOARDING_STEPS.findIndex((s) => s.id === current);
      const prev = ONBOARDING_STEPS[Math.max(0, idx - 1)]!.id;
      store.update((state) => ({ ...state, currentStep: prev }));
      return prev;
    },

    updateFirm(patch) {
      store.update((state) => ({
        ...state,
        firm: { ...state.firm, ...patch },
      }));
    },

    updateIdentity(patch) {
      store.update((state) => ({
        ...state,
        identity: { ...state.identity, ...patch },
      }));
    },

    setCloseDay(targetCloseDay) {
      store.update((state) => ({
        ...state,
        closeTemplate: { ...state.closeTemplate, targetCloseDay },
      }));
    },

    toggleChecklistStep(stepId) {
      store.update((state) => ({
        ...state,
        closeTemplate: {
          ...state.closeTemplate,
          checklistSteps: state.closeTemplate.checklistSteps.map((s) =>
            s.id === stepId ? { ...s, enabled: !s.enabled } : s
          ),
        },
      }));
    },

    stageInvite(invite) {
      const fullName = invite.fullName.trim();
      const email = invite.email.trim();
      if (!fullName || !email.includes('@')) return null;
      inviteSeq += 1;
      const id = `inv-${inviteSeq}`;
      store.update((state) => ({
        ...state,
        stagedInvites: [...state.stagedInvites, { id, ...invite, fullName, email }],
      }));
      return id;
    },

    removeStagedInvite(inviteId) {
      store.update((state) => ({
        ...state,
        stagedInvites: state.stagedInvites.filter((i) => i.id !== inviteId),
      }));
    },

    completeProvisioning() {
      store.update((state) => ({
        ...state,
        isProvisioned: true,
        completedSteps: ONBOARDING_STEPS.map((s) => s.id),
      }));
    },
  };
}

export const defaultOnboarding = createOnboardingController();

export interface AuthValidationResult {
  readonly ok: boolean;
  readonly error?: string;
  readonly email?: string;
  readonly organizationDomain?: string;
  readonly ssoTenantLabel?: string;
  readonly fullName?: string;
}

export function validateEnterpriseAuth(params: {
  readonly provider: AuthProviderId;
  readonly email: string;
  readonly tenantOrIssuer?: string;
  readonly inviteCode?: string;
  readonly fullName?: string;
}): AuthValidationResult {
  const cleanEmail = params.email.trim().toLowerCase();
  const atIdx = cleanEmail.indexOf('@');
  if (atIdx <= 0 || !cleanEmail.slice(atIdx + 1).includes('.')) {
    return { ok: false, error: 'Enter a valid firm work email address.' };
  }
  const domain = cleanEmail.slice(atIdx + 1);

  if (params.provider === 'entra') {
    const tenant = params.tenantOrIssuer?.trim() || domain;
    return {
      ok: true,
      email: cleanEmail,
      organizationDomain: domain,
      ssoTenantLabel: `Microsoft Entra ID · ${tenant}`,
    };
  }

  if (params.provider === 'okta') {
    const rawIssuer = (params.tenantOrIssuer ?? '').trim().toLowerCase();
    if (!rawIssuer || rawIssuer.length < 3) {
      return { ok: false, error: 'Enter your firm Okta domain (e.g. cartervance.okta.com).' };
    }
    const normalizedIssuer = rawIssuer.includes('.') ? rawIssuer : `${rawIssuer}.okta.com`;
    return {
      ok: true,
      email: cleanEmail,
      organizationDomain: domain,
      ssoTenantLabel: `Okta SAML 2.0 · ${normalizedIssuer}`,
    };
  }

  const code = (params.inviteCode ?? '').trim();
  if (code.length < 6) {
    return { ok: false, error: 'Enter the 6+ character workspace invite token from your email.' };
  }
  const cleanName = params.fullName?.trim();
  if (!cleanName) {
    return { ok: false, error: 'Enter your full name as it appears on workpaper sign-offs.' };
  }

  return {
    ok: true,
    email: cleanEmail,
    fullName: cleanName,
    organizationDomain: domain,
    ssoTenantLabel: `Workspace Invite · ${code.toUpperCase()}`,
  };
}
