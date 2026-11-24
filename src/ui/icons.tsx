export function LucyBrandMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#161619" stroke="rgba(255,255,255,0.14)" />
      <path
        d="M8.8 6.8v9.4c0 .6.4 1 1 1h5.8"
        stroke="#f4f4f6"
        stroke-width="2"
        stroke-linecap="round"
      />
    </svg>
  );
}

export function ThreadItemIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2.5" y="2.5" width="15" height="15" rx="4.5" fill="#141418" stroke="rgba(255,255,255,0.1)" />
      <line x1="6.5" y1="8" x2="13.5" y2="8" stroke="#a1a1aa" stroke-width="1.3" stroke-linecap="round" />
      <line x1="6.5" y1="11.8" x2="11.2" y2="11.8" stroke="#71717a" stroke-width="1.3" stroke-linecap="round" />
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

export function BotItemIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="5" stroke="#71717a" stroke-width="1.3" />
      <circle cx="8" cy="8" r="1.6" fill="#a1a1aa" />
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

export function SendArrowIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M13.6 2.4a.75.75 0 0 1 .18.78l-3.9 10.4a.75.75 0 0 1-1.39.04L6.65 9.35 2.38 7.51a.75.75 0 0 1 .04-1.39l10.4-3.9a.75.75 0 0 1 .78.18Z" />
    </svg>
  );
}
