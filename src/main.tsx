import type { ComponentChildren } from 'preact';
import { render } from 'preact';
import { createBrowserPersistenceBackend } from './core/persistence';
import { createRendererRegistry, type RendererPlugin } from './core/renderers';
import { createWorkspace } from './core/workspace';
import { App } from './ui/App';
import { clearResolvedPageCache } from './ui/primitives/LazyPageSlot';
import './styles.css';

const MAX_SPREADSHEET_FILE_BYTES = 10 * 1024 * 1024;
const SUPPORTED_SPREADSHEET_EXT = /\.(xlsx|csv|tsv)$/i;

const bootFallbackPlugin: RendererPlugin<ComponentChildren> = {
  id: 'fallback-inspector',
  label: 'Structured Payload',
  badge: 'DATA',
  accent: 'neutral',
  placement: 'inline',
  matches: () => true,
  load: async () => ({
    render({ block }) {
      return (
        <div class="artifact-inline-card">
          <span class="artifact-badge">{block.kind.toUpperCase()}</span>
          <span class="artifact-card-body">
            <span class="artifact-card-title">
              {block.filename ?? block.title ?? 'Structured record'}
            </span>
            {block.summary && <span class="artifact-card-summary">{block.summary}</span>}
          </span>
        </div>
      );
    },
  }),
};

const registry = createRendererRegistry<ComponentChildren>(bootFallbackPlugin);
const persistence = createBrowserPersistenceBackend();
const workspace = createWorkspace({
  registry,
  persistence,
});

void import('./plugins/registrySetup').then(({ registerBuiltinPlugins }) => {
  registerBuiltinPlugins(registry);
});

let wasAuthenticated = workspace.getState().authSession.isAuthenticated;
workspace.subscribe((next) => {
  if (wasAuthenticated && !next.authSession.isAuthenticated) {
    clearResolvedPageCache();
  }
  wasAuthenticated = next.authSession.isAuthenticated;
});

async function handleIngestFile(file: File): Promise<void> {
  if (!SUPPORTED_SPREADSHEET_EXT.test(file.name)) {
    workspace.notify({
      kind: 'error',
      message: `Unsupported file format "${file.name}". Import an .xlsx, .csv, or .tsv spreadsheet.`,
    });
    return;
  }

  if (file.size > MAX_SPREADSHEET_FILE_BYTES) {
    workspace.notify({
      kind: 'error',
      message: `"${file.name}" exceeds the 10 MB browser spreadsheet limit.`,
    });
    return;
  }

  try {
    const { parseSpreadsheetFile } = await import('./plugins/spreadsheet/parser');
    const workbook = await parseSpreadsheetFile(file);
    const totalRows = workbook.sheets.reduce((sum, s) => sum + s.rows.length, 0);

    workspace.attachContent({
      id: `upload-${Date.now()}`,
      kind: 'spreadsheet',
      title: file.name.replace(/\.[^.]+$/, ''),
      filename: file.name,
      mimeType:
        file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      summary: `${workbook.sheets.length} sheet${workbook.sheets.length === 1 ? '' : 's'} · ${totalRows.toLocaleString('en-US')} rows`,
      data: workbook,
    });

    workspace.notify({
      kind: 'success',
      message: `Attached "${file.name}" (${workbook.sheets.length} sheet${workbook.sheets.length === 1 ? '' : 's'} · ${totalRows.toLocaleString('en-US')} rows). Press Enter to open on stage.`,
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Unable to parse workbook.';
    workspace.notify({
      kind: 'error',
      message: `Could not import "${file.name}": ${detail}`,
    });
  }
}

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const message =
    reason instanceof Error ? reason.message : String(reason ?? 'Unexpected background error');
  workspace.notify({
    kind: 'error',
    message: `Operation failed: ${message}`,
  });
});

render(
  <App workspace={workspace} registry={registry} onIngestFile={handleIngestFile} />,
  document.getElementById('app')!
);

const isLocalPreviewHost =
  window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';

if ('serviceWorker' in navigator) {
  if (isLocalPreviewHost) {
    // Never trap localhost / 127.0.0.1 preview sessions behind stale asset caches across rebuilds
    void navigator.serviceWorker
      .getRegistrations()
      .then((regs) => Promise.all(regs.map((r) => r.unregister())))
      .catch(() => {});
    if ('caches' in window) {
      void caches
        .keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .catch(() => {});
    }
  } else if (import.meta.env.PROD) {
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { updateViaCache: 'none' })
        .then((reg) => {
          void reg.update().catch(() => {});

          function promptUpdate() {
            workspace.notify({
              kind: 'info',
              message: 'A new version of Lucy is ready.',
              reloadApp: true,
              actionLabel: 'Reload',
            });
          }

          if (reg.waiting && navigator.serviceWorker.controller) {
            promptUpdate();
          }

          reg.addEventListener('updatefound', () => {
            const installing = reg.installing;
            if (!installing) return;
            installing.addEventListener('statechange', () => {
              if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                promptUpdate();
              }
            });
          });
        })
        .catch(() => {
          // Non-fatal in restricted preview sandboxes
        });
    });
  }
}
