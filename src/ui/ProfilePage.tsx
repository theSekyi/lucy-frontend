import type { AuthSession, NavSection, UserProfile } from '../core/types';
import './profile.css';

interface ProfilePageProps {
  readonly profile: UserProfile;
  readonly authSession: AuthSession;
  readonly connectedCount: number;
  readonly onUpdateProfile: (patch: Partial<UserProfile>) => void;
  readonly onNavigate: (section: NavSection) => void;
  readonly onSignOut: () => void;
}

export function ProfilePage({
  profile,
  authSession,
  connectedCount,
  onUpdateProfile,
  onNavigate,
  onSignOut,
}: ProfilePageProps) {
  return (
    <div class="launchpad-scroll">
      <div class="profile-slim-container">
        <div class="page-top-breadcrumb">
          <button
            type="button"
            class="back-home-btn"
            onClick={() => onNavigate('home')}
          >
            <span>←</span>
            <span>Home</span>
          </button>

          <div class="stage-subbar-group">
            <button
              type="button"
              class="ghost-pill"
              onClick={() => onNavigate('connectors')}
            >
              {connectedCount} Connected →
            </button>
            <button
              type="button"
              class="ghost-pill"
              onClick={onSignOut}
            >
              Sign out
            </button>
          </div>
        </div>

        <div class="profile-card-shell">
          <header class="profile-identity-header">
            <div class="profile-avatar-lg" aria-hidden="true">
              {profile.initials}
            </div>
            <div class="profile-identity-meta">
              <h1 class="profile-name-heading">{profile.fullName}</h1>
              <span class="profile-sso-pill">{authSession.ssoTenantLabel}</span>
            </div>
          </header>

          <div class="profile-clean-stack">
            <label class="profile-field">
              <span class="profile-field-label">Full name</span>
              <input
                type="text"
                class="profile-input"
                value={profile.fullName}
                onInput={(e) =>
                  onUpdateProfile({
                    fullName: (e.currentTarget as HTMLInputElement).value,
                  })
                }
              />
            </label>

            <label class="profile-field">
              <span class="profile-field-label">Role</span>
              <input
                type="text"
                class="profile-input"
                value={profile.role}
                onInput={(e) =>
                  onUpdateProfile({
                    role: (e.currentTarget as HTMLInputElement).value,
                  })
                }
              />
            </label>

            <label class="profile-field">
              <span class="profile-field-label">Work email</span>
              <input
                type="email"
                class="profile-input"
                value={profile.email}
                onInput={(e) =>
                  onUpdateProfile({
                    email: (e.currentTarget as HTMLInputElement).value,
                  })
                }
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
