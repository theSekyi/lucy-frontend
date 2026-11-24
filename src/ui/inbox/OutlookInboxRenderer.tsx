import { Fragment } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import type { MailAttachmentLink, MailFolder, OutlookBucket } from '../../core/inbox';
import type { ContentBlock } from '../../core/types';
import { BlockSlot } from '../BlockSlot';
import { GmailLogo, OutlookLogo } from '../connectors/connectorLogos';
import { PanelToggleIcon, SearchIcon } from '../icons';
import type { MailProviderViewProps } from './GmailInboxRenderer';

const DATE_GROUPS = ['Today', 'Yesterday', 'Last Week'] as const;

function PaperclipIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      aria-hidden="true"
    >
      <path
        d="M13.2 7.4 7.5 13.1a3.4 3.4 0 0 1-4.8-4.8l6.1-6.1a2.2 2.2 0 1 1 3.1 3.1l-6 6a1 1 0 0 1-1.4-1.4l5.3-5.3"
        stroke-linecap="round"
      />
    </svg>
  );
}

function CalendarFluentIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="#62abf5"
      stroke-width="1.4"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <rect x="2" y="3" width="12" height="11" rx="1.8" />
      <line x1="2" y1="6.5" x2="14" y2="6.5" />
      <line x1="5" y1="1.8" x2="5" y2="4" stroke-linecap="round" />
      <line x1="11" y1="1.8" x2="11" y2="4" stroke-linecap="round" />
    </svg>
  );
}

export function OutlookInboxRenderer({
  threads,
  registry,
  onSwitchProvider,
  onToggleFlag,
  onMarkRead,
  onArchive,
  onOpenCompose,
  onOpenFullStage,
}: MailProviderViewProps) {
  const [folder, setFolder] = useState<MailFolder | 'flagged'>('inbox');
  const [isFolderPaneOpen, setIsFolderPaneOpen] = useState(true);
  const [bucket, setBucket] = useState<OutlookBucket>('focused');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>(threads[0]?.id ?? '');
  const [rsvpMap, setRsvpMap] = useState<Record<string, 'accepted' | 'tentative'>>({});
  const [previewBlock, setPreviewBlock] = useState<{
    att: MailAttachmentLink;
    block: ContentBlock;
  } | null>(null);

  const q = query.trim().toLowerCase();
  const visibleThreads = threads.filter((t) => {
    if (folder === 'flagged') {
      if (!t.flagged) return false;
    } else if (t.folder !== folder) {
      return false;
    }
    if (folder === 'inbox' && !q && t.outlook.bucket !== bucket) return false;
    if (unreadOnly && !t.unread) return false;
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

  const activeMail =
    visibleThreads.find((t) => t.id === selectedId) ??
    threads.find((t) => t.id === selectedId) ??
    visibleThreads[0] ??
    null;

  useEffect(() => {
    setPreviewBlock(null);
  }, [activeMail?.id]);

  async function inspectAttachment(att: MailAttachmentLink) {
    if (previewBlock?.att.id === att.id) {
      setPreviewBlock(null);
      return;
    }
    const plugin = registry.findByRoute(att.pluginRoute);
    if (!plugin?.createSample) return;
    const sample = await plugin.createSample((p) => `${p}-${Date.now()}`);
    setPreviewBlock({ att, block: sample.artifact });
  }

  const unreadInboxCount = threads.filter((t) => t.folder === 'inbox' && t.unread).length;
  const flaggedCount = threads.filter((t) => t.flagged).length;

  return (
    <div class="outlook-frame">
      <header class="outlook-appbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '146px', flexShrink: 0 }}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="#c8c6c4" aria-hidden="true">
            <circle cx="3" cy="3" r="1.2" />
            <circle cx="8" cy="3" r="1.2" />
            <circle cx="13" cy="3" r="1.2" />
            <circle cx="3" cy="8" r="1.2" />
            <circle cx="8" cy="8" r="1.2" />
            <circle cx="13" cy="8" r="1.2" />
            <circle cx="3" cy="13" r="1.2" />
            <circle cx="8" cy="13" r="1.2" />
            <circle cx="13" cy="13" r="1.2" />
          </svg>
          <OutlookLogo size={20} />
          <strong style={{ fontSize: '14.5px', letterSpacing: '-0.01em' }}>Outlook</strong>
        </div>

        <div class="outlook-search-box">
          <SearchIcon />
          <input
            type="search"
            class="gmail-search-input"
            style={{ fontSize: '13px' }}
            placeholder="Search mail and people"
            value={query}
            onInput={(e) => setQuery((e.currentTarget as HTMLInputElement).value)}
          />
        </div>

        <div class="inbox-provider-switch" role="tablist" aria-label="Mail provider">
          <button
            type="button"
            class="inbox-provider-btn"
            onClick={() => onSwitchProvider('gmail')}
          >
            <GmailLogo size={14} />
            <span>Gmail</span>
          </button>
          <button type="button" class="inbox-provider-btn is-active">
            <OutlookLogo size={14} />
            <span>Outlook</span>
          </button>
        </div>
      </header>

      <div class="outlook-command-ribbon">
        <button
          type="button"
          class="icon-action-btn"
          aria-label="Toggle folder pane"
          title="Toggle folder pane"
          onClick={() => setIsFolderPaneOpen((o) => !o)}
        >
          <PanelToggleIcon />
        </button>

        <button
          type="button"
          class="outlook-newmail-btn"
          onClick={() => onOpenCompose()}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
            <rect x="1.5" y="3" width="13" height="10" rx="1.5" />
            <path d="m2 4 6 4.5L14 4" />
          </svg>
          <span>New mail</span>
        </button>

        <span class="outlook-ribbon-sep" aria-hidden="true" />

        {activeMail && (
          <>
            <button
              type="button"
              class="outlook-cmd-btn"
              onClick={() => onArchive(activeMail.id)}
            >
              Archive
            </button>
            <button
              type="button"
              class="outlook-cmd-btn"
              onClick={() => onToggleFlag(activeMail.id)}
            >
              {activeMail.flagged ? '⚑ Unflag' : '⚑ Flag'}
            </button>
            <button
              type="button"
              class="outlook-cmd-btn"
              onClick={() => onMarkRead(activeMail.id, !activeMail.unread)}
            >
              {activeMail.unread ? 'Mark read' : 'Mark unread'}
            </button>
            <button
              type="button"
              class="outlook-cmd-btn"
              onClick={() =>
                onOpenCompose(`Re: ${activeMail.subject}`, activeMail.senderEmail)
              }
            >
              ↩ Reply
            </button>
          </>
        )}
      </div>

      <div class="outlook-three-pane">
        {isFolderPaneOpen && (
          <nav class="outlook-folder-pane" aria-label="Outlook folders">
            <div class="outlook-folder-group-label">▾ Favorites</div>
            <button
              type="button"
              class={`outlook-folder-btn ${folder === 'inbox' ? 'is-active' : ''}`}
              onClick={() => setFolder('inbox')}
            >
              <span>Inbox</span>
              {unreadInboxCount > 0 && (
                <span style={{ color: '#62abf5', fontWeight: 600 }}>{unreadInboxCount}</span>
              )}
            </button>
            <button
              type="button"
              class={`outlook-folder-btn ${folder === 'flagged' ? 'is-active' : ''}`}
              onClick={() => setFolder('flagged')}
            >
              <span>Flagged</span>
              {flaggedCount > 0 && <span>{flaggedCount}</span>}
            </button>
            <button
              type="button"
              class={`outlook-folder-btn ${folder === 'sent' ? 'is-active' : ''}`}
              onClick={() => setFolder('sent')}
            >
              <span>Sent Items</span>
            </button>

            <div class="outlook-folder-group-label" style={{ marginTop: '10px' }}>
              ▾ Carter & Vance LLP
            </div>
            <button
              type="button"
              class={`outlook-folder-btn ${folder === 'archive' ? 'is-active' : ''}`}
              onClick={() => setFolder('archive')}
            >
              <span>Archive</span>
            </button>
          </nav>
        )}

        <section class="outlook-list-pane" aria-label="Message list">
          <div class="outlook-focused-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                class={`outlook-focus-tab ${bucket === 'focused' ? 'is-active' : ''}`}
                onClick={() => setBucket('focused')}
              >
                Focused
              </button>
              <button
                type="button"
                class={`outlook-focus-tab ${bucket === 'other' ? 'is-active' : ''}`}
                onClick={() => setBucket('other')}
              >
                Other
              </button>
            </div>

            <button
              type="button"
              class={`metric-chip ${unreadOnly ? 'is-active' : ''}`}
              onClick={() => setUnreadOnly((u) => !u)}
            >
              Unread
            </button>
          </div>

          <div class="gmail-list-scroll">
            {DATE_GROUPS.map((group) => {
              const items = visibleThreads.filter((t) => t.dateGroup === group);
              if (items.length === 0) return null;

              return (
                <Fragment key={group}>
                  <div class="outlook-date-divider">▾ {group}</div>
                  {items.map((item) => {
                    const isSelected = activeMail?.id === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        class={`outlook-msg-card ${item.unread ? 'is-unread' : ''} ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => {
                          setSelectedId(item.id);
                          if (item.unread) onMarkRead(item.id, false);
                        }}
                      >
                        {item.unread && <span class="outlook-unread-bar" />}

                        <div
                          class="outlook-avatar"
                          style={{ background: item.avatarColor }}
                        >
                          {item.senderInitials}
                        </div>

                        <div class="outlook-card-lines">
                          <div class="outlook-card-line1">
                            <span class="outlook-card-sender">{item.senderName}</span>
                            <span class="outlook-indicators">
                              {item.outlook.importance === 'high' && (
                                <strong style={{ color: '#f87171' }} title="High importance">
                                  !
                                </strong>
                              )}
                              {item.outlook.mentionedMe && (
                                <strong style={{ color: '#60a5fa' }} title="Mentioned you">
                                  @
                                </strong>
                              )}
                              {item.flagged && (
                                <span style={{ color: '#fb923c' }} title="Flagged">
                                  ⚑
                                </span>
                              )}
                              {item.attachments.length > 0 && <PaperclipIcon />}
                              <span style={{ color: '#a19f9d' }}>{item.timeShort}</span>
                            </span>
                          </div>

                          <div class="outlook-card-subject">{item.subject}</div>

                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '6px',
                              marginTop: '3px',
                            }}
                          >
                            <span class="outlook-card-snippet">{item.snippet}</span>
                            {item.outlook.categoryTag && (
                              <span
                                class={`outlook-cat-tag cat-${item.outlook.categoryTag.color}`}
                                style={{ flexShrink: 0 }}
                              >
                                {item.outlook.categoryTag.label}
                              </span>
                            )}
                          </div>

                          {item.attachments[0] && (
                            <div class="outlook-inline-att-chip">
                              <PaperclipIcon />
                              <span>{item.attachments[0].filename}</span>
                              {item.attachments.length > 1 && (
                                <span>+{item.attachments.length - 1}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </Fragment>
              );
            })}
          </div>
        </section>

        <section class="outlook-reading-pane" aria-label="Reading pane">
          {activeMail ? (
            <>
              <div class="outlook-reading-subject-row">
                <h2 class="outlook-reading-subject">{activeMail.subject}</h2>
                {activeMail.outlook.categoryTag && (
                  <span class={`outlook-cat-tag cat-${activeMail.outlook.categoryTag.color}`}>
                    {activeMail.outlook.categoryTag.label}
                  </span>
                )}
              </div>

              {(activeMail.outlook.importance === 'high' ||
                activeMail.outlook.followUpDue ||
                activeMail.outlook.sensitivity ||
                activeMail.outlook.retentionPolicy) && (
                <div class="outlook-info-callout">
                  <div class="stage-subbar-group">
                    {activeMail.outlook.importance === 'high' && (
                      <strong style={{ color: '#fca5a5' }}>! High Importance</strong>
                    )}
                    {activeMail.outlook.followUpDue && (
                      <span>⚑ {activeMail.outlook.followUpDue}</span>
                    )}
                    {activeMail.outlook.sensitivity && (
                      <span>· {activeMail.outlook.sensitivity}</span>
                    )}
                  </div>
                  {activeMail.outlook.retentionPolicy && (
                    <span class="sheet-meta-count">{activeMail.outlook.retentionPolicy}</span>
                  )}
                </div>
              )}

              {activeMail.outlook.meeting && (
                <div class="outlook-meeting-box">
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '9px', minWidth: 0 }}>
                    <div style={{ marginTop: '2px' }}>
                      <CalendarFluentIcon />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <strong style={{ fontSize: '12.5px', color: '#f3f2f1', display: 'block' }}>
                        {activeMail.outlook.meeting.title}
                      </strong>
                      <div style={{ fontSize: '11.5px', color: '#9ca3af', marginTop: '2px' }}>
                        {activeMail.outlook.meeting.when} · {activeMail.outlook.meeting.location}
                      </div>
                    </div>
                  </div>
                  <div class="stage-subbar-group">
                    <button
                      type="button"
                      class={`decision-btn ${rsvpMap[activeMail.id] === 'accepted' ? 'is-accept-active' : ''}`}
                      onClick={() =>
                        setRsvpMap((prev) => ({ ...prev, [activeMail.id]: 'accepted' }))
                      }
                    >
                      {rsvpMap[activeMail.id] === 'accepted' ? '✓ Accepted' : 'Accept'}
                    </button>
                    <button
                      type="button"
                      class={`decision-btn ${rsvpMap[activeMail.id] === 'tentative' ? 'is-accept-active' : ''}`}
                      onClick={() =>
                        setRsvpMap((prev) => ({ ...prev, [activeMail.id]: 'tentative' }))
                      }
                    >
                      {rsvpMap[activeMail.id] === 'tentative' ? '✓ Tentative' : 'Tentative'}
                    </button>
                  </div>
                </div>
              )}

              <div class="outlook-sender-header">
                <div class="outlook-sender-left">
                  <div
                    class="outlook-avatar"
                    style={{
                      width: '34px',
                      height: '34px',
                      background: activeMail.avatarColor,
                    }}
                  >
                    {activeMail.senderInitials}
                  </div>
                  <div class="outlook-sender-addresses">
                    <div>
                      <strong>{activeMail.senderName}</strong>{' '}
                      <span style={{ color: '#8a8886', fontSize: '12px' }}>
                        &lt;{activeMail.senderEmail}&gt;
                      </span>
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#a19f9d', marginTop: '2px' }}>
                      <strong>To:</strong> {activeMail.toList}
                    </div>
                    {activeMail.ccList && (
                      <div style={{ fontSize: '11.5px', color: '#8a8886' }}>
                        <strong>Cc:</strong> {activeMail.ccList}
                      </div>
                    )}
                  </div>
                </div>

                <div class="outlook-sender-right">
                  <div style={{ fontSize: '11.5px', color: '#8a8886' }}>
                    {activeMail.fullTimestamp}
                  </div>
                  <button
                    type="button"
                    class="ghost-pill"
                    onClick={() =>
                      onOpenCompose(`Re: ${activeMail.subject}`, activeMail.senderEmail)
                    }
                  >
                    ↩ Reply
                  </button>
                </div>
              </div>

              <div class="prose-content">
                {activeMail.bodyParagraphs.map((p, idx) => (
                  <p key={idx} class="prose-paragraph">
                    {p}
                  </p>
                ))}
              </div>

              {activeMail.attachments.length > 0 && (
                <div class="mail-attachment-deck">
                  {activeMail.attachments.map((att) => {
                    const isOpen = previewBlock?.att.id === att.id;
                    return (
                      <button
                        key={att.id}
                        type="button"
                        class={`mail-att-card ${isOpen ? 'is-active' : ''}`}
                        onClick={() => void inspectAttachment(att)}
                      >
                        <span class="artifact-badge accent-sky">{att.badge}</span>
                        <span>
                          <strong style={{ display: 'block', fontSize: '12px', color: '#f3f2f1' }}>
                            {att.filename}
                          </strong>
                          <span style={{ fontSize: '11px', color: '#a19f9d' }}>
                            {att.sizeLabel} · {isOpen ? 'Hide workpaper' : 'Preview workpaper'}
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
            </>
          ) : (
            <div class="daily-brief-body">Select a message to read.</div>
          )}
        </section>
      </div>
    </div>
  );
}
