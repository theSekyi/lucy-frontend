import type { NavSection, UserProfile } from '../core/types';

interface ProfilePageProps {
  readonly profile: UserProfile;
  readonly connectedCount: number;
  readonly onUpdateProfile: (patch: Partial<UserProfile>) => void;
  readonly onNavigate: (section: NavSection) => void;
}

export function ProfilePage({
  profile,
  connectedCount,
  onUpdateProfile,
  onNavigate,
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
            <span>Dashboard</span>
          </button>
          <button
            type="button"
            class="ghost-pill"
            onClick={() => onNavigate('connectors')}
          >
            {connectedCount} Connected →
          </button>
        </div>

        <div class="profile-card-shell">
          <header class="profile-identity-header">
            <div class="profile-avatar-lg" aria-hidden="true">
              {profile.initials}
            </div>
            <div class="profile-identity-meta">
              <h1 class="profile-name-heading">{profile.fullName}</h1>
            </div>
          </header>

          <div class="profile-clean-stack">
            <label class="profile-field">
              <span class="profile-field-label">Full Name</span>
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
              <span class="profile-field-label">Work Email</span>
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
