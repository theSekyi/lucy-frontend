# Lucy Frontend (`lucy-frontend`)

Strict-TypeScript accounting, audit, tax, and practice workspace engineered for **single-round-trip boot payloads (`<= 30 KB` Brotli budget)**, **integer minor-unit ledger tie-out**, **local IndexedDB/storage draft & revision persistence**, **isolated error boundaries**, and **WCAG 2.2 AA keyboard navigation**.

## Quick Start

```bash
pnpm install
pnpm dev                    # Start local Vite dev server
pnpm typecheck              # Strict tsc --noEmit verification
pnpm test                   # Unit, architecture, CSS hygiene, parser, and jsdom Preact DOM tests
pnpm build                  # Production bundle build
node scripts/benchmark.mjs  # Verify critical-boot Brotli budget (<= 30 KB)
```

## Architecture & Directory Layout

- `src/core/` — Pure headless TypeScript domain state (`money.ts`, `ledger.ts`, `routes.ts`, `persistence.ts`, `store.ts`, `types.ts`, `inbox.ts`, `admin.ts`, `onboarding.ts`, `connectors.ts`, `seed.ts`, `workspace.ts`, `renderers.ts`). Zero UI, Preact, or DOM imports (enforced by automated tests).
  - `money.ts` & `ledger.ts` — Single-source integer minor-unit arithmetic and canonical UK (`GBP £`, FRS 102 / IFRS 15 & 16, HMRC CT600) and US (`USD $`, US GAAP, Schedule M-1 / K-1) workpaper fixtures so figures tie out identically across Home, Inbox, Clients, Firm Admin, and all stage/inline renderers.
  - `routes.ts` — Typed query-string route table (`/?page=workpaper&id=...`, `/?page=inbox&provider=gmail&thread=...`, `/?page=clients&client=...&eng=...`, `/?page=admin`, `/?page=connectors`, `/?page=login`, `/?page=onboarding`) with full `Back` / `Forward` / `Reload` history support on static hosts.
  - `persistence.ts` — Versioned browser persistence (`IndexedDB` + `localStorage` snapshot mirror) for workpaper drafts, committed revisions with `Undo`, mail thread state, composer drafts, firm admin checklists, and queued offline prompts.
- `src/tokens.css` & `src/styles.css` — Shared design tokens, WCAG 2.2 AA contrast, composite `:focus-within` / `:focus-visible` focus rings, `@media (prefers-reduced-motion: reduce)`, `@media (forced-colors: active)`, and `@media print` workpaper layout.
- `src/ui/` — Preact presentation shell (`App.tsx`, `Sidebar.tsx`, `CommandPalette.tsx`, `Launchpad.tsx`, `ThreadView.tsx`, `Composer.tsx`, `BlockSlot.tsx`), `inbox/` (`InboxWorkspace.tsx`, `GmailInboxRenderer.tsx`, `OutlookInboxRenderer.tsx`, `MailIntelligencePanel.tsx`), `clients/ClientsPage.tsx`, `admin/FirmAdminPage.tsx`, `connectors/ConnectorsPage.tsx`, `auth/` (`LoginPage.tsx`, `WorkspaceOnboardingPage.tsx`), and accessible `primitives/` (`ErrorBoundary.tsx`, `LazyPageSlot.tsx`, `ToastRegion.tsx`, `SelectMenu.tsx`, `MoneyInput.tsx`, `useAsyncResource.ts`, `useWorkspaceSlice.ts`).
- `src/plugins/` — 14 on-demand stage and inline capability plugins loaded as async chunks via `RendererRegistry`:
  - Accounting, Audit & Tax: `trial-balance/`, `journal-entry/`, `reconciliation/`, `vouching/`, `pbc-tracker/`, `rollforward/`, `tax-bridge/`
  - Enterprise Documents & Analytics: `spreadsheet/` (bounded `.xlsx` / `.csv` parser + virtualized `role="grid"` viewer), `contract/`, `redline/`, `sql-canvas/`, `topology/`, `deck/`, `code/`, and `prose.tsx`.
- `public/sw.js` — Versioned asset & navigation Service Worker with user-confirmed `SKIP_WAITING` update activation.
- `.github/workflows/ci.yml` — Automated CI pipeline gating `pnpm typecheck`, `pnpm test`, `pnpm build`, and `node scripts/benchmark.mjs`.
