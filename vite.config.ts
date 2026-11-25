import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

function stampServiceWorkerBuildHash(): Plugin {
  let outDir = 'dist';
  return {
    name: 'stamp-sw-build-hash',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    writeBundle() {
      const htmlPath = resolve(process.cwd(), outDir, 'index.html');
      const swPath = resolve(process.cwd(), outDir, 'sw.js');
      if (!existsSync(htmlPath) || !existsSync(swPath)) return;

      const html = readFileSync(htmlPath, 'utf8');
      const hash = createHash('sha256').update(html).digest('hex').slice(0, 10);
      const swSource = readFileSync(swPath, 'utf8');
      writeFileSync(swPath, swSource.replace(/__BUILD_HASH__/g, hash), 'utf8');
    },
  };
}

export default defineConfig({
  plugins: [stampServiceWorkerBuildHash()],
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'preact',
  },
  build: {
    target: 'es2022',
    modulePreload: false,
  },
});
