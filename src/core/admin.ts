import { createStore, type ReadableStore } from './store';

export type PracticeLine = 'Audit' | 'Tax' | 'CAS';

export type SigningAuthority =
  | 'Partner · ERP & HMRC Sign-Off'
  | 'Director · EQCR & Tax Filing'
  | 'Manager · Workpaper Review'
  | 'Senior · Preparer'
  | 'Associate · Preparer';

export type EngagementStage =
  | 'PBC & Intake'
  | 'Fieldwork'
  | 'Manager Review'
  | 'Partner Sign-Off'
  | 'Filed / Complete';

export interface FirmMember {
  readonly id: string;
  readonly fullName: string;
  readonly initials: string;
  readonly email: string;
  readonly title: string;
  readonly department: PracticeLine;
  readonly authority: SigningAuthority;
  readonly utilizationPct: number;
  readonly workpapersCompleted: number;
  readonly ajesStaged: number;
  readonly lastActiveLabel: string;
}

export interface FirmEngagement {
  readonly id: string;
  readonly clientName: string;
  readonly deliverable: string;
  readonly practice: PracticeLine;
  readonly ownerId: string;
  readonly reviewerId: string;
  readonly stage: EngagementStage;
  readonly dueDateLabel: string;
  readonly atRisk?: boolean;
  readonly lucyProgress: string;
  readonly pluginRoute?: string;
  readonly anchor?: string;
}

export interface FirmAuditLogItem {
  readonly id: string;
  readonly timestamp: string;
  readonly actorName: string;
  readonly clientName: string;
  readonly actionSummary: string;
  readonly sourceLabel: string;
  readonly pluginRoute?: string;
  readonly anchor?: string;
}

export interface FirmGovernancePolicy {
  readonly id: string;
  readonly label: string;
  readonly detail: string;
  readonly enabled: boolean;
}

export interface FirmAdminState {
  readonly firmName: string;
  readonly periodLabel: string;
  readonly members: ReadonlyArray<FirmMember>;
  readonly engagements: ReadonlyArray<FirmEngagement>;
  readonly auditLog: ReadonlyArray<FirmAuditLogItem>;
  readonly policies: ReadonlyArray<FirmGovernancePolicy>;
}

export interface NewFirmMemberInput {
  readonly fullName: string;
  readonly email: string;
  readonly title: string;
  readonly department: PracticeLine;
  readonly authority: SigningAuthority;
}

export interface NewEngagementInput {
  readonly clientName: string;
  readonly deliverable: string;
  readonly practice: PracticeLine;
  readonly ownerId: string;
  readonly dueDateLabel: string;
}

export interface FirmAdminController extends ReadableStore<FirmAdminState> {
  addMember: (input: NewFirmMemberInput) => string | null;
  removeMember: (memberId: string) => void;
  updateMemberAuthority: (memberId: string, authority: SigningAuthority) => void;
  reassignEngagement: (engagementId: string, nextOwnerId: string) => void;
  updateEngagementStage: (engagementId: string, nextStage: EngagementStage) => void;
  addEngagement: (input: NewEngagementInput) => string | null;
  togglePolicy: (policyId: string) => void;
}

function computeInitials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'ST'
  );
}

export function createInitialFirmAdminState(): FirmAdminState {
  return {
    firmName: 'Carter & Vance Chartered Accountants',
    periodLabel: 'November 2026 Close & Statutory Cycle',
    members: [
      {
        id: 'mem-elena',
        fullName: 'Elena Carter',
        initials: 'EC',
        email: 'e.carter@cartervance.co.uk',
        title: 'Managing Partner',
        department: 'Audit',
        authority: 'Partner · ERP & HMRC Sign-Off',
        utilizationPct: 86,
        workpapersCompleted: 14,
        ajesStaged: 6,
        lastActiveLabel: 'Online now',
      },
      {
        id: 'mem-tom',
        fullName: 'Tom Aldridge',
        initials: 'TA',
        email: 't.aldridge@cartervance.co.uk',
        title: 'Tax Director (CTA)',
        department: 'Tax',
        authority: 'Director · EQCR & Tax Filing',
        utilizationPct: 92,
        workpapersCompleted: 22,
        ajesStaged: 3,
        lastActiveLabel: '14m ago',
      },
      {
        id: 'mem-marcus',
        fullName: 'Marcus Chen',
        initials: 'MC',
        email: 'm.chen@cartervance.co.uk',
        title: 'Audit Manager (ACA)',
        department: 'Audit',
        authority: 'Manager · Workpaper Review',
        utilizationPct: 88,
        workpapersCompleted: 31,
        ajesStaged: 9,
        lastActiveLabel: '28m ago',
      },
      {
        id: 'mem-hannah',
        fullName: 'Hannah Lin',
        initials: 'HL',
        email: 'h.lin@cartervance.co.uk',
        title: 'Audit Senior',
        department: 'Audit',
        authority: 'Senior · Preparer',
        utilizationPct: 96,
        workpapersCompleted: 44,
        ajesStaged: 11,
        lastActiveLabel: '6m ago',
      },
      {
        id: 'mem-priya',
        fullName: 'Priya Nair',
        initials: 'PN',
        email: 'p.nair@cartervance.co.uk',
        title: 'CAS Outsourced Controller',
        department: 'CAS',
        authority: 'Manager · Workpaper Review',
        utilizationPct: 78,
        workpapersCompleted: 39,
        ajesStaged: 15,
        lastActiveLabel: '41m ago',
      },
      {
        id: 'mem-lucas',
        fullName: 'Lucas Meyer',
        initials: 'LM',
        email: 'l.meyer@cartervance.co.uk',
        title: 'Tax Associate',
        department: 'Tax',
        authority: 'Associate · Preparer',
        utilizationPct: 64,
        workpapersCompleted: 19,
        ajesStaged: 2,
        lastActiveLabel: '1h ago',
      },
    ],
    engagements: [
      {
        id: 'eng-acme-ct600',
        clientName: 'Acme Holdings Ltd',
        deliverable: 'CT600 & Schedule M-1 / K-1 Tax Bridge',
        practice: 'Tax',
        ownerId: 'mem-tom',
        reviewerId: 'mem-elena',
        stage: 'Partner Sign-Off',
        dueDateLabel: '30 Nov',
        atRisk: true,
        lucyProgress: '$1,648,400 taxable profit tied · iXBRL validated',
        pluginRoute: 'tax',
      },
      {
        id: 'eng-acme-audit',
        clientName: 'Acme Holdings Ltd',
        deliverable: 'Nov Consolidated TB & ASC 606 AJE-042',
        practice: 'Audit',
        ownerId: 'mem-marcus',
        reviewerId: 'mem-elena',
        stage: 'Partner Sign-Off',
        dueDateLabel: '28 Nov',
        atRisk: true,
        lucyProgress: '3 flux flags > $25k PM · $60,058 AJE balanced',
        pluginRoute: 'tb',
      },
      {
        id: 'eng-acme-vouch',
        clientName: 'Acme Holdings Ltd',
        deliverable: 'WP E-40 Substantive AP Vouching',
        practice: 'Audit',
        ownerId: 'mem-hannah',
        reviewerId: 'mem-marcus',
        stage: 'Manager Review',
        dueDateLabel: '02 Dec',
        lucyProgress: '4/5 invoices tied · $42.10 FX variance flagged',
        pluginRoute: 'vouch',
      },
      {
        id: 'eng-kensington-lease',
        clientName: 'Kensington Retail Ltd',
        deliverable: 'Q4 ASC 842 Flagship Lease Rollforward',
        practice: 'Audit',
        ownerId: 'mem-hannah',
        reviewerId: 'mem-elena',
        stage: 'Fieldwork',
        dueDateLabel: '04 Dec',
        lucyProgress: 'Regent St ROU schedule updated ($98.5k/qtr)',
        pluginRoute: 'rollforward',
      },
      {
        id: 'eng-vela-recon',
        clientName: 'Vela Bio Systems',
        deliverable: 'Chase #4821 Bank-to-NetSuite Reconciliation',
        practice: 'CAS',
        ownerId: 'mem-priya',
        reviewerId: 'mem-elena',
        stage: 'Manager Review',
        dueDateLabel: '03 Dec',
        lucyProgress: '142/146 lines auto-matched (97.3%) · 4 open',
        pluginRoute: 'recon',
      },
      {
        id: 'eng-northstar-ixbrl',
        clientName: 'Northstar UK Sub Ltd',
        deliverable: 'FRS 102 Statutory Accounts & NatWest Confirm',
        practice: 'Tax',
        ownerId: 'mem-lucas',
        reviewerId: 'mem-tom',
        stage: 'Filed / Complete',
        dueDateLabel: 'Filed 20 Nov',
        lucyProgress: 'Companies House AA01 accepted (#09481722)',
        pluginRoute: 'pdf',
        anchor: '§4.2',
      },
    ],
    auditLog: [
      {
        id: 'log-1',
        timestamp: '10:42',
        actorName: 'Tom Aldridge',
        clientName: 'Acme Holdings Ltd',
        actionSummary: 'Reconciled CT600 Schedule M-1 ($1,648,400) against HMRC MTD obligations',
        sourceLabel: 'TY2026_Schedule_M1_K1.tax',
        pluginRoute: 'tax',
      },
      {
        id: 'log-2',
        timestamp: '09:24',
        actorName: 'Marcus Chen',
        clientName: 'Acme Holdings Ltd',
        actionSummary: 'Staged balanced NetSuite journal AJE-2026-042 ($60,058.00) for partner gate',
        sourceLabel: 'AJE-2026-042_NetSuite.aje',
        pluginRoute: 'aje',
      },
      {
        id: 'log-3',
        timestamp: '08:11',
        actorName: 'Hannah Lin',
        clientName: 'Acme Holdings Ltd',
        actionSummary: 'Vouched 5 Dext AP selections ($279,192.10); isolated $42.10 Brex FX fee',
        sourceLabel: 'WP_E40_Vouching_TieOut.wp',
        pluginRoute: 'vouch',
      },
      {
        id: 'log-4',
        timestamp: 'Yesterday',
        actorName: 'Priya Nair',
        clientName: 'Vela Bio Systems',
        actionSummary: 'Auto-matched 142 Open Banking lines against GL 1010; queued 4 timing items',
        sourceLabel: 'Chase_4821_Nov2026.recon',
        pluginRoute: 'recon',
      },
      {
        id: 'log-5',
        timestamp: 'Yesterday',
        actorName: 'Elena Carter',
        clientName: 'Acme Holdings Ltd',
        actionSummary: 'Verified MSA §4.2 3x TTM data-protection liability cap for permanent audit file',
        sourceLabel: 'Acme_Global_MSA_FY27.pdf · §4.2',
        pluginRoute: 'pdf',
        anchor: '§4.2',
      },
    ],
    policies: [
      {
        id: 'pol-erp-gate',
        label: 'Partner dual-control on ERP journal write-back',
        detail: 'Blocks Xero, QuickBooks, Sage, and NetSuite posting unless ∑Dr = ∑Cr and a Partner signs off.',
        enabled: true,
      },
      {
        id: 'pol-hmrc-eqcr',
        label: 'EQCR lock on HMRC MTD & Companies House filings',
        detail: 'Requires Director/Partner review stamp before transmitting CT600, VAT, or iXBRL accounts.',
        enabled: true,
      },
      {
        id: 'pol-pii-redaction',
        label: 'Statutory UTR, NI & bank account boundary retention',
        detail: 'Keeps taxpayer identifiers and bank feeds scoped to firm-approved UK/EU model endpoints.',
        enabled: true,
      },
    ],
  };
}

let adminSeq = 300;
function nextAdminId(prefix: string): string {
  adminSeq += 1;
  return `${prefix}-${adminSeq}`;
}

export function createFirmAdminController(
  initialState: FirmAdminState = createInitialFirmAdminState()
): FirmAdminController {
  const store = createStore<FirmAdminState>(initialState);

  return {
    getState: store.getState,
    subscribe: store.subscribe,

    addMember(input) {
      const cleanName = input.fullName.trim();
      const cleanEmail = input.email.trim();
      if (!cleanName || !cleanEmail) return null;

      const id = nextAdminId('mem');
      const newMember: FirmMember = {
        id,
        fullName: cleanName,
        initials: computeInitials(cleanName),
        email: cleanEmail,
        title: input.title.trim() || `${input.department} Staff`,
        department: input.department,
        authority: input.authority,
        utilizationPct: 0,
        workpapersCompleted: 0,
        ajesStaged: 0,
        lastActiveLabel: 'Invited just now',
      };

      store.update((state) => ({
        ...state,
        members: [...state.members, newMember],
        auditLog: [
          {
            id: nextAdminId('log'),
            timestamp: 'Just now',
            actorName: 'Firm Admin',
            clientName: 'Practice Roster',
            actionSummary: `Added ${cleanName} (${input.department} · ${input.authority})`,
            sourceLabel: 'Roster & Access',
          },
          ...state.auditLog,
        ],
      }));
      return id;
    },

    removeMember(memberId) {
      store.update((state) => {
        if (state.members.length <= 1) return state;
        const removed = state.members.find((m) => m.id === memberId);
        if (!removed) return state;

        const remaining = state.members.filter((m) => m.id !== memberId);
        const fallbackOwner =
          remaining.find((m) => m.authority.startsWith('Partner')) ?? remaining[0]!;

        return {
          ...state,
          members: remaining,
          engagements: state.engagements.map((eng) =>
            eng.ownerId === memberId ? { ...eng, ownerId: fallbackOwner.id } : eng
          ),
          auditLog: [
            {
              id: nextAdminId('log'),
              timestamp: 'Just now',
              actorName: 'Firm Admin',
              clientName: 'Practice Roster',
              actionSummary: `Removed ${removed.fullName}; reassigned open engagements to ${fallbackOwner.fullName}`,
              sourceLabel: 'Roster & Access',
            },
            ...state.auditLog,
          ],
        };
      });
    },

    updateMemberAuthority(memberId, authority) {
      store.update((state) => ({
        ...state,
        members: state.members.map((m) =>
          m.id === memberId ? { ...m, authority } : m
        ),
      }));
    },

    reassignEngagement(engagementId, nextOwnerId) {
      store.update((state) => {
        const member = state.members.find((m) => m.id === nextOwnerId);
        const target = state.engagements.find((e) => e.id === engagementId);
        if (!member || !target || target.ownerId === nextOwnerId) return state;

        return {
          ...state,
          engagements: state.engagements.map((eng) =>
            eng.id === engagementId ? { ...eng, ownerId: nextOwnerId } : eng
          ),
          auditLog: [
            {
              id: nextAdminId('log'),
              timestamp: 'Just now',
              actorName: 'Firm Admin',
              clientName: target.clientName,
              actionSummary: `Reassigned "${target.deliverable}" to ${member.fullName}`,
              sourceLabel: target.deliverable,
              pluginRoute: target.pluginRoute,
              anchor: target.anchor,
            },
            ...state.auditLog,
          ],
        };
      });
    },

    updateEngagementStage(engagementId, nextStage) {
      store.update((state) => ({
        ...state,
        engagements: state.engagements.map((eng) =>
          eng.id === engagementId
            ? {
                ...eng,
                stage: nextStage,
                atRisk: nextStage === 'Filed / Complete' ? false : eng.atRisk,
              }
            : eng
        ),
      }));
    },

    addEngagement(input) {
      const client = input.clientName.trim();
      const deliverable = input.deliverable.trim();
      if (!client || !deliverable) return null;

      const id = nextAdminId('eng');
      store.update((state) => {
        const partner =
          state.members.find((m) => m.authority.startsWith('Partner')) ?? state.members[0]!;
        const ownerId = state.members.some((m) => m.id === input.ownerId)
          ? input.ownerId
          : partner.id;

        const created: FirmEngagement = {
          id,
          clientName: client,
          deliverable,
          practice: input.practice,
          ownerId,
          reviewerId: partner.id,
          stage: 'PBC & Intake',
          dueDateLabel: input.dueDateLabel.trim() || '15 Dec',
          lucyProgress: 'Workspace initialized · awaiting client PBC upload',
          pluginRoute: input.practice === 'Tax' ? 'tax' : input.practice === 'CAS' ? 'recon' : 'tb',
        };

        return {
          ...state,
          engagements: [created, ...state.engagements],
        };
      });
      return id;
    },

    togglePolicy(policyId) {
      store.update((state) => ({
        ...state,
        policies: state.policies.map((p) =>
          p.id === policyId ? { ...p, enabled: !p.enabled } : p
        ),
      }));
    },
  };
}

export const defaultFirmAdmin = createFirmAdminController();
