// @vitest-environment jsdom
import { deflateRawSync } from 'node:zlib';
import type { ComponentChildren } from 'preact';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFirmAdminController, selectClientEngagementGroups } from '../src/core/admin';
import { INITIAL_MAIL_THREADS } from '../src/core/inbox';
import {
  ACME_RECON_SUMMARY,
  ACME_SQL_COHORTS,
  ACME_TB_SUMMARY,
  ACME_TRIAL_BALANCE,
  ACME_VOUCHING,
  KENSINGTON_RF_DEFERRED_SUMMARY,
  VELA_TAX_SUMMARY,
  buildTrialBalanceStrings,
  expandReconciledSqlSubledgerRows,
} from '../src/core/ledger';
import { createBrowserPersistenceBackend } from '../src/core/persistence';
import { formatRoute, parseRoute } from '../src/core/routes';
import { createInitialWorkspaceState } from '../src/core/seed';
import { buildHydratedSeededTopics } from '../src/core/seedWorkpapers';
import { createWorkspace } from '../src/core/workspace';
import { createDefaultRendererRegistry } from '../src/plugins/registrySetup';
import {
  parseDelimitedText,
  parseXlsxBuffer,
  serializeSheetToCsv,
} from '../src/plugins/spreadsheet/parser';
import { spreadsheetRendererModule } from '../src/plugins/spreadsheet/SpreadsheetRenderer';
import { App } from '../src/ui/App';
import { clearResolvedPageCache } from '../src/ui/primitives/LazyPageSlot';

async function deflateRaw(text: string): Promise<Uint8Array> {
  return new Uint8Array(deflateRawSync(Buffer.from(text, 'utf8')));
}

async function buildXlsxZip(files: Record<string, string>): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  const entries = Object.entries(files);

  for (const [name, content] of entries) {
    const nameBytes = encoder.encode(name);
    const compressed = await deflateRaw(content);
    const uncompressedLen = encoder.encode(content).byteLength;

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(localHeader.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(8, 8, true);
    lv.setUint32(18, compressed.byteLength, true);
    lv.setUint32(22, uncompressedLen, true);
    lv.setUint16(26, nameBytes.length, true);
    localHeader.set(nameBytes, 30);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(centralHeader.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(10, 8, true);
    cv.setUint32(20, compressed.byteLength, true);
    cv.setUint32(24, uncompressedLen, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);

    localParts.push(localHeader, compressed);
    centralParts.push(centralHeader);
    offset += localHeader.byteLength + compressed.byteLength;
  }

  const centralSize = centralParts.reduce((s, p) => s + p.byteLength, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);

  const total = offset + centralSize + eocd.byteLength;
  const archive = new Uint8Array(total);
  let cursor = 0;
  for (const part of [...localParts, ...centralParts, eocd]) {
    archive.set(part, cursor);
    cursor += part.byteLength;
  }
  return archive.buffer;
}

async function waitForDom(assertion: () => void): Promise<void> {
  await vi.waitFor(
    async () => {
      await act(async () => {});
      assertion();
    },
    { timeout: 5000 }
  );
}

describe('DOM Integration: Navigation (A1 P0), Error Boundaries, Persistence, Tie-Out & Parser Bounds', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, '', '/');
    clearResolvedPageCache();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it('navigates across Workpapers, Clients, Home, Inbox (Gmail & Outlook), Admin, and Connectors with zero blank screens (A1 regression)', async () => {
    const registry = createDefaultRendererRegistry();
    const workspace = createWorkspace({ responseDelayMs: 0, registry });

    await act(async () => {
      render(
        <App workspace={workspace} registry={registry} onIngestFile={() => {}} />,
        container
      );
    });

    // 1. Starts on Home with greeting and Today work items
    await waitForDom(() => {
      expect(container.textContent).toContain('Elena');
      expect(document.title).toBe('Home — Lucy');
    });

    // 2. Reproduce exact A1 sequence: Open MSA §4.2 workpaper -> Click Clients -> Click Home
    const msaBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('MSA §4.2')
    );
    expect(msaBtn).toBeTruthy();

    await act(async () => {
      msaBtn!.click();
    });

    await waitForDom(() => {
      expect(window.location.search).toContain('page=workpaper');
      expect(window.location.search).toContain('id=wp-acme-msa-pdf');
      expect(container.textContent).toContain('Liability Cap');
    });

    const clickNav = async (label: string) => {
      const btn = Array.from(
        container.querySelectorAll<HTMLButtonElement>('.sidebar button')
      ).find((b) => b.textContent?.includes(label));
      expect(btn, `Sidebar nav button "${label}" should exist`).toBeTruthy();
      await act(async () => {
        btn!.click();
      });
    };

    // Step 3 of A1: Click Clients -> must render ClientsPage, never stick on workpaper or throw
    await clickNav('Clients');
    await waitForDom(() => {
      expect(window.location.search).toContain('page=clients');
      expect(container.querySelector('h1')?.textContent).toContain('Clients');
      expect(container.textContent).toContain('Acme Holdings Ltd');
    });

    // Step 4 of A1: Click Home -> must render Home cleanly, never go blank
    await clickNav('Home');
    await waitForDom(() => {
      expect(window.location.search).toBe('');
      expect(container.textContent).toContain('Elena');
    });

    // Continue round-trip across Inbox (Gmail -> Outlook), Firm Admin, and Connectors
    await clickNav('Inbox');
    await waitForDom(() => {
      expect(window.location.search).toContain('page=inbox');
      expect(container.textContent).toContain('Unread sign-offs');
      expect(
        container.querySelector('textarea[aria-label="Ask across your inbox"]')
      ).toBeTruthy();
    });
    expect(container.querySelectorAll('.mail-terminal-form').length).toBe(0);

    // Switch Inbox provider to Outlook (?page=inbox&provider=outlook)
    await act(async () => {
      workspace.setInboxProvider('outlook');
    });
    await waitForDom(() => {
      expect(window.location.search).toContain('provider=outlook');
      expect(container.textContent).toContain('New mail');
    });

    await clickNav('Firm Admin');
    await waitForDom(() => {
      expect(window.location.search).toContain('page=admin');
      expect(container.querySelector('h1')?.textContent).toContain('Firm Admin');
    });

    await clickNav('Connectors');
    await waitForDom(() => {
      expect(window.location.search).toContain('page=connectors');
      expect(container.querySelector('h1')?.textContent).toContain('Connectors');
    });
  });

  it('contains a crashing stage renderer inside its local ErrorBoundary while keeping Sidebar navigation live', async () => {
    const registry = createDefaultRendererRegistry();
    registry.register({
      id: 'crash-probe',
      label: 'Faulty Schedule',
      badge: 'ERR',
      placement: 'stage',
      priority: 999,
      matches: (b) => b.kind === 'crash-probe',
      load: async () => ({
        render(): ComponentChildren {
          throw new Error('Simulated renderer failure');
        },
      }),
    });

    const workspace = createWorkspace({ responseDelayMs: 0, registry });
    workspace.attachContent({
      id: 'blk-crash-1',
      kind: 'crash-probe',
      title: 'Corrupted Schedule',
      filename: 'Corrupted.probe',
      data: {},
    });
    workspace.submitPrompt('Open corrupted schedule');

    await act(async () => {
      render(
        <App workspace={workspace} registry={registry} onIngestFile={() => {}} />,
        container
      );
    });

    await waitForDom(() => {
      expect(container.textContent).toContain('Unable to display');
      expect(container.textContent).toContain('Simulated renderer failure');
    });

    // Sidebar remains operational and navigates away cleanly
    const clientsBtn = Array.from(
      container.querySelectorAll<HTMLButtonElement>('.sidebar button')
    ).find((b) => b.textContent?.includes('Clients'));
    await act(async () => {
      clientsBtn!.click();
    });

    await waitForDom(() => {
      expect(container.querySelector('h1')?.textContent).toContain('Clients');
    });
  });

  it('persists Trial Balance drafts across a full remount/refresh, commits revisions, and supports Undo', async () => {
    const persistence = createBrowserPersistenceBackend();
    const registry = createDefaultRendererRegistry();
    const workspace1 = createWorkspace({ responseDelayMs: 0, registry, persistence });

    workspace1.openWorkpaper('wp-acme-tb');

    await act(async () => {
      render(
        <App workspace={workspace1} registry={registry} onIngestFile={() => {}} />,
        container
      );
    });

    let pmInput: HTMLInputElement | null = null;
    await waitForDom(() => {
      pmInput = container.querySelector(
        'input[aria-label="Performance materiality threshold"]'
      ) as HTMLInputElement | null;
      expect(pmInput).toBeTruthy();
    });
    expect(pmInput!.value).toBe('25,000');

    // Edit PM threshold to 30,000 -> auto-saves draft into workspace + browser storage
    await act(async () => {
      pmInput!.focus();
      pmInput!.value = '30000';
      pmInput!.dispatchEvent(new Event('input', { bubbles: true }));
      pmInput!.blur();
    });

    await waitForDom(() => {
      expect(container.textContent).toContain('Unsaved draft');
    });

    // Simulate full browser reload: unmount DOM, instantiate fresh WorkspaceController from persistence
    render(null, container);
    workspace1.dispose();

    const workspace2 = createWorkspace({ responseDelayMs: 0, registry, persistence });
    workspace2.openWorkpaper('wp-acme-tb');

    await act(async () => {
      render(
        <App workspace={workspace2} registry={registry} onIngestFile={() => {}} />,
        container
      );
    });

    let restoredPmInput: HTMLInputElement | null = null;
    await waitForDom(() => {
      restoredPmInput = container.querySelector(
        'input[aria-label="Performance materiality threshold"]'
      ) as HTMLInputElement | null;
      expect(restoredPmInput?.value).toBe('30,000');
    });
    expect(container.textContent).toContain('Unsaved draft');

    // Commit Save -> clears draft, records revision, shows Undo action in role="status" toast
    const saveBtn = Array.from(
      container.querySelectorAll<HTMLButtonElement>('.artifact-stage-pane button')
    ).find((b) => b.textContent?.trim() === 'Save');
    expect(saveBtn).toBeTruthy();

    await act(async () => {
      saveBtn!.click();
    });

    await waitForDom(() => {
      expect(container.textContent).not.toContain('Unsaved draft');
      expect(workspace2.getState().revisions).toHaveLength(1);
    });

    const undoToastBtn = container.querySelector(
      '[role="status"] .toast-action-btn'
    ) as HTMLButtonElement | null;
    expect(undoToastBtn?.textContent).toContain('Undo');

    await act(async () => {
      undoToastBtn!.click();
    });

    await waitForDom(() => {
      const revertedPmInput = container.querySelector(
        'input[aria-label="Performance materiality threshold"]'
      ) as HTMLInputElement | null;
      expect(revertedPmInput?.value).toBe('25,000');
      expect(workspace2.getState().revisions).toHaveLength(0);
    });
    workspace2.dispose();
  });

  it('opens keyboard Command Palette on Cmd+K and round-trips typed query-string routes', async () => {
    expect(formatRoute(parseRoute('?page=inbox&provider=outlook&thread=mail-hmrc-ct600'))).toBe(
      '/?page=inbox&provider=outlook&thread=mail-hmrc-ct600'
    );
    expect(formatRoute(parseRoute('?page=clients&client=acme&eng=eng-acme-stat'))).toBe(
      '/?page=clients&client=acme&eng=eng-acme-stat'
    );
    expect(parseRoute('?stage=tb')).toEqual({
      kind: 'workpaper',
      topicId: 'wp-acme-tb',
      blockId: null,
      anchor: null,
    });

    const registry = createDefaultRendererRegistry();
    const workspace = createWorkspace({ responseDelayMs: 0, registry });

    await act(async () => {
      render(
        <App workspace={workspace} registry={registry} onIngestFile={() => {}} />,
        container
      );
    });
    await waitForDom(() => {
      expect(container.textContent).toContain('Elena');
    });

    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })
      );
    });

    await vi.waitFor(async () => {
      await act(async () => {});
      const dialog = container.querySelector(
        '[role="dialog"][aria-label="Command palette"]'
      );
      expect(dialog).toBeTruthy();
    });
  });

  it('enforces single-source ledger tie-out across UK GBP and US USD entities (Group D)', () => {
    // 0. Boot stub previews match computed hydrated ledger summaries 1:1
    const stubs = createInitialWorkspaceState().topics;
    const hydrated = buildHydratedSeededTopics();
    expect(
      stubs.map((t) => ({ id: t.id, title: t.title, preview: t.preview }))
    ).toEqual(
      hydrated.map((t) => ({ id: t.id, title: t.title, preview: t.preview }))
    );
    // 1. Flagged Trial Balance count agrees between evaluator and prose/summary
    const tbStrings = buildTrialBalanceStrings(ACME_TRIAL_BALANCE);
    expect(ACME_TB_SUMMARY.flaggedCount).toBe(5);
    expect(tbStrings.summary).toContain('5 flux flags');
    expect(tbStrings.prose).toContain('`5` accounts flagged');

    // 2. UK Acme & Kensington threads use £ GBP without $ drift; US Vela thread uses $ USD
    const acmeCfoMail = INITIAL_MAIL_THREADS.find((t) => t.id === 'mail-acme-cfo-tb')!;
    expect(acmeCfoMail.bodyParagraphs.join(' ')).toContain('£45,000.00');
    expect(acmeCfoMail.bodyParagraphs.join(' ')).not.toContain('$');
    expect(
      INITIAL_MAIL_THREADS.some((t) => t.bodyParagraphs.join(' ').includes('£3,442.10'))
    ).toBe(true);
    expect(ACME_RECON_SUMMARY.remainingVarianceMinor).toBe(344210);

    // 3. Canary Wharf CAM ties out at £34,500.00 across Vouching WP E-40 and Inbox
    const camSample = ACME_VOUCHING.items.find((i) => i.vendor.includes('Canary Wharf'))!;
    expect(camSample.ledgerAmount).toBe(34500);
    const dextMail = INITIAL_MAIL_THREADS.find((t) => t.id === 'mail-dext-vouch')!;
    expect(dextMail.intelligence?.verdict).toContain('£34,500.00');

    // 4. Kensington IFRS 15 Q4 ending deferred revenue ties out at £1,185,000
    expect(KENSINGTON_RF_DEFERRED_SUMMARY.endingMinor).toBe(118500000);
    expect(
      INITIAL_MAIL_THREADS.some((t) =>
        `${t.bodyParagraphs.join(' ')} ${t.intelligence?.verdict ?? ''}`.includes(
          '£1,185,000'
        )
      )
    ).toBe(true);

    // 5. US Vela Bio Systems Inc. uses USD $ and 21% federal corporate rate ($300,699 on $1,431,900)
    expect(VELA_TAX_SUMMARY.taxableMinor).toBe(143190000);
    expect(VELA_TAX_SUMMARY.estTaxMinor).toBe(30069900);

    // 6. SQL Canvas 4-quarter chart sum equals expanded subledger drilldown sum (17,730 = £17.73M)
    const chartSumK = ACME_SQL_COHORTS.rows.reduce((s, r) => s + Number(r[1] ?? 0), 0);
    const expandedRows = expandReconciledSqlSubledgerRows(ACME_SQL_COHORTS.rows);
    const subledgerSumK = Math.round(
      expandedRows.reduce((s, r) => s + Number(r[1] ?? 0), 0)
    );
    expect(chartSumK).toBe(17730);
    expect(subledgerSumK).toBe(17730);

    // 7. FirmAdmin client currencies align with jurisdiction split
    const adminGroups = selectClientEngagementGroups(createFirmAdminController().getState());
    expect(adminGroups.find((g) => g.clientId === 'acme')?.currency).toBe('GBP');
    expect(adminGroups.find((g) => g.clientId === 'kensington')?.currency).toBe('GBP');
    expect(adminGroups.find((g) => g.clientId === 'vela')?.currency).toBe('USD');
  });

  it('enforces spreadsheet parser safety & accuracy invariants (E1, E3, E4, E5, E7) and virtualized DOM rows', async () => {
    // E1: Self-closing empty <c r="B2" s="3"/> must NOT shift C2 left into column B
    // E5: Non-sequential workbook.xml.rels target mapping resolves exact worksheet file
    const zip = await buildXlsxZip({
      'xl/workbook.xml': `
        <workbook><sheets>
          <sheet name="Summary" sheetId="1" r:id="rId2"/>
          <sheet name="Detail" sheetId="2" r:id="rId1"/>
        </sheets></workbook>`,
      'xl/_rels/workbook.xml.rels': `
        <Relationships>
          <Relationship Id="rId1" Target="worksheets/sheet2.xml"/>
          <Relationship Id="rId2" Target="worksheets/sheet1.xml"/>
        </Relationships>`,
      'xl/worksheets/sheet1.xml': `
        <worksheet><sheetData>
          <row r="1"><c r="A1" t="inlineStr"><is><t>Code</t></is></c><c r="B1" t="inlineStr"><is><t>BlankCol</t></is></c><c r="C1" t="inlineStr"><is><t>Amount</t></is></c></row>
          <row r="2"><c r="A2" t="inlineStr"><is><t>1010</t></is></c><c r="B2" s="3"/><c r="C2"><v>500</v></c></row>
        </sheetData></worksheet>`,
      'xl/worksheets/sheet2.xml': `
        <worksheet><sheetData>
          <row r="1"><c r="A1" t="inlineStr"><is><t>Note</t></is></c></row>
          <row r="2"><c r="A2" t="inlineStr"><is><t>SecondTab</t></is></c></row>
        </sheetData></worksheet>`,
    });

    const parsed = await parseXlsxBuffer(zip);
    expect(parsed.sheets[0]?.name).toBe('Summary');
    expect(parsed.sheets[0]?.rows[0]).toEqual(['1010', null, 500]);
    expect(parsed.sheets[1]?.name).toBe('Detail');
    expect(parsed.sheets[1]?.rows[0]).toEqual(['SecondTab']);

    // E3: Out-of-bounds column ZZZZ1 rejects immediately instead of allocating huge sparse array
    const maliciousZip = await buildXlsxZip({
      'xl/workbook.xml': `<workbook><sheets><sheet name="Bomb" sheetId="1" r:id="rId1"/></sheets></workbook>`,
      'xl/worksheets/sheet1.xml': `<worksheet><sheetData><row r="1"><c r="ZZZZ1"><v>1</v></c></row></sheetData></worksheet>`,
    });
    await expect(parseXlsxBuffer(maliciousZip)).rejects.toThrow(/column/i);

    // E4: Leading zeros and >15-digit integers stay strings
    const csv = 'AccountCode,EntityId,Amount\n00123,12345678901234567,450.25';
    const csvWb = parseDelimitedText(csv, 'Codes');
    expect(csvWb.sheets[0]?.rows[0]).toEqual(['00123', '12345678901234567', 450.25]);

    // E7: CSV export neutralizes spreadsheet formula injection (=, +, -, @) on string cells
    const unsafeSheet = {
      name: 'Export',
      columns: ['Vendor', 'Note'],
      rows: [['Acme', '=CMD()'], ['Beta', '+SUM(A1)']],
    };
    const exportedCsv = serializeSheetToCsv(unsafeSheet);
    expect(exportedCsv).toContain("'=CMD()");
    expect(exportedCsv).toContain("'+SUM(A1)");

    // Virtualized grid: 5,000 rows render < 100 DOM <tr> nodes at once
    const largeRows = Array.from({ length: 5000 }, (_, i) => [`Row-${i + 1}`, i * 10]);
    await act(async () => {
      render(
        spreadsheetRendererModule.render({
          block: {
            id: 'blk-large-grid',
            kind: 'spreadsheet',
            title: '5k Ledger Dump',
            data: {
              sourceFormat: 'csv',
              sheets: [{ name: 'GL_5000', columns: ['Ref', 'Balance'], rows: largeRows }],
            },
          },
          isCompact: false,
        }),
        container
      );
    });
    const renderedTrCount = container.querySelectorAll('tbody tr').length;
    expect(renderedTrCount).toBeGreaterThan(5);
    expect(renderedTrCount).toBeLessThan(100);
  });
});
