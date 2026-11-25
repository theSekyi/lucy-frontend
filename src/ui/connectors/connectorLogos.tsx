import type { JSX } from 'preact';

export function GmailLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 6.8V18a1.8 1.8 0 0 0 1.8 1.8h2.1V10.4L3 7.4v-.6Z" fill="#4285F4" />
      <path d="M17.1 19.8h2.1A1.8 1.8 0 0 0 21 18V6.8l-3.9 3.6v9.4Z" fill="#34A853" />
      <path d="M17.1 5.1v5.3L21 7.4V6.2a2 2 0 0 0-3.2-1.6l-.7.5Z" fill="#FBBC04" />
      <path d="M6.9 10.4V5.1L12 8.9l5.1-3.8v5.3L12 14.2l-5.1-3.8Z" fill="#EA4335" />
      <path d="M3 6.2v1.2l3.9 3V5.1l-.7-.5A2 2 0 0 0 3 6.2Z" fill="#C5221F" />
    </svg>
  );
}

export function OutlookLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="8.5" y="4" width="13" height="16" rx="2" fill="#28A8EA" />
      <path d="M8.5 9.5 15 13.8l6.5-4.3V18a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2V9.5Z" fill="#0078D4" />
      <rect x="2.5" y="6.5" width="11" height="11" rx="2" fill="#0364B8" />
      <ellipse cx="8" cy="12" rx="3" ry="3.4" stroke="#ffffff" stroke-width="1.7" />
    </svg>
  );
}

export function XeroLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#13B5EA" />
      <path d="m6.2 9.5 3.6 5m0-5-3.6 5" stroke="#fff" stroke-width="1.7" stroke-linecap="round" />
      <circle cx="15.8" cy="12" r="2.6" stroke="#fff" stroke-width="1.7" />
    </svg>
  );
}

export function QuickBooksLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#2CA01C" />
      <path
        d="M10.4 8.2H8.9a3.3 3.3 0 0 0 0 6.6h1.5V17m3.2-10v8.6h1.5a3.3 3.3 0 0 0 0-6.6h-1.5"
        stroke="#fff"
        stroke-width="1.75"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}

export function SageLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5.5" fill="#0d1f14" stroke="#00D639" stroke-width="1.2" />
      <path
        d="M15.6 9c-.8-.6-2-.8-3.2-.8-2 0-3.4 1-3.4 2.3 0 3 6.8 1.4 6.8 4.6 0 1.5-1.5 2.5-3.8 2.5-1.4 0-2.7-.4-3.5-1"
        stroke="#00D639"
        stroke-width="2"
        stroke-linecap="round"
      />
    </svg>
  );
}

export function NetSuiteLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" fill="#162944" />
      <path d="M6.5 17.2V6.8h3.4l4.2 6.2V6.8h3.4v10.4h-3.4L9.9 11v6.2H6.5Z" fill="#7FB3FF" />
    </svg>
  );
}

export function FreeAgentLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" fill="#007AB8" />
      <path d="M6.5 16.5C8.5 11 12.5 8 18 7.2c-2.3 2.5-3.4 4.8-3.8 7.3-2.5-.4-5 .4-7.7 2Z" fill="#fff" />
    </svg>
  );
}

export function HmrcLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" fill="#00703C" />
      {/* Minimal UK Crown emblem */}
      <path
        d="M6.2 15.5h11.6M6.8 13.2 5.8 9l3.3 2 2.9-3.6 2.9 3.6 3.3-2-1 4.2H6.8Z"
        stroke="#ffffff"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <circle cx="12" cy="5.8" r="0.9" fill="#ffffff" />
    </svg>
  );
}

export function CompaniesHouseLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" fill="#1D70B8" />
      <path d="M5.5 9.2 12 5.8l6.5 3.4H5.5ZM6.5 17.5h11M8 10.8v5.2m4-5.2v5.2m4-5.2v5.2" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

export function CchAxcessLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" fill="#111827" stroke="rgba(255,255,255,0.14)" />
      <path d="M6.2 10A6.2 6.2 0 0 1 16 6.8" stroke="#38BDF8" stroke-width="2.1" stroke-linecap="round" />
      <path d="M17.8 10.5A6.2 6.2 0 0 1 11 18.2" stroke="#22C55E" stroke-width="2.1" stroke-linecap="round" />
      <path d="M8.5 17.2A6.2 6.2 0 0 1 6.2 10" stroke="#EF4444" stroke-width="2.1" stroke-linecap="round" />
    </svg>
  );
}

export function UltraTaxLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" fill="#1f1610" />
      <circle cx="12" cy="12" r="6" stroke="#FF6600" stroke-width="2.2" stroke-dasharray="2.4 2.3" />
      <circle cx="12" cy="12" r="2" fill="#FF6600" />
    </svg>
  );
}

export function IrisTaxLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" fill="#17192e" />
      <polygon points="12,5.5 18,16.8 6,16.8" stroke="#38BDF8" stroke-width="1.8" fill="rgba(56,189,248,0.18)" />
    </svg>
  );
}

export function KarbonLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" fill="#1f1f24" />
      <path d="M8 6.5v11M16 6.5l-5.6 5.5L16 17.5" stroke="#FB7185" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

export function CasewareLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" fill="#14213d" />
      <polygon points="12,5.5 17.8,8.8 17.8,15.2 12,18.5 6.2,15.2 6.2,8.8" stroke="#FCA311" stroke-width="1.7" />
      <path d="m9.5 12 1.8 1.8 3.4-3.5" stroke="#ffffff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

export function DextLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" fill="#FF5A00" />
      <path d="M7.8 7h3.8a5 5 0 0 1 0 10H7.8V7Z" stroke="#fff" stroke-width="2.1" stroke-linejoin="round" />
    </svg>
  );
}

export function IgnitionLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" fill="#231412" />
      <path d="M12.8 5.8 7.5 13h4.2l-.6 5.2 5.4-7.2h-4.2l.5-5.2Z" fill="#FF5C35" />
    </svg>
  );
}

export function OpenBankingLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" fill="#18181b" stroke="rgba(255,255,255,0.15)" />
      <path d="m7 9.5 5-3 5 3-5 3-5-3Zm0 5 5-3 5 3-5 3-5-3Z" stroke="#e4e4e7" stroke-width="1.5" stroke-linejoin="round" />
    </svg>
  );
}

export function StripeLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" fill="#635BFF" />
      <path
        d="M14.8 9.2c-.8-.4-1.8-.6-2.7-.6-1.4 0-2.3.6-2.3 1.5 0 2.1 5.4 1.2 5.4 4.3 0 1.6-1.4 2.6-3.6 2.6-1.2 0-2.4-.3-3.2-.8"
        stroke="#fff"
        stroke-width="2.1"
        stroke-linecap="round"
      />
    </svg>
  );
}

export function GustoLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" fill="#F45D48" />
      <path
        d="M15 9.8a3.2 3.2 0 1 0 0 3.8v1.8a2.8 2.8 0 0 1-5.2 1.2"
        stroke="#fff"
        stroke-width="2"
        stroke-linecap="round"
      />
    </svg>
  );
}

export function SharePointLogo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="14.5" cy="7.5" r="5" fill="#036C70" />
      <circle cx="16.5" cy="14.5" r="4.2" fill="#1A9BA1" />
      <circle cx="12" cy="17.5" r="3.4" fill="#37C6D0" />
      <rect x="2.5" y="6.5" width="11" height="11" rx="2.2" fill="#038387" />
      <path
        d="M9.6 10.2c-.4-.3-1-.5-1.6-.5-.9 0-1.5.4-1.5 1 0 .6.5.8 1.5 1.1 1.3.4 2 .9 2 2 0 1.2-1 2-2.5 2-.9 0-1.7-.2-2.2-.6"
        stroke="#fff"
        stroke-width="1.5"
        stroke-linecap="round"
      />
    </svg>
  );
}

export function OneDriveLogo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9.8 8.4A5.2 5.2 0 0 1 19.5 10a4 4 0 0 1 1 7.8H6.2a4.3 4.3 0 0 1-.6-8.5 4.6 4.6 0 0 1 4.2-.9Z"
        fill="#0078D4"
      />
      <path
        d="M6.2 17.8h14.3a4 4 0 0 0 .8-6.4l-8.1 3.2-7-3.2a4.3 4.3 0 0 0 0 6.4Z"
        fill="#28A8EA"
      />
    </svg>
  );
}

export function GoogleDriveLogo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8.8 3.5h6.4l5.8 10-3.2 5.5-5.8-10L8.8 3.5Z" fill="#FBBC04" />
      <path d="M3 13.5 8.8 3.5l3.2 5.5-5.8 10L3 13.5Z" fill="#0F9D58" />
      <path d="M6.2 19h11.6l3.2-5.5H9.4L6.2 19Z" fill="#4285F4" />
    </svg>
  );
}

export const CONNECTOR_LOGOS: Readonly<Record<string, (props: { size?: number }) => JSX.Element>> = {
  gmail: GmailLogo,
  outlook: OutlookLogo,
  sharepoint: SharePointLogo,
  onedrive: OneDriveLogo,
  gdrive: GoogleDriveLogo,
  xero: XeroLogo,
  quickbooks: QuickBooksLogo,
  sage: SageLogo,
  netsuite: NetSuiteLogo,
  freeagent: FreeAgentLogo,
  'hmrc-mtd': HmrcLogo,
  'companies-house': CompaniesHouseLogo,
  'cch-axcess': CchAxcessLogo,
  ultratax: UltraTaxLogo,
  'iris-tax': IrisTaxLogo,
  karbon: KarbonLogo,
  caseware: CasewareLogo,
  dext: DextLogo,
  ignition: IgnitionLogo,
  'open-banking': OpenBankingLogo,
  stripe: StripeLogo,
  gusto: GustoLogo,
};
