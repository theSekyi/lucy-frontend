import { useEffect } from 'preact/hooks';
import type { WorkspaceNotification } from '../../core/types';

interface ToastRegionProps {
  readonly notifications: ReadonlyArray<WorkspaceNotification>;
  readonly onAction: (item: WorkspaceNotification) => void;
  readonly onDismiss: (notificationId: string) => void;
}

export function ToastRegion({
  notifications,
  onAction,
  onDismiss,
}: ToastRegionProps) {
  useEffect(() => {
    if (notifications.length === 0) return;
    const latest = notifications[notifications.length - 1]!;
    if (latest.kind === 'error') return;

    const hasAction = Boolean(latest.undoRevisionId || latest.undoSentMailId);
    const timeoutMs = hasAction ? 9000 : 5000;
    const timer = setTimeout(() => {
      onDismiss(latest.id);
    }, timeoutMs);

    return () => clearTimeout(timer);
  }, [notifications, onDismiss]);

  return (
    <div
      class="toast-region"
      role="status"
      aria-live="polite"
      aria-atomic="false"
    >
      {notifications.map((item) => {
        const hasAction = Boolean(item.undoRevisionId || item.undoSentMailId);
        return (
          <div key={item.id} class={`toast-card is-${item.kind}`}>
            <span class="toast-message">{item.message}</span>
            <div class="toast-actions">
              {hasAction && (
                <button
                  type="button"
                  class="toast-action-btn"
                  onClick={() => onAction(item)}
                >
                  {item.actionLabel ?? 'Undo'}
                </button>
              )}
              <button
                type="button"
                class="toast-dismiss-btn"
                aria-label="Dismiss notification"
                onClick={() => onDismiss(item.id)}
              >
                ×
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
