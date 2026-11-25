import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import {
  INITIAL_MAIL_THREADS,
  queryAcrossInbox,
  type InboxGlobalAnswer,
  type MailThreadItem,
} from '../../core/inbox';
import { loadWithRetry, type RendererRegistry } from '../../core/renderers';
import type { InboxProvider } from '../../core/types';
import type { GmailInboxRenderer as GmailComp } from './GmailInboxRenderer';
import type { DeepLinkTarget } from './MailIntelligencePanel';
import type { OutlookInboxRenderer as OutlookComp } from './OutlookInboxRenderer';
import { SendArrowIcon } from '../icons';
import './inbox.css';

interface InboxWorkspaceProps {
  readonly provider: InboxProvider;
  readonly selectedMailId?: string | null;
  readonly registry: RendererRegistry<ComponentChildren>;
  readonly senderEmail: string;
  readonly senderName: string;
  readonly onSwitchProvider: (provider: InboxProvider) => void;
  readonly onUnreadCountChange: (count: number) => void;
  readonly onNavigateSource: (target: DeepLinkTarget) => void;
}

export function InboxWorkspace({
  provider,
  selectedMailId = null,
  registry,
  senderEmail,
  senderName,
  onSwitchProvider,
  onUnreadCountChange,
  onNavigateSource,
}: InboxWorkspaceProps) {
  const [threads, setThreads] = useState<MailThreadItem[]>(() => [...INITIAL_MAIL_THREADS]);
  const [GmailView, setGmailView] = useState<typeof GmailComp | null>(null);
  const [OutlookView, setOutlookView] = useState<typeof OutlookComp | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  const [focusedThreadReq, setFocusedThreadReq] = useState<{
    readonly id: string;
    readonly pulse: number;
  } | null>(() => (selectedMailId ? { id: selectedMailId, pulse: 1 } : null));

  const [askInput, setAskInput] = useState('');
  const [activeAnswer, setActiveAnswer] = useState<InboxGlobalAnswer | null>(null);

  useEffect(() => {
    if (selectedMailId) {
      setFocusedThreadReq((prev) => ({ id: selectedMailId, pulse: (prev?.pulse ?? 0) + 1 }));
    }
  }, [selectedMailId]);

  useEffect(() => {
    let cancelled = false;
    setLoadFailed(false);

    if (provider === 'gmail' && !GmailView) {
      loadWithRetry(() => import('./GmailInboxRenderer'), 2, 220)
        .then((m) => {
          if (!cancelled) setGmailView(() => m.GmailInboxRenderer);
        })
        .catch(() => {
          if (!cancelled) setLoadFailed(true);
        });
    } else if (provider === 'outlook' && !OutlookView) {
      loadWithRetry(() => import('./OutlookInboxRenderer'), 2, 220)
        .then((m) => {
          if (!cancelled) setOutlookView(() => m.OutlookInboxRenderer);
        })
        .catch(() => {
          if (!cancelled) setLoadFailed(true);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [provider, GmailView, OutlookView]);

  const unreadCallbackRef = useRef(onUnreadCountChange);
  unreadCallbackRef.current = onUnreadCountChange;

  useEffect(() => {
    const unread = threads.filter((t) => t.folder === 'inbox' && t.unread).length;
    unreadCallbackRef.current(unread);
  }, [threads]);

  function toggleStar(id: string) {
    setThreads((prev) =>
      prev.map((t) => (t.id === id ? { ...t, starred: !t.starred } : t))
    );
  }

  function toggleFlag(id: string) {
    setThreads((prev) =>
      prev.map((t) => (t.id === id ? { ...t, flagged: !t.flagged } : t))
    );
  }

  function markRead(id: string, unread: boolean) {
    setThreads((prev) =>
      prev.map((t) => (t.id === id ? { ...t, unread } : t))
    );
  }

  function archiveThread(id: string) {
    setThreads((prev) =>
      prev.map((t) => (t.id === id ? { ...t, folder: 'archive', unread: false } : t))
    );
  }

  function appendSentMessage(to: string, subject: string, body: string) {
    if (!subject.trim() && !body.trim()) return;
    const initials = senderName
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? '')
      .join('');

    const sentItem: MailThreadItem = {
      id: `sent-${Date.now()}`,
      folder: 'sent',
      senderName,
      senderInitials: initials || 'EC',
      senderEmail,
      avatarColor: '#374151',
      toList: to || 'client@acmeholdings.com',
      subject: subject || '(No subject)',
      snippet: body.replace(/\s+/g, ' ').slice(0, 120),
      bodyParagraphs: body.split('\n\n'),
      timeShort: 'Just now',
      fullTimestamp: 'Just now',
      dateGroup: 'Today',
      unread: false,
      starred: false,
      flagged: false,
      gmailCategory: 'primary',
      outlook: { bucket: 'focused' },
      attachments: [],
    };
    setThreads((prev) => [sentItem, ...prev]);
  }

  function runInboxAsk(question: string) {
    const clean = question.trim();
    if (!clean) return;
    setActiveAnswer(queryAcrossInbox(threads, clean));
    setAskInput('');
  }

  function jumpToMatchedThread(threadId: string) {
    setFocusedThreadReq((prev) => ({ id: threadId, pulse: (prev?.pulse ?? 0) + 1 }));
    markRead(threadId, false);
  }

  const ActiveRenderer = provider === 'gmail' ? GmailView : OutlookView;

  return (
    <div class="inbox-host-shell">
      <div class="inbox-provider-stage">
        {ActiveRenderer ? (
          <ActiveRenderer
            threads={threads}
            focusedThreadReq={focusedThreadReq}
            registry={registry}
            activeProvider={provider}
            senderEmail={senderEmail}
            onSwitchProvider={onSwitchProvider}
            onToggleStar={toggleStar}
            onToggleFlag={toggleFlag}
            onMarkRead={markRead}
            onArchive={archiveThread}
            onSendMail={appendSentMessage}
            onNavigateSource={onNavigateSource}
          />
        ) : loadFailed ? (
          <div class="launchpad-scroll">
            <div class="renderer-skeleton is-retry-box">
              <span>Connection interrupted while loading {provider}.</span>
              <button
                type="button"
                class="primary-action-pill is-sm"
                onClick={() => setLoadFailed(false)}
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <div class="launchpad-scroll">
            <div class="renderer-skeleton">Loading {provider}…</div>
          </div>
        )}
      </div>

      {/* Persistent Cross-Inbox Ask Dock (consistent with Composer) */}
      <section class="inbox-bottom-ask-dock" aria-label="Ask across inbox">
        <div class="inbox-composer-shell">
          {activeAnswer && (
            <div class="inbox-ask-drawer" role="region" aria-label="Inbox query answer">
              <div class="inbox-ask-drawer-top">
                <strong class="inbox-ask-question">{activeAnswer.question}</strong>
                <button
                  type="button"
                  class="ghost-pill"
                  onClick={() => setActiveAnswer(null)}
                >
                  Close
                </button>
              </div>

              <p class="inbox-ask-answer-text">{activeAnswer.answer}</p>

              {(activeAnswer.matchedThreads.length > 0 || activeAnswer.sources.length > 0) && (
                <div class="inbox-ask-links-row">
                  {activeAnswer.matchedThreads.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      class="mail-deeplink-chip"
                      onClick={() => jumpToMatchedThread(item.id)}
                    >
                      <span>{item.senderName}</span>
                    </button>
                  ))}

                  {activeAnswer.sources.map((src) => (
                    <button
                      key={src.id}
                      type="button"
                      class="mail-deeplink-chip"
                      onClick={() =>
                        onNavigateSource({
                          pluginRoute: src.pluginRoute,
                          anchor: src.anchor,
                          connectorId: src.connectorId,
                        })
                      }
                    >
                      <span>{src.label} ↗</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <form
            class="composer-card is-compact"
            onSubmit={(e) => {
              e.preventDefault();
              runInboxAsk(askInput);
            }}
          >
            <textarea
              rows={2}
              class="composer-textarea"
              aria-label="Ask across your inbox"
              placeholder="Ask across inbox — filings, variances, or open sign-offs…"
              value={askInput}
              onInput={(e) => setAskInput((e.currentTarget as HTMLTextAreaElement).value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  runInboxAsk(askInput);
                } else if (e.key === 'Escape' && activeAnswer) {
                  setActiveAnswer(null);
                }
              }}
            />

            <div class="composer-toolbar">
              <div class="composer-tools-left">
                <span class="composer-hint-text">Inbox · Threads &amp; linked workpapers</span>
              </div>
              <div class="composer-tools-right">
                <button
                  type="submit"
                  class="composer-send-btn"
                  aria-label="Ask across inbox"
                >
                  <SendArrowIcon />
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
