import type { OnboardingStepId } from './onboarding';
import type { AuthProviderId, InboxProvider } from './types';

/**
 * Stable seeded workpaper topic IDs. Every deep link across Home, Inbox, Clients, and Firm Admin
 * resolves to one canonical seeded workpaper rather than minting duplicate copies on reload.
 */
export const SEEDED_WORKPAPER_IDS: Readonly<Record<string, string>> = {
  'trial-balance': 'wp-acme-tb',
  tb: 'wp-acme-tb',
  flux: 'wp-acme-tb',
  reconciliation: 'wp-acme-recon',
  recon: 'wp-acme-recon',
  'bank-rec': 'wp-acme-recon',
  vouching: 'wp-acme-vouch',
  vouch: 'wp-acme-vouch',
  'wp-e40': 'wp-acme-vouch',
  'journal-entry': 'wp-acme-aje',
  aje: 'wp-acme-aje',
  je: 'wp-acme-aje',
  'pbc-tracker': 'wp-acme-pbc',
  pbc: 'wp-acme-pbc',
  'tax-bridge': 'wp-vela-tax',
  tax: 'wp-vela-tax',
  m1: 'wp-vela-tax',
  k1: 'wp-vela-tax',
  rollforward: 'wp-kensington-rf',
  asc606: 'wp-kensington-rf',
  asc842: 'wp-kensington-rf',
  waterfall: 'wp-kensington-rf',
  'cited-document': 'wp-acme-msa-pdf',
  pdf: 'wp-acme-msa-pdf',
  contract: 'wp-acme-msa-pdf',
  redline: 'wp-acme-msa-diff',
  diff: 'wp-acme-msa-diff',
  spreadsheet: 'wp-firm-q4-model',
  excel: 'wp-firm-q4-model',
  xlsx: 'wp-firm-q4-model',
  csv: 'wp-firm-q4-model',
  'sql-canvas': 'wp-acme-sql',
  sql: 'wp-acme-sql',
  topology: 'wp-acme-dag',
  dag: 'wp-acme-dag',
  'slide-deck': 'wp-acme-deck',
  deck: 'wp-acme-deck',
  slides: 'wp-acme-deck',
  'code-workspace': 'wp-acme-code',
  code: 'wp-acme-code',
};

export function resolveSeededWorkpaperId(routeOrId: string): string | undefined {
  const clean = routeOrId.trim().toLowerCase();
  return SEEDED_WORKPAPER_IDS[clean];
}

export type AppRoute =
  | { readonly kind: 'home' }
  | {
      readonly kind: 'workpaper';
      readonly topicId: string;
      readonly blockId?: string | null;
      readonly anchor?: string | null;
    }
  | {
      readonly kind: 'inbox';
      readonly provider: InboxProvider;
      readonly mailId?: string | null;
    }
  | {
      readonly kind: 'clients';
      readonly clientId?: string | null;
      readonly engagementId?: string | null;
    }
  | { readonly kind: 'connectors' }
  | { readonly kind: 'admin' }
  | { readonly kind: 'profile' }
  | { readonly kind: 'login'; readonly mode: AuthProviderId }
  | { readonly kind: 'onboarding'; readonly step: OnboardingStepId };

const VALID_STEPS = new Set<OnboardingStepId>([
  'firm',
  'identity',
  'stack',
  'templates',
  'team',
]);

export function parseRoute(searchOrUrl: string): AppRoute {
  const queryText = searchOrUrl.includes('?')
    ? searchOrUrl.slice(searchOrUrl.indexOf('?'))
    : searchOrUrl.startsWith('page=') || searchOrUrl.startsWith('stage=')
      ? `?${searchOrUrl}`
      : searchOrUrl;

  const params = new URLSearchParams(queryText);
  const rawPage = params.get('page')?.trim().toLowerCase();
  const rawProvider = (params.get('provider') ?? params.get('inbox'))?.trim().toLowerCase();

  if (rawPage === 'login' || rawPage === 'signin') {
    const rawMode = (params.get('mode') ?? params.get('auth'))?.trim().toLowerCase();
    const mode: AuthProviderId =
      rawMode === 'okta' || rawMode === 'invite' ? rawMode : 'entra';
    return { kind: 'login', mode };
  }

  if (rawPage === 'onboarding' || rawPage === 'setup') {
    const rawStep = params.get('step')?.trim().toLowerCase() as OnboardingStepId | undefined;
    const step: OnboardingStepId = rawStep && VALID_STEPS.has(rawStep) ? rawStep : 'firm';
    return { kind: 'onboarding', step };
  }

  if (rawPage === 'profile') {
    return { kind: 'profile' };
  }

  if (rawPage === 'connectors') {
    return { kind: 'connectors' };
  }

  if (rawPage === 'admin') {
    return { kind: 'admin' };
  }

  if (rawPage === 'clients') {
    const clientId = params.get('client')?.trim() || null;
    const engagementId = params.get('eng')?.trim() || null;
    return { kind: 'clients', clientId, engagementId };
  }

  if (rawPage === 'inbox' || rawProvider === 'gmail' || rawProvider === 'outlook') {
    const provider: InboxProvider = rawProvider === 'outlook' ? 'outlook' : 'gmail';
    const mailId = (params.get('thread') ?? params.get('mail'))?.trim() || null;
    return { kind: 'inbox', provider, mailId };
  }

  if (rawPage === 'workpaper') {
    const id = params.get('id')?.trim();
    if (id) {
      return {
        kind: 'workpaper',
        topicId: id,
        blockId: params.get('block')?.trim() || null,
        anchor: params.get('anchor')?.trim() || null,
      };
    }
  }

  const rawStage = params.get('stage')?.trim().toLowerCase();
  if (rawStage) {
    const seededId = resolveSeededWorkpaperId(rawStage);
    if (seededId) {
      return {
        kind: 'workpaper',
        topicId: seededId,
        blockId: null,
        anchor: params.get('anchor')?.trim() || null,
      };
    }
  }

  return { kind: 'home' };
}

export function formatRoute(route: AppRoute, pathname = '/'): string {
  const params = new URLSearchParams();

  switch (route.kind) {
    case 'home':
      return pathname;

    case 'workpaper':
      params.set('page', 'workpaper');
      params.set('id', route.topicId);
      if (route.blockId) params.set('block', route.blockId);
      if (route.anchor) params.set('anchor', route.anchor);
      break;

    case 'inbox':
      params.set('page', 'inbox');
      params.set('provider', route.provider);
      if (route.mailId) params.set('thread', route.mailId);
      break;

    case 'clients':
      params.set('page', 'clients');
      if (route.clientId) params.set('client', route.clientId);
      if (route.engagementId) params.set('eng', route.engagementId);
      break;

    case 'connectors':
    case 'admin':
    case 'profile':
      params.set('page', route.kind);
      break;

    case 'login':
      params.set('page', 'login');
      params.set('mode', route.mode);
      break;

    case 'onboarding':
      params.set('page', 'onboarding');
      params.set('step', route.step);
      break;
  }

  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function routesEqual(a: AppRoute, b: AppRoute): boolean {
  return formatRoute(a) === formatRoute(b);
}

export function isSamePrimaryView(a: AppRoute, b: AppRoute): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'workpaper' && b.kind === 'workpaper') {
    return a.topicId === b.topicId;
  }
  if (a.kind === 'clients' && b.kind === 'clients') {
    return (a.clientId ?? null) === (b.clientId ?? null);
  }
  if (a.kind === 'inbox' && b.kind === 'inbox') {
    return (
      a.provider === b.provider && (a.mailId ?? null) === (b.mailId ?? null)
    );
  }
  return true;
}

export function getRouteTitle(
  route: AppRoute,
  context: { readonly topicTitle?: string; readonly clientName?: string } = {}
): string {
  switch (route.kind) {
    case 'home':
      return 'Home — Lucy';
    case 'workpaper':
      return `${context.topicTitle ?? 'Workpaper'} — Lucy`;
    case 'inbox':
      return `Inbox (${route.provider === 'outlook' ? 'Outlook' : 'Gmail'}) — Lucy`;
    case 'clients':
      return context.clientName
        ? `${context.clientName} · Clients — Lucy`
        : 'Clients — Lucy';
    case 'connectors':
      return 'Connectors — Lucy';
    case 'admin':
      return 'Firm Admin — Lucy';
    case 'profile':
      return 'Profile — Lucy';
    case 'login':
      return 'Sign in — Lucy';
    case 'onboarding':
      return 'Workspace Setup — Lucy';
  }
}
