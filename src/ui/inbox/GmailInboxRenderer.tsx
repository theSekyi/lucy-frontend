import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import type {
  GmailCategory,
  MailAttachmentLink,
  MailFolder,
  MailThreadItem,
} from '../../core/inbox';
import type { RendererRegistry } from '../../core/renderers';
import type { InboxProvider } from '../../core/types';
import { GmailLogo } from '../connectors/connectorLogos';
import { SearchIcon } from '../icons';
import { MailIntelligencePanel, type DeepLinkTarget } from './MailIntelligencePanel';
import {
  InboxProviderSwitch,
  InlineAttachmentDeck,
  InlineNewMailForm,
  useMailAttachmentPreview,
} from './MailSharedParts';

export interface MailProviderViewProps {
  readonly threads: ReadonlyArray<MailThreadItem>;
  readonly focusedThreadReq?: { readonly id: string; readonly pulse: number } | null;
  readonly registry: RendererRegistry<ComponentChildren>;
  readonly activeProvider: InboxProvider;
  readonly senderEmail: string;
  readonly onSwitchProvider: (provider: InboxProvider) => void;
  readonly onToggleStar: (id: string) => void;
  readonly onToggleFlag: (id: string) => void;
  readonly onMarkRead: (id: string, unread: boolean) => void;
  readonly onArchive: (id: string) => void;
  readonly onSendMail: (to: string, subject: string, body: string) => void;
  readonly onNavigateSource: (target: DeepLinkTarget) => void;
}

const GMAIL_LABELS: ReadonlyArray<{ text: string; color: string }> = [
  { text: 'HMRC & Tax', color: '#81c995' },
  { text: 'Audit PBC', color: '#fdd663' },
  { text: 'Urgent Sign-off', color: '#f28b82' },
  { text: 'Billing & ERP', color: '#8ab4f8' },
];

export function GmailInboxRenderer({
  threads,
  focusedThreadReq = null,
  registry,
  activeProvider,
  senderEmail,
  onSwitchProvider,
  onToggleStar,
  onMarkRead,
  onArchive,
  onSendMail,
  onNavigateSource,
}: MailProviderViewProps) {
  const [folder, setFolder] = useState<MailFolder>('inbox');
  const [category, setCategory] = useState<GmailCategory>('primary');
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [isRailCollapsed, setIsRailCollapsed] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= 740
  );
  const [query, setQuery] = useState('');
  const [openedId, setOpenedId] = useState<string | null>(focusedThreadReq?.id ?? null);
  const [isComposing, setIsComposing] = useState(false);
  const [replyPulse, setReplyPulse] = useState(0);

  const { previewBlock, clearPreview, openAttachment } = useMailAttachmentPreview(registry);

  useEffect(() => {
    if (focusedThreadReq?.id) {
      setIsComposing(false);
      setOpenedId(focusedThreadReq.id);
      clearPreview();
    }
  }, [focusedThreadReq?.id, focusedThreadReq?.pulse, clearPreview]);

  const unreadInbox = threads.filter((t) => t.folder === 'inbox' && t.unread).length;
  const unreadUpdates = threads.filter(
    (t) => t.folder === 'inbox' && t.gmailCategory === 'updates' && t.unread
  ).length;

  const q = query.trim().toLowerCase();
  const visibleThreads = threads.filter((t) => {
    if (folder === 'starred') {
      if (!t.starred) return false;
    } else if (t.folder !== folder) {
      return false;
    }
    if (activeLabel && t.gmailLabel?.text !== activeLabel) return false;
    if (!activeLabel && folder === 'inbox' && !q && t.gmailCategory !== category) {
      return false;
    }
    if (
      q &&
      !t.subject.toLowerCase().includes(q) &&
      !t.senderName.toLowerCase().includes(q) &&
      !t.snippet.toLowerCase().includes(q)
    ) {
      return false;
    }
    return true;
  });

  const openedThread = threads.find((t) => t.id === openedId) ?? null;

  function openThreadWithAttachment(item: MailThreadItem, att: MailAttachmentLink) {
    setIsComposing(false);
    setOpenedId(item.id);
    if (item.unread) onMarkRead(item.id, false);
    void openAttachment(att, false);
  }

  return (
    <div class="gmail-frame">
      <header class="gmail-topbar">
        <div class="gmail-brand">
          <button
            type="button"
            class="icon-action-btn"
            aria-label="Toggle Gmail navigation"
            onClick={() => setIsRailCollapsed((c) => !c)}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9aa0a6"
              stroke-width="2"
              aria-hidden="true"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <GmailLogo size={22} />
          <span class="gmail-wordmark">Gmail</span>
        </div>

        <div class="gmail-search-pill">
          <SearchIcon />
          <input
            type="search"
            class="gmail-search-input"
            placeholder="Search in mail"
            value={query}
            onInput={(e) => {
              setQuery((e.currentTarget as HTMLInputElement).value);
              setOpenedId(null);
              setIsComposing(false);
            }}
          />
        </div>

        <InboxProviderSwitch
          activeProvider={activeProvider}
          onSwitchProvider={onSwitchProvider}
        />
      </header>

      <div class="gmail-body">
        <nav
          class={`gmail-left-rail ${isRailCollapsed ? 'is-rail-collapsed' : ''}`}
          aria-label="Gmail folders"
        >
          <button
            type="button"
            class="gmail-compose-btn"
            onClick={() => {
              setOpenedId(null);
              clearPreview();
              setIsComposing(true);
            }}
            title="Compose"
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <path d="M12 20h9" stroke-linecap="round" />
              <path
                d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z"
                stroke-linejoin="round"
              />
            </svg>
            {!isRailCollapsed && <span>Compose</span>}
          </button>

          <button
            type="button"
            class={`gmail-folder-row ${folder === 'inbox' && !activeLabel ? 'is-active' : ''}`}
            title="Inbox"
            onClick={() => {
              setFolder('inbox');
              setActiveLabel(null);
              setOpenedId(null);
              setIsComposing(false);
            }}
          >
            <span class="gmail-folder-left">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M3 13h5l2 3h4l2-3h5" />
              </svg>
              {!isRailCollapsed && <span>Inbox</span>}
            </span>
            {!isRailCollapsed && unreadInbox > 0 && <span>{unreadInbox}</span>}
          </button>

          <button
            type="button"
            class={`gmail-folder-row ${folder === 'starred' ? 'is-active' : ''}`}
            title="Starred"
            onClick={() => {
              setFolder('starred');
              setActiveLabel(null);
              setOpenedId(null);
              setIsComposing(false);
            }}
          >
            <span class="gmail-folder-left">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <polygon points="12 2 15.1 8.3 22 9.3 17 14.1 18.2 21 12 17.7 5.8 21 7 14.1 2 9.3 8.9 8.3 12 2" />
              </svg>
              {!isRailCollapsed && <span>Starred</span>}
            </span>
          </button>

          <button
            type="button"
            class={`gmail-folder-row ${folder === 'sent' ? 'is-active' : ''}`}
            title="Sent"
            onClick={() => {
              setFolder('sent');
              setActiveLabel(null);
              setOpenedId(null);
              setIsComposing(false);
            }}
          >
            <span class="gmail-folder-left">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="m22 2-7 20-4-9-9-4 20-7Z" stroke-linejoin="round" />
                <path d="M22 2 11 13" />
              </svg>
              {!isRailCollapsed && <span>Sent</span>}
            </span>
          </button>

          <button
            type="button"
            class={`gmail-folder-row ${folder === 'archive' ? 'is-active' : ''}`}
            title="All Mail"
            onClick={() => {
              setFolder('archive');
              setActiveLabel(null);
              setOpenedId(null);
              setIsComposing(false);
            }}
          >
            <span class="gmail-folder-left">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <rect x="2" y="4" width="20" height="5" rx="1" />
                <path d="M4 9v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9" />
                <line x1="10" y1="13" x2="14" y2="13" />
              </svg>
              {!isRailCollapsed && <span>All Mail</span>}
            </span>
          </button>

          {!isRailCollapsed && (
            <>
              <div class="gmail-labels-header">Labels</div>
              {GMAIL_LABELS.map((lbl) => (
                <button
                  key={lbl.text}
                  type="button"
                  class={`gmail-folder-row ${activeLabel === lbl.text ? 'is-active' : ''}`}
                  onClick={() => {
                    setFolder('inbox');
                    setActiveLabel((curr) => (curr === lbl.text ? null : lbl.text));
                    setOpenedId(null);
                    setIsComposing(false);
                  }}
                >
                  <span class="gmail-folder-left">
                    <span class="gmail-label-dot" style={{ background: lbl.color }} />
                    <span>{lbl.text}</span>
                  </span>
                </button>
              ))}
            </>
          )}
        </nav>

        <section class="gmail-sheet" aria-label="Messages">
          {isComposing ? (
            <>
              <div class="gmail-action-strip">
                <button
                  type="button"
                  class="ghost-pill"
                  onClick={() => setIsComposing(false)}
                >
                  ← Back to Inbox
                </button>
                <span class="sheet-meta-count">New Message</span>
              </div>
              <InlineNewMailForm
                variant="gmail"
                senderEmail={senderEmail}
                onDiscard={() => setIsComposing(false)}
                onSend={(to, subject, body) => {
                  onSendMail(to, subject, body);
                  setIsComposing(false);
                }}
              />
            </>
          ) : openedThread ? (
            <>
              <div class="gmail-action-strip">
                <div class="stage-subbar-group">
                  <button
                    type="button"
                    class="ghost-pill"
                    onClick={() => {
                      setOpenedId(null);
                      clearPreview();
                    }}
                  >
                    ← Back to Inbox
                  </button>
                  <button
                    type="button"
                    class="ghost-pill"
                    onClick={() => {
                      onArchive(openedThread.id);
                      setOpenedId(null);
                    }}
                  >
                    Archive
                  </button>
                  <button
                    type="button"
                    class="ghost-pill"
                    onClick={() => {
                      onMarkRead(openedThread.id, true);
                      setOpenedId(null);
                    }}
                  >
                    Mark unread
                  </button>
                </div>

                <span class="sheet-meta-count">{openedThread.fullTimestamp}</span>
              </div>

              <div class="gmail-thread-detail">
                <h2 class="gmail-thread-subject">
                  <span>{openedThread.subject}</span>
                  {openedThread.gmailLabel && (
                    <span class={`gmail-label-chip tone-${openedThread.gmailLabel.tone}`}>
                      {openedThread.gmailLabel.text}
                    </span>
                  )}
                </h2>

                <div class="gmail-sender-row">
                  <div class="gmail-sender-meta">
                    <div
                      class="outlook-avatar"
                      style={{
                        width: '36px',
                        height: '36px',
                        background: openedThread.avatarColor,
                      }}
                    >
                      {openedThread.senderInitials}
                    </div>
                    <div class="outlook-sender-addresses">
                      <div>
                        <strong class="mail-sender-strong">{openedThread.senderName}</strong>{' '}
                        <span class="mail-sender-addr">&lt;{openedThread.senderEmail}&gt;</span>
                      </div>
                      <div class="mail-sender-to">
                        to {openedThread.toList}
                        {openedThread.ccList ? ` · cc ${openedThread.ccList}` : ''}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    class="ghost-pill"
                    onClick={() => setReplyPulse((p) => p + 1)}
                  >
                    ↩ Reply
                  </button>
                </div>

                <div class="prose-content mail-prose-measure">
                  {openedThread.bodyParagraphs.map((p, idx) => (
                    <p key={idx} class="prose-paragraph">
                      {p}
                    </p>
                  ))}
                </div>

                <InlineAttachmentDeck
                  attachments={openedThread.attachments}
                  previewBlock={previewBlock}
                  registry={registry}
                  onToggleAttachment={(att) => void openAttachment(att)}
                  onClearPreview={clearPreview}
                  onNavigateSource={onNavigateSource}
                />

                <MailIntelligencePanel
                  thread={openedThread}
                  replyFocusPulse={replyPulse}
                  senderEmail={senderEmail}
                  onNavigateSource={onNavigateSource}
                  onPreviewInlineRoute={(route) => {
                    const matchedAtt = openedThread.attachments.find(
                      (a) => a.pluginRoute === route
                    );
                    if (matchedAtt) void openAttachment(matchedAtt);
                    else onNavigateSource({ pluginRoute: route });
                  }}
                  onSendReply={onSendMail}
                />
              </div>
            </>
          ) : (
            <>
              <div class="gmail-action-strip">
                <div class="stage-subbar-group">
                  <span class="gmail-row-check" aria-hidden="true" />
                  <span>↻</span>
                  {activeLabel && (
                    <>
                      <span class="mail-sender-strong">Label: {activeLabel}</span>
                      <button
                        type="button"
                        class="ghost-pill"
                        onClick={() => setActiveLabel(null)}
                      >
                        Clear ×
                      </button>
                    </>
                  )}
                  {folder !== 'inbox' && !activeLabel && (
                    <span class="mail-sender-strong">
                      {folder === 'archive' ? 'All Mail' : folder[0]?.toUpperCase() + folder.slice(1)}
                    </span>
                  )}
                </div>
                <div class="stage-subbar-group">
                  <span>
                    1–{visibleThreads.length} of {visibleThreads.length}
                  </span>
                </div>
              </div>

              {folder === 'inbox' && !activeLabel && !q && (
                <div class="gmail-category-tabs" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={category === 'primary'}
                    class={`gmail-cat-tab ${category === 'primary' ? 'is-active' : ''}`}
                    onClick={() => setCategory('primary')}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                      <rect x="3" y="4" width="18" height="16" rx="2" />
                      <path d="M3 13h5l2 3h4l2-3h5" />
                    </svg>
                    <span>Primary</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={category === 'updates'}
                    class={`gmail-cat-tab ${category === 'updates' ? 'is-active' : ''}`}
                    onClick={() => setCategory('updates')}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                      <circle cx="12" cy="12" r="9" />
                      <line x1="12" y1="11" x2="12" y2="16" />
                      <circle cx="12" cy="8" r="0.8" fill="currentColor" />
                    </svg>
                    <span>Updates</span>
                    {unreadUpdates > 0 && (
                      <span class="gmail-new-pill">{unreadUpdates} new</span>
                    )}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={category === 'filings'}
                    class={`gmail-cat-tab ${category === 'filings' ? 'is-active' : ''}`}
                    onClick={() => setCategory('filings')}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                      <path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V4h9l8.6 8.6a2 2 0 0 1 0 .8Z" />
                      <circle cx="7.5" cy="8.5" r="1.2" fill="currentColor" />
                    </svg>
                    <span>HMRC & Filings</span>
                  </button>
                </div>
              )}

              <div class="gmail-list-scroll">
                {visibleThreads.map((item) => (
                  <div
                    key={item.id}
                    class={`gmail-row ${item.unread ? 'is-unread' : ''}`}
                    onClick={() => {
                      setOpenedId(item.id);
                      clearPreview();
                      if (item.unread) onMarkRead(item.id, false);
                    }}
                  >
                    <div class="gmail-row-main">
                      <span class="gmail-row-check" aria-hidden="true" />
                      <button
                        type="button"
                        class={`gmail-star-btn ${item.starred ? 'is-starred' : ''}`}
                        aria-label="Star thread"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleStar(item.id);
                        }}
                      >
                        {item.starred ? '★' : '☆'}
                      </button>

                      <span class="gmail-sender-col">{item.senderName}</span>

                      {item.gmailLabel && (
                        <span class={`gmail-label-chip tone-${item.gmailLabel.tone}`}>
                          {item.gmailLabel.text}
                        </span>
                      )}

                      <span class="gmail-subject-col">
                        <span class="gmail-subject-text">{item.subject}</span>
                        <span class="gmail-snippet-dash"> — {item.snippet}</span>
                      </span>

                      <span class="gmail-time-col">{item.timeShort}</span>
                    </div>

                    {item.attachments.length > 0 && (
                      <div class="gmail-row-attachments">
                        {item.attachments.map((att) => (
                          <button
                            key={att.id}
                            type="button"
                            class="gmail-att-pill"
                            onClick={(e) => {
                              e.stopPropagation();
                              openThreadWithAttachment(item, att);
                            }}
                          >
                            <span class="gmail-att-badge">{att.badge}</span>
                            <span>{att.filename}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
