import { useEffect, useState } from 'preact/hooks';
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
  readonly onNavigateSource: (target: DeepLinkTarget) => void;
  readonly onPreviewInlineRoute?: (pluginRoute: string) => void;
  readonly onSendQuickReply: (to: string, subject: string, body: string) => void;
  readonly onOpenInReplyComposer: (prefilledBody: string) => void;
}

export function MailIntelligencePanel({
  thread,
  onNavigateSource,
  onPreviewInlineRoute,
  onSendQuickReply,
  onOpenInReplyComposer,
}: MailIntelligencePanelProps) {
  const [tone, setTone] = useState<ReplyDraftTone>('standard');
  const [draftText, setDraftText] = useState<string>(() =>
    generateMailReplyDraft(thread, 'standard')
  );
  const [showReasoning, setShowReasoning] = useState(true);
  const [sentNotice, setSentNotice] = useState(false);
  const [terminalInput, setTerminalInput] = useState('');
  const [exchanges, setExchanges] = useState<MailTerminalExchange[]>([]);

  useEffect(() => {
    setTone('standard');
    setDraftText(generateMailReplyDraft(thread, 'standard'));
    setSentNotice(false);
    setTerminalInput('');
    setExchanges([]);
  }, [thread.id]);

  function handleToneSelect(nextTone: ReplyDraftTone) {
    setTone(nextTone);
    setDraftText(generateMailReplyDraft(thread, nextTone));
    setSentNotice(false);
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
    <section class="mail-intel-shell" aria-label="Prepared response, reasoning, and terminal">
      <header class="mail-intel-header">
        <div class="mail-intel-title-row">
          <span class="mail-intel-tag">PREPARED BRIEF</span>
          <span class="mail-intel-verdict">
            {intel ? intel.verdict : 'Draft response prepared from thread context.'}
          </span>
        </div>

        <button
          type="button"
          class="mail-intel-toggle-btn"
          onClick={() => setShowReasoning((v) => !v)}
        >
          {showReasoning ? 'Hide reasoning ▴' : 'Show reasoning ▾'}
        </button>
      </header>

      {showReasoning && intel && (
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
                        title={linked.detail}
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
                    title={src.detail}
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

      <div class="mail-draft-section">
        <div class="mail-draft-toolbar">
          <div class="mail-tone-tabs" role="tablist" aria-label="Draft style">
            <span class="mail-sources-label">Draft reply</span>
            {(['standard', 'concise', 'pushback'] as const).map((t) => (
              <button
                key={t}
                type="button"
                class={`mail-tone-btn ${tone === t ? 'is-active' : ''}`}
                onClick={() => handleToneSelect(t)}
              >
                {t === 'standard' ? 'Standard' : t === 'concise' ? 'Concise' : 'Request backup'}
              </button>
            ))}
          </div>

          <div class="stage-subbar-group">
            <button
              type="button"
              class="ghost-pill"
              onClick={() => onOpenInReplyComposer(draftText)}
            >
              Edit in Reply ↩
            </button>
            <button
              type="button"
              class="primary-action-pill is-sm"
              onClick={() => {
                onSendQuickReply(thread.senderEmail, `Re: ${thread.subject}`, draftText);
                setSentNotice(true);
              }}
            >
              {sentNotice ? '✓ Sent' : 'Send reply'}
            </button>
          </div>
        </div>

        <textarea
          rows={4}
          class="mail-draft-textarea"
          value={draftText}
          onInput={(e) => {
            setSentNotice(false);
            setDraftText((e.currentTarget as HTMLTextAreaElement).value);
          }}
        />
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
                      setDraftText((prev) => `${prev.trim()}\n\n${ex.answer}`)
                    }
                  >
                    Insert into draft ↵
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
            placeholder="Ask terminal about figures, clauses, or tied ledgers in this mail…"
            value={terminalInput}
            onInput={(e) => setTerminalInput((e.currentTarget as HTMLInputElement).value)}
          />
          <button type="submit" class="mail-term-run-btn">
            Run ↵
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
