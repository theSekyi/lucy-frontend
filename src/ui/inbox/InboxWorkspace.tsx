import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import {
  INITIAL_MAIL_THREADS,
  queryAcrossInbox,
  queryMailTerminal,
  type InboxGlobalAnswer,
  type MailSourceLink,
  type MailThreadItem,
} from '../../core/inbox';
import type { JournalEntryGateData } from '../../core/ledger';
import type { RendererRegistry } from '../../core/renderers';
import type { InboxProvider } from '../../core/types';
import type { WorkspaceController } from '../../core/workspace';
import { SendArrowIcon } from '../icons';
import { ErrorBoundary, reloadForUpdatedVersion } from '../primitives/ErrorBoundary';
import { useAsyncResource } from '../primitives/useAsyncResource';
import type { GmailInboxRenderer as GmailComp } from './GmailInboxRenderer';
import type { DeepLinkTarget } from './MailIntelligencePanel';
import type { OutlookInboxRenderer as OutlookComp } from './OutlookInboxRenderer';
import './inbox.css';

const providerModuleCache = new Map<string, unknown>();

interface InboxWorkspaceProps {
  readonly provider: InboxProvider;
  readonly selectedMailId?: string | null;
  readonly mailThreads: ReadonlyArray<MailThreadItem>;
  readonly registry: RendererRegistry<ComponentChildren>;
  readonly workspace: WorkspaceController;
  readonly senderEmail: string;
  readonly senderName: string;
  readonly onSwitchProvider: (provider: InboxProvider) => void;
  readonly onSelectMailThread: (mailId: string | null) => void;
  readonly onNavigateSource: (target: DeepLinkTarget) => void;
}

interface UnifiedInboxAnswer {
  readonly scope: 'all' | 'thread';
  readonly question: string;
  readonly answer: string;
  readonly matchKind: 'answer' | 'partial' | 'no-match';
  readonly matchedThreads: InboxGlobalAnswer['matchedThreads'];
  readonly sources: ReadonlyArray<MailSourceLink>;
}

const SUGGESTED_INBOX_QUERIES = [
  'Unread sign-offs',
  'HMRC & tax deadlines',
  'Open variances & PBC',
] as const;

export function InboxWorkspace({
  provider,
  selectedMailId = null,
  mailThreads,
  registry,
  workspace,
  senderEmail,
  senderName,
  onSwitchProvider,
  onSelectMailThread,
  onNavigateSource,
}: InboxWorkspaceProps) {
  const [activeThreadId, setActiveThreadId] = useState<string | null>(selectedMailId);
  const [focusedThreadReq, setFocusedThreadReq] = useState<{
    readonly id: string;
    readonly pulse: number;
  } | null>(() => (selectedMailId ? { id: selectedMailId, pulse: 1 } : null));

  const [askScope, setAskScope] = useState<'all' | 'thread'>('all');
  const [askInput, setAskInput] = useState('');
  const [activeAnswer, setActiveAnswer] = useState<UnifiedInboxAnswer | null>(null);
  const [injectedReplySnippet, setInjectedReplySnippet] = useState<{
    readonly text: string;
    readonly pulse: number;
  } | null>(null);

  const effectiveThreads = mailThreads.length > 0 ? mailThreads : INITIAL_MAIL_THREADS;

  useEffect(() => {
    void workspace.ensureInboxHydrated();
    void workspace.ensureWorkpapersHydrated();
  }, [workspace]);

  useEffect(() => {
    if (selectedMailId) {
      setActiveThreadId(selectedMailId);
      setFocusedThreadReq((prev) => ({
        id: selectedMailId,
        pulse: (prev?.pulse ?? 0) + 1,
      }));
    }
  }, [selectedMailId]);

  const { status, data: ActiveRenderer, isVersionMismatch, retry } = useAsyncResource<
    typeof GmailComp | typeof OutlookComp
  >(
    `inbox-provider:${provider}`,
    () =>
      provider === 'gmail'
        ? import('./GmailInboxRenderer').then((m) => m.GmailInboxRenderer)
        : import('./OutlookInboxRenderer').then((m) => m.OutlookInboxRenderer),
    {
      cache: providerModuleCache,
      retries: 1,
      retryDelayMs: 220,
    }
  );

  const openThread = activeThreadId
    ? effectiveThreads.find((t) => t.id === activeThreadId) ?? null
    : null;

  useEffect(() => {
    if (!openThread && askScope === 'thread') {
      setAskScope('all');
    }
  }, [askScope, openThread]);

  const ajeBlock = workspace.findBlockById('blk-acme-aje');
  const ajeData = (workspace.getState().artifactDrafts['blk-acme-aje'] ??
    ajeBlock?.data) as JournalEntryGateData | undefined;
  const isAjePosted = Boolean(ajeData?.posted);

  function handleSendMail(to: string, subject: string, body: string): boolean {
    const res = workspace.sendMail(to, subject, body);
    return res.ok;
  }

  function runInboxAsk(question: string) {
    const clean = question.trim();
    if (!clean) return;

    if (askScope === 'thread' && openThread) {
      const term = queryMailTerminal(openThread, clean);
      setActiveAnswer({
        scope: 'thread',
        question: term.question,
        answer: term.answer,
        matchKind: term.matchKind,
        matchedThreads: [],
        sources: term.citations,
      });
    } else {
      const globalRes: InboxGlobalAnswer = queryAcrossInbox(effectiveThreads, clean);
      setActiveAnswer({
        scope: 'all',
        question: globalRes.question,
        answer: globalRes.answer,
        matchKind: globalRes.matchKind,
        matchedThreads: globalRes.matchedThreads,
        sources: globalRes.sources,
      });
    }
    setAskInput('');
  }

  function jumpToMatchedThread(threadId: string) {
    setActiveThreadId(threadId);
    setFocusedThreadReq((prev) => ({ id: threadId, pulse: (prev?.pulse ?? 0) + 1 }));
    workspace.markMailRead(threadId, false);
    onSelectMailThread(threadId);
  }

  return (
    <div class="inbox-host-shell">
      <h1 class="sr-only">Inbox — {provider === 'gmail' ? 'Gmail' : 'Outlook'}</h1>

      <div class="inbox-provider-stage">
        {status === 'ready' && ActiveRenderer ? (
          <ErrorBoundary boundaryKey={`inbox-${provider}`} label={`${provider} inbox`}>
            <ActiveRenderer
              threads={effectiveThreads}
              focusedThreadReq={focusedThreadReq}
              registry={registry}
              workspace={workspace}
              actorName={senderName}
              isAjePosted={isAjePosted}
              injectedReplySnippet={injectedReplySnippet}
              activeProvider={provider}
              senderEmail={senderEmail}
              onSwitchProvider={onSwitchProvider}
              onSelectThread={(id) => {
                setActiveThreadId(id);
                if (id) onSelectMailThread(id);
              }}
              onToggleStar={(id) => workspace.toggleMailStar(id)}
              onToggleFlag={(id) => workspace.toggleMailFlag(id)}
              onMarkRead={(id, unread) => workspace.markMailRead(id, unread)}
              onArchive={(id) => workspace.archiveMailThread(id)}
              onSendMail={handleSendMail}
              onNavigateSource={onNavigateSource}
            />
          </ErrorBoundary>
        ) : status === 'error' ? (
          <div class="launchpad-scroll">
            <div class="renderer-skeleton is-retry-box" role="alert">
              <div class="error-boundary-copy">
                <strong>
                  {isVersionMismatch
                    ? 'A new version of Lucy is available.'
                    : `Connection interrupted while loading ${provider}.`}
                </strong>
                <span class="error-boundary-detail">
                  Retry loading {provider} or reload the workspace.
                </span>
              </div>
              <div class="error-boundary-actions">
                {!isVersionMismatch && (
                  <button type="button" class="ghost-pill" onClick={retry}>
                    Retry
                  </button>
                )}
                <button
                  type="button"
                  class="primary-action-pill is-sm"
                  onClick={reloadForUpdatedVersion}
                >
                  Reload
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div class="launchpad-scroll">
            <div class="renderer-skeleton" role="status" aria-live="polite">
              <span>Loading {provider}…</span>
            </div>
          </div>
        )}
      </div>

      <section class="inbox-bottom-ask-dock" aria-label="Ask across inbox">
        <div class="inbox-composer-shell">
          {activeAnswer && (
            <div class="inbox-ask-drawer" role="region" aria-label="Inbox query answer">
              <div class="inbox-ask-drawer-top">
                <strong class="inbox-ask-question">{activeAnswer.question}</strong>
                <div class="stage-subbar-group">
                  {openThread && activeAnswer.matchKind !== 'no-match' && (
                    <button
                      type="button"
                      class="ghost-pill"
                      onClick={() =>
                        setInjectedReplySnippet((prev) => ({
                          text: activeAnswer.answer,
                          pulse: (prev?.pulse ?? 0) + 1,
                        }))
                      }
                    >
                      Insert into reply
                    </button>
                  )}
                  <button
                    type="button"
                    class="ghost-pill"
                    onClick={() => setActiveAnswer(null)}
                  >
                    Close
                  </button>
                </div>
              </div>

              <p class="inbox-ask-answer-text">{activeAnswer.answer}</p>

              {activeAnswer.matchKind === 'no-match' ? (
                <div class="inbox-ask-links-row">
                  {SUGGESTED_INBOX_QUERIES.map((qText) => (
                    <button
                      key={qText}
                      type="button"
                      class="mail-deeplink-chip"
                      onClick={() => runInboxAsk(qText)}
                    >
                      <span>{qText}</span>
                    </button>
                  ))}
                </div>
              ) : (
                (activeAnswer.matchedThreads.length > 0 ||
                  activeAnswer.sources.length > 0) && (
                  <div class="inbox-ask-links-row">
                    {activeAnswer.matchedThreads.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        class="mail-deeplink-chip"
                        onClick={() => jumpToMatchedThread(item.id)}
                      >
                        <span>{item.senderName} →</span>
                      </button>
                    ))}

                    {activeAnswer.sources.map((src) => (
                      <button
                        key={src.id}
                        type="button"
                        class="mail-deeplink-chip"
                        onClick={() =>
                          onNavigateSource({
                            workpaperId: src.workpaperId,
                            pluginRoute: src.pluginRoute,
                            anchor: src.anchor,
                            connectorId: src.connectorId,
                          })
                        }
                      >
                        <span>{src.label} →</span>
                      </button>
                    ))}
                  </div>
                )
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
              aria-label={
                askScope === 'thread' && openThread
                  ? `Ask about ${openThread.subject}`
                  : 'Ask across your inbox'
              }
              placeholder={
                askScope === 'thread' && openThread
                  ? `Ask about "${openThread.subject.slice(0, 44)}…" — figures, clauses, or checks…`
                  : 'Ask across inbox — filings, variances, clauses, or open sign-offs…'
              }
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
                {openThread ? (
                  <div class="seg-tabs" role="group" aria-label="Query scope">
                    <button
                      type="button"
                      class={`seg-tab ${askScope === 'all' ? 'is-active' : ''}`}
                      onClick={() => setAskScope('all')}
                    >
                      All inbox
                    </button>
                    <button
                      type="button"
                      class={`seg-tab ${askScope === 'thread' ? 'is-active' : ''}`}
                      onClick={() => setAskScope('thread')}
                    >
                      This thread
                    </button>
                  </div>
                ) : (
                  <span class="composer-hint-text">Inbox · Threads &amp; linked workpapers</span>
                )}

                <div class="inbox-quick-prompts">
                  {SUGGESTED_INBOX_QUERIES.map((qText) => (
                    <button
                      key={qText}
                      type="button"
                      class="inbox-prompt-chip"
                      onClick={() => runInboxAsk(qText)}
                    >
                      {qText}
                    </button>
                  ))}
                </div>
              </div>
              <div class="composer-tools-right">
                <button
                  type="submit"
                  class="composer-send-btn"
                  aria-label="Submit inbox question"
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
