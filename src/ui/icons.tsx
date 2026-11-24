export function LobeBrandAvatar() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#f5e6dc" />
      <circle cx="9" cy="6.5" r="3.2" fill="#a855f7" />
      <circle cx="14.5" cy="6" r="3.4" fill="#ec4899" />
      <circle cx="17.5" cy="8.5" r="2.5" fill="#38bdf8" />
      <rect x="5.5" y="8.5" width="13" height="10.5" rx="5.2" fill="#fb923c" />
      <circle cx="9.8" cy="13.5" r="2" fill="#ffffff" />
      <circle cx="14.2" cy="13.5" r="2" fill="#ffffff" />
      <circle cx="10" cy="13.6" r="1.1" fill="#18181b" />
      <circle cx="14" cy="13.6" r="1.1" fill="#18181b" />
      <path d="M10.6 16.5c.7.6 2.1.6 2.8 0" stroke="#7c2d12" stroke-width="1.2" stroke-linecap="round" />
    </svg>
  );
}

export function LobeTopicAvatar({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" class="topic-avatar-svg">
      <circle cx="12" cy="12" r="11" fill="#23192d" />
      <circle cx="8.5" cy="6.8" r="3.4" fill="#9333ea" />
      <circle cx="13.8" cy="6.2" r="3.6" fill="#f472b6" />
      <circle cx="16.8" cy="8.8" r="2.6" fill="#38bdf8" />
      <rect x="5.2" y="8.8" width="13.6" height="10.4" rx="5.2" fill="#fb923c" />
      <circle cx="9.6" cy="13.8" r="2.1" fill="#ffffff" />
      <circle cx="14.4" cy="13.8" r="2.1" fill="#ffffff" />
      <circle cx="9.8" cy="13.9" r="1.15" fill="#111113" />
      <circle cx="14.2" cy="13.9" r="1.15" fill="#111113" />
      <path d="M10.5 16.8c.8.65 2.2.65 3 0" stroke="#431407" stroke-width="1.2" stroke-linecap="round" />
    </svg>
  );
}

export function LobeWavingMascot() {
  return (
    <svg
      width="98"
      height="90"
      viewBox="0 0 120 110"
      fill="none"
      aria-hidden="true"
      class="mascot-svg"
    >
      <defs>
        <linearGradient id="lobeBody" x1="40" y1="55" x2="88" y2="108" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#ffc163" />
          <stop offset="55%" stop-color="#fb923c" />
          <stop offset="100%" stop-color="#ea580c" />
        </linearGradient>
        <radialGradient id="lobeFace" cx="42%" cy="34%" r="68%">
          <stop offset="0%" stop-color="#ffd280" />
          <stop offset="60%" stop-color="#fb923c" />
          <stop offset="100%" stop-color="#e05e0b" />
        </radialGradient>
        <radialGradient id="orbPurple" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#e9d5ff" />
          <stop offset="45%" stop-color="#a855f7" />
          <stop offset="100%" stop-color="#6b21a8" />
        </radialGradient>
        <radialGradient id="orbPink" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#fbcfe8" />
          <stop offset="50%" stop-color="#ec4899" />
          <stop offset="100%" stop-color="#9d174d" />
        </radialGradient>
        <radialGradient id="orbCyan" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#bae6fd" />
          <stop offset="50%" stop-color="#38bdf8" />
          <stop offset="100%" stop-color="#0369a1" />
        </radialGradient>
      </defs>

      {/* Waving left-viewer arm */}
      <path
        d="M42 78 C27 70, 20 56, 22 44"
        stroke="url(#lobeBody)"
        stroke-width="9.5"
        stroke-linecap="round"
      />
      {/* Waving hand fingers */}
      <circle cx="21.5" cy="41.5" r="5.5" fill="#ffb048" />
      <path
        d="M17 37 L15 31 M21 35.5 L20.8 29 M25.5 36.5 L27.5 30.8 M27.5 41 L31.5 38"
        stroke="#ffb048"
        stroke-width="3.1"
        stroke-linecap="round"
      />
      <path
        d="M24 51 C26 53, 29 53.5, 31 52"
        stroke="#a855f7"
        stroke-width="2.4"
        stroke-linecap="round"
      />

      {/* Right resting arm */}
      <path
        d="M84 79 C92 86, 95 96, 94 106"
        stroke="url(#lobeBody)"
        stroke-width="9"
        stroke-linecap="round"
      />

      {/* Torso */}
      <path d="M43 74 C43 68, 83 68, 83 74 L88 109 L38 109 Z" fill="url(#lobeBody)" />
      {/* Purple V collar accent */}
      <path d="M51 76 L63 92 L75 76 Z" fill="#9333ea" opacity="0.88" />

      {/* Colorful 3D-shaded cloud/brain hair */}
      <circle cx="45" cy="24" r="12" fill="url(#orbPurple)" />
      <circle cx="62" cy="17" r="14" fill="url(#orbCyan)" />
      <circle cx="80" cy="22" r="12.5" fill="url(#orbPink)" />
      <circle cx="90" cy="33" r="9" fill="url(#lobeFace)" />
      <circle cx="36" cy="33" r="8.5" fill="url(#lobeFace)" />
      <circle cx="55" cy="22" r="8.5" fill="url(#orbPurple)" opacity="0.88" />
      <circle cx="72" cy="19" r="8" fill="url(#orbPink)" opacity="0.88" />

      {/* Head */}
      <rect
        x="34"
        y="28"
        width="58"
        height="46"
        rx="22"
        transform="rotate(4 63 51)"
        fill="url(#lobeFace)"
      />

      {/* Ears */}
      <circle cx="33.5" cy="51" r="5.2" fill="#f97316" />
      <circle cx="92" cy="54" r="5.2" fill="#ea580c" />

      {/* Big expressive eyes */}
      <circle cx="51.5" cy="50.5" r="9.2" fill="#ffffff" />
      <circle cx="74.5" cy="52" r="9.2" fill="#ffffff" />
      <circle cx="52.5" cy="51" r="5.7" fill="#1c1917" />
      <circle cx="73.8" cy="52.4" r="5.7" fill="#1c1917" />
      <circle cx="50.6" cy="48.8" r="2" fill="#ffffff" />
      <circle cx="72" cy="50.2" r="2" fill="#ffffff" />

      {/* Cheerful open mouth */}
      <path
        d="M57.5 62.5 Q62.8 69.5 68.5 63"
        fill="#7c2d12"
        stroke="#7c2d12"
        stroke-width="2"
        stroke-linecap="round"
      />
      <path d="M59.5 65.5 Q63 68 66.5 65.8" stroke="#fb7185" stroke-width="2.4" stroke-linecap="round" />
    </svg>
  );
}

export function PanelToggleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35">
      <rect x="2" y="2.5" width="12" height="11" rx="2" />
      <line x1="6" y1="2.5" x2="6" y2="13.5" />
    </svg>
  );
}

export function BellIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35">
      <path d="M8 2.2a3.8 3.8 0 0 0-3.8 3.8v2.3L2.9 10.2a.6.6 0 0 0 .5.9h9.2a.6.6 0 0 0 .5-.9l-1.3-1.9V6A3.8 3.8 0 0 0 8 2.2Z" />
      <path d="M6.5 12.4a1.6 1.6 0 0 0 3 0" stroke-linecap="round" />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4">
      <circle cx="7.2" cy="7.2" r="4.5" />
      <line x1="10.6" y1="10.6" x2="13.6" y2="13.6" stroke-linecap="round" />
    </svg>
  );
}

export function HomeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4">
      <path d="M2.5 6.8 8 2.3l5.5 4.5v6.2a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V6.8Z" stroke-linejoin="round" />
      <path d="M6.3 14V9.5h3.4V14" stroke-linejoin="round" />
    </svg>
  );
}

export function TasksIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4">
      <circle cx="3.5" cy="4.5" r="1.2" />
      <line x1="6.5" y1="4.5" x2="13.5" y2="4.5" stroke-linecap="round" />
      <path d="m2.5 8.5.9.9 1.7-1.8" stroke-linecap="round" stroke-linejoin="round" />
      <line x1="6.5" y1="8.5" x2="13.5" y2="8.5" stroke-linecap="round" />
      <circle cx="3.5" cy="12.2" r="1.2" />
      <line x1="6.5" y1="12.2" x2="11.5" y2="12.2" stroke-linecap="round" />
    </svg>
  );
}

export function PagesIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4">
      <path d="M4 2.2h5.5L12.8 5.5v8.3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3.2a1 1 0 0 1 1-1Z" stroke-linejoin="round" />
      <path d="M9.2 2.2v3.5h3.5" stroke-linejoin="round" />
      <line x1="5.3" y1="8.5" x2="10.4" y2="8.5" stroke-linecap="round" />
      <line x1="5.3" y1="11" x2="9" y2="11" stroke-linecap="round" />
    </svg>
  );
}

export function BotItemIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.3" fill="#172554" stroke="#38bdf8" stroke-width="1.1" />
      <circle cx="6.1" cy="7.7" r="1" fill="#7dd3fc" />
      <circle cx="9.9" cy="7.7" r="1" fill="#7dd3fc" />
      <path d="M5.8 10.4c1.2.8 3.2.8 4.4 0" stroke="#7dd3fc" stroke-width="1.1" stroke-linecap="round" />
    </svg>
  );
}

export function SpinnerItemIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#71717a" stroke-width="1.4">
      <circle cx="8" cy="8" r="5.8" stroke-dasharray="2.3 2.3" />
    </svg>
  );
}

export function AgentLoopIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4">
      <path
        d="M5.1 6C3.7 6 2.6 7 2.6 8.2s1.1 2.2 2.5 2.2c1.9 0 3.9-4.4 5.8-4.4 1.4 0 2.5 1 2.5 2.2s-1.1 2.2-2.5 2.2C9 10.4 7 6 5.1 6Z"
        stroke-linecap="round"
      />
    </svg>
  );
}

export function SendArrowIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M13.6 2.4a.75.75 0 0 1 .18.78l-3.9 10.4a.75.75 0 0 1-1.39.04L6.65 9.35 2.38 7.51a.75.75 0 0 1 .04-1.39l10.4-3.9a.75.75 0 0 1 .78.18Z" />
    </svg>
  );
}
