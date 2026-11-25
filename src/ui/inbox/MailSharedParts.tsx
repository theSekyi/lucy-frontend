import type { ComponentChildren } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { MailAttachmentLink } from '../../core/inbox';
import type { RendererRegistry } from '../../core/renderers';
import type { ContentBlock, InboxProvider } from '../../core/types';
import { BlockSlot } from '../BlockSlot';
import { GmailLogo, OutlookLogo } from '../connectors/connectorLogos';
import type { DeepLinkTarget } from './MailIntelligencePanel';

export interface PreviewAttachmentState {
  readonly att: MailAttachmentLink;
  readonly block: ContentBlock;
}

export function useMailAttachmentPreview(registry: RendererRegistry<ComponentChildren>) {
  const [previewBlock, setPreviewBlock] = useState<PreviewAttachmentState | null>(null);
  const mountedRef = useRef(true);
  const reqSeqRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const clearPreview = useCallback(() => {
    reqSeqRef.current += 1;
    setPreviewBlock(null);
  }, []);

  const openAttachment = useCallback(
    async (att: MailAttachmentLink, toggleIfSame = true) => {
      if (toggleIfSame && previewBlock?.att.id === att.id) {
        clearPreview();
        return;
      }
      const plugin = registry.findByRoute(att.pluginRoute);
      if (!plugin?.createSample) return;
      const seq = ++reqSeqRef.current;
      const sample = await plugin.createSample((p) => `${p}-${Date.now()}`);
      if (mountedRef.current && reqSeqRef.current === seq) {
        setPreviewBlock({ att, block: sample.artifact });
      }
    },
    [clearPreview, previewBlock?.att.id, registry]
  );

  return { previewBlock, clearPreview, openAttachment };
}

export function InboxProviderSwitch({
  activeProvider,
  onSwitchProvider,
}: {
  readonly activeProvider: InboxProvider;
  readonly onSwitchProvider: (provider: InboxProvider) => void;
}) {
  return (
    <div class="inbox-provider-switch" role="tablist" aria-label="Mail provider">
      <button
        type="button"
        role="tab"
        aria-selected={activeProvider === 'gmail'}
        class={`inbox-provider-btn ${activeProvider === 'gmail' ? 'is-active' : ''}`}
        onClick={() => activeProvider !== 'gmail' && onSwitchProvider('gmail')}
      >
        <GmailLogo size={14} />
        <span>Gmail</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeProvider === 'outlook'}
        class={`inbox-provider-btn ${activeProvider === 'outlook' ? 'is-active' : ''}`}
        onClick={() => activeProvider !== 'outlook' && onSwitchProvider('outlook')}
      >
        <OutlookLogo size={14} />
        <span>Outlook</span>
      </button>
    </div>
  );
}

export function InlineAttachmentDeck({
  attachments,
  previewBlock,
  registry,
  onToggleAttachment,
  onClearPreview,
  onNavigateSource,
}: {
  readonly attachments: ReadonlyArray<MailAttachmentLink>;
  readonly previewBlock: PreviewAttachmentState | null;
  readonly registry: RendererRegistry<ComponentChildren>;
  readonly onToggleAttachment: (att: MailAttachmentLink) => void;
  readonly onClearPreview: () => void;
  readonly onNavigateSource: (target: DeepLinkTarget) => void;
}) {
  return (
    <>
      {attachments.length > 0 && (
        <div class="mail-attachment-deck">
          {attachments.map((att) => {
            const isOpen = previewBlock?.att.id === att.id;
            return (
              <button
                key={att.id}
                type="button"
                class={`mail-att-card ${isOpen ? 'is-active' : ''}`}
                onClick={() => onToggleAttachment(att)}
              >
                <span class="artifact-badge accent-sky">{att.badge}</span>
                <span>
                  <strong class="mail-att-filename">{att.filename}</strong>
                  <span class="mail-att-size">{att.sizeLabel}</span>
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
              <span class="artifact-badge accent-sky">{previewBlock.att.badge}</span>
              <strong class="artifact-stage-title">{previewBlock.att.filename}</strong>
            </div>
            <div class="artifact-stage-controls">
              <button
                type="button"
                class="ghost-pill"
                onClick={() =>
                  onNavigateSource({ pluginRoute: previewBlock.att.pluginRoute })
                }
              >
                Open in Split Stage ↗
              </button>
              <button
                type="button"
                class="icon-action-btn"
                aria-label="Close inline preview"
                onClick={onClearPreview}
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
  );
}

export function InlineNewMailForm({
  variant,
  senderEmail,
  onDiscard,
  onSend,
}: {
  readonly variant: 'gmail' | 'outlook';
  readonly senderEmail: string;
  readonly onDiscard: () => void;
  readonly onSend: (to: string, subject: string, body: string) => void;
}) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  function handleSubmit(e: Event) {
    e.preventDefault();
    onSend(to, subject, body);
  }

  return (
    <form
      class={`inline-pane-compose-form ${variant === 'outlook' ? 'is-flush' : ''}`}
      onSubmit={handleSubmit}
    >
      {variant === 'outlook' && (
        <div class="outlook-reading-subject-row">
          <h2 class="outlook-reading-subject">New mail</h2>
          <button type="button" class="ghost-pill" onClick={onDiscard}>
            Discard
          </button>
        </div>
      )}

      <input
        type="text"
        class="profile-input"
        placeholder="To"
        value={to}
        onInput={(e) => setTo((e.currentTarget as HTMLInputElement).value)}
      />
      <input
        type="text"
        class="profile-input"
        placeholder={variant === 'outlook' ? 'Add a subject' : 'Subject'}
        value={subject}
        onInput={(e) => setSubject((e.currentTarget as HTMLInputElement).value)}
      />
      <textarea
        rows={9}
        class="mail-draft-textarea"
        placeholder="Write message…"
        value={body}
        onInput={(e) => setBody((e.currentTarget as HTMLTextAreaElement).value)}
      />

      <div class="mail-inline-reply-footer">
        <span class="sheet-meta-count">From {senderEmail}</span>
        <div class="stage-subbar-group">
          {variant === 'gmail' && (
            <button type="button" class="ghost-pill" onClick={onDiscard}>
              Discard
            </button>
          )}
          <button
            type="submit"
            class={variant === 'outlook' ? 'outlook-newmail-btn' : 'primary-action-pill is-sm'}
          >
            Send
          </button>
        </div>
      </div>
    </form>
  );
}
