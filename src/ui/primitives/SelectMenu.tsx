import type { JSX } from 'preact';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';

export interface SelectMenuOption<T extends string = string> {
  readonly value: T;
  readonly label: string;
  readonly meta?: string;
}

interface SelectMenuProps<T extends string = string> {
  readonly value: T;
  readonly options: ReadonlyArray<SelectMenuOption<T>>;
  readonly onChange: (nextValue: T) => void;
  readonly ariaLabel?: string;
  readonly size?: 'sm' | 'md';
  readonly align?: 'left' | 'right';
  readonly fullWidth?: boolean;
}

export function SelectMenu<T extends string = string>({
  value,
  options,
  onChange,
  ariaLabel,
  size = 'sm',
  align = 'left',
  fullWidth = false,
}: SelectMenuProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<JSX.CSSProperties | null>(null);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selectedIndex = useMemo(() => {
    const idx = options.findIndex((o) => o.value === value);
    return idx >= 0 ? idx : 0;
  }, [options, value]);

  const activeOption = options[selectedIndex] ?? options[0];

  const computeCoords = useCallback(() => {
    if (!triggerRef.current || typeof window === 'undefined') return;
    const rect = triggerRef.current.getBoundingClientRect();
    const estHeight = Math.min(240, options.length * 30 + 12);
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < estHeight + 12 && rect.top > estHeight;
    const minW = Math.max(Math.round(rect.width), 152);

    const vertical = openUpward
      ? { bottom: `${Math.round(window.innerHeight - rect.top + 5)}px` }
      : { top: `${Math.round(rect.bottom + 5)}px` };

    const horizontal =
      align === 'right'
        ? { right: `${Math.max(8, Math.round(window.innerWidth - rect.right))}px` }
        : {
            left: `${Math.max(
              8,
              Math.min(Math.round(rect.left), window.innerWidth - minW - 8)
            )}px`,
          };

    setCoords({
      ...vertical,
      ...horizontal,
      minWidth: `${minW}px`,
    });
  }, [align, options.length]);

  function openDropdown() {
    computeCoords();
    setHighlightIdx(selectedIndex);
    setIsOpen(true);
  }

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setIsOpen(false);
      }
    }

    function handleScrollOrResize(event: Event) {
      if (event.type === 'scroll' && menuRef.current?.contains(event.target as Node)) {
        return;
      }
      setIsOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setIsOpen(false);
        triggerRef.current?.focus();
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        setHighlightIdx((i) => (i + 1) % Math.max(1, options.length));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setHighlightIdx((i) => (i - 1 + options.length) % Math.max(1, options.length));
      } else if (event.key === 'Home') {
        event.preventDefault();
        setHighlightIdx(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        setHighlightIdx(Math.max(0, options.length - 1));
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        const chosen = options[highlightIdx];
        if (chosen) {
          onChange(chosen.value);
          setIsOpen(false);
          triggerRef.current?.focus();
        }
      } else if (event.key === 'Tab') {
        setIsOpen(false);
      }
    }

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, highlightIdx, onChange, options]);

  return (
    <div
      ref={rootRef}
      class={`ui-select-anchor ${fullWidth ? 'is-full' : ''} ${isOpen ? 'is-open' : ''}`}
    >
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        class={`ui-select-trigger is-${size} ${isOpen ? 'is-active' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          if (isOpen) setIsOpen(false);
          else openDropdown();
        }}
        onKeyDown={(e) => {
          if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault();
            openDropdown();
          }
        }}
      >
        <span class="ui-select-label">{activeOption?.label ?? value}</span>
        <svg
          class={`ui-select-chevron ${isOpen ? 'is-rotated' : ''}`}
          width="11"
          height="11"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          aria-hidden="true"
        >
          <path d="M3 4.5 6 7.5 9 4.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>

      {isOpen && coords && (
        <div
          ref={menuRef}
          role="listbox"
          aria-label={ariaLabel}
          class="ui-select-menu"
          style={coords}
        >
          {options.map((opt, idx) => {
            const isSelected = opt.value === value;
            const isHighlighted = idx === highlightIdx;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                class={`ui-select-option ${isSelected ? 'is-selected' : ''} ${
                  isHighlighted ? 'is-highlighted' : ''
                }`}
                onMouseEnter={() => setHighlightIdx(idx)}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(opt.value);
                  setIsOpen(false);
                }}
              >
                <span class="ui-select-option-text">
                  <span>{opt.label}</span>
                  {opt.meta && <span class="ui-select-option-meta">{opt.meta}</span>}
                </span>
                <span class="ui-select-check" aria-hidden="true">
                  {isSelected ? '✓' : ''}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
