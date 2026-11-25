import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { MailThreadItem } from '../core/inbox';
import type {
  ArtifactRevision,
  InboxProvider,
  NavSection,
  TopicThread,
} from '../core/types';
import { SearchIcon } from './icons';
import './command-palette.css';

interface CommandItem {
  readonly id: string;
  readonly group: 'Sections' | 'Workpapers' | 'Inbox' | 'Actions';
  readonly label: string;
  readonly detail: string;
  readonly shortcut?: string;
  readonly run: () => void;
}

interface CommandPaletteProps {
  readonly isOpen: boolean;
  readonly topics: ReadonlyArray<TopicThread>;
  readonly mailThreads: ReadonlyArray<MailThreadItem>;
  readonly revisions: ReadonlyArray<ArtifactRevision>;
  readonly onClose: () => void;
  readonly onSelectSection: (section: NavSection) => void;
  readonly onOpenInboxProvider: (provider: InboxProvider) => void;
  readonly onOpenTopic: (topicId: string) => void;
  readonly onOpenMailThread: (mailId: string) => void;
  readonly onUndoLatestRevision: (revisionId: string) => void;
}

export function CommandPalette({
  isOpen,
  topics,
  mailThreads,
  revisions,
  onClose,
  onSelectSection,
  onOpenInboxProvider,
  onOpenTopic,
  onOpenMailThread,
  onUndoLatestRevision,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    setQuery('');
    setActiveIndex(0);
    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => {
      cancelAnimationFrame(frame);
      previousFocusRef.current?.focus?.();
    };
  }, [isOpen]);

  const items = useMemo<ReadonlyArray<CommandItem>>(() => {
    const list: CommandItem[] = [
      {
        id: 'sec-home',
        group: 'Sections',
        label: 'Home',
        detail: 'Today queue, composer & recent workpapers',
        shortcut: 'G H',
        run: () => onSelectSection('home'),
      },
      {
        id: 'sec-inbox-gmail',
        group: 'Sections',
        label: 'Inbox — Gmail',
        detail: 'Client & HMRC correspondence',
        shortcut: 'G I',
        run: () => onOpenInboxProvider('gmail'),
      },
      {
        id: 'sec-inbox-outlook',
        group: 'Sections',
        label: 'Inbox — Outlook',
        detail: 'Microsoft 365 firm mailbox',
        run: () => onOpenInboxProvider('outlook'),
      },
      {
        id: 'sec-clients',
        group: 'Sections',
        label: 'Clients & Bookkeeping Close',
        detail: 'Monthly close checklists & statutory engagements',
        shortcut: 'G C',
        run: () => onSelectSection('clients'),
      },
      {
        id: 'sec-connectors',
        group: 'Sections',
        label: 'Connectors',
        detail: 'Xero, NetSuite, QuickBooks, Sage, SharePoint & HMRC',
        run: () => onSelectSection('connectors'),
      },
      {
        id: 'sec-admin',
        group: 'Sections',
        label: 'Firm Admin',
        detail: 'Staff roster, signing authority & workload',
        shortcut: 'G A',
        run: () => onSelectSection('admin'),
      },
      {
        id: 'sec-profile',
        group: 'Sections',
        label: 'Profile & Session',
        detail: 'Partner identity & SSO session controls',
        run: () => onSelectSection('profile'),
      },
    ];

    for (const topic of topics) {
      list.push({
        id: `wp-${topic.id}`,
        group: 'Workpapers',
        label: topic.title,
        detail: `Workpaper · ${topic.dateLabel}`,
        run: () => onOpenTopic(topic.id),
      });
    }

    for (const thread of mailThreads) {
      list.push({
        id: `mail-${thread.id}`,
        group: 'Inbox',
        label: thread.subject,
        detail: `${thread.gmailLabel?.text ?? 'Inbox'} · ${thread.senderName}`,
        run: () => onOpenMailThread(thread.id),
      });
    }

    const latestRev = revisions[revisions.length - 1];
    if (latestRev) {
      list.push({
        id: `undo-${latestRev.id}`,
        group: 'Actions',
        label: `Undo latest save (${latestRev.summary[0] ?? latestRev.blockId})`,
        detail: `Saved by ${latestRev.actorName}`,
        run: () => onUndoLatestRevision(latestRev.id),
      });
    }

    return list;
  }, [
    mailThreads,
    onOpenInboxProvider,
    onOpenMailThread,
    onOpenTopic,
    onSelectSection,
    onUndoLatestRevision,
    revisions,
    topics,
  ]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 18);
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.detail.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q)
    );
  }, [items, query]);

  useEffect(() => {
    if (activeIndex >= filtered.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, filtered.length]);

  if (!isOpen) return null;

  function executeItem(item: CommandItem | undefined) {
    if (!item) return;
    onClose();
    item.run();
  }

  return (
    <div
      class="cmd-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        class="cmd-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex((idx) => (filtered.length === 0 ? 0 : (idx + 1) % filtered.length));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((idx) =>
              filtered.length === 0 ? 0 : (idx - 1 + filtered.length) % filtered.length
            );
          } else if (e.key === 'Enter') {
            e.preventDefault();
            executeItem(filtered[activeIndex]);
          }
        }}
      >
        <div class="cmd-search-bar">
          <SearchIcon />
          <input
            ref={inputRef}
            type="search"
            class="cmd-search-input"
            placeholder="Jump to workpaper, client, mail thread, or section…"
            aria-label="Search commands, workpapers, and inbox threads"
            value={query}
            onInput={(e) => {
              setQuery((e.currentTarget as HTMLInputElement).value);
              setActiveIndex(0);
            }}
          />
          <kbd class="cmd-kbd">Esc</kbd>
        </div>

        <div class="cmd-results" role="listbox" aria-label="Matching destinations">
          {filtered.length === 0 ? (
            <div class="cmd-empty-state">
              <span>No matching workpapers, sections, or mail threads for “{query}”.</span>
              <button
                type="button"
                class="ghost-pill"
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
              >
                Clear filter
              </button>
            </div>
          ) : (
            filtered.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={idx === activeIndex}
                class={`cmd-item ${idx === activeIndex ? 'is-active' : ''}`}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => executeItem(item)}
              >
                <div class="cmd-item-main">
                  <span class="cmd-item-group">{item.group}</span>
                  <span class="cmd-item-label">{item.label}</span>
                  <span class="cmd-item-detail">{item.detail}</span>
                </div>
                {item.shortcut && <kbd class="cmd-kbd">{item.shortcut}</kbd>}
              </button>
            ))
          )}
        </div>

        <div class="cmd-footer">
          <span>↑↓ Navigate</span>
          <span>↵ Open</span>
          <span>Esc Close</span>
          <span>⌘K Toggle palette</span>
        </div>
      </div>
    </div>
  );
}
