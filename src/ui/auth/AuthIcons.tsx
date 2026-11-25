export function EntraIdLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2.4 3.4 12.1c-.4.45-.35 1.14.1 1.54l7.55 6.66c.54.48 1.36.48 1.9 0l7.55-6.66c.45-.4.5-1.09.1-1.54L12 2.4Z" fill="#0078D4" />
      <path d="M12 2.4v18.26c.35 0 .69-.12.95-.36l7.55-6.66c.45-.4.5-1.09.1-1.54L12 2.4Z" fill="#2563EB" />
      <path d="M12 8.2 7.2 13.5l4.8 4.2 4.8-4.2L12 8.2Z" fill="#50E6FF" />
    </svg>
  );
}

export function OktaLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9.2" fill="#007DC1" />
      <circle cx="12" cy="12" r="4.4" fill="#0e0e11" />
    </svg>
  );
}

export function InviteEnvelopeIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#e4e4e7"
      stroke-width="1.7"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m3.8 6.5 8.2 6.1 8.2-6.1" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}
