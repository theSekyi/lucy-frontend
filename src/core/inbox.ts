export type GmailCategory = 'primary' | 'updates' | 'filings';
export type OutlookBucket = 'focused' | 'other';
export type MailFolder = 'inbox' | 'starred' | 'sent' | 'drafts' | 'archive';

export interface MailAttachmentLink {
  readonly id: string;
  readonly filename: string;
  readonly sizeLabel: string;
  readonly badge: string;
  readonly pluginRoute: string;
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
  },
];
