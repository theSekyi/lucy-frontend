import { useEffect, useRef, useState } from 'preact/hooks';
import {
  generateMailReplyDraft,
  resolveLiveMailVerdict,
  type MailSourceLink,
  type MailThreadItem,
  type ReplyDraftTone,
} from '../../core/inbox';

export interface DeepLinkTarget {
  readonly workpaperId?: string;
  readonly blockId?: string;
  readonly pluginRoute?: string;
  readonly anchor?: string;
  readonly connectorId?: string;
}

interface MailIntelligencePanelProps {
  readonly thread: MailThreadItem;
  readonly replyFocusPulse: number;
  readonly senderEmail: string;
  readonly isAjePosted?: boolean;
  readonly injectedReplySnippet?: {
    readonly text: string;
    readonly pulse: number;
  } | null;
  readonly onNavigateSource: (target: DeepLinkTarget) => void;
  readonly onPreviewInlineRoute?: (pluginRoute: string) => void;
  readonly onSendReply: (to: string, subject: string, body: string) => boolean;
}

export function MailIntelligencePanel({
  thread,
  replyFocusPulse,
  senderEmail,
  isAjePosted = false,
  injectedReplySnippet = null,
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

  const replyBoxRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setTone('standard');
    setDraftText(generateMailReplyDraft(thread, 'standard'));
    setSentNotice(false);
  }, [thread.id]);

  useEffect(() => {
    if (replyFocusPulse <= 0) return;
    replyBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    textareaRef.current?.focus();
  }, [replyFocusPulse]);

  useEffect(() => {
    if (!injectedReplySnippet || injectedReplySnippet.pulse <= 0) return;
    setSentNotice(false);
    setDraftText((prev) =>
      prev.trim()
        ? `${prev.trim()}\n\n${injectedReplySnippet.text}`
        : injectedReplySnippet.text
    );
    replyBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    textareaRef.current?.focus();
  }, [injectedReplySnippet?.pulse]);

  function handleToneSelect(nextTone: ReplyDraftTone) {
    setTone(nextTone);
    setDraftText(generateMailReplyDraft(thread, nextTone));
    setSentNotice(false);
    textareaRef.current?.focus();
  }

  function triggerSource(src: MailSourceLink) {
    if (src.pluginRoute && !src.anchor && onPreviewInlineRoute) {
      onPreviewInlineRoute(src.pluginRoute);
      return;
    }
    onNavigateSource({
      workpaperId: src.workpaperId,
      pluginRoute: src.pluginRoute,
      anchor: src.anchor,
      connectorId: src.connectorId,
    });
  }

  const intel = thread.intelligence;
  const liveVerdict = resolveLiveMailVerdict(thread, { ajePosted: isAjePosted });
  const sources = intel?.sources ?? [];

  return (
    <section class="mail-intel-shell" aria-label="Verification checks and reply composer">
      {intel && (
        <div>
          <div class="mail-intel-header">
            <span class="mail-intel-verdict">{liveVerdict ?? intel.verdict}</span>
            <button
              type="button"
              class="mail-intel-toggle-btn"
              aria-expanded={showReasoning}
              onClick={() => setShowReasoning((v) => !v)}
            >
              {showReasoning ? 'Hide checks' : 'Show checks'}
            </button>
          </div>

          {showReasoning && (
            <div class="mail-reasoning-block">
              <div class="mail-reasoning-steps">
                {intel.reasoning.map((item, idx) => {
                  const linked = sources.find((s) => s.id === item.sourceId);
                  return (
                    <div key={idx} class="mail-reasoning-row">
                      <span class="mail-step-bullet" aria-hidden="true">
                        —
                      </span>
                      <div class="mail-step-body">
                        <span>{item.check}</span>
                        {linked && (
                          <button
                            type="button"
                            class="mail-deeplink-chip"
                            onClick={() => triggerSource(linked)}
                          >
                            <span>{linked.label}</span>
                            <span>→</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
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

          <div class="mail-tone-tabs" role="group" aria-label="Reply draft template">
            <button
              type="button"
              class={`mail-tone-btn ${tone === 'standard' && draftText ? 'is-active' : ''}`}
              onClick={() => handleToneSelect('standard')}
            >
              Standard
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
              Request support
            </button>
          </div>
        </div>

        <textarea
          ref={textareaRef}
          rows={5}
          class="mail-draft-textarea"
          placeholder="Write reply…"
          aria-label={`Reply to ${thread.senderName}`}
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
              disabled={!draftText.trim()}
              onClick={() => {
                if (!draftText.trim()) return;
                const sent = onSendReply(
                  thread.senderEmail,
                  `Re: ${thread.subject}`,
                  draftText
                );
                if (sent) {
                  setSentNotice(true);
                }
              }}
            >
              {sentNotice ? 'Sent' : 'Send reply'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
