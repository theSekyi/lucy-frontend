import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { INITIAL_MAIL_THREADS, type MailThreadItem } from '../../core/inbox';
import type { RendererRegistry } from '../../core/renderers';
import type { InboxProvider } from '../../core/types';
import type { GmailInboxRenderer as GmailComp } from './GmailInboxRenderer';
import type { OutlookInboxRenderer as OutlookComp } from './OutlookInboxRenderer';
import './inbox.css';

interface InboxWorkspaceProps {
  readonly provider: InboxProvider;
  readonly registry: RendererRegistry<ComponentChildren>;
  readonly senderEmail: string;
  readonly senderName: string;
  readonly onSwitchProvider: (provider: InboxProvider) => void;
  readonly onUnreadCountChange: (count: number) => void;
  readonly onOpenFullStage: (pluginRoute: string) => void;
}

export function InboxWorkspace({
  provider,
  registry,
  senderEmail,
  senderName,
  onSwitchProvider,
  onUnreadCountChange,
  onOpenFullStage,
}: InboxWorkspaceProps) {
  const [threads, setThreads] = useState<MailThreadItem[]>(() => [...INITIAL_MAIL_THREADS]);
  const [GmailView, setGmailView] = useState<typeof GmailComp | null>(null);
  const [OutlookView, setOutlookView] = useState<typeof OutlookComp | null>(null);
  const [composeDraft, setComposeDraft] = useState<{
    to: string;
    subject: string;
    body: string;
  } | null>(null);

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

  function sendComposedMail(e: Event) {
    e.preventDefault();
    if (!composeDraft?.subject.trim()) return;
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
      toList: composeDraft.to || 'client@acmeholdings.com',
      subject: composeDraft.subject,
      snippet: composeDraft.body.slice(0, 120),
      bodyParagraphs: composeDraft.body.split('\n\n'),
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
    setComposeDraft(null);
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
          onOpenCompose={(subject = '', to = '') =>
            setComposeDraft({ to, subject, body: '' })
          }
          onOpenFullStage={onOpenFullStage}
        />
      ) : (
        <div class="launchpad-scroll">
          <div class="renderer-skeleton">Loading {provider} workspace…</div>
        </div>
      )}

      {composeDraft && (
        <form class="compose-modal-card" onSubmit={sendComposedMail}>
          <div class="inline-control-header">
            <strong>New Message ({provider === 'gmail' ? 'Gmail' : 'Outlook'})</strong>
            <button
              type="button"
              class="icon-action-btn"
              onClick={() => setComposeDraft(null)}
            >
              ×
            </button>
          </div>
          <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
              rows={4}
              class="profile-input"
              placeholder="Write message…"
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
      )}
    </div>
  );
}
