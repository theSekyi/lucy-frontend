import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { INITIAL_MAIL_THREADS, type MailThreadItem } from '../../core/inbox';
import type { RendererRegistry } from '../../core/renderers';
import type { InboxProvider } from '../../core/types';
import type { GmailInboxRenderer as GmailComp } from './GmailInboxRenderer';
import type { DeepLinkTarget } from './MailIntelligencePanel';
import type { OutlookInboxRenderer as OutlookComp } from './OutlookInboxRenderer';
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

  const ActiveRenderer = provider === 'gmail' ? GmailView : OutlookView;

  return (
    <div class="inbox-host-shell">
      {ActiveRenderer ? (
        <ActiveRenderer
          threads={threads}
          initialThreadId={selectedMailId}
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
      ) : (
        <div class="launchpad-scroll">
          <div class="renderer-skeleton">Loading {provider}…</div>
        </div>
      )}
    </div>
  );
}
