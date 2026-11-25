import { useState } from 'preact/hooks';
import { formatAccountingNumber, parseMoneyInput } from '../../core/money';

interface MoneyInputProps {
  readonly value: number;
  readonly baselineValue?: number;
  readonly decimals?: 0 | 2;
  readonly allowNegative?: boolean;
  readonly placeholder?: string;
  readonly ariaLabel: string;
  readonly onChange: (next: number) => void;
}

/**
 * Accessible accounting numeric cell input:
 * - Displays tabular thousand-separated accounting format at rest
 * - Switches to raw editable digits while focused so typing never fights formatting
 * - Marks modified values subtly without noisy badges
 */
export function MoneyInput({
  value,
  baselineValue,
  decimals = 0,
  allowNegative = true,
  placeholder = '0',
  ariaLabel,
  onChange,
}: MoneyInputProps) {
  const [focused, setFocused] = useState(false);
  const [rawText, setRawText] = useState('');

  const isEdited =
    baselineValue !== undefined && Math.abs(value - baselineValue) > 0.0001;

  const restDisplay =
    value === 0 && decimals > 0 && placeholder
      ? ''
      : formatAccountingNumber(value, { decimals });

  function commitRaw(input: string) {
    const parsed = parseMoneyInput(input);
    if (parsed === null) {
      onChange(0);
      return;
    }
    const clamped = allowNegative ? parsed : Math.max(0, parsed);
    const factor = 10 ** decimals;
    const rounded = Math.round(clamped * factor) / factor;
    onChange(Object.is(rounded, -0) ? 0 : rounded);
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      class={`acct-inline-num-input ${isEdited ? 'is-edited' : ''}`}
      value={focused ? rawText : restDisplay}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onFocus={(e) => {
        setFocused(true);
        const initialRaw =
          value === 0
            ? ''
            : decimals > 0
              ? value.toFixed(decimals).replace(/\.00$/, '')
              : String(value);
        setRawText(initialRaw);
        requestAnimationFrame(() => {
          (e.target as HTMLInputElement | null)?.select?.();
        });
      }}
      onInput={(e) => {
        const nextRaw = (e.currentTarget as HTMLInputElement).value;
        setRawText(nextRaw);
        const live = parseMoneyInput(nextRaw);
        if (live !== null) {
          const clamped = allowNegative ? live : Math.max(0, live);
          const factor = 10 ** decimals;
          const rounded = Math.round(clamped * factor) / factor;
          onChange(Object.is(rounded, -0) ? 0 : rounded);
        } else if (nextRaw.trim() === '') {
          onChange(0);
        }
      }}
      onBlur={(e) => {
        commitRaw((e.currentTarget as HTMLInputElement).value);
        setFocused(false);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          (e.currentTarget as HTMLInputElement).blur();
        }
      }}
    />
  );
}
