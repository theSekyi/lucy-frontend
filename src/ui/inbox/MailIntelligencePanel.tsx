import { useEffect, useRef, useState } from 'preact/hooks';
import {
  generateMailReplyDraft,
  queryMailTerminal,
  type MailSourceLink,
  type MailTerminalExchange,
  type MailThreadItem,
  type ReplyDraftTone,
} from '../../core/inbox';

export interface DeepLinkTarget {
  readonly pluginRoute?: string;
  readonly anchor?: string;
  readonly connectorId?: string;
}

interface MailIntelligencePanelProps {
  readonly thread: MailThreadItem;
  readonly replyFocusPulse: number;
  readonly senderEmail: string;
  readonly onNavigateSource: (target: DeepLinkTarget) => void;
  readonly onPreviewInlineRoute?: (pluginRoute: string) => void;
  readonly onSendReply: (to: string, subject: string, body: string) => void;
}

export function MailIntelligencePanel({
  thread,
  replyFocusPulse,
  senderEmail,
  onNavigateSource,
  onPreviewInlineRoute,
  onSendReply,
}: MailIntelligencePanelProps) {
  const [tone, setTone] = useState<ReplyDraftTone>('standard');
  const [draftText, setDraftText] = useState<string>(() =>
    generateMailReplyDraft(thread, 'standard')
  );
  const [showReasoning, setShowReasoning] = useState(true);
  const [sentNotice, setSentNotice] = useState(false);
  const [terminalInput, setTerminalInput] = useState('');
  const [exchanges, setExchanges] = useState<MailTerminalExchange[]>([]);

  const replyBoxRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setTone('standard');
    setDraftText(generateMailReplyDraft(thread, 'standard'));
    setSentNotice(false);
    setTerminalInput('');
    setExchanges([]);
  }, [thread.id]);

  useEffect(() => {
    if (replyFocusPulse <= 0) return;
    replyBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    textareaRef.current?.focus();
  }, [replyFocusPulse]);

  function handleToneSelect(nextTone: ReplyDraftTone) {
    setTone(nextTone);
    setDraftText(generateMailReplyDraft(thread, nextTone));
    setSentNotice(false);
    textareaRef.current?.focus();
  }

  function runTerminalQuery(questionText: string) {
    const clean = questionText.trim();
    if (!clean) return;
    const result = queryMailTerminal(thread, clean);
    setExchanges((prev) => [...prev, result]);
    setTerminalInput('');
  }

  function handleTerminalSubmit(e: Event) {
    e.preventDefault();
    runTerminalQuery(terminalInput);
  }

  function triggerSource(src: MailSourceLink) {
    if (src.pluginRoute && !src.anchor && onPreviewInlineRoute) {
      onPreviewInlineRoute(src.pluginRoute);
      return;
    }
    onNavigateSource({
      pluginRoute: src.pluginRoute,
      anchor: src.anchor,
      connectorId: src.connectorId,
    });
  }

  const intel = thread.intelligence;
  const sources = intel?.sources ?? [];

  return (
    <section class="mail-intel-shell" aria-label="Reasoning, inline reply, and terminal">
      {intel && (
        <div class="mail-reasoning-header-wrap">
          <div class="mail-intel-header">
            <span class="mail-intel-verdict">{intel.verdict}</span>
            <button
              type="button"
              class="mail-intel-toggle-btn"
              onClick={() => setShowReasoning((v) => !v)}
            >
              {showReasoning ? 'Hide reasoning ▴' : 'Reasoning ▾'}
            </button>
          </div>

          {showReasoning && (
            <div class="mail-reasoning-block">
              <div class="mail-reasoning-steps">
                {intel.reasoning.map((item, idx) => {
                  const linked = sources.find((s) => s.id === item.sourceId);
                  return (
                    <div key={idx} class="mail-reasoning-row">
                      <span class="mail-step-num">0{idx + 1}</span>
                      <div class="mail-step-body">
                        <span>{item.check}</span>
                        {linked && (
                          <button
                            type="button"
                            class="mail-deeplink-chip"
                            onClick={() => triggerSource(linked)}
                          >
                            <span class="mail-deeplink-kind">{linked.kindLabel}</span>
                            <span>{linked.label}</span>
                            <span>↗</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {sources.length > 0 && (
                <div class="mail-sources-strip">
                  <span class="mail-sources-label">Sources</span>
                  <div class="mail-sources-list">
                    {sources.map((src) => (
                      <button
                        key={src.id}
                        type="button"
                        class="mail-source-pill"
                        onClick={() =>
                          onNavigateSource({
                            pluginRoute: src.pluginRoute,
                            anchor: src.anchor,
                            connectorId: src.connectorId,
                          })
                        }
                      >
                        <span class="mail-deeplink-kind">{src.kindLabel}</span>
                        <span>{src.label}</span>
                        <span class="mail-source-arrow">↗</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div ref={replyBoxRef} class="mail-inline-reply-box">
        <div class="mail-draft-toolbar">
          <div class="mail-reply-to-line">
            <span class="mail-reply-glyph">↩</span>
            <span class="mail-reply-recipient">{thread.senderEmail}</span>
          </div>

          <div class="mail-tone-tabs" role="group" aria-label="Generate response">
            <button
              type="button"
              class={`mail-tone-btn ${tone === 'standard' && draftText ? 'is-active' : ''}`}
              onClick={() => handleToneSelect('standard')}
            >
              Generate response
            </button>
            <button
              type="button"
              class={`mail-tone-btn ${tone === 'concise' && draftText ? 'is-active' : ''}`}
              onClick={() => handleToneSelect('concise')}
            >
              Concise
            </button>
            <button
              type="button"
              class={`mail-tone-btn ${tone === 'pushback' && draftText ? 'is-active' : ''}`}
              onClick={() => handleToneSelect('pushback')}
            >
              Request backup
            </button>
          </div>
        </div>

        <textarea
          ref={textareaRef}
          rows={5}
          class="mail-draft-textarea"
          placeholder="Write your reply or click Generate response…"
          value={draftText}
          onInput={(e) => {
            setSentNotice(false);
            setDraftText((e.currentTarget as HTMLTextAreaElement).value);
          }}
        />

        <div class="mail-inline-reply-footer">
          <span class="sheet-meta-count">From {senderEmail}</span>

          <div class="stage-subbar-group">
            {draftText && (
              <button
                type="button"
                class="ghost-pill"
                onClick={() => {
                  setDraftText('');
                  setSentNotice(false);
                  textareaRef.current?.focus();
                }}
              >
                Clear
              </button>
            )}
            <button
              type="button"
              class="primary-action-pill is-sm"
              onClick={() => {
                if (!draftText.trim()) return;
                onSendReply(thread.senderEmail, `Re: ${thread.subject}`, draftText);
                setSentNotice(true);
              }}
            >
              {sentNotice ? '✓ Sent' : 'Send'}
            </button>
          </div>
        </div>
      </div>

      <div class="mail-terminal-dock">
        {exchanges.length > 0 && (
          <div class="mail-terminal-log">
            {exchanges.map((ex) => (
              <div key={ex.id} class="mail-terminal-entry">
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
                      setDraftText((prev) =>
                        prev.trim() ? `${prev.trim()}\n\n${ex.answer}` : ex.answer
                      )
                    }
                  >
                    Insert into reply ↵
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <form class="mail-terminal-form" onSubmit={handleTerminalSubmit}>
          <span class="mail-term-prompt" aria-hidden="true">
            ›
          </span>
          <input
            type="text"
            class="mail-terminal-input"
            placeholder="Ask terminal about figures, clauses, or tied ledgers…"
            value={terminalInput}
            onInput={(e) => setTerminalInput((e.currentTarget as HTMLInputElement).value)}
          />
          <button type="submit" class="mail-term-run-btn">
            Ask ↵
          </button>
        </form>

        {intel && intel.quickPrompts.length > 0 && exchanges.length === 0 && (
          <div class="mail-term-suggestions">
            {intel.quickPrompts.map((qp) => (
              <button
                key={qp}
                type="button"
                class="mail-term-chip"
                onClick={() => runTerminalQuery(qp)}
              >
                › {qp}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
