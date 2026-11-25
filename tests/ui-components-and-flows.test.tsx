import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { VNode } from 'preact';
import { describe, expect, it, vi } from 'vitest';
import { CONNECTOR_CATALOG } from '../src/core/connectors';
import {
  generateMailReplyDraft,
  INITIAL_MAIL_THREADS,
  queryAcrossInbox,
  queryMailTerminal,
} from '../src/core/inbox';
import { createWorkspace } from '../src/core/workspace';
import { proseRendererModule } from '../src/plugins/prose';
import { createDefaultRendererRegistry } from '../src/plugins/registrySetup';
import { EntraIdLogo, InviteEnvelopeIcon, OktaLogo } from '../src/ui/auth/AuthIcons';
import { CONNECTOR_LOGOS } from '../src/ui/connectors/connectorLogos';

function flattenVNodes(node: unknown): VNode[] {
  if (!node || typeof node === 'boolean' || typeof node === 'string' || typeof node === 'number') {
    return [];
  }
  if (Array.isArray(node)) {
    return node.flatMap(flattenVNodes);
  }
  if (typeof node === 'object' && 'type' in node && 'props' in node) {
    const vnode = node as VNode<{ children?: unknown }>;
    return [vnode, ...flattenVNodes(vnode.props.children)];
  }
  return [];
}

function extractText(node: unknown): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (typeof node === 'object' && 'props' in node) {
    return extractText((node as VNode<{ children?: unknown }>).props.children);
  }
  return '';
}

describe('ProseRenderer inline token recursion & grounded citations', () => {
  it('renders nested inline code and clickable citations inside bold spans without leaking backticks', () => {
    const onInspect = vi.fn();
    const rendered = proseRendererModule.render({
      block: {
        id: 'b-prose',
        kind: 'prose',
        data: 'Staged **`AJE-2026-042`** and **Performance Materiality (`PM`)** under **Clause [§4.2]**.',
      },
      isCompact: false,
      siblingArtifactId: 'block-msa-pdf',
      onInspect,
    });

    const plainText = extractText(rendered);
    expect(plainText).toBe(
      'Staged AJE-2026-042 and Performance Materiality (PM) under Clause [§4.2].'
    );
    expect(plainText).not.toContain('`');
    expect(plainText).not.toContain('**');

    const nodes = flattenVNodes(rendered);
    const codeNodes = nodes.filter((n) => n.type === 'code');
    expect(codeNodes.map(extractText)).toEqual(['AJE-2026-042', 'PM']);

    const citationBtn = nodes.find(
      (n) =>
        n.type === 'button' &&
        (n.props as { class?: string }).class === 'inline-citation'
    );
    expect(citationBtn).toBeDefined();
    (citationBtn!.props as unknown as { onClick: () => void }).onClick();
    expect(onInspect).toHaveBeenCalledWith('block-msa-pdf', '§4.2');
  });
});

describe('Connector & Enterprise Auth lightweight SVG icon coverage', () => {
  it('provides crisp inline SVG logos for every catalog connector and all 3 SSO providers', () => {
    expect(CONNECTOR_CATALOG.length).toBeGreaterThanOrEqual(16);
    for (const item of CONNECTOR_CATALOG) {
      const Logo = CONNECTOR_LOGOS[item.id];
      expect(Logo, `Missing SVG logo for connector "${item.id}"`).toBeTypeOf('function');
      const vnode = Logo!({ size: 18 }) as VNode;
      expect(vnode.type).toBe('svg');
    }

    for (const AuthIcon of [EntraIdLogo, OktaLogo, InviteEnvelopeIcon]) {
      const vnode = AuthIcon({ size: 18 }) as VNode;
      expect(vnode.type).toBe('svg');
    }
  });
});

describe('Cross-Inbox Ask Engine & Per-Email Terminal edge cases', () => {
  it('synthesizes grounded answers across clause, vouching, and fallback inbox queries without duplicate sources', () => {
    const clauseAns = queryAcrossInbox(
      INITIAL_MAIL_THREADS,
      'What are the open MSA redline clauses and §4.2 liability cap?'
    );
    expect(clauseAns.matchedThreads.some((m) => m.id === 'mail-legal-msa')).toBe(true);
    expect(clauseAns.answer).toContain('3x');
    const sourceIds = clauseAns.sources.map((s) => `${s.label}::${s.pluginRoute ?? ''}`);
    expect(new Set(sourceIds).size).toBe(sourceIds.length);

    const vouchAns = queryAcrossInbox(
      INITIAL_MAIL_THREADS,
      'Check Brex £42.10 FX variance on WP E-40'
    );
    expect(vouchAns.matchedThreads.some((m) => m.id === 'mail-dext-vouch')).toBe(true);
    expect(vouchAns.sources.some((s) => s.pluginRoute === 'vouch')).toBe(true);

    const fallbackAns = queryAcrossInbox(
      INITIAL_MAIL_THREADS,
      'Unrelated topic xyz987'
    );
    expect(fallbackAns.matchKind).toBe('no-match');
    expect(fallbackAns.matchedThreads).toEqual([]);
    expect(fallbackAns.answer).toContain('No inbox threads matched');

    // Marking threads read updates cross-inbox unread summary counts dynamically
    const allRead = INITIAL_MAIL_THREADS.map((t) => ({ ...t, unread: false }));
    const zeroUnreadAns = queryAcrossInbox(allRead, 'What unread items need sign-off?');
    expect(zeroUnreadAns.answer).toContain('All inbox items are read');
  });

  it('produces distinct standard, concise, and request-backup drafts and grounded terminal answers', () => {
    const thread = INITIAL_MAIL_THREADS[0]!;
    const standard = generateMailReplyDraft(thread, 'standard');
    const concise = generateMailReplyDraft(thread, 'concise');
    const pushback = generateMailReplyDraft(thread, 'pushback');

    expect(standard).not.toBe(concise);
    expect(standard).not.toBe(pushback);
    expect(concise).not.toBe(pushback);

    const terminalAns = queryMailTerminal(thread, 'Confirm UTR and filing deadline');
    expect(terminalAns.question).toBe('Confirm UTR and filing deadline');
    expect(terminalAns.answer.length).toBeGreaterThan(20);
    expect(terminalAns.citations.length).toBeGreaterThan(0);
  });
});

describe('Workspace idempotency, attachment lifecycle, and responsive/a11y invariants', () => {
  it('avoids redundant subscriber notifications on idempotent sidebar and network updates', () => {
    const registry = createDefaultRendererRegistry();
    const workspace = createWorkspace({ responseDelayMs: 0, registry });
    const listener = vi.fn();
    const unsub = workspace.subscribe(listener);

    // Sidebar starts open (true); setting true again must be a strict no-op
    workspace.setSidebarOpen(true);
    expect(listener).not.toHaveBeenCalled();

    workspace.setSidebarOpen(false);
    expect(listener).toHaveBeenCalledTimes(1);
    workspace.setSidebarOpen(false);
    expect(listener).toHaveBeenCalledTimes(1);

    // Network starts online; setting online again must be a strict no-op
    workspace.setNetworkStatus('online');
    expect(listener).toHaveBeenCalledTimes(1);

    unsub();
  });

  it('handles spreadsheet attachment ingestion, removal, and stage auto-open cleanly', async () => {
    const registry = createDefaultRendererRegistry();
    const workspace = createWorkspace({ responseDelayMs: 0, registry });

    workspace.attachContent({
      id: 'att-1',
      kind: 'spreadsheet',
      title: 'TrialBalance_Upload',
      filename: 'TrialBalance_Upload.csv',
      data: { sheets: [{ name: 'Sheet1', columns: ['Acct', 'Amt'], rows: [['1010', 500]] }] },
    });
    expect(workspace.getState().attachments).toHaveLength(1);

    workspace.removeAttachment('att-1');
    expect(workspace.getState().attachments).toHaveLength(0);

    workspace.attachContent({
      id: 'att-2',
      kind: 'spreadsheet',
      title: 'Nov_Close',
      filename: 'Nov_Close.xlsx',
      data: { sheets: [{ name: 'TB', columns: ['Acct', 'Balance'], rows: [['1010', 12500]] }] },
    });
    const topicId = workspace.submitPrompt();
    expect(topicId).toBeTruthy();

    await vi.waitFor(() => {
      expect(workspace.getState().inspectedBlockId).toBe('att-2');
    });

    workspace.inspectArtifact(null);
    expect(workspace.getState().inspectedBlockId).toBeNull();
    workspace.returnHome();
    expect(workspace.getState().activeTopicId).toBeNull();
  });

  it('locks down accessibility, reduced-motion, mobile flex-column height bounds, and Service Worker caching', () => {
    const coreCss = readFileSync(join(process.cwd(), 'src/styles.css'), 'utf8');
    expect(coreCss).toContain('prefers-reduced-motion: reduce');
    expect(coreCss).toContain('button:focus-visible');
    expect(coreCss).toMatch(/textarea:focus-visible\s*\{\s*outline:\s*none;/);

    //Inbox bottom ask dock reuses Composer card & SendArrowIcon (consistent with Home/Thread Composer)
    const inboxSource = readFileSync(
      join(process.cwd(), 'src/ui/inbox/InboxWorkspace.tsx'),
      'utf8'
    );
    expect(inboxSource).toContain('composer-card is-compact');
    expect(inboxSource).toContain('SendArrowIcon');

    // Prevent mobile flex-column stage blowout (must keep min-height: 0 on both panes)
    expect(coreCss).toMatch(/\.thread-conversation-pane\s*\{[^}]*min-height:\s*0;/);
    expect(coreCss).toMatch(/\.artifact-stage-pane\s*\{[^}]*min-height:\s*0;/);

    const swSource = readFileSync(join(process.cwd(), 'public/sw.js'), 'utf8');
    expect(swSource).toContain("url.pathname.startsWith('/assets/')");
    expect(swSource).toContain("request.mode === 'navigate'");
    expect(swSource).toContain('caches.delete');
  });
});
