import { Component, type ComponentChildren } from 'preact';

interface ErrorBoundaryProps {
  readonly boundaryKey?: string;
  readonly label: string;
  readonly compact?: boolean;
  readonly children: ComponentChildren;
}

interface ErrorBoundaryState {
  readonly error: Error | null;
}

export function reloadForUpdatedVersion(): void {
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker
      .getRegistration()
      .then((reg) => {
        reg?.waiting?.postMessage({ type: 'SKIP_WAITING' });
      })
      .catch(() => {})
      .finally(() => {
        window.location.reload();
      });
    return;
  }
  if (typeof window !== 'undefined') {
    window.location.reload();
  }
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static override getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      error: error instanceof Error ? error : new Error(String(error ?? 'Render error')),
    };
  }

  override componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (prevProps.boundaryKey !== this.props.boundaryKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  private handleRetry = (): void => {
    this.setState({ error: null });
  };

  override render() {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }

    const content = (
      <div class="renderer-skeleton is-retry-box" role="alert">
        <div class="error-boundary-copy">
          <strong>Unable to display {this.props.label}.</strong>
          <span class="error-boundary-detail">
            Other sections and workpapers remain available. ({error.message})
          </span>
        </div>
        <div class="error-boundary-actions">
          <button type="button" class="ghost-pill" onClick={this.handleRetry}>
            Retry
          </button>
          <button
            type="button"
            class="primary-action-pill is-sm"
            onClick={reloadForUpdatedVersion}
          >
            Reload
          </button>
        </div>
      </div>
    );

    if (this.props.compact) {
      return content;
    }

    return <div class="launchpad-scroll">{content}</div>;
  }
}
