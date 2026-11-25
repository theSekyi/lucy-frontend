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
  queryMailTerminal,
} from '../src/core/inbox';
import { createRendererRegistry } from '../src/core/renderers';
import {
  createWorkspace,
  selectHomeRecentTopics,
  selectHomeRecentTotalCount,
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
    lv.setUint16(8, 8, true); // deflate
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
    expect(files.length).toBeGreaterThanOrEqual(4);

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
    expect(uiFiles.length).toBeGreaterThanOrEqual(10);

    for (const file of uiFiles) {
      const source = readFileSync(file, 'utf8');
      expect(source).not.toMatch(/from\s+['"][^'"]*plugins\//);
      expect(source).not.toMatch(/import\(['"][^'"]*plugins\//);
    }
  });
});

describe('Headless Workspace state and offline resilience', () => {
  it('initializes with reference counts and transitions cleanly to thread + spreadsheet stage', async () => {
    const registry = createDefaultRendererRegistry();
    const workspace = createWorkspace({ responseDelayMs: 0, registry });
    const initial = workspace.getState();

    expect(initial.activeSection).toBe('home');
    expect(initial.activeTopicId).toBeNull();
    expect(selectHomeRecentTotalCount(initial)).toBe(8);
    expect(selectHomeRecentTopics(initial)).toHaveLength(5);
    expect(selectSidebarRecentTopics(initial)).toHaveLength(5);

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

  it('dynamically routes and launches all 13 stage & inline enterprise/accounting plugins + citation anchors', async () => {
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

    // Verify inline control plugins (AJE Gate & PBC Tracker) render inline without opening the side stage
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

    // Launch a stage plugin again to verify citation anchor & revision commits
    await workspace.launchPluginSample('cited-document');
    const docId = workspace.getState().inspectedBlockId!;
    const initialPulse = workspace.getState().anchorPulse;
    workspace.inspectArtifact(docId, '§4.2');
    expect(workspace.getState().inspectedAnchor).toBe('§4.2');
    expect(workspace.getState().anchorPulse).toBe(initialPulse + 1);
    workspace.inspectArtifact(docId, '§4.2');
    expect(workspace.getState().anchorPulse).toBe(initialPulse + 2);

    // Verify bidirectional artifact revision commits updated data + appends LLM context turns
    const beforeTurnCount = workspace
      .getState()
      .topics.find((t) => t.id === workspace.getState().activeTopicId)!.turns.length;

    workspace.commitArtifactRevision(docId, { updated: true }, [
      'Slide 1 KPI (Ending Enterprise ARR): $5.64M → $5.92M',
    ]);

    const afterRevTopic = workspace
      .getState()
      .topics.find((t) => t.id === workspace.getState().activeTopicId)!;
    expect(afterRevTopic.turns.length).toBe(beforeTurnCount + 2);
    const updatedBlock = afterRevTopic.turns
      .flatMap((t) => t.blocks)
      .find((b) => b.id === docId)!;
    expect(updatedBlock.data).toEqual({ updated: true });
  });

  it('queues prompts safely while offline and flushes automatically when back online', async () => {
    const workspace = createWorkspace({ responseDelayMs: 0 });
    workspace.setNetworkStatus('offline');
    const topicId = workspace.submitPrompt('Summarize pending MCP bugs')!;

    const offlineState = workspace.getState();
    expect(offlineState.queuedTurnIds).toHaveLength(1);
    const pendingTopic = offlineState.topics.find((t) => t.id === topicId)!;
    expect(pendingTopic.turns[1]?.status).toBe('queued-offline');

    workspace.setNetworkStatus('online');
    await vi.waitFor(() => {
      expect(workspace.getState().queuedTurnIds).toHaveLength(0);
    });
    const recoveredState = workspace.getState();
    expect(recoveredState.queuedTurnIds).toHaveLength(0);
    const completedTopic = recoveredState.topics.find((t) => t.id === topicId)!;
    expect(completedTopic.turns[1]?.status).toBe('complete');
  });

  it('manages user profile updates, accounting software connectors, and modular inbox attachment routes', async () => {
    const registry = createDefaultRendererRegistry();
    const workspace = createWorkspace({ responseDelayMs: 0, registry });

    // Profile update recomputes initials cleanly
    expect(workspace.getState().userProfile.initials).toBe('EC');
    workspace.updateUserProfile({ fullName: 'Arthur Pendelton', role: 'Senior Tax Partner' });
    expect(workspace.getState().userProfile.fullName).toBe('Arthur Pendelton');
    expect(workspace.getState().userProfile.initials).toBe('AP');

    // Connector toggle adds & removes cleanly
    const beforeCount = workspace.getState().connectedAppIds.length;
    workspace.toggleConnector('quickbooks');
    expect(workspace.getState().connectedAppIds).toContain('quickbooks');
    expect(workspace.getState().connectedAppIds.length).toBe(beforeCount + 1);
    workspace.toggleConnector('quickbooks');
    expect(workspace.getState().connectedAppIds).not.toContain('quickbooks');

    // Inbox provider switching activates inbox section & unread count setter is idempotent
    workspace.setInboxProvider('outlook');
    expect(workspace.getState().activeSection).toBe('inbox');
    expect(workspace.getState().inboxProvider).toBe('outlook');

    let notifyCount = 0;
    const unsub = workspace.subscribe(() => {
      notifyCount += 1;
    });
    const currentUnread = workspace.getState().unreadInboxCount;
    workspace.setUnreadInboxCount(currentUnread);
    workspace.setInboxProvider('outlook');
    expect(notifyCount).toBe(0);
    unsub();

    // Every attachment & intelligence source pluginRoute across Gmail & Outlook resolves cleanly
    for (const thread of INITIAL_MAIL_THREADS) {
      expect(thread.intelligence).toBeDefined();
      expect(generateMailReplyDraft(thread, 'standard').length).toBeGreaterThan(20);
      expect(generateMailReplyDraft(thread, 'concise').length).toBeGreaterThan(15);

      for (const att of thread.attachments) {
        const plugin = registry.findByRoute(att.pluginRoute);
        expect(plugin, `Missing plugin route "${att.pluginRoute}" on ${att.filename}`).toBeDefined();
      }
      for (const src of thread.intelligence?.sources ?? []) {
        if (src.pluginRoute) {
          const plugin = registry.findByRoute(src.pluginRoute);
          expect(plugin, `Missing source plugin route "${src.pluginRoute}" on ${src.label}`).toBeDefined();
        }
      }
    }

    // Verify terminal Q&A answers grounded questions with deep-link citations
    const msaThread = INITIAL_MAIL_THREADS.find((t) => t.id === 'mail-legal-msa')!;
    const termRes = queryMailTerminal(msaThread, 'What is our liability cap in §4.2?');
    expect(termRes.answer).toContain('3x trailing twelve-month');
    expect(termRes.citations.some((c) => c.anchor === '§4.2')).toBe(true);
  });

  it('manages Clients engagement groupings and Firm Admin staff roster with safe reassignment on removal', () => {
    const admin = createFirmAdminController();
    const initialCount = admin.getState().members.length;

    const initialGroups = selectClientEngagementGroups(admin.getState());
    expect(initialGroups.length).toBeGreaterThanOrEqual(4);
    expect(initialGroups[0]?.engagements.length).toBeGreaterThanOrEqual(2);
    expect(initialGroups[0]?.averageProgressPct).toBeGreaterThan(0);

    const newId = admin.addMember({
      fullName: 'Sophie Grant',
      email: 's.grant@cartervance.co.uk',
      department: 'Audit',
      authority: 'Associate',
    });
    expect(newId).toBeTruthy();
    expect(admin.getState().members).toHaveLength(initialCount + 1);

    // Assign an engagement to the new member, then remove her and verify automatic reassignment to Partner
    const firstEngId = admin.getState().engagements[0]!.id;
    admin.reassignEngagement(firstEngId, newId!);
    expect(admin.getState().engagements[0]?.ownerId).toBe(newId);

    admin.removeMember(newId!);
    expect(admin.getState().members).toHaveLength(initialCount);
    const reassignedOwnerId = admin.getState().engagements[0]!.ownerId;
    expect(reassignedOwnerId).not.toBe(newId);
    expect(admin.getState().members.some((m) => m.id === reassignedOwnerId)).toBe(true);

    // Updating stage automatically updates engagement progress percentage
    admin.updateEngagementStage(firstEngId, 'Complete');
    expect(admin.getState().engagements[0]?.progressPct).toBe(100);
  });
});

describe('Extensible RendererRegistry', () => {
  it('supports zero-touch plugin registration, lazy deduplication, retry on flaky networks, and fallback', async () => {
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

    registry.register({
      id: 'cad-step',
      label: '3D CAD Viewer',
      badge: 'STEP',
      placement: 'stage',
      priority: 50,
      matches: (b) => b.kind === 'cad/step',
      load: loadSpy,
    });

    const cadBlock = { id: 'c1', kind: 'cad/step', title: 'TurbineHousing.step', data: {} };
    const [r1, r2] = await Promise.all([
      registry.loadRenderer(cadBlock),
      registry.loadRenderer(cadBlock),
    ]);

    expect(r1).toBe(r2);
    expect(loadSpy).toHaveBeenCalledTimes(2); // initial transient drop + 1 automatic retry
    expect(r1.render({ block: cadBlock })).toBe('CAD:TurbineHousing.step');

    const unknownBlock = { id: 'u1', kind: 'medical/dicom', data: {} };
    const fbRenderer = await registry.loadRenderer(unknownBlock);
    expect(fbRenderer.render({ block: unknownBlock })).toBe('fallback-view');
  });
});

describe('Zero-dependency Excel (.xlsx) and CSV parser', () => {
  it('parses quoted CSV and round-trips cleanly', () => {
    const csv = 'Account,ARR,Notes\n"Acme, Inc.",125000,"Multi-year, enterprise"\nBeta,48500,Standard';
    const wb = parseDelimitedText(csv, 'Accounts');
    expect(wb.sheets[0]?.columns).toEqual(['Account', 'ARR', 'Notes']);
    expect(wb.sheets[0]?.rows[0]).toEqual(['Acme, Inc.', 125000, 'Multi-year, enterprise']);

    const exported = serializeSheetToCsv(wb.sheets[0]!);
    expect(exported).toContain('"Acme, Inc.",125000,"Multi-year, enterprise"');
  });

  it('extracts sheets, shared strings, numbers, and cell formulas from binary .xlsx archives', async () => {
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
    expect(workbook.sheets).toHaveLength(1);
    expect(workbook.sheets[0]?.name).toBe('Revenue');
    expect(workbook.sheets[0]?.columns).toEqual(['Quarter', 'ARR']);
    expect(workbook.sheets[0]?.rows).toEqual([
      ['Q3', 410000],
      ['Q4', 525000],
      ['Total', 935000],
    ]);
    expect(workbook.sheets[0]?.formulas?.B4).toBe('=SUM(B2:B3)');
  });
});
