export type CurrencyCode = 'GBP' | 'USD' | 'EUR';

export interface FormatMoneyOptions {
  readonly currency?: CurrencyCode;
  readonly decimals?: 0 | 2;
  readonly accounting?: boolean;
  readonly signed?: boolean;
}

const CURRENCY_LOCALE: Readonly<Record<CurrencyCode, string>> = {
  GBP: 'en-GB',
  USD: 'en-US',
  EUR: 'de-DE',
};

const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(
  currency: CurrencyCode,
  decimals: 0 | 2,
  accounting: boolean
): Intl.NumberFormat {
  const key = `${currency}:${decimals}:${accounting ? 'acct' : 'std'}`;
  let fmt = formatterCache.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat(CURRENCY_LOCALE[currency], {
      style: 'currency',
      currency,
      currencySign: accounting ? 'accounting' : 'standard',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    formatterCache.set(key, fmt);
  }
  return fmt;
}

/**
 * Converts a major-unit decimal number (e.g. 3442.1) into exact integer minor units (344210).
 */
export function toMinorUnits(majorAmount: number): number {
  if (!Number.isFinite(majorAmount)) return 0;
  const rounded = Math.round(majorAmount * 100);
  return Object.is(rounded, -0) ? 0 : rounded;
}

/**
 * Converts integer minor units (e.g. 344210) into major units (3442.1) for serialization/inputs.
 */
export function fromMinorUnits(minorUnits: number): number {
  if (!Number.isFinite(minorUnits)) return 0;
  const val = Math.round(minorUnits) / 100;
  return Object.is(val, -0) ? 0 : val;
}

/**
 * Sums major-unit numbers via exact integer minor units so cent balances never suffer IEEE-754 drift.
 */
export function sumMajorViaMinor(values: ReadonlyArray<number>): number {
  let totalMinor = 0;
  for (const v of values) {
    totalMinor += toMinorUnits(v);
  }
  return Object.is(totalMinor, -0) ? 0 : totalMinor;
}

/**
 * Formats integer minor units consistently across every screen and renderer.
 */
export function formatMoneyMinor(
  minorUnits: number,
  options: FormatMoneyOptions = {}
): string {
  const currency = options.currency ?? 'GBP';
  const decimals = options.decimals ?? 2;
  const accounting = options.accounting ?? false;
  const signed = options.signed ?? false;

  const cleanMinor = Object.is(Math.round(minorUnits), -0) ? 0 : Math.round(minorUnits);
  const major = cleanMinor / 100;

  if (signed && cleanMinor !== 0 && !accounting) {
    const absText = getFormatter(currency, decimals, false).format(Math.abs(major));
    return cleanMinor > 0 ? `+${absText}` : `-${absText}`;
  }

  return getFormatter(currency, decimals, accounting).format(major);
}

/**
 * Convenience wrapper formatting major-unit numbers via exact integer minor conversion.
 */
export function formatMoney(
  majorAmount: number,
  options: FormatMoneyOptions = {}
): string {
  return formatMoneyMinor(toMinorUnits(majorAmount), options);
}

/**
 * Formats plain accounting numbers without currency symbol (e.g. "(960,000)" or "1,422,362").
 */
export function formatAccountingNumber(
  majorAmount: number,
  options: { readonly decimals?: 0 | 2; readonly signed?: boolean } = {}
): string {
  const minor = toMinorUnits(majorAmount);
  const decimals = options.decimals ?? 0;
  const absText = (Math.abs(minor) / 100).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  if (minor < 0) {
    return options.signed ? `-${absText}` : `(${absText})`;
  }
  if (options.signed && minor > 0) {
    return `+${absText}`;
  }
  return absText;
}

/**
 * Parses user-entered accounting/money text ("45,000", "(18,500.50)", "-£250", "$1,200") into major units.
 */
export function parseMoneyInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return 0;
  const isParenNeg = /^\(.*\)$/.test(trimmed);
  const stripped = trimmed.replace(/[£$€,\s()]/g, '');
  if (!/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(stripped)) return null;
  const parsed = Number(stripped);
  if (!Number.isFinite(parsed)) return null;
  const signed = isParenNeg ? -Math.abs(parsed) : parsed;
  return fromMinorUnits(toMinorUnits(signed));
}

export const REFERENCE_CLOCK_ISO = '2026-11-25T09:30:00Z';

export function getTimeGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function formatCalendarDate(
  isoDate: string,
  style: 'short' | 'weekday-time' | 'month-day' = 'short'
): string {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;

  if (style === 'month-day') {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      timeZone: 'UTC',
    }).format(d);
  }

  if (style === 'weekday-time') {
    const datePart = new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(d);
    const timePart = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'UTC',
    }).format(d);
    return `${datePart}, ${timePart}`;
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d);
}

export function formatAuditTimestamp(
  isoTimestamp: string,
  nowMs: number = Date.now()
): string {
  const parsed = Date.parse(isoTimestamp);
  if (Number.isNaN(parsed)) return isoTimestamp;
  const diffSec = Math.max(0, Math.floor((nowMs - parsed) / 1000));
  if (diffSec < 45) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  const d = new Date(parsed);
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}
