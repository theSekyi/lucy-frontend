import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFirmAdminController } from '../src/core/admin';
import {
  createOnboardingController,
  ONBOARDING_STEPS,
  validateEnterpriseAuth,
} from '../src/core/onboarding';
import { loadWithRetry } from '../src/core/renderers';
import { createStore } from '../src/core/store';
import { createWorkspace } from '../src/core/workspace';

function walkFiles(dir: string, predicate: (name: string) => boolean): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walkFiles(full, predicate));
    } else if (predicate(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe('UI Hygiene, Zero Native <select>, Zero AI Clichés & Zero Dead CSS', () => {
  it('forbids native <select> elements across the entire UI and plugin tree', () => {
    const tsxFiles = walkFiles(join(process.cwd(), 'src'), (f) => f.endsWith('.tsx'));
    expect(tsxFiles.length).toBeGreaterThanOrEqual(20);

    for (const file of tsxFiles) {
      const source = readFileSync(file, 'utf8');
      expect(
        source,
        `Found forbidden native <select> element in ${file}; use <SelectMenu /> instead`
      ).not.toMatch(/<select[\s>]/);
    }
  });

  it('forbids LLM chatbot model pickers and leftover demo strings across src/', () => {
    const allSrcFiles = walkFiles(join(process.cwd(), 'src'), (f) =>
      /\.(ts|tsx)$/.test(f)
    );
    const forbidden = [
      'DeepSeek',
      'GPT-5',
      'Claude 4.5',
      'Seedance',
      'BotItemIcon',
      'AI Runtime',
      'Lucy Enterprise Inc',
      'Lucy Orchestrator',
      'Simulate Outage',
      'sync-llm-btn',
      'INBOX_QUICK_QUERIES',
      'Generate response',
      'Ask terminal',
      'Click any ',
      '⚡',
    ];

    for (const file of allSrcFiles) {
      const source = readFileSync(file, 'utf8');
      for (const word of forbidden) {
        expect(source, `Found forbidden string "${word}" in ${file}`).not.toContain(word);
      }
    }
  });

  it('keeps ALL stylesheets across src/ free of dead unreferenced class selectors', () => {
    const cssTargets = walkFiles(join(process.cwd(), 'src'), (f) => f.endsWith('.css'));
    expect(cssTargets.length).toBeGreaterThanOrEqual(8);

    const codeCorpus = [
      readFileSync(join(process.cwd(), 'index.html'), 'utf8'),
      ...walkFiles(join(process.cwd(), 'src'), (f) => /\.(ts|tsx)$/.test(f)).map((f) =>
        readFileSync(f, 'utf8')
      ),
    ].join('\n');

    // Dynamic prefix patterns interpolated in JSX like `accent-${...}`, `is-${...}`, `status-${...}`, `tone-${...}`, `cat-${...}`, `theme-${...}`
    const dynamicPattern = /^(accent-|is-|status-|tone-|cat-|theme-|badge-xlsx$)/;

    const unused: string[] = [];
    for (const cssPath of cssTargets) {
      const css = readFileSync(cssPath, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      const selectorBlocks = css.matchAll(/([^{}]+)\{/g);
      for (const match of selectorBlocks) {
        const selectorText = match[1]!;
        if (selectorText.trim().startsWith('@')) continue;
        for (const clsMatch of selectorText.matchAll(/\.([a-zA-Z0-9_-]+)/g)) {
          const cls = clsMatch[1]!;
          if (dynamicPattern.test(cls)) continue;
          if (!codeCorpus.includes(cls)) {
            unused.push(`${cssPath.split('/src/')[1]}:.${cls}`);
          }
        }
      }
    }
    expect(unused).toEqual([]);
  });
});

describe('Memory Safety, Deterministic Store Subscriptions & Timer Disposal', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('cleans up store listeners deterministically even when unsubscribing mid-notification', () => {
    const store = createStore({ count: 0 });
    expect(store.getListenerCount()).toBe(0);

    const calls: string[] = [];
    let unsubB: () => void = () => {};

    const unsubA = store.subscribe(() => {
      calls.push('A');
      unsubB();
    });
    unsubB = store.subscribe(() => {
      calls.push('B');
    });

    expect(store.getListenerCount()).toBe(2);
    store.update((s) => ({ count: s.count + 1 }));

    // A unsubscribed B during dispatch, so B must not receive a stale notification
    expect(calls).toEqual(['A']);
    expect(store.getListenerCount()).toBe(1);

    unsubA();
    expect(store.getListenerCount()).toBe(0);
  });

  it('cancels pending workspace timers on dispose() so unmounted sessions never leak updates', () => {
    vi.useFakeTimers();
    const workspace = createWorkspace({ responseDelayMs: 500 });
    const listener = vi.fn();
    const unsub = workspace.subscribe(listener);

    const topicId = workspace.submitPrompt('Prepare trial balance flux memo')!;
    expect(workspace.getState().topics.find((t) => t.id === topicId)?.turns[1]?.status).toBe(
      'streaming'
    );

    const callsBeforeDispose = listener.mock.calls.length;
    workspace.dispose();

    // Advance clock well past 500ms; disposed controller must not fire late state mutations
    vi.advanceTimersByTime(2000);
    expect(listener.mock.calls.length).toBe(callsBeforeDispose);
    expect(workspace.getState().topics.find((t) => t.id === topicId)?.turns[1]?.status).toBe(
      'streaming'
    );

    unsub();
    expect(workspace.getListenerCount()).toBe(0);
  });

  it('retries flaky network module loads and propagates final errors when offline', async () => {
    let tries = 0;
    const recovered = await loadWithRetry(
      async () => {
        tries += 1;
        if (tries < 3) throw new Error('Packet drop');
        return 'chunk-ready';
      },
      2,
      1
    );
    expect(recovered).toBe('chunk-ready');
    expect(tries).toBe(3);

    await expect(
      loadWithRetry(
        async () => {
          throw new Error('Offline');
        },
        1,
        1
      )
    ).rejects.toThrow('Offline');
  });
});

describe('Enterprise Authentication (Entra ID, Okta, Invite) & Admin Onboarding', () => {
  it('validates Microsoft Entra ID, Okta Workforce SAML, and Email Invite tokens', () => {
    const entra = validateEnterpriseAuth({
      provider: 'entra',
      email: 'e.carter@cartervance.co.uk',
      tenantOrIssuer: 'cartervance.co.uk',
    });
    expect(entra.ok).toBe(true);
    expect(entra.ssoTenantLabel).toContain('Microsoft Entra ID');

    const oktaMissingDomain = validateEnterpriseAuth({
      provider: 'okta',
      email: 'e.carter@cartervance.co.uk',
      tenantOrIssuer: '',
    });
    expect(oktaMissingDomain.ok).toBe(false);

    const oktaShort = validateEnterpriseAuth({
      provider: 'okta',
      email: 'e.carter@cartervance.co.uk',
      tenantOrIssuer: 'cartervance',
    });
    expect(oktaShort.ok).toBe(true);
    expect(oktaShort.ssoTenantLabel).toBe('Okta SAML 2.0 · cartervance.okta.com');

    const badInvite = validateEnterpriseAuth({
      provider: 'invite',
      email: 'j.doe@cartervance.co.uk',
      inviteCode: '123',
      fullName: 'Jane Doe',
    });
    expect(badInvite.ok).toBe(false);

    const validInvite = validateEnterpriseAuth({
      provider: 'invite',
      email: 'j.doe@cartervance.co.uk',
      inviteCode: 'CV-2026-PARTNER',
      fullName: 'Jane Doe',
    });
    expect(validInvite.ok).toBe(true);
    expect(validInvite.fullName).toBe('Jane Doe');
  });

  it('handles signOut -> completeSignIn lifecycle and 5-step Admin Workspace Onboarding', () => {
    const workspace = createWorkspace({ responseDelayMs: 0 });
    const admin = createFirmAdminController();
    const onboarding = createOnboardingController();

    workspace.signOut();
    expect(workspace.getState().authSession.isAuthenticated).toBe(false);
    expect(workspace.getState().activeSection).toBe('login');

    // Step through all 5 onboarding phases
    expect(onboarding.getState().currentStep).toBe('firm');
    onboarding.updateFirm({
      firmName: 'Vance & Partners LLP',
      regulatoryBody: 'ACCA',
    });

    expect(onboarding.advanceStep()).toBe('identity');
    onboarding.updateIdentity({
      primaryIdp: 'okta',
      verifiedDomain: 'vancepartners.co.uk',
      tenantOrIssuer: 'vancepartners.okta.com',
    });

    expect(onboarding.advanceStep()).toBe('stack');
    expect(onboarding.advanceStep()).toBe('templates');
    onboarding.setCloseDay('WD+7');
    onboarding.toggleChecklistStep('tpl-vat');
    expect(
      onboarding.getState().closeTemplate.checklistSteps.find((s) => s.id === 'tpl-vat')?.enabled
    ).toBe(false);

    expect(onboarding.advanceStep()).toBe('team');
    const invId = onboarding.stageInvite({
      fullName: 'Oliver Grant',
      email: 'o.grant@vancepartners.co.uk',
      department: 'Tax',
      authority: 'Manager',
    });
    expect(invId).toBeTruthy();

    // Commit staged invites into FirmAdminController and complete provisioning
    for (const inv of onboarding.getState().stagedInvites) {
      admin.addMember(inv);
    }
    onboarding.completeProvisioning();
    expect(onboarding.getState().isProvisioned).toBe(true);
    expect(onboarding.getState().completedSteps).toHaveLength(ONBOARDING_STEPS.length);
    expect(admin.getState().members.some((m) => m.email === 'o.grant@vancepartners.co.uk')).toBe(
      true
    );

    workspace.completeSignIn({
      provider: 'okta',
      email: 'e.carter@vancepartners.co.uk',
      firm: onboarding.getState().firm.firmName,
      organizationDomain: 'vancepartners.co.uk',
      ssoTenantLabel: 'Okta SAML 2.0 · vancepartners.okta.com',
      nextSection: 'admin',
    });

    expect(workspace.getState().authSession.isAuthenticated).toBe(true);
    expect(workspace.getState().authSession.provider).toBe('okta');
    expect(workspace.getState().userProfile.firm).toBe('Vance & Partners LLP');
    expect(workspace.getState().activeSection).toBe('admin');
  });
});
