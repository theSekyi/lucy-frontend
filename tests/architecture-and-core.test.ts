import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  createFirmAdminController,
  selectClientEngagementGroups,
} from '../src/core/admin';
import {
  generateMailReplyDraft,
  INITIAL_MAIL_THREADS,
  queryAcrossInbox,
  queryMailTerminal,
} from '../src/core/inbox';
import { createRendererRegistry } from '../src/core/renderers';
import {
  createWorkspace,
  selectHomeRecentTopics,
  selectSidebarRecentTopics,
} from '../src/core/workspace';
import { createDefaultRendererRegistry } from '../src/plugins/registrySetup';
import {
  parseDelimitedText,
  parseXlsxBuffer,
  serializeSheetToCsv,
} from '../src/plugins/spreadsheet/parser';

async function deflateRaw(text: string): Promise<Uint8Array> {
  const encoded = new TextEncoder().encode(text);
  const input = new Uint8Array(encoded.byteLength);
  input.set(encoded);
  const stream = new Blob([input]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function buildMinimalXlsxZip(files: Record<string, string>): Promise<ArrayBuffer> {
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

describe('Separation of logic from presentation and strict plugin modularity', () => {
  it('keeps src/core completely free of UI framework, plugin, and DOM imports', () => {
    const coreDir = join(process.cwd(), 'src/core');
    const files = readdirSync(coreDir).filter((f) => f.endsWith('.ts'));
    expect(files.length).toBeGreaterThanOrEqual(6);

    for (const file of files) {
      const source = readFileSync(join(coreDir, file), 'utf8');
      expect(source).not.toMatch(/from\s+['"]preact/);
      expect(source).not.toMatch(/from\s+['"]\.\.\/(ui|plugins)/);
      expect(source).not.toMatch(/\b(document|window)\.[A-Za-z_$]|\bHTMLElement\b/);
    }
  });

  it('keeps src/ui completely decoupled from concrete plugin implementations across all subfolders', () => {
    function collectTsFiles(dir: string): string[] {
      const out: string[] = [];
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
          out.push(...collectTsFiles(full));
        } else if (/\.(ts|tsx)$/.test(entry)) {
          out.push(full);
        }
      }
      return out;
    }

    const uiFiles = collectTsFiles(join(process.cwd(), 'src/ui'));
    expect(uiFiles.length).toBeGreaterThanOrEqual(14);

    for (const file of uiFiles) {
      const source = readFileSync(file, 'utf8');
      expect(source).not.toMatch(/from\s+['"][^'"]*plugins\//);
      expect(source).not.toMatch(/import\(['"][^'"]*plugins\//);
    }
  });

  it('keeps App.tsx free of eager admin or secondary page imports so critical boot stays minimal', () => {
    const appSource = readFileSync(join(process.cwd(), 'src/ui/App.tsx'), 'utf8');
    expect(appSource).not.toMatch(/^import\s+\{[^}]*\}\s+from\s+['"]\.\.\/core\/admin['"]/m);
    expect(appSource).not.toMatch(/^import\s+\{[^}]*\}\s+from\s+['"]\.\/clients\/ClientsPage['"]/m);
    expect(appSource).not.toMatch(/^import\s+\{[^}]*\}\s+from\s+['"]\.\/inbox\/InboxWorkspace['"]/m);
    expect(appSource).not.toMatch(/^import\s+\{[^}]*\}\s+from\s+['"]\.\/admin\/FirmAdminPage['"]/m);
    expect(appSource).not.toMatch(/^import\s+\{[^}]*\}\s+from\s+['"]\.\/auth\/LoginPage['"]/m);
  });
});

describe('Headless Workspace state and offline resilience', () => {
  it('initializes with clean accounting domain threads and transitions to thread + spreadsheet stage', async () => {
    const registry = createDefaultRendererRegistry();
    const workspace = createWorkspace({ responseDelayMs: 0, registry });
    const initial = workspace.getState();

    expect(initial.activeSection).toBe('home');
    expect(initial.activeTopicId).toBeNull();
    expect(initial.clientCount).toBe(4);
    expect(selectHomeRecentTopics(initial)).toHaveLength(5);
    expect(selectSidebarRecentTopics(initial)).toHaveLength(5);

    workspace.toggleMoreSidebarRecents();
    expect(selectSidebarRecentTopics(workspace.getState()).length).toBeGreaterThanOrEqual(6);

    workspace.updateDraft('Build a Q4 revenue Excel forecast');
    const createdTopicId = workspace.submitPrompt();
    await vi.waitFor(() => {
      expect(workspace.getState().inspectedBlockId).toBeTruthy();
    });
    const afterSubmit = workspace.getState();

    expect(createdTopicId).toBeTruthy();
    expect(afterSubmit.activeTopicId).toBe(createdTopicId);
    expect(afterSubmit.composerDraft).toBe('');
    expect(afterSubmit.inspectedBlockId).toBeTruthy();

    const thread = afterSubmit.topics.find((t) => t.id === createdTopicId)!;
    expect(thread.turns).toHaveLength(2);
    expect(thread.turns[1]?.blocks.some((b) => b.kind === 'spreadsheet')).toBe(true);
  });

  it('dynamically routes and launches all 14 stage & inline enterprise/accounting plugins + citation anchors', async () => {
    const registry = createDefaultRendererRegistry();
    const workspace = createWorkspace({ responseDelayMs: 0, registry });

    const stagePluginIds = [
      'vouching',
      'trial-balance',
      'reconciliation',
      'tax-bridge',
      'rollforward',
      'spreadsheet',
      'cited-document',
      'redline',
      'sql-canvas',
      'topology',
      'slide-deck',
      'code-workspace',
    ];

    for (const pluginId of stagePluginIds) {
      const topicId = await workspace.launchPluginSample(pluginId);
      expect(topicId).toBeTruthy();
      const current = workspace.getState();
      expect(current.inspectedBlockId).toBeTruthy();

      const activeTopic = current.topics.find((t) => t.id === topicId)!;
      const block = activeTopic.turns
        .flatMap((t) => t.blocks)
        .find((b) => b.id === current.inspectedBlockId)!;
      expect(registry.resolve(block).id).toBe(pluginId);

      const loaded = await registry.loadRenderer(block);
      expect(typeof loaded.render).toBe('function');
    }

    for (const inlineId of ['journal-entry', 'pbc-tracker']) {
      const topicId = await workspace.launchPluginSample(inlineId);
      expect(topicId).toBeTruthy();
      expect(workspace.getState().inspectedBlockId).toBeNull();

      const activeTopic = workspace.getState().topics.find((t) => t.id === topicId)!;
      const lastTurn = activeTopic.turns[activeTopic.turns.length - 1]!;
      const inlineBlock = lastTurn.blocks[lastTurn.blocks.length - 1]!;
      expect(registry.resolve(inlineBlock).id).toBe(inlineId);
      expect(registry.resolve(inlineBlock).placement).toBe('inline');

      const loaded = await registry.loadRenderer(inlineBlock);
      expect(typeof loaded.render).toBe('function');
    }

    await workspace.launchPluginSample('cited-document');
    const docId = workspace.getState().inspectedBlockId!;
    const initialPulse = workspace.getState().anchorPulse;
    workspace.inspectArtifact(docId, '§4.2');
    expect(workspace.getState().inspectedAnchor).toBe('§4.2');
    expect(workspace.getState().anchorPulse).toBe(initialPulse + 1);

    const beforeTurnCount = workspace
      .getState()
      .topics.find((t) => t.id === workspace.getState().activeTopicId)!.turns.length;

    workspace.commitArtifactRevision(docId, { updated: true }, [
      'Clause §4.2 super-cap confirmed at 3x TTM fees',
    ]);

    const afterRevTopic = workspace
      .getState()
      .topics.find((t) => t.id === workspace.getState().activeTopicId)!;
    expect(afterRevTopic.turns.length).toBe(beforeTurnCount + 2);
  });

  it('queues prompts safely while offline and flushes automatically when back online', async () => {
    const workspace = createWorkspace({ responseDelayMs: 0 });
    workspace.setNetworkStatus('offline');
    const topicId = workspace.submitPrompt('Check November Trial Balance cutoff')!;

    const offlineState = workspace.getState();
    expect(offlineState.queuedTurnIds).toHaveLength(1);
    const pendingTopic = offlineState.topics.find((t) => t.id === topicId)!;
    expect(pendingTopic.turns[1]?.status).toBe('queued-offline');

    workspace.setNetworkStatus('online');
    await vi.waitFor(() => {
      expect(workspace.getState().queuedTurnIds).toHaveLength(0);
    });
    const completedTopic = workspace.getState().topics.find((t) => t.id === topicId)!;
    expect(completedTopic.turns[1]?.status).toBe('complete');
  });

  it('powers cross-inbox queries, per-email terminal Q&A, profile updates, and connector toggles', () => {
    const registry = createDefaultRendererRegistry();
    const workspace = createWorkspace({ responseDelayMs: 0, registry });

    workspace.updateUserProfile({ fullName: 'Arthur Pendelton', role: 'Senior Tax Partner' });
    expect(workspace.getState().userProfile.initials).toBe('AP');

    workspace.toggleConnector('quickbooks');
    expect(workspace.getState().connectedAppIds).toContain('quickbooks');
    expect(workspace.getState().disconnectedAppIds).not.toContain('quickbooks');

    // Cross-inbox ask bar queries across all threads
    const signoffAns = queryAcrossInbox(
      INITIAL_MAIL_THREADS,
      'What unread items need partner sign-off today?'
    );
    expect(signoffAns.matchedThreads.length).toBeGreaterThanOrEqual(4);
    expect(signoffAns.answer).toContain('CT600');
    expect(signoffAns.sources.length).toBeGreaterThan(0);

    const deadlineAns = queryAcrossInbox(
      INITIAL_MAIL_THREADS,
      'Summarize upcoming HMRC tax deadlines'
    );
    expect(deadlineAns.answer).toContain('4918204110');
    expect(deadlineAns.matchedThreads.some((m) => m.id === 'mail-hmrc-ct600')).toBe(true);

    const varianceAns = queryAcrossInbox(
      INITIAL_MAIL_THREADS,
      'Any open bank variances or missing PBC items?'
    );
    expect(varianceAns.answer).toContain('£3,442.10');
    expect(varianceAns.answer).toContain('Canary Wharf');

    for (const thread of INITIAL_MAIL_THREADS) {
      expect(generateMailReplyDraft(thread, 'standard').length).toBeGreaterThan(20);
      for (const att of thread.attachments) {
        expect(registry.findByRoute(att.pluginRoute)).toBeDefined();
      }
    }

    const msaThread = INITIAL_MAIL_THREADS.find((t) => t.id === 'mail-legal-msa')!;
    const termRes = queryMailTerminal(msaThread, 'What is our liability cap in §4.2?');
    expect(termRes.answer).toContain('3x trailing twelve-month');
    expect(termRes.citations.some((c) => c.anchor === '§4.2')).toBe(true);
  });

  it('manages Clients 12-month bookkeeping close, engagement checklists, and Firm Admin roster', () => {
    const admin = createFirmAdminController();
    const initialCount = admin.getState().members.length;

    const initialGroups = selectClientEngagementGroups(admin.getState());
    expect(initialGroups).toHaveLength(4);
    expect(initialGroups[0]?.periods).toHaveLength(12);

    admin.toggleBookkeepingMonthLock('acme', '2026-11');
    const afterLock = selectClientEngagementGroups(admin.getState()).find(
      (g) => g.clientId === 'acme'
    )!;
    expect(afterLock.currentMonthStatus).toBe('closed');
    expect(afterLock.currentMonthProgressPct).toBe(100);

    const addedClient = admin.addClient({
      name: 'Mayfair Capital LLP',
      ledger: 'Xero',
      yearEnd: '31 Mar',
    });
    expect(addedClient).toBe('mayfair-capital-llp');
    expect(admin.getState().clients).toHaveLength(5);

    const newId = admin.addMember({
      fullName: 'Sophie Grant',
      email: 's.grant@cartervance.co.uk',
      department: 'Bookkeeping',
      authority: 'Associate',
    });
    expect(newId).toBeTruthy();
    expect(admin.getState().members).toHaveLength(initialCount + 1);

    const firstEngId = admin.getState().engagements[0]!.id;
    admin.reassignEngagement(firstEngId, newId!);
    admin.removeMember(newId!);
    expect(admin.getState().members).toHaveLength(initialCount);
    expect(admin.getState().engagements[0]?.ownerId).not.toBe(newId);
  });
});

describe('Extensible RendererRegistry with memoized priority sorting', () => {
  it('memoizes sorted plugin order and recovers from transient chunk failures', async () => {
    const fallback = {
      id: 'fallback',
      label: 'Fallback',
      badge: 'RAW',
      placement: 'inline' as const,
      matches: () => true,
      load: async () => ({ render: () => 'fallback-view' }),
    };

    const registry = createRendererRegistry<string>(fallback);
    let attempts = 0;
    const loadSpy = vi.fn(async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('Simulated 2G packet drop');
      return { render: ({ block }: { block: { title?: string } }) => `CAD:${block.title}` };
    });

    const unregister = registry.register({
      id: 'cad-step',
      label: '3D CAD Viewer',
      badge: 'STEP',
      placement: 'stage',
      priority: 50,
      matches: (b) => b.kind === 'cad/step',
      load: loadSpy,
    });

    // Memoization guarantee: repeated calls return the exact same array reference
    const listA = registry.listPlugins();
    const listB = registry.listPlugins();
    expect(listA).toBe(listB);

    const cadBlock = { id: 'c1', kind: 'cad/step', title: 'TurbineHousing.step', data: {} };
    const [r1, r2] = await Promise.all([
      registry.loadRenderer(cadBlock),
      registry.loadRenderer(cadBlock),
    ]);

    expect(r1).toBe(r2);
    expect(loadSpy).toHaveBeenCalledTimes(2);
    expect(r1.render({ block: cadBlock })).toBe('CAD:TurbineHousing.step');

    unregister();
    expect(registry.listPlugins()).not.toBe(listA);
    expect(registry.listPlugins()).toHaveLength(0);
  });
});

describe('Zero-dependency Excel (.xlsx) and CSV parser', () => {
  it('parses quoted CSV and binary .xlsx archives with cell formulas', async () => {
    const csv = 'Account,ARR,Notes\n"Acme, Inc.",125000,"Multi-year, enterprise"\nBeta,48500,Standard';
    const wb = parseDelimitedText(csv, 'Accounts');
    expect(wb.sheets[0]?.rows[0]).toEqual(['Acme, Inc.', 125000, 'Multi-year, enterprise']);
    expect(serializeSheetToCsv(wb.sheets[0]!)).toContain('"Acme, Inc.",125000,"Multi-year, enterprise"');

    const xlsxBuffer = await buildMinimalXlsxZip({
      'xl/workbook.xml': `<workbook><sheets><sheet name="Revenue" sheetId="1" r:id="rId1"/></sheets></workbook>`,
      'xl/sharedStrings.xml': `<sst><si><t>Quarter</t></si><si><t>ARR</t></si><si><t>Q3</t></si><si><t>Q4</t></si></sst>`,
      'xl/worksheets/sheet1.xml': `
        <worksheet><sheetData>
          <row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>
          <row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2"><v>410000</v></c></row>
          <row r="3"><c r="A3" t="s"><v>3</v></c><c r="B3"><v>525000</v></c></row>
          <row r="4"><c r="A4" t="inlineStr"><is><t>Total</t></is></c><c r="B4"><f>SUM(B2:B3)</f><v>935000</v></c></row>
        </sheetData></worksheet>`,
    });

    const workbook = await parseXlsxBuffer(xlsxBuffer);
    expect(workbook.sheets[0]?.formulas?.B4).toBe('=SUM(B2:B3)');
  });
});
