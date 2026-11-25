export type GmailCategory = 'primary' | 'updates' | 'filings';
export type OutlookBucket = 'focused' | 'other';
export type MailFolder = 'inbox' | 'starred' | 'sent' | 'drafts' | 'archive';
export type ReplyDraftTone = 'standard' | 'concise' | 'pushback';

export interface MailAttachmentLink {
  readonly id: string;
  readonly filename: string;
  readonly sizeLabel: string;
  readonly badge: string;
  readonly pluginRoute: string;
}

export interface MailSourceLink {
  readonly id: string;
  readonly label: string;
  readonly kindLabel: 'PDF' | 'WORKPAPER' | 'LEDGER' | 'GATEWAY';
  readonly detail: string;
  readonly pluginRoute?: string;
  readonly anchor?: string;
  readonly connectorId?: string;
}

export interface MailReasoningStep {
  readonly check: string;
  readonly sourceId?: string;
}

export interface MailIntelligenceBrief {
  readonly verdict: string;
  readonly reasoning: ReadonlyArray<MailReasoningStep>;
  readonly sources: ReadonlyArray<MailSourceLink>;
  readonly drafts: Readonly<Record<ReplyDraftTone, string>>;
  readonly quickPrompts: ReadonlyArray<string>;
}

export interface MailTerminalExchange {
  readonly id: string;
  readonly question: string;
  readonly answer: string;
  readonly citations: ReadonlyArray<MailSourceLink>;
}

export interface OutlookMeetingSlot {
  readonly title: string;
  readonly when: string;
  readonly location: string;
  readonly rsvp?: 'none' | 'accepted' | 'tentative' | 'declined';
}

export interface OutlookMetadata {
  readonly bucket: OutlookBucket;
  readonly importance?: 'high' | 'normal';
  readonly mentionedMe?: boolean;
  readonly followUpDue?: string;
  readonly sensitivity?: string;
  readonly retentionPolicy?: string;
  readonly categoryTag?: { readonly label: string; readonly color: 'red' | 'amber' | 'green' | 'blue' };
  readonly meeting?: OutlookMeetingSlot;
}

export interface MailThreadItem {
  readonly id: string;
  readonly folder: MailFolder;
  readonly senderName: string;
  readonly senderInitials: string;
  readonly senderEmail: string;
  readonly avatarColor: string;
  readonly toList: string;
  readonly ccList?: string;
  readonly subject: string;
  readonly snippet: string;
  readonly bodyParagraphs: ReadonlyArray<string>;
  readonly timeShort: string;
  readonly fullTimestamp: string;
  readonly dateGroup: 'Today' | 'Yesterday' | 'Last Week';
  readonly unread: boolean;
  readonly starred: boolean;
  readonly flagged: boolean;
  readonly gmailCategory: GmailCategory;
  readonly gmailLabel?: { readonly text: string; readonly tone: 'hmrc' | 'audit' | 'urgent' | 'erp' };
  readonly outlook: OutlookMetadata;
  readonly attachments: ReadonlyArray<MailAttachmentLink>;
  readonly intelligence?: MailIntelligenceBrief;
}

export function generateMailReplyDraft(
  thread: MailThreadItem,
  tone: ReplyDraftTone = 'standard'
): string {
  if (thread.intelligence) {
    return thread.intelligence.drafts[tone];
  }
  const firstName = thread.senderName.split(/\s+/)[0] ?? 'there';
  if (tone === 'concise') {
    return `Hi ${firstName},\n\nConfirmed — we have reviewed "${thread.subject}" and reconciled the underlying schedules.\n\nBest,\nElena`;
  }
  if (tone === 'pushback') {
    return `Hi ${firstName},\n\nBefore we sign off on "${thread.subject}", please upload the supporting source schedule so we can complete our workpaper tie-out.\n\nBest,\nElena`;
  }
  return `Hi ${firstName},\n\nThank you for sending "${thread.subject}" over. We have cross-checked the figures against the engagement binder and will confirm final sign-off shortly.\n\nBest regards,\nElena Carter`;
}

let termSeq = 1;
export function queryMailTerminal(
  thread: MailThreadItem,
  rawQuestion: string
): MailTerminalExchange {
  termSeq += 1;
  const q = rawQuestion.trim();
  const lower = q.toLowerCase();
  const intel = thread.intelligence;
  const sources = intel?.sources ?? [];

  let answer = '';
  let matchedCitations: ReadonlyArray<MailSourceLink> = sources.slice(0, 2);

  if (lower.includes('materiality') || lower.includes('flux') || lower.includes('threshold')) {
    answer =
      thread.id === 'mail-acme-cfo-tb'
        ? 'Performance Materiality is $25,000 (5.0% pre-tax benchmark). Consolidated TB shows 3 accounts exceeding PM; proposed AJE-2026-042 ($60,058.00) resolves the $45,000 ASC 606 deferred revenue cut-off and $15,058 audit accrual cleanly ($0.00 imbalance).'
        : `Checked against firm materiality ($25,000 PM): "${thread.subject}" has ${
            intel ? intel.verdict.toLowerCase() : 'no unrecorded misstatements above threshold'
          }.`;
  } else if (lower.includes('cap') || lower.includes('4.2') || lower.includes('2.4') || lower.includes('clause') || lower.includes('liability')) {
    answer =
      'Clause §4.2 sets the data-protection & confidentiality super-cap at 3x trailing twelve-month (TTM) fees, while §2.4 extends prior written subprocessor notice from 14 days to 30 calendar days.';
    matchedCitations = sources.filter((s) => s.anchor || s.pluginRoute === 'pdf' || s.pluginRoute === 'diff');
    if (matchedCitations.length === 0) matchedCitations = sources;
  } else if (lower.includes('variance') || lower.includes('exception') || lower.includes('fx') || lower.includes('42.10') || lower.includes('unreconciled')) {
    if (thread.id === 'mail-chase-recon') {
      answer =
        '4 unreconciled items on Chase #4821 ($3,442.10 net variance): Global Corp wire +$12,500.00, Stripe payout fee -$42.10, lockbox deposit in transit -$8,400.00, and duplicate Datadog ACH -$615.80.';
    } else {
      answer =
        'Isolated $42.10 variance on Selection S-02 (Brex #4419): NetSuite GL 6420 recorded $3,442.10 vs Dext hotel receipt of $3,400.00 due to an unmapped card FX fee. Selection S-05 awaits signed Hudson Yards CAM PBC.';
    }
  } else if (lower.includes('tax') || lower.includes('m-1') || lower.includes('ct600') || lower.includes('1,648,400') || lower.includes('allowance')) {
    answer =
      'Book Net Income ($1,636,500) + permanent disallowances (-$5,600 net: +$18,400 meals §274(n), -$24,000 tax-exempt interest) + temporary diffs (+$17,500 net, incl. -$142,000 accelerated depreciation) = $1,648,400 reconciled taxable profit (21% est. tax: $346,164).';
  } else if (lower.includes('source') || lower.includes('where') || lower.includes('link') || lower.includes('cite')) {
    const names = sources.map((s) => `${s.label} (${s.detail})`).join('; ');
    answer = names
      ? `Grounded across ${sources.length} verified sources: ${names}.`
      : `Derived directly from thread metadata and attached engagement schedules (${thread.attachments.map((a) => a.filename).join(', ') || 'none'}).`;
    matchedCitations = sources;
  } else if (intel) {
    const stepSummary = intel.reasoning.map((r, idx) => `(${idx + 1}) ${r.check}`).join(' ');
    answer = `${intel.verdict} — ${stepSummary}`;
    matchedCitations = sources;
  } else {
    answer = `Reviewed "${thread.subject}" from ${thread.senderName}: ${thread.snippet}`;
  }

  return {
    id: `term-${termSeq}`,
    question: q,
    answer,
    citations: matchedCitations,
  };
}

export interface InboxGlobalAnswer {
  readonly id: string;
  readonly question: string;
  readonly answer: string;
  readonly matchedThreads: ReadonlyArray<{
    readonly id: string;
    readonly senderName: string;
    readonly subject: string;
    readonly timeShort: string;
  }>;
  readonly sources: ReadonlyArray<MailSourceLink>;
}

let globalAskSeq = 1;

/**
 * Synthesizes grounded answers across every thread in the user's inbox,
 * surfacing clickable deep-links to both matching emails and underlying workpapers/PDFs.
 */
export function queryAcrossInbox(
  threads: ReadonlyArray<MailThreadItem>,
  rawQuestion: string
): InboxGlobalAnswer {
  globalAskSeq += 1;
  const q = rawQuestion.trim();
  const lower = q.toLowerCase();
  const inboxThreads = threads.filter((t) => t.folder === 'inbox');

  function toSummary(list: ReadonlyArray<MailThreadItem>) {
    return list.map((t) => ({
      id: t.id,
      senderName: t.senderName,
      subject: t.subject,
      timeShort: t.timeShort,
    }));
  }

  function collectSources(list: ReadonlyArray<MailThreadItem>): ReadonlyArray<MailSourceLink> {
    const seen = new Set<string>();
    const out: MailSourceLink[] = [];
    for (const item of list) {
      for (const src of item.intelligence?.sources ?? []) {
        const key = `${src.kindLabel}:${src.label}`;
        if (!seen.has(key)) {
          seen.add(key);
          out.push(src);
        }
      }
    }
    return out.slice(0, 5);
  }

  if (
    lower.includes('unread') ||
    lower.includes('sign-off') ||
    lower.includes('sign off') ||
    lower.includes('today') ||
    lower.includes('priority') ||
    lower.includes('urgent')
  ) {
    const unread = inboxThreads.filter((t) => t.unread);
    const answer =
      unread.length === 0
        ? 'All inbox items are read. Zero pending partner sign-offs remain in your queue.'
        : `${unread.length} unread threads require action: (1) HMRC CT600 & Schedule M-1 transmission ($1,648,400 taxable profit, closes 30 Nov), (2) Acme November Consolidated TB + balanced AJE-2026-042 ($60,058.00), (3) Kensington ASC 842 Regent Street lease rollforward ($98,500/qtr), (4) WP E-40 $34,500 Hudson Yards CAM PBC chaser, and (5) Chase #4821 cutoff ($3,442.10 net variance).`;
    return {
      id: `inbox-ask-${globalAskSeq}`,
      question: q,
      answer,
      matchedThreads: toSummary(unread),
      sources: collectSources(unread),
    };
  }

  if (
    lower.includes('deadline') ||
    lower.includes('hmrc') ||
    lower.includes('tax') ||
    lower.includes('ct600') ||
    lower.includes('filing') ||
    lower.includes('m-1')
  ) {
    const taxThreads = inboxThreads.filter(
      (t) =>
        t.id === 'mail-hmrc-ct600' ||
        t.id === 'mail-companies-house' ||
        t.id === 'mail-xero-digest'
    );
    return {
      id: `inbox-ask-${globalAskSeq}`,
      question: q,
      answer:
        'Upcoming statutory deadlines in Inbox: Acme Holdings CT600 & Schedule M-1 ($1,648,400 taxable profit, UTR 4918204110) closes 30 Nov via HMRC MTD; Kensington Retail FCA 90-day Open Banking consent expires 3 Dec; Northstar UK AA01 & iXBRL accounts (#09481722) are already accepted by Companies House.',
      matchedThreads: toSummary(taxThreads),
      sources: collectSources(taxThreads),
    };
  }

  if (
    lower.includes('variance') ||
    lower.includes('exception') ||
    lower.includes('reconcil') ||
    lower.includes('fx') ||
    lower.includes('bank') ||
    lower.includes('pbc')
  ) {
    const varThreads = inboxThreads.filter(
      (t) =>
        t.id === 'mail-chase-recon' ||
        t.id === 'mail-dext-vouch' ||
        t.id === 'mail-acme-cfo-tb'
    );
    return {
      id: `inbox-ask-${globalAskSeq}`,
      question: q,
      answer:
        'Open variances & PBC items across Inbox: Chase #4821 has 4 unreconciled items ($3,442.10 net, including a duplicate -$615.80 Datadog ACH); WP E-40 flagged a trivial $42.10 Brex FX fee (< $1,250 CTT) and a missing $34,500 Hudson Yards CAM landlord statement (> $25,000 PM); Acme TB has 1 Cloud Hosting flux note.',
      matchedThreads: toSummary(varThreads),
      sources: collectSources(varThreads),
    };
  }

  if (
    lower.includes('lease') ||
    lower.includes('842') ||
    lower.includes('kensington') ||
    lower.includes('msa') ||
    lower.includes('clause') ||
    lower.includes('4.2')
  ) {
    const contractThreads = inboxThreads.filter(
      (t) => t.id === 'mail-kensington-rollforward' || t.id === 'mail-legal-msa'
    );
    return {
      id: `inbox-ask-${globalAskSeq}`,
      question: q,
      answer:
        'Contracts & technical schedules in Inbox: Kensington Retail executed a 3-year Regent Street lease extension ($98,500/quarter ROU run-rate reconciled to Xero); Claire Dubois sent executed Acme Global MSA redlines locking §4.2 data-protection super-cap at 3x TTM fees and §2.4 subprocessor notice at 30 days.',
      matchedThreads: toSummary(contractThreads),
      sources: collectSources(contractThreads),
    };
  }

  const tokens = lower.split(/[^a-z0-9§.]+/).filter((tok) => tok.length >= 2);
  const scored = inboxThreads
    .map((thread) => {
      const hay = `${thread.senderName} ${thread.subject} ${thread.snippet} ${
        thread.intelligence?.verdict ?? ''
      }`.toLowerCase();
      const hits = tokens.reduce((acc, tok) => (hay.includes(tok) ? acc + 1 : acc), 0);
      return { thread, hits };
    })
    .filter((entry) => entry.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .map((entry) => entry.thread);

  const matched = scored.length > 0 ? scored.slice(0, 4) : inboxThreads.slice(0, 3);
  const digest = matched
    .map((t) => `${t.senderName}: ${t.intelligence?.verdict ?? t.snippet}`)
    .join(' · ');

  return {
    id: `inbox-ask-${globalAskSeq}`,
    question: q,
    answer:
      scored.length > 0
        ? `Found ${scored.length} matching thread${scored.length === 1 ? '' : 's'}: ${digest}`
        : `Across ${inboxThreads.length} inbox threads (${inboxThreads.filter((t) => t.unread).length} unread): ${digest}`,
    matchedThreads: toSummary(matched),
    sources: collectSources(matched),
  };
}

export const INITIAL_MAIL_THREADS: ReadonlyArray<MailThreadItem> = [
  {
    id: 'mail-hmrc-ct600',
    folder: 'inbox',
    senderName: 'HMRC Corporation Tax Gateway',
    senderInitials: 'HM',
    senderEmail: 'no-reply@tax.service.gov.uk',
    avatarColor: '#00703C',
    toList: 'Elena Carter <e.carter@cartervance.co.uk>',
    ccList: 'Corporation Tax Desk <ct@cartervance.co.uk>',
    subject: 'MTD CT600 & Schedule M-1 Computation Ready for Partner Sign-Off (UTR 4918204110)',
    snippet: 'Acme Holdings Ltd period ending 30 Nov 2026 — taxable profit £1,648,400 reconciled; submission window closes 30 Nov.',
    bodyParagraphs: [
      'Agent Services Account reference ASA-88412-UK: Draft Corporation Tax computation and book-to-tax schedule for Acme Holdings Ltd have passed Making Tax Digital schema validation.',
      'Reconciled taxable profit stands at $1,648,400 after permanent IRC/CTA disallowances (-$5,600) and accelerated capital allowances (-$142,000). Review the attached tax bridge workpaper before transmitting final iXBRL tags.',
    ],
    timeShort: '10:42',
    fullTimestamp: 'Tue 24 Nov 2026, 10:42',
    dateGroup: 'Today',
    unread: true,
    starred: true,
    flagged: true,
    gmailCategory: 'filings',
    gmailLabel: { text: 'HMRC & Tax', tone: 'hmrc' },
    outlook: {
      bucket: 'focused',
      importance: 'high',
      mentionedMe: true,
      followUpDue: 'Follow up by Fri 28 Nov, 17:00',
      sensitivity: 'Confidential — Statutory Tax Record',
      retentionPolicy: '7-Year Statutory Tax Retention',
      categoryTag: { label: 'HMRC Deadline', color: 'green' },
      meeting: {
        title: 'Partner Tax Sign-Off & iXBRL Transmission',
        when: 'Thu 26 Nov 2026 · 14:00 – 14:30',
        location: 'Microsoft Teams · Tax Committee',
        rsvp: 'none',
      },
    },
    attachments: [
      {
        id: 'att-tax',
        filename: 'TY2026_Schedule_M1_K1.tax',
        sizeLabel: '64 KB',
        badge: 'TAX',
        pluginRoute: 'tax',
      },
    ],
    intelligence: {
      verdict: 'Taxable income ($1,648,400) ties to Adjusted Trial Balance and Schedule M-1; cleared for partner transmission.',
      reasoning: [
        {
          check: 'Matched UTR 4918204110 obligation period against HMRC Making Tax Digital ASA-88412-UK gateway status.',
          sourceId: 'src-hmrc',
        },
        {
          check: 'Verified Book Net Income ($1,636,500) + permanent diffs (-$5,600) + temporary diffs (+$17,500) = $1,648,400 taxable income.',
          sourceId: 'src-m1',
        },
        {
          check: 'Cross-tied opening book profit directly to November Consolidated Trial Balance (NetSuite / Xero sync).',
          sourceId: 'src-tb-tie',
        },
      ],
      sources: [
        {
          id: 'src-m1',
          label: 'TY2026_Schedule_M1_K1.tax',
          kindLabel: 'WORKPAPER',
          detail: 'Schedule M-1 waterfall & K-1 allocations',
          pluginRoute: 'tax',
        },
        {
          id: 'src-tb-tie',
          label: 'Nov2026_Consolidated_TB.tb',
          kindLabel: 'LEDGER',
          detail: 'Adjusted Book Net Income tie-out',
          pluginRoute: 'tb',
        },
        {
          id: 'src-hmrc',
          label: 'HMRC Making Tax Digital (ASA-88412)',
          kindLabel: 'GATEWAY',
          detail: 'CT600 schema & 30 Nov filing obligation',
          connectorId: 'hmrc-mtd',
        },
      ],
      drafts: {
        standard:
          'Corporation Tax Desk,\n\nI have reviewed the Schedule M-1 book-to-tax bridge for Acme Holdings Ltd (UTR 4918204110). Reconciled taxable profit of $1,648,400 (estimated tax $346,164) ties cleanly to the adjusted Trial Balance, including the -$142,000 accelerated capital allowance deduction.\n\nApproved for iXBRL tagging and HMRC MTD transmission ahead of Thursday’s committee slot.\n\nElena Carter, ACA CPA',
        concise:
          'Confirmed — Schedule M-1 ($1,648,400 taxable profit) ties to the adjusted TB. Cleared to transmit CT600 via HMRC MTD.\n\nElena',
        pushback:
          'Hold HMRC transmission until we attach the signed fixed-asset additions schedule supporting the -$142,000 §168(k) / AIA capital allowance deduction in Schedule M-1.\n\nElena',
      },
      quickPrompts: [
        'Break down the $1,648,400 M-1 tax bridge',
        'Which sources were checked for UTR 4918204110?',
        'Are any Trial Balance flux items blocking filing?',
      ],
    },
  },
  {
    id: 'mail-acme-cfo-tb',
    folder: 'inbox',
    senderName: 'Marcus Vance (Acme CFO)',
    senderInitials: 'MV',
    senderEmail: 'm.vance@acmeholdings.com',
    avatarColor: '#1d4ed8',
    toList: 'Elena Carter <e.carter@cartervance.co.uk>',
    ccList: 'Audit Seniors <audit-team@cartervance.co.uk>',
    subject: 'Nov 2026 Consolidated Trial Balance + Proposed ASC 606 Adjusting Entry',
    snippet: '@Elena Carter uploaded the unadjusted November TB and AJE-2026-042 ($60,058.00) for partner review ahead of board pack.',
    bodyParagraphs: [
      '@Elena Carter — our controller closed the subledgers this morning. Attached is the consolidated November Trial Balance alongside proposed adjusting entry AJE-2026-042 ($45,000 ASC 606 earned subscription release and $15,058 external audit accrual).',
      'Could you verify the flux flags above $25,000 Performance Materiality and approve the NetSuite journal entry gate if everything ties out?',
    ],
    timeShort: '09:18',
    fullTimestamp: 'Tue 24 Nov 2026, 09:18',
    dateGroup: 'Today',
    unread: true,
    starred: true,
    flagged: true,
    gmailCategory: 'primary',
    gmailLabel: { text: 'Urgent Sign-off', tone: 'urgent' },
    outlook: {
      bucket: 'focused',
      importance: 'high',
      mentionedMe: true,
      followUpDue: 'Follow up Today, 18:00',
      sensitivity: 'Confidential — Client Close',
      categoryTag: { label: 'Audit Sign-off', color: 'red' },
    },
    attachments: [
      {
        id: 'att-tb',
        filename: 'Nov2026_Consolidated_TB.tb',
        sizeLabel: '112 KB',
        badge: 'TB',
        pluginRoute: 'tb',
      },
      {
        id: 'att-aje',
        filename: 'AJE-2026-042_NetSuite.aje',
        sizeLabel: '18 KB',
        badge: 'AJE',
        pluginRoute: 'aje',
      },
    ],
    intelligence: {
      verdict: 'AJE-2026-042 balances ($60,058.00 Dr = Cr) and clears deferred revenue & audit accrual cutoff; 1 hosting flux remains under review.',
      reasoning: [
        {
          check: 'Validated AJE-2026-042 debits ($45,000 GL 2400 + $15,058 GL 6510) equal credits ($45,000 GL 4010 + $15,058 GL 2120) with $0.00 variance.',
          sourceId: 'src-aje-gate',
        },
        {
          check: 'Tested Consolidated TB against $25,000 Performance Materiality: ASC 606 release ties to Q4 deferred revenue waterfall.',
          sourceId: 'src-tb-flux',
        },
        {
          check: 'Verified NetSuite OneWorld subsidiary mapping before unlocking ERP write-back.',
          sourceId: 'src-netsuite',
        },
      ],
      sources: [
        {
          id: 'src-aje-gate',
          label: 'AJE-2026-042_NetSuite.aje',
          kindLabel: 'WORKPAPER',
          detail: 'Balanced $60,058.00 adjusting journal',
          pluginRoute: 'aje',
        },
        {
          id: 'src-tb-flux',
          label: 'Nov2026_Consolidated_TB.tb',
          kindLabel: 'WORKPAPER',
          detail: 'GAAP hierarchy & $25k PM flux flags',
          pluginRoute: 'tb',
        },
        {
          id: 'src-netsuite',
          label: 'Oracle NetSuite (US & UK Subs)',
          kindLabel: 'LEDGER',
          detail: 'GL 2400 / 4010 / 6510 / 2120 live balances',
          connectorId: 'netsuite',
        },
      ],
      drafts: {
        standard:
          'Hi Marcus,\n\nWe verified the November Consolidated Trial Balance against our $25,000 Performance Materiality threshold and confirmed that AJE-2026-042 ($60,058.00) is in balance:\n• $45,000.00 Dr Deferred Revenue (2400) / Cr Subscription Revenue (4010) ties to the Q4 ASC 606 schedule.\n• $15,058.00 Dr Audit Fees (6510) / Cr Accrued Expenses (2120) matches engagement progress billing.\n\nI have approved AJE-2026-042 for NetSuite staging so you can lock the board pack.\n\nBest,\nElena',
        concise:
          'Hi Marcus,\n\nAJE-2026-042 ($60,058.00) ties out and clears our $25,000 PM flux check. Approved and staged to NetSuite.\n\nElena',
        pushback:
          'Hi Marcus,\n\nAJE-2026-042 ($60,058.00) is balanced, but before we release the final TB for the board pack please share backup for the Cloud Hosting (GL 5120) prior-period flux exceeding $25,000 PM.\n\nBest,\nElena',
      },
      quickPrompts: [
        'Does AJE-2026-042 clear Performance Materiality?',
        'List all accounts affected by AJE-2026-042',
        'Cite the NetSuite & TB sources used',
      ],
    },
  },
  {
    id: 'mail-dext-vouch',
    folder: 'inbox',
    senderName: 'Hannah Lin (Audit Senior)',
    senderInitials: 'HL',
    senderEmail: 'h.lin@cartervance.co.uk',
    avatarColor: '#7c2d12',
    toList: 'Elena Carter <e.carter@cartervance.co.uk>',
    subject: 'WP E-40 AP Vouching: $42.10 FX Exception on Brex Clearing (#4419)',
    snippet: '3 of 5 high-value OpEx selections tied cleanly; flagged S-02 ($42.10 receipt variance) and S-05 Hudson Yards CAM PBC.',
    bodyParagraphs: [
      'Finished substantive vouching on the 5 AP & OpEx selections ($279,192.10 tested). AWS, Baker McKenzie (1099-NEC), and Gusto payroll tied to the penny.',
      'Selection S-02 (Brex #4419) posted at $3,442.10 in GL 6420 against a $3,400.00 hotel receipt due to an unmapped $42.10 FX fee, and S-05 still needs the signed Hudson Yards CAM schedule.',
    ],
    timeShort: '08:05',
    fullTimestamp: 'Tue 24 Nov 2026, 08:05',
    dateGroup: 'Today',
    unread: true,
    starred: false,
    flagged: false,
    gmailCategory: 'primary',
    gmailLabel: { text: 'Audit PBC', tone: 'audit' },
    outlook: {
      bucket: 'focused',
      mentionedMe: false,
      retentionPolicy: '7-Year Audit Workpaper Policy',
      categoryTag: { label: 'Audit Review', color: 'amber' },
    },
    attachments: [
      {
        id: 'att-vouch',
        filename: 'WP_E40_Vouching_TieOut.wp',
        sizeLabel: '240 KB',
        badge: 'VOUCH',
        pluginRoute: 'vouch',
      },
      {
        id: 'att-pbc',
        filename: 'Acme_Q4_Open_PBC_List.pbc',
        sizeLabel: '14 KB',
        badge: 'PBC',
        pluginRoute: 'pbc',
      },
    ],
    intelligence: {
      verdict: '$42.10 FX fee is trivial (below $1,250 CTT), while missing Hudson Yards CAM schedule ($34,500) requires client PBC follow-up.',
      reasoning: [
        {
          check: 'Compared S-02 ($42.10 Brex FX fee) to Clearly Trivial Threshold ($1,250): pass as immaterial bank fee, reclass optional.',
          sourceId: 'src-wp-e40',
        },
        {
          check: 'Checked S-05 ($34,500 Hudson Yards CAM) against $25,000 Performance Materiality: exceeds PM and requires signed landlord statement.',
          sourceId: 'src-pbc-cam',
        },
        {
          check: 'Verified optical invoice bounding boxes pulled from Dext Prepare OCR feed.',
          sourceId: 'src-dext',
        },
      ],
      sources: [
        {
          id: 'src-wp-e40',
          label: 'WP_E40_Vouching_TieOut.wp',
          kindLabel: 'WORKPAPER',
          detail: '5 OpEx selections ($279,192.10) & OCR bounding boxes',
          pluginRoute: 'vouch',
        },
        {
          id: 'src-pbc-cam',
          label: 'Acme_Q4_Open_PBC_List.pbc',
          kindLabel: 'WORKPAPER',
          detail: 'Open PBC request for Hudson Yards CAM',
          pluginRoute: 'pbc',
        },
        {
          id: 'src-dext',
          label: 'Dext Prepare OCR',
          kindLabel: 'GATEWAY',
          detail: 'Supplier invoice receipt image extraction',
          connectorId: 'dext',
        },
      ],
      drafts: {
        standard:
          'Thanks Hannah — clean work on WP E-40.\n\n1. For S-02 (Brex #4419), the $42.10 FX fee is well below our $1,250 Clearly Trivial Threshold; note it as a non-adjusting FX fee tickmark and close the selection.\n2. For S-05 ($34,500 Hudson Yards CAM), since it exceeds $25,000 PM, trigger the PBC chaser to Acme’s controller today so we can clear occupancy testing before Friday.\n\nElena',
        concise:
          'Pass on S-02 ($42.10 < $1,250 CTT) with an FX tickmark, and send the PBC chaser on S-05 (Hudson Yards CAM > $25k PM).\n\nElena',
        pushback:
          'Please double-check whether Brex #4419 has recurring unmapped FX fees across the full Q4 population in GL 6420 before waiving S-02, and issue the S-05 CAM PBC request immediately.\n\nElena',
      },
      quickPrompts: [
        'Explain the $42.10 FX variance on S-02',
        'Why is S-05 Hudson Yards CAM blocking sign-off?',
        'Show linked Dext and WP E-40 sources',
      ],
    },
  },
  {
    id: 'mail-kensington-rollforward',
    folder: 'inbox',
    senderName: 'Sarah Jenkins (Kensington CFO)',
    senderInitials: 'SJ',
    senderEmail: 's.jenkins@kensingtonretail.co.uk',
    avatarColor: '#be185d',
    toList: 'Elena Carter <e.carter@cartervance.co.uk>',
    ccList: 'Technical Accounting <ifrs@cartervance.co.uk>',
    subject: 'Q4 ASC 842 Flagship Lease Modification & Deferred Revenue Rollforward',
    snippet: 'Signed Regent Street lease extension attached — please confirm updated ROU liability schedule before Friday close.',
    bodyParagraphs: [
      'Hi Elena — we executed the 3-year Regent Street flagship lease extension this morning. Our controller updated the Q4 lease liability & ASC 606 deferred revenue rollforward waterfall.',
      'Can your team check the updated amortization run-rate ($98,500/quarter) and confirm the period-end reclassification entry?',
    ],
    timeShort: '07:41',
    fullTimestamp: 'Tue 24 Nov 2026, 07:41',
    dateGroup: 'Today',
    unread: true,
    starred: false,
    flagged: true,
    gmailCategory: 'primary',
    gmailLabel: { text: 'Urgent Sign-off', tone: 'urgent' },
    outlook: {
      bucket: 'focused',
      mentionedMe: false,
      followUpDue: 'Follow up Thu 26 Nov, 12:00',
      categoryTag: { label: 'Audit Sign-off', color: 'red' },
    },
    attachments: [
      {
        id: 'att-roll',
        filename: 'Q4_ASC842_Lease_Rollforward.roll',
        sizeLabel: '76 KB',
        badge: 'ROLL',
        pluginRoute: 'rollforward',
      },
    ],
    intelligence: {
      verdict: 'Opening + Additions − Amortization = Ending ties across all 4 quarters; $98,500/qtr ROU run-rate verified.',
      reasoning: [
        {
          check: 'Recalculated Opening + Lease Modification Additions − Quarterly Amortization = Ending ROU Liability with zero rollforward breaks.',
          sourceId: 'src-roll',
        },
        {
          check: 'Matched current vs non-current lease liability split to Xero balance sheet accounts.',
          sourceId: 'src-xero-gl',
        },
      ],
      sources: [
        {
          id: 'src-roll',
          label: 'Q4_ASC842_Lease_Rollforward.roll',
          kindLabel: 'WORKPAPER',
          detail: 'ASC 842 & ASC 606 cascading quarterly schedule',
          pluginRoute: 'rollforward',
        },
        {
          id: 'src-xero-gl',
          label: 'Xero Multi-Currency Ledger',
          kindLabel: 'LEDGER',
          detail: 'Regent St ROU asset & lease liability tie-out',
          connectorId: 'xero',
        },
      ],
      drafts: {
        standard:
          'Hi Sarah,\n\nWe verified the Regent Street ASC 842 lease modification rollforward. Opening balances plus the 3-year extension addition reconcile cleanly across Q1–Q4 at the $98,500/quarter amortization run-rate, and the current/non-current liability split ties to Xero.\n\nCleared to post your Friday close reclassification entry.\n\nBest,\nElena',
        concise:
          'Hi Sarah — confirmed, the ASC 842 Regent Street rollforward ($98,500/qtr run-rate) ties cleanly. Good to post for Friday close.\n\nElena',
        pushback:
          'Hi Sarah — the rollforward math ties at $98,500/qtr, but please share the incremental borrowing rate (IBR) memo used to remeasure the 3-year Regent Street extension so we can archive it in our audit file.\n\nBest,\nElena',
      },
      quickPrompts: [
        'Does the ASC 842 rollforward balance across quarters?',
        'What IBR documentation should we request?',
      ],
    },
  },
  {
    id: 'mail-chase-recon',
    folder: 'inbox',
    senderName: 'Open Banking Treasury Feed',
    senderInitials: 'OB',
    senderEmail: 'feeds@openbanking-ais.co.uk',
    avatarColor: '#0f766e',
    toList: 'CAS Outsourced Controller <cas@cartervance.co.uk>',
    subject: 'Chase Operating #4821 Cutoff Feed: 142 Auto-Matched, 4 Unreconciled ($3,442.10)',
    snippet: 'Automated bank-to-NetSuite matching completed at 97.3% match rate; 4 items require timing match or fee AJE.',
    bodyParagraphs: [
      'Direct AIS bank feed for Chase Operating #4821 imported 146 November statement lines ($1,418,920.00 matched automatically against NetSuite GL 1010).',
      'Four exceptions remain open: Global Corp wire +$12,500.00, Stripe payout fee -$42.10, lockbox deposit in transit -$8,400.00, and duplicate Datadog ACH -$615.80.',
    ],
    timeShort: 'Yesterday',
    fullTimestamp: 'Mon 23 Nov 2026, 17:45',
    dateGroup: 'Yesterday',
    unread: true,
    starred: false,
    flagged: false,
    gmailCategory: 'updates',
    gmailLabel: { text: 'Billing & ERP', tone: 'erp' },
    outlook: {
      bucket: 'other',
      categoryTag: { label: 'Bank Feeds', color: 'blue' },
    },
    attachments: [
      {
        id: 'att-recon',
        filename: 'Chase_4821_Nov2026.recon',
        sizeLabel: '88 KB',
        badge: 'RECON',
        pluginRoute: 'recon',
      },
    ],
    intelligence: {
      verdict: '97.3% auto-matched; 2 timing items clear Dec 1, -$42.10 needs Stripe fee AJE, and -$615.80 Datadog ACH is a duplicate debit.',
      reasoning: [
        {
          check: 'Verified 142 statement lines ($1,418,920.00) matched 1-to-1 with NetSuite GL 1010 via FCA Open Banking AIS.',
          sourceId: 'src-recon-wb',
        },
        {
          check: 'Flagged -$615.80 Datadog ACH as duplicate settlement requiring bank recall / vendor credit.',
          sourceId: 'src-ob-feed',
        },
      ],
      sources: [
        {
          id: 'src-recon-wb',
          label: 'Chase_4821_Nov2026.recon',
          kindLabel: 'WORKPAPER',
          detail: 'Two-way reconciliation workbench (4 exceptions)',
          pluginRoute: 'recon',
        },
        {
          id: 'src-ob-feed',
          label: 'Open Banking UK / Plaid AIS',
          kindLabel: 'GATEWAY',
          detail: 'Direct Chase #4821 cutoff statement feed',
          connectorId: 'open-banking',
        },
      ],
      drafts: {
        standard:
          'CAS Team,\n\nOn Chase Operating #4821:\n1. Book the -$42.10 Stripe processing fee AJE to GL 6190.\n2. Carry the +$12,500 Global Corp wire and -$8,400 lockbox deposit as verified timing items.\n3. Initiate ACH dispute / vendor credit notice on the duplicate -$615.80 Datadog debit.\n\nElena',
        concise:
          'Book -$42.10 fee AJE, carry the 2 timing items, and recall the duplicate -$615.80 Datadog ACH.\n\nElena',
        pushback:
          'Hold November cash sign-off until we attach the Dec 1 subsequent bank statement confirming clearance of the -$8,400 lockbox deposit in transit.\n\nElena',
      },
      quickPrompts: [
        'List the 4 unreconciled Chase #4821 items',
        'How should we treat the -$615.80 Datadog ACH?',
      ],
    },
  },
  {
    id: 'mail-legal-msa',
    folder: 'inbox',
    senderName: 'Claire Dubois (General Counsel)',
    senderInitials: 'CD',
    senderEmail: 'c.dubois@acmeholdings.com',
    avatarColor: '#6d28d9',
    toList: 'Elena Carter <e.carter@cartervance.co.uk>',
    subject: 'Executed MSA Data-Residency & Liability Cap Redlines (§2.4 / §4.2)',
    snippet: 'Attached final PDF execution copy and legal redline diff for your permanent audit binder (SOC2 & GDPR verification).',
    bodyParagraphs: [
      'Following your audit committee observation on vendor liability exposure, please find the Master Cloud Services Agreement execution folio and our tracked redlines.',
      'Clause §4.2 locks the data-protection super-cap at 3x trailing twelve-month fees, and §2.4 extends subprocessor prior notice to 30 calendar days.',
    ],
    timeShort: 'Yesterday',
    fullTimestamp: 'Mon 23 Nov 2026, 14:12',
    dateGroup: 'Yesterday',
    unread: false,
    starred: true,
    flagged: false,
    gmailCategory: 'primary',
    gmailLabel: { text: 'Audit PBC', tone: 'audit' },
    outlook: {
      bucket: 'focused',
      sensitivity: 'Legal Privilege & Audit Confidential',
      categoryTag: { label: 'Audit Review', color: 'amber' },
    },
    attachments: [
      {
        id: 'att-pdf',
        filename: 'Acme_Global_MSA_FY27.pdf',
        sizeLabel: '1.4 MB',
        badge: 'PDF',
        pluginRoute: 'pdf',
      },
      {
        id: 'att-diff',
        filename: 'Acme_MSA_v4_Legal_Redline.diff',
        sizeLabel: '32 KB',
        badge: 'DIFF',
        pluginRoute: 'diff',
      },
    ],
    intelligence: {
      verdict: 'Both audit committee observations resolved in executed PDF (§2.4 = 30-day notice; §4.2 = 3x TTM super-cap).',
      reasoning: [
        {
          check: 'Inspected Clause §4.2 on page 2 of Acme_Global_MSA_FY27.pdf: confirmed 3x trailing twelve-month super-cap on data protection & confidentiality.',
          sourceId: 'src-pdf-42',
        },
        {
          check: 'Verified word-level redline in §2.4 replacing "fourteen (14)" with "thirty (30) calendar days" prior subprocessor notice plus objection window.',
          sourceId: 'src-diff-24',
        },
      ],
      sources: [
        {
          id: 'src-pdf-42',
          label: 'Acme_Global_MSA_FY27.pdf · §4.2',
          kindLabel: 'PDF',
          detail: 'Page 2 — 3x TTM Data-Protection Super-Cap',
          pluginRoute: 'pdf',
          anchor: '§4.2',
        },
        {
          id: 'src-pdf-24',
          label: 'Acme_Global_MSA_FY27.pdf · §2.4',
          kindLabel: 'PDF',
          detail: 'Page 1 — 30-Day Subprocessor Notice',
          pluginRoute: 'pdf',
          anchor: '§2.4',
        },
        {
          id: 'src-diff-24',
          label: 'Acme_MSA_v4_Legal_Redline.diff',
          kindLabel: 'WORKPAPER',
          detail: 'Tracked counsel redlines across §2.4 & §4.2',
          pluginRoute: 'diff',
        },
      ],
      drafts: {
        standard:
          'Hi Claire,\n\nThank you — we verified Clause §4.2 (3x TTM data-protection liability super-cap) and Clause §2.4 (30-day prior written subprocessor notice) directly in the executed PDF folio and redline diff.\n\nBoth items satisfy our SOC2 / GDPR vendor governance note and have been indexed into the FY26 permanent audit binder.\n\nBest regards,\nElena',
        concise:
          'Hi Claire — confirmed §4.2 (3x TTM cap) and §2.4 (30-day notice) in the executed MSA PDF. Archived to the permanent audit file.\n\nElena',
        pushback:
          'Hi Claire — §2.4 and §4.2 look clean in the MSA text; please also send Annex B (the current approved subprocessor list) so our IT audit file is complete.\n\nBest,\nElena',
      },
      quickPrompts: [
        'What is our liability cap in Clause §4.2?',
        'Summarize the §2.4 subprocessor redline',
        'Open PDF citations used in reasoning',
      ],
    },
  },
  {
    id: 'mail-karbon-close',
    folder: 'inbox',
    senderName: 'Tom Aldridge (Tax Director)',
    senderInitials: 'TA',
    senderEmail: 't.aldridge@cartervance.co.uk',
    avatarColor: '#4338ca',
    toList: 'Elena Carter <e.carter@cartervance.co.uk>',
    subject: 'Partner EQCR Sign-Off Queue: 3 November Audits & R&D Tax Relief Claim',
    snippet: 'Karbon engagement milestones updated — Acme Holdings, Northstar UK, and Vela Bio ready for partner cold review.',
    bodyParagraphs: [
      'All manager review notes on the November close cycle have been cleared in Caseware and Karbon.',
      'Included the executive QBR margin deck for tomorrow morning’s audit committee walkthrough in case you want to tweak any commentary inline.',
    ],
    timeShort: 'Nov 22',
    fullTimestamp: 'Sun 22 Nov 2026, 16:20',
    dateGroup: 'Last Week',
    unread: false,
    starred: false,
    flagged: false,
    gmailCategory: 'primary',
    gmailLabel: { text: 'Audit PBC', tone: 'audit' },
    outlook: {
      bucket: 'focused',
      categoryTag: { label: 'Audit Review', color: 'amber' },
    },
    attachments: [
      {
        id: 'att-deck',
        filename: 'Audit_Committee_Q4_Deck.deck',
        sizeLabel: '184 KB',
        badge: 'DECK',
        pluginRoute: 'deck',
      },
    ],
    intelligence: {
      verdict: 'All 3 Karbon workflows cleared manager review; Q4 Audit Committee deck KPIs reconcile to TB.',
      reasoning: [
        {
          check: 'Checked Karbon milestone status and Caseware review notes across Acme, Northstar UK, and Vela Bio.',
          sourceId: 'src-karbon',
        },
        {
          check: 'Verified headline ARR & margin figures on Slide 1–3 of Audit_Committee_Q4_Deck.deck.',
          sourceId: 'src-deck',
        },
      ],
      sources: [
        {
          id: 'src-deck',
          label: 'Audit_Committee_Q4_Deck.deck',
          kindLabel: 'WORKPAPER',
          detail: 'Editable 16:9 Audit Committee presentation',
          pluginRoute: 'deck',
        },
        {
          id: 'src-karbon',
          label: 'Karbon Practice Workflow',
          kindLabel: 'GATEWAY',
          detail: 'Partner EQCR sign-off queue (3 engagements)',
          connectorId: 'karbon',
        },
      ],
      drafts: {
        standard:
          'Thanks Tom — I am working through the EQCR sign-off queue this afternoon and reviewed the Audit Committee deck. Numbers tie cleanly to our November close pack.\n\nElena',
        concise: 'Thanks Tom — reviewing the 3 EQCR binders now; deck looks sharp.\n\nElena',
        pushback:
          'Thanks Tom — before tomorrow’s Audit Committee walkthrough, add a bullet on Slide 2 highlighting the $34,500 Hudson Yards CAM open PBC item.\n\nElena',
      },
      quickPrompts: ['Which engagements are in the EQCR queue?'],
    },
  },
  {
    id: 'mail-natwest-confirm',
    folder: 'inbox',
    senderName: 'NatWest Bank Audit Desk',
    senderInitials: 'NW',
    senderEmail: 'confirmations@natwest.com',
    avatarColor: '#5b21b6',
    toList: 'Elena Carter <e.carter@cartervance.co.uk>',
    subject: 'Standard Bank Audit Confirmation Returned — Northstar UK Sub Ltd (#7710)',
    snippet: 'Direct third-party confirmation of cleared Sterling & USD balances, facility covenants, and zero off-balance-sheet guarantees.',
    bodyParagraphs: [
      'Standard Audit Request confirmation for Northstar UK Sub Ltd as at period end: Sterling current account £842,190.00, revolving facility undrawn (£1,500,000 limit), and no undisclosed charges or letters of credit.',
    ],
    timeShort: 'Nov 21',
    fullTimestamp: 'Sat 21 Nov 2026, 11:05',
    dateGroup: 'Last Week',
    unread: false,
    starred: true,
    flagged: false,
    gmailCategory: 'primary',
    gmailLabel: { text: 'Audit PBC', tone: 'audit' },
    outlook: {
      bucket: 'focused',
      retentionPolicy: '7-Year Audit Workpaper Policy',
      categoryTag: { label: 'Bank Feeds', color: 'blue' },
    },
    attachments: [],
    intelligence: {
      verdict: 'Confirmed £842,190.00 cash balance & £1.5M undrawn RCF match Northstar UK lead schedule with £0.00 variance.',
      reasoning: [
        {
          check: 'Tied £842,190.00 NatWest confirmation directly to Xero / Caseware cash lead schedule (Account #7710).',
          sourceId: 'src-caseware',
        },
        {
          check: 'Confirmed zero charges, guarantees, or letters of credit requiring FRS 102 contingent liability disclosure.',
          sourceId: 'src-chs',
        },
      ],
      sources: [
        {
          id: 'src-caseware',
          label: 'Caseware Cash Lead Schedule',
          kindLabel: 'GATEWAY',
          detail: 'Northstar UK Sub #7710 cash & facility tie-out',
          connectorId: 'caseware',
        },
        {
          id: 'src-chs',
          label: 'Companies House Charges Register',
          kindLabel: 'GATEWAY',
          detail: 'Verified zero unregistered charges (#09481722)',
          connectorId: 'companies-house',
        },
      ],
      drafts: {
        standard:
          'Audit Confirmations Desk,\n\nConfirming receipt of the completed Standard Bank Audit Confirmation for Northstar UK Sub Ltd (#7710). No follow-up queries required.\n\nRegards,\nElena Carter',
        concise: 'Received and tied out — thank you.\n\nElena Carter',
        pushback:
          'Please also confirm the accrued commitment fee balance as at 31 March 2026 on the £1,500,000 undrawn revolving facility.\n\nRegards,\nElena Carter',
      },
      quickPrompts: ['Are there any contingent liabilities or charges?'],
    },
  },
  {
    id: 'mail-companies-house',
    folder: 'inbox',
    senderName: 'Companies House Filing Service',
    senderInitials: 'CH',
    senderEmail: 'ewf@companieshouse.gov.uk',
    avatarColor: '#1D70B8',
    toList: 'Company Secretarial <cosec@cartervance.co.uk>',
    subject: 'Accepted: AA01 & Full iXBRL Statutory Accounts — Northstar UK Sub Ltd (09481722)',
    snippet: 'Submission 09481722-2026-AA has been accepted and placed on the public register; no further action required.',
    bodyParagraphs: [
      'Companies House confirms receipt and acceptance of full statutory iXBRL accounts for Northstar UK Sub Ltd (Company No. 09481722) for the period ended 31 March 2026.',
    ],
    timeShort: 'Nov 20',
    fullTimestamp: 'Fri 20 Nov 2026, 11:30',
    dateGroup: 'Last Week',
    unread: false,
    starred: false,
    flagged: false,
    gmailCategory: 'filings',
    gmailLabel: { text: 'HMRC & Tax', tone: 'hmrc' },
    outlook: {
      bucket: 'other',
      categoryTag: { label: 'HMRC Deadline', color: 'green' },
    },
    attachments: [],
    intelligence: {
      verdict: 'Statutory iXBRL filing accepted (#09481722-2026-AA); engagement milestone can be closed.',
      reasoning: [
        {
          check: 'Verified submission reference 09481722-2026-AA on Companies House public register stream.',
          sourceId: 'src-ch-api',
        },
      ],
      sources: [
        {
          id: 'src-ch-api',
          label: 'Companies House UK (09481722)',
          kindLabel: 'GATEWAY',
          detail: 'AA01 & iXBRL statutory filing acceptance',
          connectorId: 'companies-house',
        },
      ],
      drafts: {
        standard:
          'CoSec Team — please archive the Companies House acceptance receipt (09481722-2026-AA) to Northstar UK’s permanent statutory binder and mark the Karbon deliverable complete.\n\nElena',
        concise: 'Archive receipt 09481722-2026-AA and close the Karbon task.\n\nElena',
        pushback: 'Please forward the stamped public-register PDF copy to Northstar UK’s CFO.\n\nElena',
      },
      quickPrompts: ['Confirm filing reference for Northstar UK'],
    },
  },
  {
    id: 'mail-xero-digest',
    folder: 'inbox',
    senderName: 'Xero Partner HQ',
    senderInitials: 'XE',
    senderEmail: 'partner-alerts@xero.com',
    avatarColor: '#0284c7',
    toList: 'Elena Carter <e.carter@cartervance.co.uk>',
    subject: 'Weekly Client Bank Feed Health: 38 of 39 Client Organisations Active',
    snippet: '1 Open Banking consent renewal due in 9 days for Kensington Retail Ltd; all other ledger feeds green.',
    bodyParagraphs: [
      'Weekly practice digest for Carter & Vance Chartered Accountants: 38 client ledgers synced overnight with zero bank-feed gaps. Kensington Retail Ltd requires FCA 90-day re-authentication before 3 December.',
    ],
    timeShort: 'Nov 19',
    fullTimestamp: 'Thu 19 Nov 2026, 07:00',
    dateGroup: 'Last Week',
    unread: false,
    starred: false,
    flagged: false,
    gmailCategory: 'updates',
    gmailLabel: { text: 'Billing & ERP', tone: 'erp' },
    outlook: {
      bucket: 'other',
      categoryTag: { label: 'Bank Feeds', color: 'blue' },
    },
    attachments: [
      {
        id: 'att-xlsx',
        filename: 'Q4_Revenue_Model.xlsx',
        sizeLabel: '92 KB',
        badge: 'XLSX',
        pluginRoute: 'excel',
      },
    ],
    intelligence: {
      verdict: '38/39 Xero feeds healthy; send 90-day FCA Open Banking re-auth link to Kensington Retail CFO before 3 Dec.',
      reasoning: [
        {
          check: 'Confirmed 38 client Xero ledgers synced through 24 Nov with zero missing statement days.',
          sourceId: 'src-xero-hq',
        },
        {
          check: 'Cross-referenced Q4_Revenue_Model.xlsx forecast sheets against synced ledger totals.',
          sourceId: 'src-xlsx-q4',
        },
      ],
      sources: [
        {
          id: 'src-xlsx-q4',
          label: 'Q4_Revenue_Model.xlsx',
          kindLabel: 'WORKPAPER',
          detail: 'Regional revenue & margin workbook',
          pluginRoute: 'excel',
        },
        {
          id: 'src-xero-hq',
          label: 'Xero Advisor API',
          kindLabel: 'LEDGER',
          detail: '38/39 active client bank feeds',
          connectorId: 'xero',
        },
      ],
      drafts: {
        standard:
          'CAS Team — please send the 90-day FCA Open Banking re-authorization link to Sarah Jenkins at Kensington Retail Ltd so their Barclays/NatWest Xero feed stays uninterrupted past 3 December.\n\nElena',
        concise: 'Trigger the 90-day bank feed renewal link for Kensington Retail before 3 Dec.\n\nElena',
        pushback: 'Check if any other client FCA consents expire between 3 Dec and 15 Dec so we batch the renewal notices.\n\nElena',
      },
      quickPrompts: ['Which client bank feed needs re-authentication?'],
    },
  },
];
