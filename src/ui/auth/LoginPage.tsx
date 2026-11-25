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
  const [oktaDomain, setOktaDomain] = useState('cartervance.okta.com');
  const [inviteCode, setInviteCode] = useState('CV-2026-PARTNER');
  const [fullName, setFullName] = useState('Elena Carter');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMode(initialMode);
    setError(null);
  }, [initialMode]);

  function selectProvider(next: AuthProviderId) {
    setMode(next);
    setError(null);
    onModeChange?.(next);
  }

  function handleSubmit(e: Event) {
    e.preventDefault();
    const check = validateEnterpriseAuth({
      provider: mode,
      email,
      tenantOrIssuer: mode === 'okta' ? oktaDomain : undefined,
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
          <LucyBrandMark size={20} />
          <span class="brand-name">Lucy</span>
        </button>

        <div class="stage-subbar-group">
          {isAlreadyAuthenticated && (
            <button type="button" class="conn-open-link" onClick={onReturnWorkspace}>
              Workspace
            </button>
          )}
          <button type="button" class="conn-open-link" onClick={onStartOnboarding}>
            Workspace setup
          </button>
        </div>
      </header>

      <main class="auth-center-stage">
        <div class="auth-card">
          <div class="auth-card-head">
            <h1 class="auth-heading">Sign in</h1>
            <p class="auth-meta">{defaultFirm}</p>
          </div>

          <div class="auth-method-tabs" role="tablist" aria-label="Sign-in method">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'entra'}
              class={`auth-method-tab ${mode === 'entra' ? 'is-active' : ''}`}
              onClick={() => selectProvider('entra')}
            >
              <EntraIdLogo size={15} />
              <span>Microsoft</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={mode === 'okta'}
              class={`auth-method-tab ${mode === 'okta' ? 'is-active' : ''}`}
              onClick={() => selectProvider('okta')}
            >
              <OktaLogo size={15} />
              <span>Okta</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={mode === 'invite'}
              class={`auth-method-tab ${mode === 'invite' ? 'is-active' : ''}`}
              onClick={() => selectProvider('invite')}
            >
              <InviteEnvelopeIcon size={15} />
              <span>Invite</span>
            </button>
          </div>

          <form class="auth-form" onSubmit={handleSubmit}>
            <label class="profile-field">
              <span class="profile-field-label">Work email</span>
              <input
                type="email"
                class="profile-input"
                placeholder="name@firm.co.uk"
                value={email}
                onInput={(e) => setEmail((e.currentTarget as HTMLInputElement).value)}
              />
            </label>

            {mode === 'okta' && (
              <label class="profile-field">
                <span class="profile-field-label">Okta domain</span>
                <input
                  type="text"
                  class="profile-input"
                  placeholder="firm.okta.com"
                  value={oktaDomain}
                  onInput={(e) => setOktaDomain((e.currentTarget as HTMLInputElement).value)}
                />
              </label>
            )}

            {mode === 'invite' && (
              <>
                <label class="profile-field">
                  <span class="profile-field-label">Full name</span>
                  <input
                    type="text"
                    class="profile-input"
                    placeholder="Elena Carter"
                    value={fullName}
                    onInput={(e) => setFullName((e.currentTarget as HTMLInputElement).value)}
                  />
                </label>

                <label class="profile-field">
                  <span class="profile-field-label">Invite code</span>
                  <input
                    type="text"
                    class="profile-input auth-mono-input"
                    placeholder="CV-2026-PARTNER"
                    value={inviteCode}
                    onInput={(e) => setInviteCode((e.currentTarget as HTMLInputElement).value)}
                  />
                </label>
              </>
            )}

            {error && (
              <div class="auth-error-banner" role="alert">
                {error}
              </div>
            )}

            <button type="submit" class="primary-action-pill auth-submit-btn">
              {mode === 'entra'
                ? 'Continue with Microsoft'
                : mode === 'okta'
                  ? 'Continue with Okta'
                  : 'Accept invite'}
            </button>
          </form>

          <footer class="auth-card-footer">
            <span>New firm workspace?</span>
            <button type="button" class="conn-open-link" onClick={onStartOnboarding}>
              Set up workspace
            </button>
          </footer>
        </div>
      </main>
    </div>
  );
}
