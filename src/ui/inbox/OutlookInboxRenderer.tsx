import { Fragment } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import type { MailFolder, OutlookBucket } from '../../core/inbox';
import { OutlookLogo } from '../connectors/connectorLogos';
import { PanelToggleIcon, SearchIcon } from '../icons';
import type { MailProviderViewProps } from './GmailInboxRenderer';
import { MailIntelligencePanel } from './MailIntelligencePanel';
import {
  InboxProviderSwitch,
  InlineAttachmentDeck,
  InlineNewMailForm,
  useMailAttachmentPreview,
} from './MailSharedParts';

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
  focusedThreadReq = null,
  registry,
  activeProvider,
  senderEmail,
  onSwitchProvider,
  onToggleFlag,
  onMarkRead,
  onArchive,
  onSendMail,
  onNavigateSource,
}: MailProviderViewProps) {
  const [folder, setFolder] = useState<MailFolder | 'flagged'>('inbox');
  const [isFolderPaneOpen, setIsFolderPaneOpen] = useState(
    () => typeof window === 'undefined' || window.innerWidth > 920
  );
  const [bucket, setBucket] = useState<OutlookBucket>('focused');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>(
    focusedThreadReq?.id ?? threads[0]?.id ?? ''
  );
  const [mobileShowReader, setMobileShowReader] = useState(Boolean(focusedThreadReq?.id));
  const [isComposing, setIsComposing] = useState(false);
  const [replyPulse, setReplyPulse] = useState(0);
  const [rsvpMap, setRsvpMap] = useState<Record<string, 'accepted' | 'tentative'>>({});

  const { previewBlock, clearPreview, openAttachment } = useMailAttachmentPreview(registry);

  useEffect(() => {
    if (!focusedThreadReq?.id) return;
    setSelectedId(focusedThreadReq.id);
    setIsComposing(false);
    setMobileShowReader(true);
    const matched = threads.find((t) => t.id === focusedThreadReq.id);
    if (matched) setBucket(matched.outlook.bucket);
  }, [focusedThreadReq?.id, focusedThreadReq?.pulse, threads]);

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
    clearPreview();
  }, [activeMail?.id, clearPreview]);

  const unreadInboxCount = threads.filter((t) => t.folder === 'inbox' && t.unread).length;
  const flaggedCount = threads.filter((t) => t.flagged).length;

  return (
    <div class="outlook-frame">
      <header class="outlook-appbar">
        <div class="outlook-brand">
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
          <strong class="outlook-wordmark">Outlook</strong>
        </div>

        <div class="outlook-search-box">
          <SearchIcon />
          <input
            type="search"
            class="gmail-search-input"
            placeholder="Search mail and people"
            value={query}
            onInput={(e) => setQuery((e.currentTarget as HTMLInputElement).value)}
          />
        </div>

        <InboxProviderSwitch
          activeProvider={activeProvider}
          onSwitchProvider={onSwitchProvider}
        />
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
          onClick={() => {
            setIsComposing(true);
            setMobileShowReader(true);
          }}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
            <rect x="1.5" y="3" width="13" height="10" rx="1.5" />
            <path d="m2 4 6 4.5L14 4" />
          </svg>
          <span>New mail</span>
        </button>

        <span class="outlook-ribbon-sep" aria-hidden="true" />

        {activeMail && !isComposing && (
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
              onClick={() => {
                setMobileShowReader(true);
                setReplyPulse((p) => p + 1);
              }}
            >
              ↩ Reply
            </button>
          </>
        )}
      </div>

      <div
        class={`outlook-three-pane ${
          mobileShowReader || isComposing ? 'is-mobile-reader-open' : ''
        }`}
      >
        {isFolderPaneOpen && (
          <nav class="outlook-folder-pane" aria-label="Outlook folders">
            <div class="outlook-folder-group-label">▾ Favorites</div>
            <button
              type="button"
              class={`outlook-folder-btn ${folder === 'inbox' ? 'is-active' : ''}`}
              onClick={() => {
                setFolder('inbox');
                setIsComposing(false);
                setMobileShowReader(false);
              }}
            >
              <span>Inbox</span>
              {unreadInboxCount > 0 && (
                <span class="outlook-unread-num">{unreadInboxCount}</span>
              )}
            </button>
            <button
              type="button"
              class={`outlook-folder-btn ${folder === 'flagged' ? 'is-active' : ''}`}
              onClick={() => {
                setFolder('flagged');
                setIsComposing(false);
                setMobileShowReader(false);
              }}
            >
              <span>Flagged</span>
              {flaggedCount > 0 && <span>{flaggedCount}</span>}
            </button>
            <button
              type="button"
              class={`outlook-folder-btn ${folder === 'sent' ? 'is-active' : ''}`}
              onClick={() => {
                setFolder('sent');
                setIsComposing(false);
                setMobileShowReader(false);
              }}
            >
              <span>Sent Items</span>
            </button>

            <div class="outlook-folder-group-label">▾ Carter & Vance LLP</div>
            <button
              type="button"
              class={`outlook-folder-btn ${folder === 'archive' ? 'is-active' : ''}`}
              onClick={() => {
                setFolder('archive');
                setIsComposing(false);
                setMobileShowReader(false);
              }}
            >
              <span>Archive</span>
            </button>
          </nav>
        )}

        <section class="outlook-list-pane" aria-label="Message list">
          <div class="outlook-focused-bar">
            <div class="stage-subbar-group">
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
                    const isSelected = activeMail?.id === item.id && !isComposing;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        class={`outlook-msg-card ${item.unread ? 'is-unread' : ''} ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => {
                          setIsComposing(false);
                          setSelectedId(item.id);
                          setMobileShowReader(true);
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

                          <div class="outlook-card-snippet-row">
                            <span class="outlook-card-snippet">{item.snippet}</span>
                            {item.outlook.categoryTag && (
                              <span
                                class={`outlook-cat-tag cat-${item.outlook.categoryTag.color}`}
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
          <div class="outlook-mobile-back-row">
            <button
              type="button"
              class="ghost-pill"
              onClick={() => {
                setIsComposing(false);
                setMobileShowReader(false);
              }}
            >
              ← Messages
            </button>
          </div>

          {isComposing ? (
            <InlineNewMailForm
              variant="outlook"
              senderEmail={senderEmail}
              onDiscard={() => {
                setIsComposing(false);
                setMobileShowReader(false);
              }}
              onSend={(to, subject, body) => {
                onSendMail(to, subject, body);
                setIsComposing(false);
              }}
            />
          ) : activeMail ? (
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
                  <div class="outlook-meeting-meta">
                    <CalendarFluentIcon />
                    <div>
                      <strong class="mail-sender-strong">
                        {activeMail.outlook.meeting.title}
                      </strong>
                      <div class="mail-sender-to">
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
                      <span class="mail-sender-addr">&lt;{activeMail.senderEmail}&gt;</span>
                    </div>
                    <div class="mail-sender-to">
                      <strong>To:</strong> {activeMail.toList}
                    </div>
                    {activeMail.ccList && (
                      <div class="mail-sender-addr">
                        <strong>Cc:</strong> {activeMail.ccList}
                      </div>
                    )}
                  </div>
                </div>

                <div class="outlook-sender-right">
                  <div class="mail-sender-addr">{activeMail.fullTimestamp}</div>
                  <button
                    type="button"
                    class="ghost-pill"
                    onClick={() => setReplyPulse((p) => p + 1)}
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

              <InlineAttachmentDeck
                attachments={activeMail.attachments}
                previewBlock={previewBlock}
                registry={registry}
                onToggleAttachment={(att) => void openAttachment(att)}
                onClearPreview={clearPreview}
                onNavigateSource={onNavigateSource}
              />

              <MailIntelligencePanel
                thread={activeMail}
                replyFocusPulse={replyPulse}
                senderEmail={senderEmail}
                onNavigateSource={onNavigateSource}
                onPreviewInlineRoute={(route) => {
                  const matchedAtt = activeMail.attachments.find(
                    (a) => a.pluginRoute === route
                  );
                  if (matchedAtt) void openAttachment(matchedAtt);
                  else onNavigateSource({ pluginRoute: route });
                }}
                onSendReply={onSendMail}
              />
            </>
          ) : (
            <div class="sheet-meta-count">Select a message to read.</div>
          )}
        </section>
      </div>
    </div>
  );
}
