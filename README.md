# Lucy Frontend (`lucy-frontend`)

A minimal, strict-TypeScript enterprise & accounting workspace engineered for **single-round-trip boot payloads (`~20 KB` Brotli)**, **slow/offline network resilience**, **strict separation of headless logic from UI presentation**, and **plug-and-play renderer modularity** (`src/plugins/<name>/index.ts`).

## Quick Start

```bash
pnpm install
pnpm dev          # Start local dev server
pnpm test         # Run architectural boundary + core + .xlsx parser tests
pnpm build        # Run strict tsc --noEmit + production bundle build
node scripts/benchmark.mjs
```

## Directory Layout

- `src/core/` — Pure headless TypeScript domain state (`store.ts`, `types.ts`, `workspace.ts`, `renderers.ts`, `seed.ts`). Zero UI or DOM imports (enforced by automated tests).
- `src/plugins/` — On-demand capability plugins split into async chunks (`spreadsheet/` with zero-dependency `.xlsx` ZIP/XML + `.csv` parser and multi-sheet grid viewer; `code/` snippet viewer; `registrySetup.tsx`).
- `src/ui/` — Declarative Preact presentation layer (`App.tsx`, `Sidebar.tsx`, `Launchpad.tsx`, `Composer.tsx`, `ThreadView.tsx`, `BlockSlot.tsx`, `icons.tsx`).
- `public/sw.js` — Stale-while-revalidate Service Worker for offline and high-latency resilience.
