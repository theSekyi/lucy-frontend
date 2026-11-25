import {
  ACME_AJE_GATE,
  ACME_AJE_SUMMARY,
  ACME_RECONCILIATION,
  ACME_RECON_SUMMARY,
  ACME_TB_SUMMARY,
  ACME_TRIAL_BALANCE,
  ACME_UK_CT600,
  ACME_VOUCHING,
  ACME_VOUCHING_SUMMARY,
  KENSINGTON_RF_DEFERRED_SUMMARY,
  KENSINGTON_RF_LEASE_SUMMARY,
  VELA_TAX_SUMMARY,
  evaluateJournalEntryTieOut,
  type JournalEntryGateData,
} from './ledger';
import { formatCalendarDate, formatMoney, formatMoneyMinor } from './money';

export type GmailCategory = 'primary' | 'updates' | 'filings';
export type OutlookBucket = 'focused' | 'other';
export type MailFolder = 'inbox' | 'starred' | 'sent' | 'drafts' | 'archive';
export type ReplyDraftTone = 'standard' | 'concise' | 'pushback';
export type AnswerMatchKind = 'answer' | 'partial' | 'no-match';

export interface MailAttachmentLink {
  readonly id: string;
  readonly filename: string;
  readonly sizeLabel: string;
  readonly badge: string;
  readonly pluginRoute: string;
  readonly workpaperId: string;
  readonly blockId: string;
}

export interface MailSourceLink {
  readonly id: string;
  readonly label: string;
  readonly kindLabel: 'PDF' | 'WORKPAPER' | 'LEDGER' | 'GATEWAY';
  readonly detail: string;
  readonly pluginRoute?: string;
  readonly workpaperId?: string;
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
  readonly matchKind: AnswerMatchKind;
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
  readonly categoryTag?: {
    readonly label: string;
    readonly color: 'red' | 'amber' | 'green' | 'blue';
  };
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
  readonly sentAtIso: string;
  readonly timeShort: string;
  readonly fullTimestamp: string;
  readonly dateGroup: 'Today' | 'Yesterday' | 'Last Week';
  readonly unread: boolean;
  readonly starred: boolean;
  readonly flagged: boolean;
  readonly gmailCategory: GmailCategory;
  readonly gmailLabel?: {
    readonly text: string;
    readonly tone: 'hmrc' | 'audit' | 'urgent' | 'erp';
  };
  readonly outlook: OutlookMetadata;
  readonly attachments: ReadonlyArray<MailAttachmentLink>;
  readonly intelligence?: MailIntelligenceBrief;
}

/**
 * Dynamically computes the live verification verdict for a mail thread when an attached
 * workpaper (such as AJE-2026-042) has an active draft or committed revision (fixes D13).
 */
export function resolveLiveMailVerdict(
  thread: MailThreadItem,
  liveBlocksById?: Readonly<Record<string, unknown>>
): string {
  const baseVerdict = thread.intelligence?.verdict ?? '';
  if (!liveBlocksById || thread.id !== 'mail-acme-cfo-tb') {
    return baseVerdict;
  }
  const ajeCandidate = liveBlocksById['blk-acme-aje'] as JournalEntryGateData | undefined;
  if (!ajeCandidate?.lines) return baseVerdict;

  const tie = evaluateJournalEntryTieOut(ajeCandidate.lines);
  const totalFmt = formatMoneyMinor(tie.totalDebitMinor, { currency: ajeCandidate.currency });
  if (!tie.isBalanced) {
    const diffFmt = formatMoneyMinor(Math.abs(tie.imbalanceMinor), {
      currency: ajeCandidate.currency,
    });
    return `${ajeCandidate.entryNumber} is currently out of balance by ${diffFmt} (Dr ≠ Cr) — posting blocked until balanced.`;
  }
  if (ajeCandidate.posted) {
    return `${ajeCandidate.entryNumber} (${totalFmt} Dr = Cr) posted to ${ajeCandidate.erpTarget}${ajeCandidate.approvedBy ? ` by ${ajeCandidate.approvedBy}` : ''}.`;
  }
  return `${ajeCandidate.entryNumber} balances (${totalFmt} Dr = Cr) and clears deferred income & audit accrual cutoff; ${ACME_TB_SUMMARY.flaggedCount} TB flux lines exceed PM.`;
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
    return `Hi ${firstName},\n\nReceived "${thread.subject}" — reviewing the attached schedules against our engagement file now.\n\nBest,\nElena`;
  }
  if (tone === 'pushback') {
    return `Hi ${firstName},\n\nBefore we sign off on "${thread.subject}", please upload the supporting source schedule so we can complete our workpaper tie-out.\n\nBest,\nElena`;
  }
  return `Hi ${firstName},\n\nThank you for sending "${thread.subject}" over. I am reviewing the figures against our workpaper binder and will confirm sign-off once verified.\n\nBest regards,\nElena Carter`;
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

  const pmGbp = formatMoney(ACME_TRIAL_BALANCE.materialityThreshold, {
    currency: 'GBP',
    decimals: 0,
  });
  const ajeTotalGbp = formatMoneyMinor(ACME_AJE_SUMMARY.totalDebitMinor, { currency: 'GBP' });
  const reconVarGbp = formatMoneyMinor(ACME_RECON_SUMMARY.remainingVarianceMinor, {
    currency: 'GBP',
    signed: true,
  });
  const ctTaxableGbp = formatMoneyMinor(ACME_UK_CT600.taxableProfitMinor, {
    currency: 'GBP',
    decimals: 0,
  });
  const velaTaxableUsd = formatMoneyMinor(VELA_TAX_SUMMARY.taxableMinor, {
    currency: 'USD',
    decimals: 0,
  });

  if (lower.includes('materiality') || lower.includes('flux') || lower.includes('threshold')) {
    return {
      id: `term-${termSeq}`,
      matchKind: 'answer',
      question: q,
      answer:
        thread.id === 'mail-acme-cfo-tb'
          ? `Performance Materiality is ${pmGbp} (5.0% pre-tax benchmark). Consolidated TB shows ${ACME_TB_SUMMARY.flaggedCount} accounts exceeding PM; ${ACME_AJE_GATE.entryNumber} (${ajeTotalGbp}) resolves the £45,000 IFRS 15 deferred income cut-off and £15,058 audit accrual (£0.00 imbalance).`
          : `Checked against ${pmGbp} Performance Materiality: ${intel?.verdict ?? thread.snippet}`,
      citations: sources.slice(0, 2),
    };
  }

  if (
    lower.includes('cap') ||
    lower.includes('4.2') ||
    lower.includes('2.4') ||
    lower.includes('clause') ||
    lower.includes('liability')
  ) {
    const clauseCitations = sources.filter(
      (s) => s.anchor || s.pluginRoute === 'pdf' || s.pluginRoute === 'diff'
    );
    return {
      id: `term-${termSeq}`,
      matchKind: 'answer',
      question: q,
      answer:
        'Clause §4.2 sets the data-protection & confidentiality super-cap at 3x trailing twelve-month (TTM) fees, while §2.4 extends prior written subprocessor notice from 14 days to 30 calendar days in the executed v4 folio.',
      citations: clauseCitations.length > 0 ? clauseCitations : sources,
    };
  }

  if (
    lower.includes('variance') ||
    lower.includes('exception') ||
    lower.includes('fx') ||
    lower.includes('42.10') ||
    lower.includes('unreconciled')
  ) {
    return {
      id: `term-${termSeq}`,
      matchKind: 'answer',
      question: q,
      answer:
        thread.id === 'mail-chase-recon'
          ? `${ACME_RECON_SUMMARY.unresolvedCount} unreconciled items on Barclays #4821 (${reconVarGbp} net variance): Global Corp CHAPS +£12,500.00, Stripe payout fee -£42.10, BACS remittance in transit -£8,400.00, and duplicate Datadog direct debit -£615.80.`
          : 'Isolated £42.10 variance on Selection S-02 (Card #4419): NetSuite GL 6420 recorded £3,442.10 vs Dext hotel receipt of £3,400.00 due to an unmapped card FX fee. Selection S-05 (£34,500.00 Canary Wharf CAM) awaits signed landlord certificate.',
      citations: sources.slice(0, 2),
    };
  }

  if (
    lower.includes('tax') ||
    lower.includes('m-1') ||
    lower.includes('ct600') ||
    lower.includes('utr') ||
    lower.includes('deadline') ||
    lower.includes('allowance')
  ) {
    const isVela = thread.id === 'mail-karbon-close';
    return {
      id: `term-${termSeq}`,
      matchKind: 'answer',
      question: q,
      answer: isVela
        ? `Vela Bio Systems Inc. US Form 1120 Schedule M-1 reconciles $1,420,000 book net income to ${velaTaxableUsd} taxable income (21% federal tax $300,699).`
        : `Acme Holdings Ltd UK CT600 (UTR ${ACME_UK_CT600.utr}, due 30 Nov): Adjusted TB Book Profit £569,884 + CTA 2009 disallowances (+£12,116) − AIA capital allowances (-£42,000) = ${ctTaxableGbp} taxable profit (25% UK CT = £135,000).`,
      citations: sources,
    };
  }

  if (
    lower.includes('source') ||
    lower.includes('where') ||
    lower.includes('link') ||
    lower.includes('cite')
  ) {
    const names = sources.map((s) => `${s.label} (${s.detail})`).join('; ');
    return {
      id: `term-${termSeq}`,
      matchKind: 'answer',
      question: q,
      answer: names
        ? `Linked to ${sources.length} verified records: ${names}.`
        : `Attached schedules: ${thread.attachments.map((a) => a.filename).join(', ') || 'none'}.`,
      citations: sources,
    };
  }

  // Token overlap check against current thread before answering (prevents false answers on "zebra")
  const tokens = lower.split(/[^a-z0-9§.]+/).filter((t) => t.length >= 2);
  const hay = `${thread.senderName} ${thread.subject} ${thread.snippet} ${thread.bodyParagraphs.join(' ')} ${intel?.verdict ?? ''}`.toLowerCase();
  const hitCount = tokens.filter((tok) => hay.includes(tok)).length;

  if (hitCount === 0) {
    return {
      id: `term-${termSeq}`,
      matchKind: 'no-match',
      question: q,
      answer: `No mention of "${q}" in this thread from ${thread.senderName}. Switch scope to "All inbox" to search across all threads.`,
      citations: [],
    };
  }

  return {
    id: `term-${termSeq}`,
    matchKind: 'partial',
    question: q,
    answer: intel ? intel.verdict : `${thread.senderName}: ${thread.snippet}`,
    citations: sources,
  };
}

export interface InboxGlobalAnswer {
  readonly id: string;
  readonly matchKind: AnswerMatchKind;
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
        const key = `${src.label}::${src.pluginRoute ?? src.connectorId ?? ''}`;
        if (!seen.has(key)) {
          seen.add(key);
          out.push(src);
        }
      }
    }
    return out.slice(0, 5);
  }

  const ctTaxableGbp = formatMoneyMinor(ACME_UK_CT600.taxableProfitMinor, {
    currency: 'GBP',
    decimals: 0,
  });
  const ajeTotalGbp = formatMoneyMinor(ACME_AJE_SUMMARY.totalDebitMinor, { currency: 'GBP' });
  const reconVarGbp = formatMoneyMinor(ACME_RECON_SUMMARY.remainingVarianceMinor, {
    currency: 'GBP',
    signed: true,
  });
  const velaTaxableUsd = formatMoneyMinor(VELA_TAX_SUMMARY.taxableMinor, {
    currency: 'USD',
    decimals: 0,
  });

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
        : `${unread.length} unread threads require action: (1) HMRC CT600 transmission for Acme Holdings Ltd (${ctTaxableGbp} taxable profit, closes 30 Nov), (2) Acme Consolidated TB (${ACME_TB_SUMMARY.flaggedCount} flux lines > £25,000 PM) + balanced ${ACME_AJE_GATE.entryNumber} (${ajeTotalGbp}), (3) Kensington IFRS 16 Regent Street lease rollforward (£98,500/qtr), (4) WP E-40 £34,500.00 Canary Wharf CAM PBC chaser, and (5) Barclays #4821 cutoff (${reconVarGbp} net variance).`;
    return {
      id: `inbox-ask-${globalAskSeq}`,
      matchKind: 'answer',
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
        t.id === 'mail-karbon-close' ||
        t.id === 'mail-companies-house' ||
        t.id === 'mail-xero-digest'
    );
    return {
      id: `inbox-ask-${globalAskSeq}`,
      matchKind: 'answer',
      question: q,
      answer: `Upcoming statutory & tax deadlines: Acme Holdings Ltd UK CT600 (${ctTaxableGbp} taxable profit, UTR ${ACME_UK_CT600.utr}) closes 30 Nov via HMRC MTD; Vela Bio Systems Inc. US Schedule M-1 (${velaTaxableUsd} taxable income) is due 03 Dec; Kensington Retail FCA 90-day Open Banking consent expires 03 Dec; Northstar UK AA01 & iXBRL accounts (#09481722) are accepted by Companies House.`,
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
    lower.includes('pbc') ||
    lower.includes('e-40')
  ) {
    const varThreads = inboxThreads.filter(
      (t) =>
        t.id === 'mail-chase-recon' ||
        t.id === 'mail-dext-vouch' ||
        t.id === 'mail-acme-cfo-tb'
    );
    return {
      id: `inbox-ask-${globalAskSeq}`,
      matchKind: 'answer',
      question: q,
      answer: `Open variances & PBC items across Inbox: Barclays #4821 has ${ACME_RECON_SUMMARY.unresolvedCount} unreconciled items (${reconVarGbp} net, including a duplicate -£615.80 Datadog direct debit); WP E-40 flagged a £42.10 card FX fee (< £1,250 CTT) and a missing £34,500.00 Canary Wharf Suite 810 CAM certificate (> £25,000 PM); Acme TB has ${ACME_TB_SUMMARY.flaggedCount} flux lines above £25,000 PM.`,
      matchedThreads: toSummary(varThreads),
      sources: collectSources(varThreads),
    };
  }

  if (
    lower.includes('lease') ||
    lower.includes('842') ||
    lower.includes('16') ||
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
      matchKind: 'answer',
      question: q,
      answer:
        'Contracts & lease schedules in Inbox: Kensington Retail Ltd executed a 3-year Regent Street lease extension (£98,500/quarter IFRS 16 ROU amortization reconciled to Xero, £981,000 ending liability); Claire Dubois sent executed Acme Global MSA v4 redlines locking §4.2 data-protection super-cap at 3x TTM fees and §2.4 subprocessor notice at 30 calendar days.',
      matchedThreads: toSummary(contractThreads),
      sources: collectSources(contractThreads),
    };
  }

  const tokens = lower.split(/[^a-z0-9§.]+/).filter((tok) => tok.length >= 2);
  const scored = inboxThreads
    .map((thread) => {
      const hay = `${thread.senderName} ${thread.subject} ${thread.snippet} ${thread.bodyParagraphs.join(' ')} ${
        thread.intelligence?.verdict ?? ''
      }`.toLowerCase();
      const hits = tokens.reduce((acc, tok) => (hay.includes(tok) ? acc + 1 : acc), 0);
      return { thread, hits };
    })
    .filter((entry) => entry.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .map((entry) => entry.thread);

  if (scored.length === 0) {
    return {
      id: `inbox-ask-${globalAskSeq}`,
      matchKind: 'no-match',
      question: q,
      answer: `No inbox threads matched "${q}". Try searching by client (Acme, Kensington, Vela, Northstar), filing (CT600, M-1, iXBRL), account/variance (£42.10, #4821), or contract clause (§4.2).`,
      matchedThreads: [],
      sources: [],
    };
  }

  const matched = scored.slice(0, 4);
  const digest = matched
    .map((t) => `${t.senderName}: ${t.intelligence?.verdict ?? t.snippet}`)
    .join(' · ');

  return {
    id: `inbox-ask-${globalAskSeq}`,
    matchKind: 'partial',
    question: q,
    answer: `Found ${scored.length} matching thread${scored.length === 1 ? '' : 's'}: ${digest}`,
    matchedThreads: toSummary(matched),
    sources: collectSources(matched),
  };
}

// Computed monetary strings for seeded mail threads (zero hand-typed drift)
const CT_BOOK = formatMoneyMinor(ACME_UK_CT600.bookProfitMinor, { currency: 'GBP', decimals: 0 });
const CT_TAXABLE = formatMoneyMinor(ACME_UK_CT600.taxableProfitMinor, {
  currency: 'GBP',
  decimals: 0,
});
const CT_TAX_DUE = formatMoneyMinor(ACME_UK_CT600.corporationTaxMinor, {
  currency: 'GBP',
  decimals: 0,
});
const AJE_TOTAL = formatMoneyMinor(ACME_AJE_SUMMARY.totalDebitMinor, { currency: 'GBP' });
const VOUCH_TOTAL = formatMoneyMinor(ACME_VOUCHING_SUMMARY.totalLedgerMinor, { currency: 'GBP' });
const RECON_VOL = formatMoney(ACME_RECONCILIATION.autoMatchedVolume, { currency: 'GBP' });
const RECON_VAR = formatMoneyMinor(ACME_RECON_SUMMARY.remainingVarianceMinor, {
  currency: 'GBP',
  signed: true,
});
const RF_LEASE_END = formatMoneyMinor(KENSINGTON_RF_LEASE_SUMMARY.endingMinor, {
  currency: 'GBP',
  decimals: 0,
});
const RF_DEF_END = formatMoneyMinor(KENSINGTON_RF_DEFERRED_SUMMARY.endingMinor, {
  currency: 'GBP',
  decimals: 0,
});
const VELA_TAXABLE = formatMoneyMinor(VELA_TAX_SUMMARY.taxableMinor, {
  currency: 'USD',
  decimals: 0,
});

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
    subject: `MTD CT600 Computation Ready for Partner Sign-Off (UTR ${ACME_UK_CT600.utr})`,
    snippet: `Acme Holdings Ltd period ending 30 Nov 2026 — taxable profit ${CT_TAXABLE} reconciled (25% CT ${CT_TAX_DUE}); submission window closes 30 Nov.`,
    bodyParagraphs: [
      `Agent Services Account reference ASA-88412-UK: Draft UK Corporation Tax (CT600) computation for Acme Holdings Ltd has passed Making Tax Digital iXBRL schema validation.`,
      `Adjusted Trial Balance Net Profit of ${CT_BOOK} plus CTA 2009 s.1298 disallowances (+£12,116) less Annual Investment Allowance (-£42,000) reconciles to ${CT_TAXABLE} taxable profit (${CT_TAX_DUE} Corporation Tax at 25%). Verify the underlying Trial Balance before transmitting final iXBRL tags.`,
    ],
    sentAtIso: '2026-11-24T10:42:00Z',
    timeShort: '10:42',
    fullTimestamp: formatCalendarDate('2026-11-24T10:42:00Z', 'weekday-time'),
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
      followUpDue: 'Follow up by Fri 27 Nov, 17:00',
      sensitivity: 'Confidential — Statutory Tax Record',
      retentionPolicy: '7-Year Statutory Tax Retention',
      categoryTag: { label: 'HMRC Deadline', color: 'green' },
      meeting: {
        title: 'Partner CT600 Sign-Off & iXBRL Transmission',
        when: 'Thu 26 Nov 2026 · 14:00 – 14:30',
        location: 'Microsoft Teams · Tax Committee',
        rsvp: 'none',
      },
    },
    attachments: [
      {
        id: 'att-tb-ct600',
        filename: 'Nov2026_Consolidated_TB.tb',
        sizeLabel: '112 KB',
        badge: 'TB',
        pluginRoute: 'tb',
        workpaperId: 'wp-acme-tb',
        blockId: 'blk-acme-tb',
      },
    ],
    intelligence: {
      verdict: `UK CT600 taxable profit (${CT_TAXABLE}, 25% CT ${CT_TAX_DUE}) ties to Acme Adjusted Trial Balance (${CT_BOOK} net profit).`,
      reasoning: [
        {
          check: `Matched UTR ${ACME_UK_CT600.utr} accounting period against HMRC Making Tax Digital ASA-88412-UK gateway status.`,
          sourceId: 'src-hmrc',
        },
        {
          check: `Reconciled Adjusted TB Net Profit (${CT_BOOK}) + CTA 2009 disallowances (+£12,116) − AIA capital allowances (-£42,000) = ${CT_TAXABLE} taxable profit.`,
          sourceId: 'src-tb-tie',
        },
      ],
      sources: [
        {
          id: 'src-tb-tie',
          label: 'Nov2026_Consolidated_TB.tb',
          kindLabel: 'LEDGER',
          detail: `Adjusted Net Profit ${CT_BOOK} tie-out`,
          pluginRoute: 'tb',
          workpaperId: 'wp-acme-tb',
        },
        {
          id: 'src-hmrc',
          label: 'HMRC Making Tax Digital (ASA-88412)',
          kindLabel: 'GATEWAY',
          detail: 'CT600 iXBRL schema & 30 Nov filing obligation',
          connectorId: 'hmrc-mtd',
        },
      ],
      drafts: {
        standard: `Corporation Tax Desk,\n\nI have reviewed the CT600 computation for Acme Holdings Ltd (UTR ${ACME_UK_CT600.utr}). Reconciled taxable profit of ${CT_TAXABLE} (Corporation Tax ${CT_TAX_DUE} at 25%) ties to the Adjusted Trial Balance net profit of ${CT_BOOK}, including the -£42,000 AIA capital allowance claim.\n\nReady for iXBRL tagging ahead of Thursday’s committee slot.\n\nElena Carter, ACA`,
        concise: `Confirmed — CT600 (${CT_TAXABLE} taxable profit, ${CT_TAX_DUE} tax) ties to the Adjusted TB (${CT_BOOK}). Cleared to prepare HMRC MTD submission.\n\nElena`,
        pushback: `Hold HMRC transmission until we attach the signed fixed-asset additions schedule supporting the -£42,000 Annual Investment Allowance claim.\n\nElena`,
      },
      quickPrompts: [
        `Break down the ${CT_TAXABLE} CT600 computation`,
        `Which sources were checked for UTR ${ACME_UK_CT600.utr}?`,
      ],
    },
  },
  {
    id: 'mail-acme-cfo-tb',
    folder: 'inbox',
    senderName: 'Marcus Vance (Acme CFO)',
    senderInitials: 'MV',
    senderEmail: 'm.vance@acmeholdings.co.uk',
    avatarColor: '#1d4ed8',
    toList: 'Elena Carter <e.carter@cartervance.co.uk>',
    ccList: 'Audit Seniors <audit-team@cartervance.co.uk>',
    subject: 'Nov 2026 Consolidated Trial Balance + Proposed IFRS 15 Adjusting Entry',
    snippet: `@Elena Carter uploaded the November TB (${ACME_TB_SUMMARY.flaggedCount} flux flags > £25,000 PM) and ${ACME_AJE_GATE.entryNumber} (${AJE_TOTAL}) for partner review.`,
    bodyParagraphs: [
      `@Elena Carter — our financial controller closed the UK subledgers this morning. Attached is the consolidated November Trial Balance alongside proposed adjusting entry ${ACME_AJE_GATE.entryNumber} (£45,000.00 IFRS 15 earned subscription release and £15,058.00 statutory audit accrual).`,
      `Could you review the ${ACME_TB_SUMMARY.flaggedCount} flux flags above £25,000 Performance Materiality and approve the NetSuite journal entry gate if everything ties out?`,
    ],
    sentAtIso: '2026-11-24T09:18:00Z',
    timeShort: '09:18',
    fullTimestamp: formatCalendarDate('2026-11-24T09:18:00Z', 'weekday-time'),
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
        workpaperId: 'wp-acme-tb',
        blockId: 'blk-acme-tb',
      },
      {
        id: 'att-aje',
        filename: 'AJE-2026-042_NetSuite.aje',
        sizeLabel: '18 KB',
        badge: 'AJE',
        pluginRoute: 'aje',
        workpaperId: 'wp-acme-aje',
        blockId: 'blk-acme-aje',
      },
    ],
    intelligence: {
      verdict: `${ACME_AJE_GATE.entryNumber} balances (${AJE_TOTAL} Dr = Cr) and clears deferred income & audit accrual cutoff; ${ACME_TB_SUMMARY.flaggedCount} TB flux lines exceed £25,000 PM.`,
      reasoning: [
        {
          check: `Validated ${ACME_AJE_GATE.entryNumber} debits (£45,000 GL 2400 + £15,058 GL 6510) equal credits (£45,000 GL 4010 + £15,058 GL 2120) with £0.00 variance.`,
          sourceId: 'src-aje-gate',
        },
        {
          check: `Tested Consolidated TB against £25,000 Performance Materiality: ${ACME_TB_SUMMARY.flaggedCount} accounts flagged; IFRS 15 release ties to ${RF_DEF_END} deferred income schedule.`,
          sourceId: 'src-tb-flux',
        },
        {
          check: 'Verified NetSuite UK entity mapping before unlocking ERP journal write-back.',
          sourceId: 'src-netsuite',
        },
      ],
      sources: [
        {
          id: 'src-aje-gate',
          label: 'AJE-2026-042_NetSuite.aje',
          kindLabel: 'WORKPAPER',
          detail: `Balanced ${AJE_TOTAL} adjusting journal`,
          pluginRoute: 'aje',
          workpaperId: 'wp-acme-aje',
        },
        {
          id: 'src-tb-flux',
          label: 'Nov2026_Consolidated_TB.tb',
          kindLabel: 'WORKPAPER',
          detail: `${ACME_TB_SUMMARY.flaggedCount} flux flags > £25,000 PM`,
          pluginRoute: 'tb',
          workpaperId: 'wp-acme-tb',
        },
        {
          id: 'src-netsuite',
          label: 'Oracle NetSuite (Acme Holdings Ltd)',
          kindLabel: 'LEDGER',
          detail: 'GL 2400 / 4010 / 6510 / 2120 live balances',
          connectorId: 'netsuite',
        },
      ],
      drafts: {
        standard: `Hi Marcus,\n\nI have reviewed the November Consolidated Trial Balance (${ACME_TB_SUMMARY.flaggedCount} flux accounts above £25,000 PM) and confirmed that ${ACME_AJE_GATE.entryNumber} (${AJE_TOTAL}) is in balance:\n• £45,000.00 Dr Deferred Income (2400) / Cr Subscription Revenue (4010) ties to the Q4 IFRS 15 schedule.\n• £15,058.00 Dr Legal & Audit Fees (6510) / Cr Accrued Expenses (2120) matches fieldwork billing.\n\nReady to post ${ACME_AJE_GATE.entryNumber} to NetSuite once final cash cutoff clears.\n\nBest,\nElena`,
        concise: `Hi Marcus,\n\n${ACME_AJE_GATE.entryNumber} (${AJE_TOTAL}) balances cleanly against our £25,000 PM check. Ready for NetSuite posting.\n\nElena`,
        pushback: `Hi Marcus,\n\n${ACME_AJE_GATE.entryNumber} (${AJE_TOTAL}) is balanced, but before we lock the final TB please upload the 01–05 Dec Barclays #4821 cutoff bank statement.\n\nBest,\nElena`,
      },
      quickPrompts: [
        'Does AJE-2026-042 clear Performance Materiality?',
        'List all accounts affected by AJE-2026-042',
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
    subject: 'WP E-40 AP Vouching: £42.10 FX Exception (#4419) & £34,500 Canary Wharf PBC',
    snippet: `${ACME_VOUCHING_SUMMARY.tiedCount} of ${ACME_VOUCHING.items.length} OpEx selections (${VOUCH_TOTAL}) agreed; flagged S-02 (£42.10 FX variance) and S-05 (£34,500.00 CAM PBC).`,
    bodyParagraphs: [
      `Finished substantive vouching on the ${ACME_VOUCHING.items.length} AP & OpEx selections (${VOUCH_TOTAL} tested). AWS UK, Baker McKenzie LLP, and UK Payroll tied to the penny.`,
      `Selection S-02 (Card #4419) posted at £3,442.10 in GL 6420 against a £3,400.00 hotel receipt due to an unmapped £42.10 FX fee, and S-05 (£34,500.00 Canary Wharf Suite 810 service charge) awaits the signed landlord certificate.`,
    ],
    sentAtIso: '2026-11-24T08:05:00Z',
    timeShort: '08:05',
    fullTimestamp: formatCalendarDate('2026-11-24T08:05:00Z', 'weekday-time'),
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
        workpaperId: 'wp-acme-vouch',
        blockId: 'blk-acme-vouch',
      },
      {
        id: 'att-pbc',
        filename: 'Acme_Q4_Open_PBC_List.pbc',
        sizeLabel: '14 KB',
        badge: 'PBC',
        pluginRoute: 'pbc',
        workpaperId: 'wp-acme-pbc',
        blockId: 'blk-acme-pbc',
      },
    ],
    intelligence: {
      verdict:
        '£42.10 FX fee is trivial (below £1,250 CTT), while missing Canary Wharf Suite 810 certificate (£34,500.00) exceeds £25,000 PM and blocks sign-off.',
      reasoning: [
        {
          check:
            'Compared S-02 (£42.10 card FX fee) to Clearly Trivial Threshold (£1,250): immaterial bank fee.',
          sourceId: 'src-wp-e40',
        },
        {
          check:
            'Checked S-05 (£34,500.00 Canary Wharf Suite 810 CAM) against £25,000 Performance Materiality: exceeds PM and requires signed landlord statement.',
          sourceId: 'src-pbc-cam',
        },
        {
          check: 'Verified invoice totals pulled from Dext Prepare OCR feed.',
          sourceId: 'src-dext',
        },
      ],
      sources: [
        {
          id: 'src-wp-e40',
          label: 'WP_E40_Vouching_TieOut.wp',
          kindLabel: 'WORKPAPER',
          detail: `5 OpEx selections (${VOUCH_TOTAL})`,
          pluginRoute: 'vouch',
          workpaperId: 'wp-acme-vouch',
        },
        {
          id: 'src-pbc-cam',
          label: 'Acme_Q4_Open_PBC_List.pbc',
          kindLabel: 'WORKPAPER',
          detail: 'Open PBC-09 for £34,500 Canary Wharf CAM',
          pluginRoute: 'pbc',
          workpaperId: 'wp-acme-pbc',
        },
        {
          id: 'src-dext',
          label: 'Dext Prepare OCR',
          kindLabel: 'GATEWAY',
          detail: 'Supplier invoice extraction',
          connectorId: 'dext',
        },
      ],
      drafts: {
        standard:
          'Thanks Hannah — good catch on WP E-40.\n\n1. For S-02 (Card #4419), £42.10 is well below our £1,250 Clearly Trivial Threshold; document it as a non-adjusting FX fee.\n2. For S-05 (£34,500.00 Canary Wharf CAM), since it exceeds £25,000 PM, send the PBC-09 reminder today and hold WP E-40 sign-off until the signed certificate arrives.\n\nElena',
        concise:
          'Document S-02 (£42.10 < £1,250 CTT) as non-adjusting FX, and chase PBC-09 (£34,500 Canary Wharf CAM > £25k PM) before signing off.\n\nElena',
        pushback:
          'Please check whether Card #4419 has recurring unmapped FX fees across Q4 in GL 6420 before waiving S-02, and issue the S-05 CAM PBC reminder today.\n\nElena',
      },
      quickPrompts: [
        'Explain the £42.10 FX variance on S-02',
        'Why is S-05 blocking sign-off?',
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
    subject: 'Q4 IFRS 16 Regent Street Lease Modification & Deferred Income Rollforward',
    snippet: `Signed Regent Street lease extension attached — ending lease liability ${RF_LEASE_END} (£98,500/qtr amortization).`,
    bodyParagraphs: [
      `Hi Elena — we executed the 3-year Regent Street flagship lease extension (£395,000 modification addition). Our controller updated the Q4 IFRS 16 lease liability (${RF_LEASE_END} ending) and IFRS 15 deferred income (${RF_DEF_END} ending) schedules.`,
      'Can your team verify the £98,500/quarter amortization run-rate and confirm the period-end reclassification entry?',
    ],
    sentAtIso: '2026-11-24T07:41:00Z',
    timeShort: '07:41',
    fullTimestamp: formatCalendarDate('2026-11-24T07:41:00Z', 'weekday-time'),
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
        filename: 'FY26_IFRS15_IFRS16_Rollforward.rf',
        sizeLabel: '76 KB',
        badge: 'ROLL',
        pluginRoute: 'rollforward',
        workpaperId: 'wp-kensington-rf',
        blockId: 'blk-kensington-rf',
      },
    ],
    intelligence: {
      verdict: `IFRS 16 Regent Street schedule ties to ${RF_LEASE_END} ending liability (£98,500/qtr run-rate); IFRS 15 deferred income ties to ${RF_DEF_END}.`,
      reasoning: [
        {
          check: `Recalculated Opening (£980,000) + Modification (£395,000) − 4 × £98,500 Amortization = ${RF_LEASE_END} ending lease liability.`,
          sourceId: 'src-roll',
        },
        {
          check: 'Matched current vs non-current lease liability split to Xero balance sheet control accounts.',
          sourceId: 'src-xero-gl',
        },
      ],
      sources: [
        {
          id: 'src-roll',
          label: 'FY26_IFRS15_IFRS16_Rollforward.rf',
          kindLabel: 'WORKPAPER',
          detail: `IFRS 15 (${RF_DEF_END}) & IFRS 16 (${RF_LEASE_END})`,
          pluginRoute: 'rollforward',
          workpaperId: 'wp-kensington-rf',
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
        standard: `Hi Sarah,\n\nI reviewed the Regent Street IFRS 16 lease modification schedule. Opening balance (£980,000) plus the £395,000 extension addition reconciles across Q1–Q4 at £98,500/quarter to ${RF_LEASE_END} ending liability, tying to Xero.\n\nPlease share the signed 5.2% IBR memo so we can complete the audit file before Friday close.\n\nBest,\nElena`,
        concise: `Hi Sarah — IFRS 16 Regent Street rollforward (${RF_LEASE_END} ending, £98,500/qtr) ties to Xero. Please send the 5.2% IBR memo to close out fieldwork.\n\nElena`,
        pushback: `Hi Sarah — the waterfall math ties to ${RF_LEASE_END}, but we need the signed CFO incremental borrowing rate (5.2% IBR) memo before approving the Xero reclassification.\n\nBest,\nElena`,
      },
      quickPrompts: ['Does the IFRS 16 rollforward tie to Xero?'],
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
    subject: `Barclays Operating #4821 Cutoff: ${ACME_RECONCILIATION.autoMatchedCount} Matched, ${ACME_RECON_SUMMARY.unresolvedCount} Unreconciled (${RECON_VAR})`,
    snippet: `Automated bank-to-NetSuite matching completed at 97.3%; ${ACME_RECON_SUMMARY.unresolvedCount} items require timing match or fee AJE.`,
    bodyParagraphs: [
      `Direct AIS bank feed for Barclays Operating #4821 imported 146 November statement lines (${RECON_VOL} matched automatically against NetSuite GL 1010).`,
      `Four exceptions remain open (${RECON_VAR} net variance): Global Corp CHAPS +£12,500.00, Stripe payout fee -£42.10, BACS remittance in transit -£8,400.00, and duplicate Datadog direct debit -£615.80.`,
    ],
    sentAtIso: '2026-11-23T17:45:00Z',
    timeShort: '23 Nov',
    fullTimestamp: formatCalendarDate('2026-11-23T17:45:00Z', 'weekday-time'),
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
        filename: 'Barclays_4821_Nov2026.recon',
        sizeLabel: '88 KB',
        badge: 'RECON',
        pluginRoute: 'recon',
        workpaperId: 'wp-acme-recon',
        blockId: 'blk-acme-recon',
      },
    ],
    intelligence: {
      verdict: `142 lines (${RECON_VOL}) matched; 2 timing items clear 01 Dec, -£42.10 needs Stripe fee AJE, and -£615.80 Datadog debit is a duplicate.`,
      reasoning: [
        {
          check: `Verified 142 statement lines (${RECON_VOL}) matched 1-to-1 with NetSuite GL 1010 via FCA Open Banking AIS.`,
          sourceId: 'src-recon-wb',
        },
        {
          check: 'Flagged -£615.80 Datadog direct debit as duplicate settlement requiring supplier credit.',
          sourceId: 'src-ob-feed',
        },
      ],
      sources: [
        {
          id: 'src-recon-wb',
          label: 'Barclays_4821_Nov2026.recon',
          kindLabel: 'WORKPAPER',
          detail: `Two-way reconciliation (${ACME_RECON_SUMMARY.unresolvedCount} open)`,
          pluginRoute: 'recon',
          workpaperId: 'wp-acme-recon',
        },
        {
          id: 'src-ob-feed',
          label: 'Open Banking UK AIS',
          kindLabel: 'GATEWAY',
          detail: 'Barclays #4821 cutoff statement feed',
          connectorId: 'open-banking',
        },
      ],
      drafts: {
        standard:
          'CAS Team,\n\nOn Barclays Operating #4821:\n1. Book the -£42.10 Stripe processing fee AJE to GL 6890.\n2. Match the +£12,500.00 Global Corp CHAPS and -£8,400.00 BACS remittance once the 01 Dec statement lands.\n3. Request supplier refund confirmation on the duplicate -£615.80 Datadog direct debit.\n\nElena',
        concise:
          'Book -£42.10 fee AJE, verify the 2 timing items on 01 Dec statement, and reclaim the duplicate -£615.80 Datadog debit.\n\nElena',
        pushback:
          'Hold November cash sign-off until we attach the 01–05 Dec cutoff bank statement confirming clearance of the -£8,400.00 deposit in transit.\n\nElena',
      },
      quickPrompts: ['List the 4 unreconciled Barclays #4821 items'],
    },
  },
  {
    id: 'mail-legal-msa',
    folder: 'inbox',
    senderName: 'Claire Dubois (General Counsel)',
    senderInitials: 'CD',
    senderEmail: 'c.dubois@acmeholdings.co.uk',
    avatarColor: '#6d28d9',
    toList: 'Elena Carter <e.carter@cartervance.co.uk>',
    subject: 'Executed MSA v4 Data-Residency & Liability Cap Redlines (§2.4 / §4.2)',
    snippet:
      'Attached executed v4 PDF folio (30-day subprocessor notice in §2.4; 3x TTM cap in §4.2) and tracked redline diff.',
    bodyParagraphs: [
      'Following your audit committee observation on cloud vendor liability exposure, please find the executed Master Cloud Services Agreement (v4) and our tracked redlines.',
      'Clause §4.2 locks the data-protection super-cap at 3x trailing twelve-month fees, and §2.4 extends prior written subprocessor notice from 14 to 30 calendar days.',
    ],
    sentAtIso: '2026-11-23T14:12:00Z',
    timeShort: '23 Nov',
    fullTimestamp: formatCalendarDate('2026-11-23T14:12:00Z', 'weekday-time'),
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
        workpaperId: 'wp-acme-msa-pdf',
        blockId: 'blk-acme-msa-pdf',
      },
      {
        id: 'att-diff',
        filename: 'Acme_MSA_v4_Legal_Redline.diff',
        sizeLabel: '32 KB',
        badge: 'DIFF',
        pluginRoute: 'diff',
        workpaperId: 'wp-acme-msa-diff',
        blockId: 'blk-acme-msa-diff',
      },
    ],
    intelligence: {
      verdict:
        'Executed v4 PDF matches redline diff (§2.4 = 30-day subprocessor notice; §4.2 = 3x TTM super-cap); §9.1 renewal uplift cap remains pending sign-off.',
      reasoning: [
        {
          check:
            'Inspected Clause §4.2 on page 19 of Acme_Global_MSA_FY27.pdf: 3x trailing twelve-month super-cap on data protection & confidentiality.',
          sourceId: 'src-pdf-42',
        },
        {
          check:
            'Verified Clause §2.4 on page 12 reflects the amended thirty (30) calendar days prior written subprocessor notice.',
          sourceId: 'src-diff-24',
        },
      ],
      sources: [
        {
          id: 'src-pdf-42',
          label: 'Acme_Global_MSA_FY27.pdf · §4.2',
          kindLabel: 'PDF',
          detail: 'Page 19 — 3x TTM Data-Protection Super-Cap',
          pluginRoute: 'pdf',
          workpaperId: 'wp-acme-msa-pdf',
          anchor: '§4.2',
        },
        {
          id: 'src-pdf-24',
          label: 'Acme_Global_MSA_FY27.pdf · §2.4',
          kindLabel: 'PDF',
          detail: 'Page 12 — 30-Day Subprocessor Notice',
          pluginRoute: 'pdf',
          workpaperId: 'wp-acme-msa-pdf',
          anchor: '§2.4',
        },
        {
          id: 'src-diff-24',
          label: 'Acme_MSA_v4_Legal_Redline.diff',
          kindLabel: 'WORKPAPER',
          detail: 'Tracked counsel redlines across §2.4, §4.2, §9.1',
          pluginRoute: 'diff',
          workpaperId: 'wp-acme-msa-diff',
        },
      ],
      drafts: {
        standard:
          'Hi Claire,\n\nThank you — Clause §4.2 (3x TTM data-protection super-cap) and Clause §2.4 (30-day subprocessor notice) match in the executed v4 PDF folio. Please confirm once the vendor counter-signs the §9.1 5% renewal cap.\n\nBest regards,\nElena',
        concise:
          'Hi Claire — §4.2 (3x TTM cap) and §2.4 (30-day notice) verified in the v4 PDF. Let me know once §9.1 is accepted.\n\nElena',
        pushback:
          'Hi Claire — §2.4 and §4.2 look clean; please also share Annex B (approved subprocessor list) and final confirmation on §9.1.\n\nBest,\nElena',
      },
      quickPrompts: ['What is our liability cap in Clause §4.2?'],
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
    subject: `EQCR Queue: Acme Audit Deck & Vela Bio US Schedule M-1 (${VELA_TAXABLE})`,
    snippet: `Vela Bio Systems Inc. Form 1120 Schedule M-1 (${VELA_TAXABLE} USD taxable) and Acme Q4 Audit Committee deck ready for partner review.`,
    bodyParagraphs: [
      `Manager review notes on Vela Bio Systems Inc.’s US Form 1120 Schedule M-1 & K-1 bridge ($1,420,000 book net income reconciled to ${VELA_TAXABLE} taxable income at 21% federal rate) are cleared.`,
      'Also attached the Acme Holdings Ltd Q4 Audit Committee deck (£5.64M Q4 recognized revenue; £17.73M FY26) ahead of tomorrow morning’s walkthrough.',
    ],
    sentAtIso: '2026-11-22T16:20:00Z',
    timeShort: '22 Nov',
    fullTimestamp: formatCalendarDate('2026-11-22T16:20:00Z', 'weekday-time'),
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
        id: 'att-tax-vela',
        filename: 'TY2026_Vela_Schedule_M1_K1.tax',
        sizeLabel: '64 KB',
        badge: 'TAX',
        pluginRoute: 'tax',
        workpaperId: 'wp-vela-tax',
        blockId: 'blk-vela-tax',
      },
      {
        id: 'att-deck',
        filename: 'Audit_Committee_Q4_Deck.pptx',
        sizeLabel: '184 KB',
        badge: 'DECK',
        pluginRoute: 'deck',
        workpaperId: 'wp-acme-deck',
        blockId: 'blk-acme-deck',
      },
    ],
    intelligence: {
      verdict: `Vela Bio US Schedule M-1 reconciles to ${VELA_TAXABLE} ($300,699 est. federal tax); Acme Audit Committee deck ties to £5.64M Q4 / £17.73M FY26 revenue.`,
      reasoning: [
        {
          check: `Verified Vela Bio Systems Inc. US Form 1120 Schedule M-1 ($1,420,000 book − $5,600 perm + $17,500 temp = ${VELA_TAXABLE}).`,
          sourceId: 'src-vela-tax',
        },
        {
          check:
            'Cross-checked Slide 1–3 of Audit_Committee_Q4_Deck.pptx against Acme Consolidated TB (£569,884 net profit) and CT600 (£540,000 taxable).',
          sourceId: 'src-deck',
        },
      ],
      sources: [
        {
          id: 'src-vela-tax',
          label: 'TY2026_Vela_Schedule_M1_K1.tax',
          kindLabel: 'WORKPAPER',
          detail: `Vela Bio US Sch M-1 (${VELA_TAXABLE})`,
          pluginRoute: 'tax',
          workpaperId: 'wp-vela-tax',
        },
        {
          id: 'src-deck',
          label: 'Audit_Committee_Q4_Deck.pptx',
          kindLabel: 'WORKPAPER',
          detail: 'Acme Q4 Audit Committee Close Pack',
          pluginRoute: 'deck',
          workpaperId: 'wp-acme-deck',
        },
      ],
      drafts: {
        standard: `Thanks Tom — reviewing Vela Bio’s US Schedule M-1 (${VELA_TAXABLE}) and the Acme Audit Committee deck this afternoon.\n\nElena`,
        concise: 'Thanks Tom — reviewing Vela M-1 and the Acme deck now.\n\nElena',
        pushback:
          'Thanks Tom — please confirm Slide 2 highlights the open £34,500 Canary Wharf CAM PBC item before we distribute the deck.\n\nElena',
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
    snippet:
      'Direct third-party confirmation of cleared Sterling balance (£842,190.00), £1.5M undrawn RCF, and zero charges.',
    bodyParagraphs: [
      'Standard Audit Request confirmation for Northstar UK Sub Ltd as at period end: Sterling current account £842,190.00, revolving facility undrawn (£1,500,000 limit), and no undisclosed charges or letters of credit.',
    ],
    sentAtIso: '2026-11-21T11:05:00Z',
    timeShort: '21 Nov',
    fullTimestamp: formatCalendarDate('2026-11-21T11:05:00Z', 'weekday-time'),
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
      verdict:
        'Confirmed £842,190.00 cash balance & £1.5M undrawn RCF match Northstar UK lead schedule with £0.00 variance.',
      reasoning: [
        {
          check:
            'Tied £842,190.00 NatWest confirmation to Northstar UK Sub Ltd cash lead schedule (Account #7710).',
          sourceId: 'src-chs',
        },
      ],
      sources: [
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
          'Audit Confirmations Desk,\n\nConfirming receipt of the Standard Bank Audit Confirmation for Northstar UK Sub Ltd (#7710). No follow-up queries required.\n\nRegards,\nElena Carter',
        concise: 'Received and tied out — thank you.\n\nElena Carter',
        pushback:
          'Please also confirm the accrued commitment fee balance on the £1,500,000 undrawn revolving facility.\n\nRegards,\nElena Carter',
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
    snippet:
      'Submission 09481722-2026-AA has been accepted and placed on the public register; no further action required.',
    bodyParagraphs: [
      'Companies House confirms receipt and acceptance of full statutory iXBRL accounts for Northstar UK Sub Ltd (Company No. 09481722) for the period ended 31 March 2026.',
    ],
    sentAtIso: '2026-11-20T11:30:00Z',
    timeShort: '20 Nov',
    fullTimestamp: formatCalendarDate('2026-11-20T11:30:00Z', 'weekday-time'),
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
      verdict:
        'Statutory iXBRL filing accepted (#09481722-2026-AA); Northstar UK engagement milestone complete.',
      reasoning: [
        {
          check:
            'Verified submission reference 09481722-2026-AA on Companies House public register stream.',
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
          'CoSec Team — archive Companies House acceptance receipt 09481722-2026-AA to Northstar UK’s statutory binder.\n\nElena',
        concise: 'Archive receipt 09481722-2026-AA.\n\nElena',
        pushback: 'Forward the stamped public-register PDF copy to Northstar UK’s CFO.\n\nElena',
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
    snippet:
      '1 Open Banking consent renewal due 03 Dec for Kensington Retail Ltd; all other ledger feeds active.',
    bodyParagraphs: [
      'Weekly practice digest for Carter & Vance Chartered Accountants: 38 client ledgers synced overnight with zero bank-feed gaps. Kensington Retail Ltd requires FCA 90-day re-authentication before 03 December 2026.',
    ],
    sentAtIso: '2026-11-19T07:00:00Z',
    timeShort: '19 Nov',
    fullTimestamp: formatCalendarDate('2026-11-19T07:00:00Z', 'weekday-time'),
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
        workpaperId: 'wp-firm-q4-model',
        blockId: 'blk-firm-q4-model',
      },
    ],
    intelligence: {
      verdict:
        '38/39 Xero feeds active; send 90-day FCA Open Banking re-auth link to Kensington Retail CFO before 03 Dec.',
      reasoning: [
        {
          check:
            'Confirmed 38 client Xero ledgers synced through 24 Nov with zero missing statement days.',
          sourceId: 'src-xero-hq',
        },
        {
          check:
            'Cross-referenced Q4_Revenue_Model.xlsx (£1,636,500 Q4 net practice contribution) against active client billing rosters.',
          sourceId: 'src-xlsx-q4',
        },
      ],
      sources: [
        {
          id: 'src-xlsx-q4',
          label: 'Q4_Revenue_Model.xlsx',
          kindLabel: 'WORKPAPER',
          detail: 'Practice realization & entity forecast (£1.64M)',
          pluginRoute: 'excel',
          workpaperId: 'wp-firm-q4-model',
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
          'CAS Team — please send the 90-day FCA Open Banking re-authorization link to Sarah Jenkins at Kensington Retail Ltd before 03 December.\n\nElena',
        concise:
          'Send the 90-day bank feed renewal link for Kensington Retail before 03 Dec.\n\nElena',
        pushback:
          'Check if any other client FCA consents expire between 03 Dec and 15 Dec so we batch the renewal notices.\n\nElena',
      },
      quickPrompts: ['Which client bank feed needs re-authentication?'],
    },
  },
];
