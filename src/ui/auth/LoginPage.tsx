import { useEffect, useState } from 'preact/hooks';
import { validateEnterpriseAuth } from '../../core/onboarding';
import type { AuthProviderId } from '../../core/types';
import type { SignInCompletionPayload } from '../../core/workspace';
import { LucyBrandMark } from '../icons';
import { EntraIdLogo, InviteEnvelopeIcon, OktaLogo } from './AuthIcons';
import './auth.css';

interface LoginPageProps {
  readonly initialMode?: AuthProviderId;
  readonly defaultEmail: string;
  readonly defaultFirm: string;
  readonly isAlreadyAuthenticated: boolean;
  readonly onModeChange?: (mode: AuthProviderId) => void;
  readonly onCompleteSignIn: (payload: SignInCompletionPayload) => void;
  readonly onStartOnboarding: () => void;
  readonly onReturnWorkspace: () => void;
}

export function LoginPage({
  initialMode = 'entra',
  defaultEmail,
  defaultFirm,
  isAlreadyAuthenticated,
  onModeChange,
  onCompleteSignIn,
  onStartOnboarding,
  onReturnWorkspace,
}: LoginPageProps) {
  const [mode, setMode] = useState<AuthProviderId>(initialMode);
  const [email, setEmail] = useState(defaultEmail || 'e.carter@cartervance.co.uk');
  const [tenantInput, setTenantInput] = useState(
    initialMode === 'okta' ? 'cartervance.okta.com' : 'cartervance.co.uk'
  );
  const [inviteCode, setInviteCode] = useState('CV-2026-PARTNER');
  const [fullName, setFullName] = useState('Elena Carter');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMode(initialMode);
    setError(null);
    if (initialMode === 'okta' && !tenantInput.includes('okta')) {
      setTenantInput('cartervance.okta.com');
    } else if (initialMode === 'entra' && tenantInput.includes('okta')) {
      setTenantInput('cartervance.co.uk');
    }
  }, [initialMode]);

  function selectProvider(next: AuthProviderId) {
    setMode(next);
    setError(null);
    onModeChange?.(next);
    if (next === 'okta') setTenantInput('cartervance.okta.com');
    else if (next === 'entra') setTenantInput('cartervance.co.uk');
  }

  function handleSubmit(e: Event) {
    e.preventDefault();
    const check = validateEnterpriseAuth({
      provider: mode,
      email,
      tenantOrIssuer: tenantInput,
      inviteCode,
      fullName,
    });
    if (!check.ok || !check.email || !check.organizationDomain || !check.ssoTenantLabel) {
      setError(check.error ?? 'Unable to verify credentials.');
      return;
    }

    setError(null);
    onCompleteSignIn({
      provider: mode,
      email: check.email,
      fullName: check.fullName,
      firm: defaultFirm,
      organizationDomain: check.organizationDomain,
      ssoTenantLabel: check.ssoTenantLabel,
      nextSection: 'home',
    });
  }

  return (
    <div class="auth-viewport">
      <header class="auth-topbar">
        <button type="button" class="brand-button" onClick={onReturnWorkspace}>
          <LucyBrandMark size={22} />
          <span class="brand-name">Lucy</span>
        </button>

        <div class="stage-subbar-group">
          {isAlreadyAuthenticated && (
            <button type="button" class="ghost-pill" onClick={onReturnWorkspace}>
              ← Workspace
            </button>
          )}
          <button type="button" class="ghost-pill" onClick={onStartOnboarding}>
            Admin Onboarding →
          </button>
        </div>
      </header>

      <main class="auth-center-stage">
        <div class="auth-card">
          <div class="auth-card-head">
            <h1 class="auth-heading">Sign in to Lucy</h1>
            <p class="auth-meta">Carter &amp; Vance Chartered Accountants</p>
          </div>

          <div class="auth-provider-list" role="tablist" aria-label="Authentication method">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'entra'}
              class={`auth-provider-btn ${mode === 'entra' ? 'is-active' : ''}`}
              onClick={() => selectProvider('entra')}
            >
              <span class="auth-provider-left">
                <EntraIdLogo size={18} />
                <span>Microsoft Entra ID</span>
              </span>
              <span class="auth-provider-tag">OIDC</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={mode === 'okta'}
              class={`auth-provider-btn ${mode === 'okta' ? 'is-active' : ''}`}
              onClick={() => selectProvider('okta')}
            >
              <span class="auth-provider-left">
                <OktaLogo size={18} />
                <span>Okta Workforce</span>
              </span>
              <span class="auth-provider-tag">SAML 2.0</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={mode === 'invite'}
              class={`auth-provider-btn ${mode === 'invite' ? 'is-active' : ''}`}
              onClick={() => selectProvider('invite')}
            >
              <span class="auth-provider-left">
                <InviteEnvelopeIcon size={18} />
                <span>Email Invite</span>
              </span>
              <span class="auth-provider-tag">Token</span>
            </button>
          </div>

          <form class="auth-form" onSubmit={handleSubmit}>
            {mode === 'invite' && (
              <>
                <label class="profile-field">
                  <span class="profile-field-label">Invite Token</span>
                  <input
                    type="text"
                    class="profile-input auth-mono-input"
                    placeholder="CV-2026-PARTNER"
                    value={inviteCode}
                    onInput={(e) => setInviteCode((e.currentTarget as HTMLInputElement).value)}
                  />
                </label>

                <label class="profile-field">
                  <span class="profile-field-label">Full Name</span>
                  <input
                    type="text"
                    class="profile-input"
                    placeholder="Elena Carter"
                    value={fullName}
                    onInput={(e) => setFullName((e.currentTarget as HTMLInputElement).value)}
                  />
                </label>
              </>
            )}

            <label class="profile-field">
              <span class="profile-field-label">Work Email</span>
              <input
                type="email"
                class="profile-input"
                placeholder="name@firm.co.uk"
                value={email}
                onInput={(e) => setEmail((e.currentTarget as HTMLInputElement).value)}
              />
            </label>

            {mode === 'entra' && (
              <label class="profile-field">
                <span class="profile-field-label">Azure Tenant Domain</span>
                <input
                  type="text"
                  class="profile-input"
                  placeholder="cartervance.co.uk"
                  value={tenantInput}
                  onInput={(e) => setTenantInput((e.currentTarget as HTMLInputElement).value)}
                />
              </label>
            )}

            {mode === 'okta' && (
              <label class="profile-field">
                <span class="profile-field-label">Okta Organization Domain</span>
                <input
                  type="text"
                  class="profile-input"
                  placeholder="cartervance.okta.com"
                  value={tenantInput}
                  onInput={(e) => setTenantInput((e.currentTarget as HTMLInputElement).value)}
                />
              </label>
            )}

            {error && (
              <div class="auth-error-banner" role="alert">
                {error}
              </div>
            )}

            <button type="submit" class="primary-action-pill auth-submit-btn">
              {mode === 'entra'
                ? 'Continue with Microsoft Entra →'
                : mode === 'okta'
                  ? 'Continue with Okta →'
                  : 'Accept Invite & Enter Workspace →'}
            </button>
          </form>

          <footer class="auth-card-footer">
            <span>Setting up a new accounting firm?</span>
            <button type="button" class="conn-open-link" onClick={onStartOnboarding}>
              Provision workspace →
            </button>
          </footer>
        </div>
      </main>
    </div>
  );
}
