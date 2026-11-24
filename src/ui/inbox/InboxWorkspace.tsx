import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import {
  generateMailReplyDraft,
  INITIAL_MAIL_THREADS,
  queryMailTerminal,
  type MailTerminalExchange,
  type MailThreadItem,
  type ReplyDraftTone,
} from '../../core/inbox';
import type { RendererRegistry } from '../../core/renderers';
import type { InboxProvider } from '../../core/types';
import type { GmailInboxRenderer as GmailComp } from './GmailInboxRenderer';
import type { DeepLinkTarget } from './MailIntelligencePanel';
import type { OutlookInboxRenderer as OutlookComp } from './OutlookInboxRenderer';
import './inbox.css';

interface InboxWorkspaceProps {
  readonly provider: InboxProvider;
  readonly registry: RendererRegistry<ComponentChildren>;
  readonly senderEmail: string;
  readonly senderName: string;
  readonly onSwitchProvider: (provider: InboxProvider) => void;
  readonly onUnreadCountChange: (count: number) => void;
  readonly onNavigateSource: (target: DeepLinkTarget) => void;
}

export function InboxWorkspace({
  provider,
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
  const [composeDraft, setComposeDraft] = useState<{
    to: string;
    subject: string;
    body: string;
    contextThread?: MailThreadItem;
  } | null>(null);
  const [replyTermInput, setReplyTermInput] = useState('');
  const [replyTermHistory, setReplyTermHistory] = useState<MailTerminalExchange[]>([]);

  useEffect(() => {
    if (provider === 'gmail' && !GmailView) {
      void import('./GmailInboxRenderer').then((m) => setGmailView(() => m.GmailInboxRenderer));
    } else if (provider === 'outlook' && !OutlookView) {
      void import('./OutlookInboxRenderer').then((m) =>
        setOutlookView(() => m.OutlookInboxRenderer)
      );
    }
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

  function sendComposedMail(e: Event) {
    e.preventDefault();
    if (!composeDraft) return;
    appendSentMessage(composeDraft.to, composeDraft.subject, composeDraft.body);
    setComposeDraft(null);
    setReplyTermHistory([]);
    setReplyTermInput('');
  }

  function openComposeModal(
    subject = '',
    to = '',
    prefilledBody = '',
    contextThread?: MailThreadItem
  ) {
    setComposeDraft({ to, subject, body: prefilledBody, contextThread });
    setReplyTermHistory([]);
    setReplyTermInput('');
  }

  function applyDraftInReply(tone: ReplyDraftTone) {
    if (!composeDraft) return;
    if (composeDraft.contextThread) {
      const generated = generateMailReplyDraft(composeDraft.contextThread, tone);
      setComposeDraft((prev) => (prev ? { ...prev, body: generated } : prev));
      return;
    }
    const fallback =
      tone === 'concise'
        ? 'Confirmed — we have verified the underlying schedules and cleared this item.\n\nElena'
        : 'Hi,\n\nPlease find our confirmation following review of the underlying ledger and supporting schedules.\n\nBest regards,\nElena Carter';
    setComposeDraft((prev) => (prev ? { ...prev, body: fallback } : prev));
  }

  function runReplyTerminal(e: Event) {
    e.preventDefault();
    const q = replyTermInput.trim();
    if (!q || !composeDraft) return;
    const baseThread = composeDraft.contextThread ?? threads[0]!;
    const res = queryMailTerminal(baseThread, q);
    setReplyTermHistory((prev) => [...prev, res]);
    setReplyTermInput('');
  }

  const ActiveRenderer = provider === 'gmail' ? GmailView : OutlookView;

  return (
    <div class="inbox-host-shell">
      {ActiveRenderer ? (
        <ActiveRenderer
          threads={threads}
          registry={registry}
          activeProvider={provider}
          onSwitchProvider={onSwitchProvider}
          onToggleStar={toggleStar}
          onToggleFlag={toggleFlag}
          onMarkRead={markRead}
          onArchive={archiveThread}
          onOpenCompose={openComposeModal}
          onSendQuickReply={appendSentMessage}
          onNavigateSource={onNavigateSource}
        />
      ) : (
        <div class="launchpad-scroll">
          <div class="renderer-skeleton">Loading {provider} workspace…</div>
        </div>
      )}

      {composeDraft && (
        <div class="compose-modal-card" role="dialog" aria-label="Compose message">
          <div class="inline-control-header">
            <strong>
              {composeDraft.subject.startsWith('Re:') ? 'Reply' : 'New Message'} (
              {provider === 'gmail' ? 'Gmail' : 'Outlook'})
            </strong>
            <button
              type="button"
              class="icon-action-btn"
              aria-label="Close composer"
              onClick={() => setComposeDraft(null)}
            >
              ×
            </button>
          </div>

          <div class="compose-draft-assist-bar">
            <span class="mail-sources-label">Draft</span>
            <button
              type="button"
              class="mail-tone-btn"
              onClick={() => applyDraftInReply('standard')}
            >
              Generate response
            </button>
            <button
              type="button"
              class="mail-tone-btn"
              onClick={() => applyDraftInReply('concise')}
            >
              Concise
            </button>
            <button
              type="button"
              class="mail-tone-btn"
              onClick={() => applyDraftInReply('pushback')}
            >
              Request backup
            </button>
          </div>

          <form onSubmit={sendComposedMail}>
            <div class="compose-fields-stack">
              <input
                type="text"
                class="profile-input"
                placeholder="To"
                value={composeDraft.to}
                onInput={(e) =>
                  setComposeDraft((d) =>
                    d ? { ...d, to: (e.currentTarget as HTMLInputElement).value } : d
                  )
                }
              />
              <input
                type="text"
                class="profile-input"
                placeholder="Subject"
                value={composeDraft.subject}
                onInput={(e) =>
                  setComposeDraft((d) =>
                    d ? { ...d, subject: (e.currentTarget as HTMLInputElement).value } : d
                  )
                }
              />
              <textarea
                rows={5}
                class="profile-input compose-body-area"
                placeholder="Write message or click 'Generate response'…"
                value={composeDraft.body}
                onInput={(e) =>
                  setComposeDraft((d) =>
                    d ? { ...d, body: (e.currentTarget as HTMLTextAreaElement).value } : d
                  )
                }
              />
            </div>

            <div class="inline-control-footer">
              <span class="sheet-meta-count">From {senderEmail}</span>
              <button type="submit" class="primary-action-pill is-sm">
                Send
              </button>
            </div>
          </form>

          <div class="compose-terminal-footer">
            {replyTermHistory.map((ex) => (
              <div key={ex.id} class="mail-terminal-entry is-compact">
                <div class="mail-term-q">
                  <span class="mail-term-prompt">›</span>
                  <span>{ex.question}</span>
                </div>
                <div class="mail-term-a">{ex.answer}</div>
                <div class="mail-term-actions">
                  {ex.citations.map((cit) => (
                    <button
                      key={cit.id}
                      type="button"
                      class="mail-deeplink-chip"
                      onClick={() =>
                        onNavigateSource({
                          pluginRoute: cit.pluginRoute,
                          anchor: cit.anchor,
                          connectorId: cit.connectorId,
                        })
                      }
                    >
                      <span class="mail-deeplink-kind">{cit.kindLabel}</span>
                      <span>{cit.label} ↗</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    class="mail-term-insert-btn"
                    onClick={() =>
                      setComposeDraft((d) =>
                        d
                          ? {
                              ...d,
                              body: d.body.trim()
                                ? `${d.body.trim()}\n\n${ex.answer}`
                                : ex.answer,
                            }
                          : d
                      )
                    }
                  >
                    Insert ↵
                  </button>
                </div>
              </div>
            ))}

            <form class="mail-terminal-form" onSubmit={runReplyTerminal}>
              <span class="mail-term-prompt" aria-hidden="true">
                ›
              </span>
              <input
                type="text"
                class="mail-terminal-input"
                placeholder="Ask terminal while replying (e.g. 'check variance' or 'cite §4.2')…"
                value={replyTermInput}
                onInput={(e) => setReplyTermInput((e.currentTarget as HTMLInputElement).value)}
              />
              <button type="submit" class="mail-term-run-btn">
                Ask ↵
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
