import { render } from 'preact';
import { createWorkspace } from './core/workspace';
import { createDefaultRendererRegistry } from './plugins/registrySetup';
import { App } from './ui/App';
import './styles.css';

const registry = createDefaultRendererRegistry();
const workspace = createWorkspace({ registry });

async function handleIngestFile(file: File) {
  const { parseSpreadsheetFile } = await import('./plugins/spreadsheet/parser');
  const workbook = await parseSpreadsheetFile(file);
  const totalRows = workbook.sheets.reduce((sum, s) => sum + s.rows.length, 0);

  workspace.attachContent({
    id: `upload-${Date.now()}`,
    kind: 'spreadsheet',
    title: file.name.replace(/\.[^.]+$/, ''),
    filename: file.name,
    mimeType: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    summary: `${workbook.sheets.length} sheet${workbook.sheets.length === 1 ? '' : 's'} · ${totalRows} rows`,
    data: workbook,
  });
}

render(
  <App workspace={workspace} registry={registry} onIngestFile={handleIngestFile} />,
  document.getElementById('app')!
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Non-fatal in restricted preview sandboxes
    });
  });
}
