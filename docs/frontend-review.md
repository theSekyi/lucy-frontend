# Lucy frontend review: problems, repro steps and fixes

Reviewed commit `05bb913` on `main`, 25 November 2026. Scope is the frontend only. Seeded data and the missing backend are accepted as given.

## 1. Summary

Lucy scores 37 of 100 against the review criteria. Four of five gates fail.

| Gate | Result |
|---|---|
| Build and tests pass | Pass |
| Numbers agree across screens | Fail |
| Work survives a refresh | Fail |
| One crash stays local | Fail |
| Keyboard path with no WCAG 2.2 AA blocker | Fail |

This file lists 85 problems: 9 at P0, 35 at P1, 36 at P2 and 5 at P3.

Ten root causes produce 80 of the 85 problems. Fix the root cause and the problems under it close together. Section 3 lists the root causes. Sections 5 to 14 give each one with its problems.

## 2. How to use this file

Run the production build for each repro:

```bash
pnpm install
pnpm build
pnpm preview --port 4173
```

Open `http://localhost:4173/`. Each repro starts from a fresh page load at 1280 by 800 px, unless the steps say otherwise.

Severity:

| Level | Meaning |
|---|---|
| P0 | Blocks a core task, loses work, or shows a wrong number |
| P1 | Causes clear difficulty or doubt |
| P2 | Annoys, but a workaround exists |
| P3 | Polish |

Each problem has a check label:

- Live: reproduced in the production build during the review.
- Code: found in the source. The steps are the expected repro. Confirm them before you fix.

Line numbers refer to commit `05bb913`.

## 3. Root causes at a glance

| ID | Root cause | One fix | Problems | P0 | Effort |
|---|---|---|---|---|---|
| A | Failures are not contained or reported | Error boundaries, one async hook, one feedback channel | 8 | 1 | 3 days |
| B | Work lives in component memory | Store-owned drafts, persistence, revisions | 6 | 3 | 5 days |
| C | Views and objects have no stable address | One route table with object IDs | 7 | 0 | 3 days |
| D | Sample data is typed by hand in each file | One ledger fixture with computed text, status, format and dates | 14 | 4 | 4 days |
| E | Files and large data run unguarded on the main thread | Worker parser with limits, virtual grid, narrow subscriptions | 7 | 1 | 5 days |
| F | Risky actions have no guard, undo or record | An action layer with guards, undo and an audit log | 8 | 0 | 4 days |
| G | Design tokens stop at 13 colours | One token file, one focus ring, one lint rule | 11 | 0 | 5 days |
| H | No shared accessible primitives and no command model | Shared primitives and a command registry | 9 | 0 | 7 days |
| I | Tests do not render the UI, and no CI exists | DOM tests, browser tests, CI gates | 5 | 0 | 3 days |
| J | No shared vocabulary | A glossary and a copy catalogue | 5 | 0 | 2 days |

Effort is an estimate for one senior engineer.

## 4. Recommended order

1. Day 1: the A1 hotfix, the E1 hotfix, and the first CI job with a navigation test (group I).
2. Groups C and B together. Stable IDs come first, then persistence.
3. Group D. The tie-out functions from D feed group F.
4. The rest of A, then E and F.
5. Groups G, H and J.

## 5. Group A: failures are not contained or reported

Each async load and each render path handles failure in its own way, or not at all. No component catches render errors. No single place tells the user that something failed.

### Fix

1. Hotfix A1 today. Give each `LazyPageSlot` in `src/ui/App.tsx` a `key` equal to its `slotKey`.
2. Replace the three hand-written loaders with one hook, `useAsyncResource(key, loader)`. It returns `{ status, data, error, retry }`. It stores the key with the data, so data for an old key can never render. Use it in `LazyPageSlot`, `BlockSlot` and `InboxWorkspace`.
3. Add an `ErrorBoundary`. Wrap the app root, each `LazyPageSlot` and each `BlockSlot`. The fallback names what failed and offers Retry and Reload.
4. Add one feedback channel: `notify({ kind, message, action })` with one `role="status"` region. Route save, send, import and error messages through it. Add a global `unhandledrejection` handler that calls it.
5. Wrap `handleIngestFile` in `try/catch`. Check type and size before the parse.
6. Treat a failed dynamic import after one retry as a version change. Show "A new version is available" with a Reload button. Give the service worker a build-hashed cache name and a precache manifest. Call `skipWaiting()` only after the user accepts.

Done when: a test mounts `App`, moves between each pair of sections, and finds no error. A throw inside one renderer leaves the sidebar and the other panes in operation.

### A1. The app goes blank after a user leaves a workpaper (P0, live)

Problem: the first visit to a section from a workpaper throws. Each later click shows an empty main area. Only a reload recovers.

Reproduce:

1. Load `/`.
2. Click "MSA §4.2 — Liability Cap & Subprocessor Redlines" in the sidebar.
3. Click "Clients".
4. Click "Home".

Result: after step 3 the sidebar marks Clients, but the workpaper stays on screen. The console shows `Cannot read properties of undefined (reading 'turns')`. After step 4 the main area is blank.

The same failure occurs from a workpaper to Inbox, from a workpaper to Firm Admin, and from Connectors to Inbox.

Cause: `LazyPageSlot` keeps the last loaded module in state. On a new `slotKey` it renders that old module with the new props for one render. See `src/ui/primitives/LazyPageSlot.tsx:24` and `:71`. No slot has a `key` in `src/ui/App.tsx:396-491`.

### A2. File import fails with no message (P1, live)

Reproduce:

1. Run `printf 'PK\003\004broken' > corrupt.xlsx`.
2. Load `/`.
3. Drop `corrupt.xlsx` on the composer.

Result: nothing changes on screen. The console shows `Uncaught (in promise) Error: Invalid .xlsx archive`.

Evidence: `src/main.tsx:10-24` has no `catch`.

### A3. The composer accepts each dropped file type (P1, live)

Reproduce:

1. Load `/`.
2. Drop a PDF on the composer.

Result: a "FILE report.pdf" chip appears. The app parses the PDF bytes as CSV.

Evidence: `src/ui/Composer.tsx:77-82`. The `accept` filter applies to the file dialog only.

### A4. A renderer that fails to load shows a generic card (P1, code)

Reproduce:

1. In DevTools, block request URLs that contain `TrialBalanceRenderer`.
2. Load `/?stage=trial-balance`.

Expected result from the code: a "Structured record" card renders. No error text and no retry appear.

Evidence: `src/core/renderers.ts:122-125` swaps in the fallback plugin on failure.

### A5. Open tabs break after a deploy (P1, code)

Reproduce:

1. Build and start the preview. Load `/` and keep the tab open.
2. Change one word in `src/ui/clients/ClientsPage.tsx`. Build again and restart the preview.
3. In the old tab, click "Clients".

Expected result from the code: "Connection interrupted while loading clients." appears. Retry requests the old chunk URL again, so it can never succeed.

Evidence: `src/ui/primitives/LazyPageSlot.tsx:47` and `:81`; `public/sw.js:1`, `:5`, `:38`.

### Smaller problems that the same fix closes

| ID | Level | Problem | Reproduce | Evidence | Check |
|---|---|---|---|---|---|
| A6 | P2 | The Inbox Retry button clears the error flag, but the load does not run again. | Block `GmailInboxRenderer` requests. Open Inbox. Remove the block. Click Retry. | `src/ui/inbox/InboxWorkspace.tsx:57-82`, `:187` | Code |
| A7 | P2 | Send, Save and Post change a button label only. No status region announces the result. | Send the reply in a mail. Search the DOM for `aria-live`. | `src/ui/ThreadView.tsx:83-121` | Live |
| A8 | P3 | The code viewer shows "Copied" when the clipboard call fails. | Deny clipboard permission. Click Copy. | `src/plugins/code/CodeRenderer.tsx:230` | Code |

## 6. Group B: work lives in component memory

Each renderer keeps its edits in `useState`. The workspace store lives in memory only. Some embedded renderers get no save handler. So work disappears on refresh, on close and on navigation.

### Fix

1. Give each workpaper a stable ID at seed time. Group C defines the IDs.
2. Move edit state out of the renderers. Store it as `artifacts[id].draft` in the workspace store. Renderers read `draft ?? data` and call `updateDraft(id, patch)`.
3. Make `commit(id)` the only write path. It appends a revision `{ id, actor, at, summary, before, after }` and clears the draft. Each host passes the same handler, so the inbox preview and the side panel behave the same.
4. Add `undo(id)`. It restores the previous revision. Offer it in the feedback channel after each commit.
5. Add a persistence adapter over IndexedDB with a schema version and a migration step. Load it before the first render. Persist drafts, revisions, mail state, the composer draft and the offline queue.
6. Remove a queued prompt only after delivery succeeds. Mark it failed on error.

Drafts then save by themselves, so no "discard changes?" dialog is necessary.

Done when: a browser test edits a workpaper, reloads, and finds the draft. The inbox preview and the side panel show the same state for one ID.

### B1. A refresh removes all work (P0, live)

Reproduce:

1. Load `/`. Type "Draft note" in the composer.
2. Click "+", then "Consolidated Trial Balance".
3. Set "AJE for 1010" to 3542 and "AJE for 1200" to -18600.
4. Click "Save TB". The thread shows a record of two corrections.
5. Reload the page.

Result: the composer is empty. The adjustment is 3442 again. The change record and the thread are gone. `localStorage` and `sessionStorage` hold 0 keys.

### B2. Escape or × discards unsaved edits (P0, live)

Reproduce:

1. Load `/?stage=trial-balance`.
2. Set "AJE for 1010" to 9999 and "AJE for 1200" to -25057. The pill still shows "Balanced ($0)".
3. Click an empty part of the page. Press Escape.
4. Click "Open" on the trial balance card.

Result: the panel closes with no warning. The value is 3442 again. The × button and "← Home" do the same.

Evidence: `src/ui/App.tsx:274-282`; `src/plugins/trial-balance/TrialBalanceRenderer.tsx:22-28`.

### B3. "Saved" and "Staged" states that save nothing (P0, live and code)

Reproduce:

1. Load `/`. Click the first Today item, from Marcus Vance.
2. Click the attachment "AJE-2026-042_NetSuite.aje".
3. Click "Post to ERP". The label changes to "Staged to ERP".
4. Click "Open workpaper ↗".

Result: the same entry opens with "Post to ERP" again. The two views are separate copies.

Code path for the trial balance attachment: "Save TB" shows "Saved", but the host passes no `onCommitRevision`. See `src/ui/inbox/MailSharedParts.tsx:151-156` and `src/plugins/trial-balance/TrialBalanceRenderer.tsx:46-54`. The posted state is local at `src/plugins/journal-entry/JournalEntryRenderer.tsx:16-17`.

### Smaller problems that the same fix closes

| ID | Level | Problem | Reproduce | Evidence | Check |
|---|---|---|---|---|---|
| B4 | P1 | The Inbox forgets read, archive and sent state when the user leaves it. | Open Inbox. Archive a mail. Click Home. Click Inbox. | `src/ui/inbox/InboxWorkspace.tsx:38` | Code |
| B5 | P1 | An offline prompt leaves the queue before delivery. A failed delivery loses it. The queue is memory only. | Go offline. Send a prompt. Reload. | `src/core/workspace.ts:181`, `:502-507` | Code |
| B6 | P1 | No undo exists. A commit overwrites the data. The record shows "Just now" and no name. | Save a trial balance edit. Look for undo, a name and a time. | `src/core/workspace.ts:445`, `:476-478` | Live |

## 7. Group C: views and objects have no stable address

`App.tsx` writes the URL by hand in five branches and calls `replaceState` only. Links name a renderer type, not an object. So the browser history, the URL and the screen disagree.

### Fix

1. Define one typed route table. Examples: `/inbox/:provider/:threadId?`, `/clients/:clientId/:engagementId?`, `/workpapers/:workpaperId?anchor=`, `/onboarding/:step?`.
2. Write two pure functions, `parseRoute(url)` and `formatRoute(route)`. Test that they round-trip.
3. Add one `navigate(route)` function. It calls `pushState` for a view change and `replaceState` for in-view state such as an anchor. Handle `popstate` in the same module.
4. Seed each sample workpaper once, with a stable ID. Each "Open workpaper" link goes to `/workpapers/:id`. Only the "+" menu creates a workpaper.
5. On each navigation, set `document.title`, move focus to the page heading, and set `aria-current` on the nav item. Guard each route on the session.
6. Delete the URL effects in `src/ui/App.tsx:57-243`.

Done when: Back, Forward and Reload return the same view and selection at each step of the five core tasks.

### C1. Back leaves the app (P1, live)

Reproduce:

1. Open a new tab on any site. Load `/` in that tab.
2. Click "Inbox", then "Clients".
3. Press the browser Back button.

Result: the browser leaves Lucy. `history.length` does not grow during step 2.

Evidence: `src/ui/App.tsx:157-229` has six `replaceState` calls and no `pushState` call.

### C2. The open mail is not in the URL (P1, live)

Reproduce:

1. Load `/?page=inbox&provider=gmail`.
2. Open the first mail. Read the URL.
3. Reload.

Result: the URL does not change when the mail opens. The reload returns to the list.

Evidence: `src/ui/App.tsx:106` reads a `thread` parameter. No code writes it.

### C3. `?stage=` opens a new copy on each load (P1, live)

Reproduce:

1. Load `/?stage=trial-balance`. Read the sidebar.
2. Edit and save the trial balance.
3. Reload.

Result: each load creates a new "Consolidated Trial Balance & Flux" workpaper from the sample. "Workpaper ↗" and "Open ↗" links in Inbox, Clients and Firm Admin do the same. A saved edit never shows from those links.

Evidence: `src/ui/App.tsx:116-127`, `:292-301`; `src/core/workspace.ts:510-513`.

### C4. The URL goes stale (P1, live)

Reproduce:

1. Load `/?stage=journal-entry`.
2. Click "Acme FY26 — Nov Trial Balance & Flux Review" in the sidebar.

Result: the screen shows the trial balance thread. The URL still says `?stage=journal-entry`. A reload opens the journal entry.

Evidence: the early `return` at `src/ui/App.tsx:147`.

### Smaller problems that the same fix closes

| ID | Level | Problem | Reproduce | Evidence | Check |
|---|---|---|---|---|---|
| C5 | P2 | The Northstar "FRS 102 Statutory Accounts" engagement opens the Acme contract. | Open Firm Admin. Click "Open ↗" in the last row. | `src/core/admin.ts:652-653` | Code |
| C6 | P2 | The tab title is always "Lucy". Focus stays on `body` after navigation. No nav item has `aria-current`. | Move between sections. Read `document.title` and `document.activeElement`. | `index.html:8`; `src/ui/Sidebar.tsx:170-218` | Live |
| C7 | P2 | A signed-out user can open the workspace. | Open Profile. Click "Sign out". Click "Workspace". | `src/ui/App.tsx:324`, `:335` | Code |

## 8. Group D: sample data is typed by hand in each file

Each sample file, mail body and summary string carries its own typed numbers. Seven format helpers fix `$` and `en-US`. Some status pills are literal text. No date is computed.

### Fix

1. Create one ledger fixture per client in `src/core/fixtures/`. It holds the chart of accounts, balances, journal entries, bank lines, contract facts, jurisdiction and currency.
2. Derive each artifact with pure selectors: trial balance, journal entry, reconciliation, tax bridge, rollforward, deck figures and SQL rows. Build each prose line, card summary and mail check from the computed values. Keep no amount as text.
3. Store money as integer minor units and compare integers. Add one `formatMoney(amount, { currency, locale })` on `Intl.NumberFormat` with `currencySign: 'accounting'`. Delete the seven helpers. Add a `MoneyInput` that formats on blur.
4. Export one tie-out function per schedule. Pills and guards call it. Remove the fixed "Tied" text.
5. Hold jurisdiction on the client. Select forms and terms from it: CT600 for the UK, Form 1120 with Schedule M-1 for the US.
6. Store ISO dates. Format them with `Intl.DateTimeFormat` and `Intl.RelativeTimeFormat` against an injected clock.

Done when: invariant tests prove that each artifact foots and each shared figure matches. A search of the seed text finds no typed amount.

### D1. The count of flagged accounts is 5, 4 or 3 (P0, live)

Reproduce:

1. Load `/?stage=trial-balance`.
2. Count the "> PM" flags in the table. The count is 5.
3. Read the sentence above the card. It says "4 accounts flagged".
4. Open Clients, then Acme Holdings Ltd. The fourth task says "3 flux lines > $25k materiality".

Evidence: the rule is at `src/plugins/trial-balance/TrialBalanceRenderer.tsx:128-129`. The text is at `src/plugins/trial-balance/sample.ts:94`, `src/core/seed.ts:43`, `src/core/inbox.ts:121` and `src/core/admin.ts:367`.

### D2. Deferred revenue ends at $1.075M or $1,185,000 (P0, code)

Reproduce:

1. Load `/?stage=rollforward`.
2. Read the card in the thread. It says "($1.075M ending)".
3. Read the Q4 26 row. The ending balance is $1,185,000.

Evidence: `src/plugins/rollforward/sample.ts:59` against `:53`.

### D3. One lease charge is $34,500 or $14,200 (P0, code)

Reproduce:

1. Open Inbox. Open the mail from Hannah Lin.
2. Read the summary. It names a Hudson Yards CAM schedule of $34,500.
3. Click the attachment "WP_E40_Vouching_TieOut.wp". Row S-05 shows $14,200.00.

Evidence: `src/core/inbox.ts:584`, `:591`; `src/plugins/vouching/sample.ts:97`.

### D4. One figure has two currencies (P0, code)

Reproduce:

1. Open Inbox. Switch to Outlook. Select the HMRC mail.
2. Read the list preview. It says "taxable profit £1,648,400".
3. Read the body. It says "$1,648,400".

Evidence: `src/core/inbox.ts:347` and `:350`.

### D5. A balanced entry with cents shows "Imbalance: $0" (P1, code)

Reproduce:

1. Load `/?stage=trial-balance`.
2. Set "AJE for 1010" to 3442.01.
3. Set "AJE for 1200" to -18499.99.
4. Set "AJE for 3100" to -0.02.

The three changes sum to zero. Expected result from the code: the float sum is -4.66e-10, so the pill shows "Imbalance: $0" and "Save TB" stays disabled. A Node run of the same sum confirms the value.

Evidence: `src/plugins/trial-balance/TrialBalanceRenderer.tsx:30-33`, `:62-66`.

### D6. Status pills are fixed text (P1, code)

| View | Reproduce | Result | Evidence |
|---|---|---|---|
| `/?stage=rollforward` | Change an "Additions" value. | "Tied" never changes. | `src/plugins/rollforward/RollforwardRenderer.tsx:79` |
| `/?stage=tax-bridge` | Change an M-1 amount. | "Tied to TB" never changes. | `src/plugins/tax-bridge/TaxBridgeRenderer.tsx:164` |
| `/?stage=reconciliation` | Mark all four exceptions "PBC". | "Reconciled ($0.00)" shows, with nothing resolved. | `src/plugins/reconciliation/ReconciliationRenderer.tsx:20-22` |

### D7. One client mixes UK and US rules (P1, live)

Reproduce:

1. Open Clients, then Acme Holdings Ltd, then Engagements.
2. Read "FY26 CT600 & Schedule M-1 Return". One step cites "IRC §274(n)". The next step cites HMRC.
3. Load `/?stage=tax-bridge`. The schedule uses IRC sections and MACRS. "Est. Tax: $346,164" is 21% of taxable income.

Evidence: `src/plugins/tax-bridge/sample.ts:28-29`; `src/plugins/tax-bridge/TaxBridgeRenderer.tsx:28`; `src/core/seed.ts:90-91`. The GBP default at `src/core/seed.ts:218-219` is never read.

### D8. Figures disagree between artifacts (P1, live and code)

| Figure | One place | Another place | Check |
|---|---|---|---|
| Revenue | Deck slide 1 says "FY26 Consolidated Revenue Reached $5.64M" (`src/plugins/samples.ts:231`). | The SQL chart shows $5.64M for Q4 alone. | Live |
| Notice period | The contract shows 14 days in §2.4 of the "EXECUTION COPY". | The thread "MSA §4.2" says the verified copy has 30 days (`src/core/seed.ts:82`). | Live |
| Net income | The tax bridge starts from $1,636,500 (`src/plugins/tax-bridge/sample.ts:30`). | The trial balance implies 539,942. The same $1,636,500 is the firm's own Q4 contribution (`src/core/seed.ts:17`). | Code |
| SQL rows | The detail rows total $682,800K. | The chart total is $17,730K (`src/plugins/sql-canvas/SqlCanvasRenderer.tsx:13-32`). | Code |

### Smaller problems that the same fix closes

| ID | Level | Problem | Reproduce | Evidence | Check |
|---|---|---|---|---|---|
| D9 | P2 | Money formats differ between renderers and inside one renderer. | Load `/?stage=reconciliation`. Read "$44,957.9" and "$-1,231.6". Compare `(960,000)` in the trial balance with `-84,000` in the workbook. | `src/plugins/reconciliation/ReconciliationRenderer.tsx:102-103`, plus six more helpers | Live |
| D10 | P2 | Amount inputs show raw numbers next to formatted totals. | Load `/?stage=journal-entry`. Read "45000" next to "$60,058.00". | `type="number"` inputs in each accounting renderer | Live |
| D11 | P2 | No date is computed. The greeting is always "Good afternoon". "Fri 28 Nov" is a Saturday in 2026. "Just now" never ages. | Load `/` at 09:00. | `src/ui/Launchpad.tsx:60`; `src/core/inbox.ts:364`; `src/core/workspace.ts:445` | Live |
| D12 | P2 | The SQL view prints "+-x% QoQ" for a decrease. | Select a metric and a quarter with a decline. | `src/plugins/sql-canvas/SqlCanvasRenderer.tsx:122-124` | Code |
| D13 | P2 | The mail summary keeps "balances ($60,058.00 Dr = Cr)" after an edit unbalances the entry. | In the Marcus Vance mail, open the AJE attachment. Set "Debit line 1" to 45001. | Fixed `verdict` text in `src/core/inbox.ts` | Live |
| D14 | P2 | One client has two names: "Acme Holdings Ltd" and "Acme Holdings Corp". | Load `/?stage=pbc-tracker`. | `src/plugins/pbc-tracker/sample.ts:22`; `src/core/admin.ts:356` | Live |

## 9. Group E: files and large data run unguarded on the main thread

The parser runs on the main thread, uses regex matching, and has no limits. The grid renders each row. Each store update renders the full tree again.

### Fix

1. Hotfix E1. Make the cell matcher handle self-closing cells. Add tests with real files from Excel, LibreOffice and Google Sheets.
2. Move the parse to a Web Worker. Add caps for file size, inflated size, rows and columns. Report progress and allow cancel.
3. Replace regex matching with a small XML tokenizer. Resolve sheet files through `xl/_rels/workbook.xml.rels`.
4. Keep each cell as `{ raw, value, type, formula }`. Convert to a number only when the cell type says number. Key formulas by source row.
5. Render the grid through a virtual window of about 40 rows.
6. Subscribe each component to a store slice with `useWorkspace(selector)`. A composer key press then renders the composer only.

Done when: a 10,000-row file opens in under 300 ms, a key press stays under 16 ms, and a crafted archive fails with a clear message.

### E1. `.xlsx` import moves a value one column left (P0, code)

Reproduce:

1. In Excel, type "Rent" in A2. Leave B2 empty and give it a border. Type 500 in C2.
2. Save as `.xlsx`.
3. Import the file in Lucy.

Expected result from the code: 500 appears in column B. Excel writes the empty styled cell as `<c r="B2" s="3"/>`. The regex reads it as an open tag and takes the value of the next cell.

Check the regex without Excel:

```bash
node -e 'const r=`<c r="B2" s="3"/><c r="C2"><v>500</v></c>`;for(const m of r.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g))console.log(m[1].trim(),"=>",(m[2].match(/<v>(.*?)<\/v>/)||[])[1])'
```

This prints `r="B2" s="3"/ => 500`.

Evidence: `src/plugins/spreadsheet/parser.ts:186`.

### E2. A large sheet freezes typing (P1, live)

Reproduce:

1. Run this command:

```bash
node -e 'let s="Account,Description,Jan,Feb,Mar,Apr,May,Total\n";for(let i=0;i<10000;i++)s+=[1000+i,"Ledger line "+i,i*3,i*5,-i*2,i+0.5,i*7,i*13.5].join(",")+"\n";require("fs").writeFileSync("ledger_10k.csv",s)'
```

2. Load `/`. Drop `ledger_10k.csv` on the composer. Press Enter.
3. Type in the composer. Click a cell.

Result: the page grows from about 530 to 100,513 DOM nodes. The sheet opens in about 1.8 s. Each key press and each cell click costs about 850 ms of main-thread time. A normal workpaper costs under 5 ms.

Evidence: `src/plugins/spreadsheet/SpreadsheetRenderer.tsx:135` renders each row. `src/ui/App.tsx:36` and `:43` render the tree again on each store update.

### E3. The parser has no limits (P1, code)

The audit ran the parser in Node with two crafted files:

| File | Size | Result |
|---|---|---|
| 200 rows, each with one cell at column `ZZZZ` | 9 KB | The parse blocked for 6 s and added 800 MB of heap. |
| One sheet entry that inflates to 50 MB of spaces | 51 KB | The parser accepted it with no limit. |

Reproduce: build either file with a script, then import it in Lucy. The tab stops responding.

Evidence: `src/plugins/spreadsheet/parser.ts:99-105`, `:194-196`, `:224-226`, `:249-257`.

### E4. Imported values change (P1, code)

Reproduce:

1. Save a CSV file with these two lines:

```text
Account,Amount,Rate
00123,12345678901234567890,1E-3
```

2. Import the file.

Result from the audit run: `00123` shows as 123. The 20-digit number loses digits. `1E-3` stays text. The grid rounds each number to 2 decimals.

Evidence: `src/plugins/spreadsheet/parser.ts:7`; `src/plugins/spreadsheet/SpreadsheetRenderer.tsx:9-13`.

### Smaller problems that the same fix closes

| ID | Level | Problem | Reproduce | Evidence | Check |
|---|---|---|---|---|---|
| E5 | P1 | A sheet tab can show the wrong name, because names pair with files by order. | Reorder the sheets in Excel. Save. Import. | `src/plugins/spreadsheet/parser.ts:141`, `:173-175`, `:236` | Code |
| E6 | P2 | The formula bar finds formulas by visible row, so it is wrong after a sort or filter. The first data row has label "1" and reference "A2". | Load `/?stage=spreadsheet`. Sort a column. Click a total cell. | `src/plugins/spreadsheet/SpreadsheetRenderer.tsx:64-67` | Live for the label |
| E7 | P3 | CSV export keeps a leading `=` in a cell. | Import a cell that starts with `=`. Click "Export CSV". | Export handler in `src/plugins/spreadsheet/SpreadsheetRenderer.tsx` | Code |

## 10. Group F: risky actions have no guard, undo or record

Each button calls `setState` directly. No shared rule decides when an action is allowed, who did it, or how to reverse it.

### Fix

1. Add an action layer in `src/core/actions/`. Each action has `id`, `label`, `guard(state)`, `run`, an optional `undo`, and an audit entry.
2. `guard` returns `ok`, or `blocked` with a reason. It calls the tie-out functions from group D. Example: sign-off is blocked while a variance or a client request is open.
3. Add an `ActionButton`. A blocked action shows its reason next to the button. A reversible action shows Undo for 10 seconds. Send waits for that time before it leaves.
4. Write `{ actor, at, action, target, before, after }` to an audit log in the store. Show prepared, reviewed and approved, each with a name and a time.
5. Tag each value and each draft with its source: client, Lucy or user. Show the tag.
6. Type each answer as `answer`, `partial` or `no-match`. The UI renders each kind.

Done when: no consequential button calls `setState` directly, and each sign-off shows a name and a time.

### F1. "Close Nov books" ticks open tasks (P1, live)

Reproduce:

1. Open Clients, then Acme Holdings Ltd.
2. November shows "In Progress" and "3/5 tasks".
3. Click "Close Nov books".

Result: November shows "Closed" and "5/5 tasks". The two open tasks are now ticked. One still says "3 flux lines > $25k materiality". No confirmation appears.

Evidence: `src/ui/clients/ClientsPage.tsx:187-197`.

### F2. Sign-off works with an open variance (P1, live)

Reproduce:

1. Load `/?stage=vouching`. The header shows "1 Variance" and "1 PBC".
2. Click "Sign off".

Result: the button shows "Signed off". The journal entry, in contrast, blocks its post button while unbalanced.

Evidence: `src/plugins/vouching/VouchingRenderer.tsx:49-50`, `:65-67`.

### F3. One click sends a mail or posts an entry (P1, live)

Reproduce:

1. Open the Marcus Vance mail. The reply box already holds a full draft.
2. Click "Send".
3. Open the AJE attachment. Click "Post to ERP".

Result: after step 2 the label shows "✓ Sent", and no undo exists. The draft says "We verified…" before the user did a check. After step 3 the label shows "Staged to ERP". "Post" and "Staged" name two different states.

Evidence: `src/plugins/journal-entry/JournalEntryRenderer.tsx:126-134`; `src/core/inbox.ts:526`.

### F4. Lucy never says "no match" (P1, live and code)

Reproduce:

1. Load `/`. Type "Reconcile Chase 4821 for November". Press Enter.
2. Open Inbox. Type "zebra" in "Ask across inbox". Press Enter.

Result: step 1 returns "Note recorded for Reconcile Chase 4821 for November." The composer placeholder itself suggests "reconcile accounts". Step 2, from the code, returns "Across 10 inbox threads (5 unread): …" and lists the first three threads.

Evidence: `src/core/workspace.ts:134`; `src/core/inbox.ts:319`, `:330`.

### Smaller problems that the same fix closes

| ID | Level | Problem | Reproduce | Evidence | Check |
|---|---|---|---|---|---|
| F5 | P1 | Sign-off carries no name and no time. `SigningAuthority` exists, but no code enforces it. | In Firm Admin, set a Stage to "Sign-Off". Look for who and when. | `src/core/admin.ts:5-10`; `src/ui/clients/ClientsPage.tsx:292-301` | Code |
| F6 | P1 | No value shows its source. An edited cell looks the same as a source cell. | Edit an AJE. Compare it with an untouched cell. | `src/core/inbox.ts:17-18` | Live |
| F7 | P2 | A disabled Save or Post button gives no reason. | Unbalance the trial balance. Hover "Save TB". | `src/plugins/trial-balance/TrialBalanceRenderer.tsx:86` | Live |
| F8 | P2 | A blank "To" field sends to a fixed address. | Compose a mail with no recipient. Send it. | `src/ui/inbox/InboxWorkspace.tsx:131` | Code |

## 11. Group G: design tokens stop at 13 colours

`src/styles.css:1-15` defines 13 colour tokens. All other values are typed by hand in nine CSS files and in TSX. So one decision, such as the muted text colour, lives in 48 places.

### Fix

1. Create `src/tokens.css` with two layers: a primitive scale and semantic roles. Cover colour, type size, space, radius, duration, shadow, z-index and control height.
2. Set the type scale to six steps with a 12 px floor. Raise `--text-muted` to 4.5:1 or more on each surface. The audit measured `#8e8e98` at 5.99:1.
3. Add one focus ring in the base layer: `:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }` at 3:1 or more. Delete the rule at `src/styles.css:42-47`. Change the test at `tests/ui-components-and-flows.test.tsx:206`.
4. Use three shared breakpoints. Replace the JS checks for 740 and 920 with `matchMedia` listeners. Set `--control-min: 44px` under `@media (pointer: coarse)`.
5. Add a lint rule that rejects raw colours and raw sizes outside `tokens.css`. Convert one CSS file per pull request. Start with `src/ui/inbox/inbox.css`.
6. Put semantic colours under `[data-theme]` and `prefers-color-scheme`. Add light and forced-colors themes. Add a print sheet that shows the workpaper only.

Done when: the lint rule finds zero raw values, and each theme passes a contrast check.

### G1. Muted text fails contrast (P1, live)

Reproduce:

1. Load `/`.
2. Inspect the time "09:18" in the Today list.
3. Compare its colour with its background.

Result: 3.8:1. The same token fails on each screen. From 12% to 32% of text elements fail 4.5:1 on the five screens measured.

Evidence: `src/styles.css:13`. Other failures: the placeholder at 3.15:1 (`src/styles.css:483`) and code line numbers at 2.39:1 (`src/plugins/code/code.css:131`).

### G2. Much of the text is under 12 px (P1, live)

Reproduce:

1. Load `/?page=admin`.
2. Inspect the tile labels and the table headers.

Result: 11 px. From 31% to 61% of visible text is under 12 px on the five screens measured. In the CSS, 109 of 217 `font-size` declarations are under 12 px. The smallest is 9.5 px.

### G3. Focus is faint or absent (P1, code)

Reproduce:

1. Load `/`.
2. Press Tab until focus reaches the composer.

Result from the CSS: buttons show a 1.5 px ring at 28% white, about 2.4:1. The composer shows a border change of about 1.5:1. Checkboxes, the sidebar filter, the Outlook search, the SQL editor and the code editor show nothing.

Evidence: `src/styles.css:14`, `:37-47`, `:435-439`, `:751-781`. One test requires `outline: none` on textareas.

### G4. One class has two definitions (P1, code)

Reproduce:

1. Load `/?stage=trial-balance`. Read the computed height and radius of `.primary-stage-btn`.
2. In the same session, open "Contract Redline" from the "+" menu. Read the values again.

Expected result from the code: the values can change, because two CSS files define the class with different specs.

Evidence: `.primary-stage-btn` at `src/plugins/accounting.css:2` and `src/plugins/enterprise-stage.css:65`. `.decision-btn` at `src/plugins/enterprise-stage.css:445` and `src/ui/inbox/inbox.css:1298`. Eight classes have this conflict. The primary button has five versions, with heights from 26 to 36 px.

### Smaller problems that the same fix closes

| ID | Level | Problem | Reproduce | Evidence | Check |
|---|---|---|---|---|---|
| G5 | P1 | Raw values are everywhere: 244 distinct colours in 590 uses, 19 font sizes, 12 durations, 7 z-index values. | Count hex and `rgba` values in `src/**/*.css`. | `src/styles.css:1-15`; `src/ui/inbox/inbox.css` has 185 raw colours | Code |
| G6 | P2 | CSS has eight breakpoints. Inbox reads 740 and 920 one time at mount. | Open Inbox at 1000 px. Narrow the window to 700 px. | `src/ui/inbox/GmailInboxRenderer.tsx:60`; `src/ui/inbox/OutlookInboxRenderer.tsx:71` | Code |
| G7 | P2 | Only a dark theme exists. No print or forced-colors rule exists. | Set the OS to light. Print a workpaper. | No matching media rule in the loaded CSS | Live |
| G8 | P2 | Touch targets are small. At 375 px, 16 of 17 Home controls are under 44 px. The checkbox is 15 px. | Open `/` at 375 px. Measure the controls. | `src/styles.css:131`, `:648`, `:754` | Live |
| G9 | P2 | Several buttons have primary weight in one view. Home shows four white "Reconnect" buttons that outweigh the Today list. | Load `/`. | `.conn-oauth-btn` in `src/styles.css` | Live |
| G10 | P2 | At 1280 px the side panel is 550 px wide, and account names wrap to four lines. At 1920 px the Clients page uses 840 of 1,658 px. | Load `/?stage=trial-balance` at 1280 px. | `.thread-split-layout`; `.clients-page-wrap` | Live |
| G11 | P2 | The Inbox copies the Gmail and Outlook look, so Lucy has three visual languages. | Open Inbox. Switch providers. | `src/ui/inbox/inbox.css` | Live |

## 12. Group H: no shared accessible primitives and no command model

Rows, grids, menus and tabs are built by hand in each file. Some are `div` or `td` elements with click handlers. Keyboard support and ARIA differ per file. Shortcuts live in one `keydown` handler.

### Fix

1. Build shared primitives in `src/ui/primitives/`: `Button`, `RowButton`, `ListBox`, `Tabs`, `Menu`, `Field`, `DataTable`, `DataGrid`, `EmptyState` and `Icon`.
2. Each primitive owns its roles, keyboard model and focus rules. `Menu` and `ListBox` use arrow keys, typeahead and focus return. `Tabs` links each tab to a panel. `Field` connects the label, hint and error. `DataTable` sets `scope` and `aria-sort`.
3. `DataGrid` uses `role="grid"`, arrow keys, range selection, and copy and paste as tab-separated text. It uses the virtual window from group E.
4. Add `eslint-plugin-jsx-a11y`. Reject click handlers on non-interactive elements. The repo already bans native `<select>` with a test.
5. Add a command registry: `{ id, title, shortcut, when, run }`. Build the command palette on it and bind Cmd or Ctrl+K. Show each shortcut in menus and tooltips. Open the shortcut list on `?`.
6. Add a selection model for lists. Batch actions go through the action layer from group F. Run axe in the DOM tests of each primitive.

Done when: a user completes the five core tasks with the keyboard only, and axe reports zero violations on each screen.

### H1. A keyboard user cannot open a mail in Gmail view (P1, live)

Reproduce:

1. Load `/?page=inbox&provider=gmail`.
2. Press Tab through the list.

Result: focus reaches the star and the attachment chips only. No key opens a mail. The Outlook list uses buttons and works.

Evidence: `src/ui/inbox/GmailInboxRenderer.tsx:520-527`. Compare `src/ui/inbox/OutlookInboxRenderer.tsx:329`.

### H2. Six workpaper views need a pointer (P1, code)

Reproduce: load each view and press Tab. The control in the table never gets focus.

| View | Control | Evidence |
|---|---|---|
| Vouching | Row select | `src/plugins/vouching/VouchingRenderer.tsx:88-91` |
| Trial balance | Group collapse, row detail | `src/plugins/trial-balance/TrialBalanceRenderer.tsx:113-118`, `:134-139` |
| Tax bridge | Form trace | `src/plugins/tax-bridge/TaxBridgeRenderer.tsx:113-116` |
| Workbook | Sort, cell select | `src/plugins/spreadsheet/SpreadsheetRenderer.tsx:114-123`, `:147-156` |
| SQL | Chart filter | `src/plugins/sql-canvas/SqlCanvasRenderer.tsx:291-298` |
| Lineage | Node select | `src/plugins/topology/TopologyRenderer.tsx:196-221` |

### H3. Grids have no keyboard model (P1, live)

Reproduce:

1. Load `/?stage=spreadsheet`.
2. Click a cell. Press the Right Arrow key.

Result: nothing moves. Cells are `td` elements with no `tabindex` and no grid role. No range selection, copy or paste exists.

### H4. Cmd+K is a filter, not a command palette (P1, live and code)

Reproduce:

1. Load `/`. Press Cmd+K. Type "Kensington".
2. Collapse the sidebar. Press Cmd+K again.

Result: step 1 filters the pinned workpaper list only. It finds no client, mail or action. Step 2, from the code, shows nothing.

Evidence: `src/ui/App.tsx:271-273`; `src/ui/Sidebar.tsx:86-99`; `src/core/workspace.ts:686-695`.

### Smaller problems that the same fix closes

| ID | Level | Problem | Reproduce | Evidence | Check |
|---|---|---|---|---|---|
| H5 | P2 | The "+" menu has no arrow keys and no focus move or return. The mobile sidebar has no focus trap and no Escape. | Open the "+" menu with the keyboard. | `src/ui/Composer.tsx:48-53`, `:121-141`; `src/ui/Sidebar.tsx:110-116` | Live |
| H6 | P2 | About 20 inputs use the placeholder as the only label. The SQL editor has no name. | Inspect "Search in mail" and "Write reply…". | `src/ui/inbox/MailSharedParts.tsx:197-217`; `src/plugins/sql-canvas/SqlCanvasRenderer.tsx:464` | Live |
| H7 | P2 | Fifteen tab lists have no tab panel and no arrow keys. Tables have no `scope`, caption or `aria-sort`. `SelectMenu` has no `aria-activedescendant` and no typeahead. | Use a screen reader on Firm Admin. | `src/ui/admin/FirmAdminPage.tsx:300-311`; `src/ui/primitives/SelectMenu.tsx:95-124` | Code |
| H8 | P2 | Home has 19 tab stops before the composer and no skip link. Inbox has no `h1`. Text marks such as ←, ↗ and ▾ are read aloud. | Tab through `/`. | `src/ui/Sidebar.tsx`; `src/ui/inbox/GmailInboxRenderer.tsx:364` | Live |
| H9 | P2 | No list has multi-select. The Gmail checkboxes are decoration. The only batch action is "Accept all" in the redline. | Try to select two mails. | `src/ui/inbox/GmailInboxRenderer.tsx:443`, `:530` | Code |

## 13. Group I: tests do not render the UI, and no CI exists

The tests cover the headless core and scan source text. No test renders a component, and nothing runs on each change. The crash in A1 passes all 26 tests.

### Fix

1. Add a DOM test setup: Vitest with `jsdom` and `@testing-library/preact`.
2. Write three DOM tests first: the navigation matrix, file import (good, corrupt, wrong type), and one renderer edit with save.
3. Add Playwright tests for the five core tasks. Each test includes a reload, a Back step and an axe scan.
4. Add ESLint with the hooks rules and `jsx-a11y`, and a formatter.
5. Make `scripts/benchmark.mjs` exit with an error above a budget. Keep the budget in one place, and state the same number in the README.
6. Run `tsc`, lint, unit, DOM, browser, budget and fixture checks in CI on each pull request. Replace the eight source-text tests with lint rules.

Done when: a pull request that brings back A1 fails CI.

### Problems

| ID | Level | Problem | Reproduce | Evidence | Check |
|---|---|---|---|---|---|
| I1 | P1 | No test renders a component. 26 tests pass while A1 crashes the app. | Run `pnpm test`. Then follow A1. | `tests/` has no `jsdom` setup | Live |
| I2 | P2 | 8 of 26 tests assert on source text. One requires `outline: none` on textareas. | Read the tests. | `tests/ui-components-and-flows.test.tsx:202-224`; `tests/enterprise-resilience-and-hygiene.test.ts:27-133` | Code |
| I3 | P2 | No lint, formatter, CI or pre-commit hook exists. `BlockSlot` calls hooks after a conditional return. | List the repo root. | `src/ui/BlockSlot.tsx:30`, `:52`, `:65` | Code |
| I4 | P2 | The README states about 20 KB Brotli in one round trip. The build is 26.11 KB in three requests. The benchmark only prints. | Run `pnpm build && node scripts/benchmark.mjs`. | `README.md:3`; `scripts/benchmark.mjs:86-100` | Live |
| I5 | P2 | The `.xlsx` test checks one formula and no cell value, so E1 passes. | Read the test. | `tests/architecture-and-core.test.ts:419` | Code |

## 14. Group J: no shared vocabulary

Each file names things in its own way. No glossary and no string catalogue exist.

### Fix

1. Write `docs/glossary.md` with one term per object and per action. Example: "workpaper" for the document, "panel" for the side view, "phase" for engagement progress.
2. Move the UI strings to one catalogue module. Check it against the glossary.
3. Use the `EmptyState` primitive in each list. It needs a message and a next action.
4. Use one error template: what occurred, why, and the next step.

Done when: each object has one name in the UI, and each filtered list has an empty state.

### Problems

| ID | Level | Problem | Reproduce | Evidence | Check |
|---|---|---|---|---|---|
| J1 | P2 | "Stage" means a side panel, an engagement phase and a verb. The save action has eight labels. "Home" is also "Dashboard". "Connectors" is also "Integrations". | Compare the workpaper header, Firm Admin and the rollforward button. | `src/ui/ThreadView.tsx:74`; `src/ui/admin/FirmAdminPage.tsx:308`; `src/plugins/rollforward/RollforwardRenderer.tsx:81`; `src/ui/ProfilePage.tsx:30` | Live |
| J2 | P2 | Nine or more filtered lists show nothing when no item matches. Gmail shows "1–0 of 0". | Type "zzz" in "Search clients…". | `src/ui/clients/ClientsPage.tsx:423`; `src/ui/inbox/GmailInboxRenderer.tsx:465` | Code |
| J3 | P2 | Numbers have no label. Each Clients row shows two percentages, for example "Nov · 60%" and "66%". | Open Clients. | `src/ui/clients/ClientsPage.tsx` | Live |
| J4 | P2 | Terms have no help: "PM ($)", "WD+5". Capitals differ: "Full Name" and "Full name". | Open the trial balance and onboarding step 4. | `src/plugins/trial-balance/TrialBalanceRenderer.tsx:69`; `src/ui/ProfilePage.tsx:64` | Live |
| J5 | P3 | The ↗ mark suggests an external link, but each link opens inside Lucy. | Click "Open ↗". | `src/ui/Launchpad.tsx:171` | Live |

## 15. Problems with no shared root cause

| ID | Level | Problem | Reproduce | Fix |
|---|---|---|---|---|
| S1 | P2 | No Content Security Policy exists. The audit found no injection path, so this is a second layer. | Read `index.html`. | Add a CSP header or meta tag. Move the inline style to a hashed block. |
| S2 | P2 | The mail screen shows three text boxes at one time: reply, ask about this mail, and ask across the inbox. | Open a mail. | Keep one ask box. Scope it to the open mail, with a switch to all mail. |
| S3 | P2 | The "+" menu shows 15 workpaper types in one flat list. | Click "+". | Group the items: accounting, documents, data. Add type-to-filter. |
| S4 | P3 | No favicon and no web manifest exist, although a service worker does. | Read `index.html`. | Add both. |
| S5 | P3 | Sign-out does not clear the service worker cache. | Sign out. Inspect Cache Storage. | Clear the caches in `signOut()`. |

## 16. Not checked

1. axe and screen readers. No tool was installed for the review.
2. Throttled CPU, throttled network and INP.
3. Widths of 320 and 2560 px, and zoom at 200% and 400%.
4. Live focus styles. Group G uses the CSS and a contrast calculation.
5. A walkthrough with an auditor and a tax preparer.

## 17. Strengths to protect

1. Boot is 26 KB Brotli, and Home loads with zero layout shift.
2. The journal entry and the trial balance compute their balance live. Both block save while unbalanced.
3. Each saved workpaper edit writes a before-and-after record into the thread.
4. Offline mode shows a pill, labels the queued request, and sends it on reconnect.
5. The vouching receipt, the contract paper view and the redline show real domain character.

## 18. Scorecard

| # | Dimension | Weight | Mean score (0 to 4) | Points |
|---|---|---|---|---|
| 1 | Trust and auditability | 14 | 1.2 | 4.2 |
| 2 | Domain fidelity | 10 | 1.4 | 3.5 |
| 3 | Task flow and information architecture | 10 | 1.6 | 4.0 |
| 4 | Speed | 10 | 2.2 | 5.5 |
| 5 | States and resilience | 10 | 1.4 | 3.5 |
| 6 | Keyboard and power use | 8 | 1.0 | 2.0 |
| 7 | Accessibility | 8 | 1.4 | 2.8 |
| 8 | Responsive layout and themes | 6 | 1.0 | 1.5 |
| 9 | Visual system | 8 | 2.0 | 4.0 |
| 10 | Content and voice | 4 | 1.4 | 1.4 |
| 11 | Code health and verification | 8 | 1.5 | 3.0 |
| 12 | Security and privacy in the client | 4 | 1.7 | 1.7 |
| | Total | 100 | | 37 |
