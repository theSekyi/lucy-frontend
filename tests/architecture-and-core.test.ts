import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createRendererRegistry } from '../src/core/renderers';
import {
  createWorkspace,
  selectHomeRecentTopics,
  selectHomeRecentTotalCount,
  selectSidebarRecentTopics,
} from '../src/core/workspace';
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

describe('Separation of logic from presentation', () => {
  it('keeps src/core completely free of UI framework and DOM imports', () => {
    const coreDir = join(process.cwd(), 'src/core');
    const files = readdirSync(coreDir).filter((f) => f.endsWith('.ts'));
    expect(files.length).toBeGreaterThanOrEqual(4);

    for (const file of files) {
      const source = readFileSync(join(coreDir, file), 'utf8');
      expect(source).not.toMatch(/from\s+['"]preact/);
      expect(source).not.toMatch(/from\s+['"]\.\.\/ui/);
      expect(source).not.toMatch(/\b(document|window|HTMLElement)\b/);
    }
  });
});

describe('Headless Workspace state and offline resilience', () => {
  it('initializes with reference counts and transitions cleanly to thread + spreadsheet stage', () => {
    const workspace = createWorkspace({ responseDelayMs: 0 });
    const initial = workspace.getState();

    expect(initial.activeSection).toBe('home');
    expect(initial.activeTopicId).toBeNull();
    expect(selectHomeRecentTotalCount(initial)).toBe(8);
    expect(selectHomeRecentTopics(initial)).toHaveLength(5);
    expect(selectSidebarRecentTopics(initial)).toHaveLength(5);

    workspace.updateDraft('Build a Q4 revenue Excel forecast');
    const createdTopicId = workspace.submitPrompt();
    const afterSubmit = workspace.getState();

    expect(createdTopicId).toBeTruthy();
    expect(afterSubmit.activeTopicId).toBe(createdTopicId);
    expect(afterSubmit.composerDraft).toBe('');
    expect(afterSubmit.inspectedBlockId).toBeTruthy();

    const thread = afterSubmit.topics.find((t) => t.id === createdTopicId)!;
    expect(thread.turns).toHaveLength(2);
    expect(thread.turns[1]?.blocks.some((b) => b.kind === 'spreadsheet')).toBe(true);
  });

  it('queues prompts safely while offline and flushes automatically when back online', () => {
    const workspace = createWorkspace({ responseDelayMs: 0 });
    workspace.setNetworkStatus('offline');
    const topicId = workspace.submitPrompt('Summarize pending MCP bugs')!;

    const offlineState = workspace.getState();
    expect(offlineState.queuedTurnIds).toHaveLength(1);
    const pendingTopic = offlineState.topics.find((t) => t.id === topicId)!;
    expect(pendingTopic.turns[1]?.status).toBe('queued-offline');

    workspace.setNetworkStatus('online');
    const recoveredState = workspace.getState();
    expect(recoveredState.queuedTurnIds).toHaveLength(0);
    const completedTopic = recoveredState.topics.find((t) => t.id === topicId)!;
    expect(completedTopic.turns[1]?.status).toBe('complete');
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
