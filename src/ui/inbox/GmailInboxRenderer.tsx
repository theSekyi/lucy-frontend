import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import type {
  GmailCategory,
  MailAttachmentLink,
  MailFolder,
  MailThreadItem,
} from '../../core/inbox';
import type { RendererRegistry } from '../../core/renderers';
import type { ContentBlock, InboxProvider } from '../../core/types';
import { BlockSlot } from '../BlockSlot';
import { GmailLogo, OutlookLogo } from '../connectors/connectorLogos';
import { SearchIcon } from '../icons';

export interface MailProviderViewProps {
  readonly threads: ReadonlyArray<MailThreadItem>;
  readonly registry: RendererRegistry<ComponentChildren>;
  readonly activeProvider: InboxProvider;
  readonly onSwitchProvider: (provider: InboxProvider) => void;
  readonly onToggleStar: (id: string) => void;
  readonly onToggleFlag: (id: string) => void;
  readonly onMarkRead: (id: string, unread: boolean) => void;
  readonly onArchive: (id: string) => void;
  readonly onOpenCompose: (replySubject?: string, replyTo?: string) => void;
  readonly onOpenFullStage: (pluginRoute: string) => void;
}

const GMAIL_LABELS: ReadonlyArray<{ text: string; color: string }> = [
  { text: 'HMRC & Tax', color: '#81c995' },
  { text: 'Audit PBC', color: '#fdd663' },
  { text: 'Urgent Sign-off', color: '#f28b82' },
  { text: 'Billing & ERP', color: '#8ab4f8' },
];

export function GmailInboxRenderer({
  threads,
  registry,
  onSwitchProvider,
  onToggleStar,
  onMarkRead,
  onArchive,
  onOpenCompose,
  onOpenFullStage,
}: MailProviderViewProps) {
  const [folder, setFolder] = useState<MailFolder>('inbox');
  const [category, setCategory] = useState<GmailCategory>('primary');
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [isRailCollapsed, setIsRailCollapsed] = useState(false);
  const [query, setQuery] = useState('');
  const [openedId, setOpenedId] = useState<string | null>(null);
  const [previewBlock, setPreviewBlock] = useState<{
    att: MailAttachmentLink;
    block: ContentBlock;
  } | null>(null);

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

  async function inspectAttachmentInline(att: MailAttachmentLink) {
    if (previewBlock?.att.id === att.id) {
      setPreviewBlock(null);
      return;
    }
    const plugin = registry.findByRoute(att.pluginRoute);
    if (!plugin?.createSample) return;
    const sample = await plugin.createSample((p) => `${p}-${Date.now()}`);
    setPreviewBlock({ att, block: sample.artifact });
  }

  async function openThreadWithAttachment(item: MailThreadItem, att: MailAttachmentLink) {
    setOpenedId(item.id);
    if (item.unread) onMarkRead(item.id, false);
    const plugin = registry.findByRoute(att.pluginRoute);
    if (!plugin?.createSample) return;
    const sample = await plugin.createSample((p) => `${p}-${Date.now()}`);
    setPreviewBlock({ att, block: sample.artifact });
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
            }}
          />
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#9aa0a6"
            stroke-width="1.8"
            aria-hidden="true"
          >
            <line x1="4" y1="7" x2="20" y2="7" />
            <circle cx="9" cy="7" r="2" fill="#282a2c" />
            <line x1="4" y1="17" x2="20" y2="17" />
            <circle cx="15" cy="17" r="2" fill="#282a2c" />
          </svg>
        </div>

        <div class="inbox-provider-switch" role="tablist" aria-label="Mail provider">
          <button type="button" class="inbox-provider-btn is-active">
            <GmailLogo size={14} />
            <span>Gmail</span>
          </button>
          <button
            type="button"
            class="inbox-provider-btn"
            onClick={() => onSwitchProvider('outlook')}
          >
            <OutlookLogo size={14} />
            <span>Outlook</span>
          </button>
        </div>
      </header>

      <div class="gmail-body">
        <nav
          class={`gmail-left-rail ${isRailCollapsed ? 'is-rail-collapsed' : ''}`}
          aria-label="Gmail folders"
        >
          <button
            type="button"
            class="gmail-compose-btn"
            onClick={() => onOpenCompose()}
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
          {openedThread ? (
            <>
              <div class="gmail-action-strip">
                <div class="stage-subbar-group">
                  <button
                    type="button"
                    class="ghost-pill"
                    onClick={() => {
                      setOpenedId(null);
                      setPreviewBlock(null);
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

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    flexWrap: 'wrap',
                    marginBottom: '18px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '11px', minWidth: 0 }}>
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
                    <div style={{ minWidth: 0 }}>
                      <div>
                        <strong style={{ color: '#f1f3f4' }}>
                          {openedThread.senderName}
                        </strong>{' '}
                        <span style={{ color: '#8e918f', fontSize: '12px' }}>
                          &lt;{openedThread.senderEmail}&gt;
                        </span>
                      </div>
                      <div style={{ color: '#8e918f', fontSize: '11.5px', marginTop: '2px' }}>
                        to {openedThread.toList}
                        {openedThread.ccList ? ` · cc ${openedThread.ccList}` : ''}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    class="ghost-pill"
                    onClick={() =>
                      onOpenCompose(`Re: ${openedThread.subject}`, openedThread.senderEmail)
                    }
                  >
                    ↩ Reply
                  </button>
                </div>

                <div class="prose-content" style={{ maxWidth: '720px' }}>
                  {openedThread.bodyParagraphs.map((p, idx) => (
                    <p key={idx} class="prose-paragraph">
                      {p}
                    </p>
                  ))}
                </div>

                {openedThread.attachments.length > 0 && (
                  <div class="mail-attachment-deck">
                    {openedThread.attachments.map((att) => {
                      const isOpen = previewBlock?.att.id === att.id;
                      return (
                        <button
                          key={att.id}
                          type="button"
                          class={`mail-att-card ${isOpen ? 'is-active' : ''}`}
                          onClick={() => void inspectAttachmentInline(att)}
                        >
                          <span class="artifact-badge accent-sky">{att.badge}</span>
                          <span>
                            <strong style={{ display: 'block', fontSize: '12px', color: '#f1f3f4' }}>
                              {att.filename}
                            </strong>
                            <span style={{ fontSize: '11px', color: '#9aa0a6' }}>
                              {att.sizeLabel} · {isOpen ? 'Hide preview' : 'Preview renderer'}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {previewBlock && (
                  <div class="embedded-mail-stage">
                    <div class="artifact-stage-header">
                      <div class="artifact-stage-title-group">
                        <span class="artifact-badge accent-sky">
                          {previewBlock.att.badge}
                        </span>
                        <strong class="artifact-stage-title">
                          {previewBlock.att.filename}
                        </strong>
                      </div>
                      <div class="artifact-stage-controls">
                        <button
                          type="button"
                          class="ghost-pill"
                          onClick={() => onOpenFullStage(previewBlock.att.pluginRoute)}
                        >
                          Open in Split Stage ↗
                        </button>
                        <button
                          type="button"
                          class="icon-action-btn"
                          onClick={() => setPreviewBlock(null)}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    <BlockSlot
                      key={previewBlock.block.id}
                      block={previewBlock.block}
                      registry={registry}
                      isCompact={false}
                    />
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div class="gmail-action-strip">
                <div class="stage-subbar-group">
                  <span class="gmail-row-check" aria-hidden="true" />
                  <span style={{ marginLeft: '4px', fontSize: '13px' }}>↻</span>
                  {activeLabel && (
                    <>
                      <span style={{ color: '#e3e3e3', fontWeight: 500 }}>
                        Label: {activeLabel}
                      </span>
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
                    <span style={{ color: '#e3e3e3', fontWeight: 500 }}>
                      {folder === 'archive' ? 'All Mail' : folder[0]?.toUpperCase() + folder.slice(1)}
                    </span>
                  )}
                </div>
                <div class="stage-subbar-group">
                  <span>
                    1–{visibleThreads.length} of {visibleThreads.length}
                  </span>
                  <span style={{ letterSpacing: '6px', color: '#5f6368' }}>‹ ›</span>
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
                    class={`gmail-row ${item.unread ? 'is-unread' : ''} ${item.attachments.length > 0 ? 'has-attachments' : ''}`}
                    onClick={() => {
                      setOpenedId(item.id);
                      setPreviewBlock(null);
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
                              void openThreadWithAttachment(item, att);
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
