import { render } from 'preact';
import { createWorkspace } from './core/workspace';
import { createDefaultRendererRegistry } from './plugins/registrySetup';
import { App } from './ui/App';
import './styles.css';

const registry = createDefaultRendererRegistry();
const workspace = createWorkspace({ registry });

render(<App workspace={workspace} registry={registry} />, document.getElementById('app')!);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Non-fatal in restricted preview sandboxes
    });
  });
}
