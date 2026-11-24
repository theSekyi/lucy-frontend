import { useState } from 'preact/hooks';
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
  const [draft, setDraft] = useState<UserProfile>(profile);
  const [saved, setSaved] = useState(false);

  function updateField<K extends keyof UserProfile>(key: K, value: UserProfile[K]) {
    setSaved(false);
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave(e: Event) {
    e.preventDefault();
    onUpdateProfile(draft);
    setSaved(true);
  }

  return (
    <div class="launchpad-scroll">
      <div class="launchpad-column">
        <div class="page-top-breadcrumb">
          <button
            type="button"
            class="back-home-btn"
            onClick={() => onNavigate('home')}
          >
            <span>←</span>
            <span>Dashboard</span>
          </button>
          <div class="stage-subbar-group">
            <button
              type="button"
              class="ghost-pill"
              onClick={() => onNavigate('connectors')}
            >
              {connectedCount} Connected Apps →
            </button>
          </div>
        </div>

        <form class="profile-card-shell" onSubmit={handleSave}>
          <header class="profile-identity-header">
            <div class="profile-avatar-lg" aria-hidden="true">
              {draft.initials}
            </div>
            <div class="profile-identity-meta">
              <h1 class="profile-name-heading">{draft.fullName}</h1>
              <p class="profile-role-sub">
                {draft.role} · {draft.firm}
              </p>
              <span class="profile-cred-badge">{draft.credentials}</span>
            </div>
            <button type="submit" class="primary-action-pill">
              {saved ? '✓ Profile saved' : 'Save changes'}
            </button>
          </header>

          <div class="profile-grid">
            <label class="profile-field">
              <span class="profile-field-label">Full Name</span>
              <input
                type="text"
                class="profile-input"
                value={draft.fullName}
                onInput={(e) =>
                  updateField('fullName', (e.currentTarget as HTMLInputElement).value)
                }
              />
            </label>

            <label class="profile-field">
              <span class="profile-field-label">Role / Title</span>
              <input
                type="text"
                class="profile-input"
                value={draft.role}
                onInput={(e) =>
                  updateField('role', (e.currentTarget as HTMLInputElement).value)
                }
              />
            </label>

            <label class="profile-field">
              <span class="profile-field-label">Practice / Firm</span>
              <input
                type="text"
                class="profile-input"
                value={draft.firm}
                onInput={(e) =>
                  updateField('firm', (e.currentTarget as HTMLInputElement).value)
                }
              />
            </label>

            <label class="profile-field">
              <span class="profile-field-label">Work Email</span>
              <input
                type="email"
                class="profile-input"
                value={draft.email}
                onInput={(e) =>
                  updateField('email', (e.currentTarget as HTMLInputElement).value)
                }
              />
            </label>

            <label class="profile-field is-span-2">
              <span class="profile-field-label">Professional Registrations (ICAEW / ACCA / CPA / PTIN)</span>
              <input
                type="text"
                class="profile-input"
                value={draft.credentials}
                onInput={(e) =>
                  updateField('credentials', (e.currentTarget as HTMLInputElement).value)
                }
              />
            </label>

            <label class="profile-field">
              <span class="profile-field-label">Reporting Frameworks</span>
              <input
                type="text"
                class="profile-input"
                value={draft.jurisdiction}
                onInput={(e) =>
                  updateField('jurisdiction', (e.currentTarget as HTMLInputElement).value)
                }
              />
            </label>

            <label class="profile-field">
              <span class="profile-field-label">Default Reporting Currency</span>
              <select
                class="profile-input"
                value={draft.defaultCurrency}
                onChange={(e) =>
                  updateField(
                    'defaultCurrency',
                    (e.currentTarget as HTMLSelectElement).value as UserProfile['defaultCurrency']
                  )
                }
              >
                <option value="GBP (£)">GBP (£)</option>
                <option value="USD ($)">USD ($)</option>
                <option value="EUR (€)">EUR (€)</option>
              </select>
            </label>

            <label class="profile-field">
              <span class="profile-field-label">Default Materiality Benchmark</span>
              <input
                type="text"
                class="profile-input"
                value={draft.materialityBasis}
                onInput={(e) =>
                  updateField('materialityBasis', (e.currentTarget as HTMLInputElement).value)
                }
              />
            </label>

            <div class="profile-field">
              <span class="profile-field-label">Workpaper Sign-Off Stamp</span>
              <div class="profile-stamp-preview">
                <span class="stamp-chip">Reviewed by {draft.initials}</span>
                <span class="sheet-meta-count">Auto-applied on workpaper sign-offs</span>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
