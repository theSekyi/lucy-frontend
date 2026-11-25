import { createStore, type ReadableStore } from './store';

export type PracticeLine = 'Audit' | 'Tax' | 'CAS';

export type SigningAuthority =
  | 'Partner'
  | 'Director'
  | 'Manager'
  | 'Senior'
  | 'Associate';

export type EngagementStage =
  | 'Intake'
  | 'Fieldwork'
  | 'Review'
  | 'Sign-Off'
  | 'Complete';

export interface FirmMember {
  readonly id: string;
  readonly fullName: string;
  readonly initials: string;
  readonly email: string;
  readonly department: PracticeLine;
  readonly authority: SigningAuthority;
  readonly utilizationPct: number;
  readonly workpapersCompleted: number;
}

export interface FirmEngagement {
  readonly id: string;
  readonly clientName: string;
  readonly deliverable: string;
  readonly practice: PracticeLine;
  readonly ownerId: string;
  readonly stage: EngagementStage;
  readonly progressPct: number;
  readonly dueDateLabel: string;
  readonly atRisk?: boolean;
  readonly pluginRoute?: string;
  readonly anchor?: string;
}

export interface ClientEngagementGroup {
  readonly clientName: string;
  readonly averageProgressPct: number;
  readonly completedCount: number;
  readonly totalCount: number;
  readonly nextDueLabel: string;
  readonly engagements: ReadonlyArray<
    FirmEngagement & {
      readonly ownerName: string;
      readonly ownerInitials: string;
    }
  >;
}

export interface FirmAdminState {
  readonly members: ReadonlyArray<FirmMember>;
  readonly engagements: ReadonlyArray<FirmEngagement>;
}

export interface NewFirmMemberInput {
  readonly fullName: string;
  readonly email: string;
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
}

const STAGE_DEFAULT_PROGRESS: Readonly<Record<EngagementStage, number>> = {
  Intake: 20,
  Fieldwork: 55,
  Review: 80,
  'Sign-Off': 92,
  Complete: 100,
};

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
    members: [
      {
        id: 'mem-elena',
        fullName: 'Elena Carter',
        initials: 'EC',
        email: 'e.carter@cartervance.co.uk',
        department: 'Audit',
        authority: 'Partner',
        utilizationPct: 86,
        workpapersCompleted: 14,
      },
      {
        id: 'mem-tom',
        fullName: 'Tom Aldridge',
        initials: 'TA',
        email: 't.aldridge@cartervance.co.uk',
        department: 'Tax',
        authority: 'Director',
        utilizationPct: 92,
        workpapersCompleted: 22,
      },
      {
        id: 'mem-marcus',
        fullName: 'Marcus Chen',
        initials: 'MC',
        email: 'm.chen@cartervance.co.uk',
        department: 'Audit',
        authority: 'Manager',
        utilizationPct: 88,
        workpapersCompleted: 31,
      },
      {
        id: 'mem-hannah',
        fullName: 'Hannah Lin',
        initials: 'HL',
        email: 'h.lin@cartervance.co.uk',
        department: 'Audit',
        authority: 'Senior',
        utilizationPct: 96,
        workpapersCompleted: 44,
      },
      {
        id: 'mem-priya',
        fullName: 'Priya Nair',
        initials: 'PN',
        email: 'p.nair@cartervance.co.uk',
        department: 'CAS',
        authority: 'Manager',
        utilizationPct: 78,
        workpapersCompleted: 39,
      },
      {
        id: 'mem-lucas',
        fullName: 'Lucas Meyer',
        initials: 'LM',
        email: 'l.meyer@cartervance.co.uk',
        department: 'Tax',
        authority: 'Associate',
        utilizationPct: 64,
        workpapersCompleted: 19,
      },
    ],
    engagements: [
      {
        id: 'eng-acme-ct600',
        clientName: 'Acme Holdings Ltd',
        deliverable: 'CT600 & Schedule M-1 Tax Bridge',
        practice: 'Tax',
        ownerId: 'mem-tom',
        stage: 'Sign-Off',
        progressPct: 92,
        dueDateLabel: '30 Nov',
        atRisk: true,
        pluginRoute: 'tax',
      },
      {
        id: 'eng-acme-audit',
        clientName: 'Acme Holdings Ltd',
        deliverable: 'Nov Consolidated Trial Balance',
        practice: 'Audit',
        ownerId: 'mem-marcus',
        stage: 'Sign-Off',
        progressPct: 90,
        dueDateLabel: '28 Nov',
        atRisk: true,
        pluginRoute: 'tb',
      },
      {
        id: 'eng-acme-vouch',
        clientName: 'Acme Holdings Ltd',
        deliverable: 'WP E-40 AP Substantive Vouching',
        practice: 'Audit',
        ownerId: 'mem-hannah',
        stage: 'Review',
        progressPct: 80,
        dueDateLabel: '02 Dec',
        pluginRoute: 'vouch',
      },
      {
        id: 'eng-kensington-lease',
        clientName: 'Kensington Retail Ltd',
        deliverable: 'Q4 ASC 842 Lease Rollforward',
        practice: 'Audit',
        ownerId: 'mem-hannah',
        stage: 'Fieldwork',
        progressPct: 62,
        dueDateLabel: '04 Dec',
        pluginRoute: 'rollforward',
      },
      {
        id: 'eng-kensington-vat',
        clientName: 'Kensington Retail Ltd',
        deliverable: 'Q4 MTD VAT Return & Forecast',
        practice: 'Tax',
        ownerId: 'mem-lucas',
        stage: 'Fieldwork',
        progressPct: 48,
        dueDateLabel: '07 Dec',
        pluginRoute: 'excel',
      },
      {
        id: 'eng-vela-recon',
        clientName: 'Vela Bio Systems',
        deliverable: 'Chase #4821 Bank Reconciliation',
        practice: 'CAS',
        ownerId: 'mem-priya',
        stage: 'Review',
        progressPct: 85,
        dueDateLabel: '03 Dec',
        pluginRoute: 'recon',
      },
      {
        id: 'eng-vela-aje',
        clientName: 'Vela Bio Systems',
        deliverable: 'Nov Adjusting Journal Gate',
        practice: 'CAS',
        ownerId: 'mem-priya',
        stage: 'Sign-Off',
        progressPct: 95,
        dueDateLabel: '29 Nov',
        pluginRoute: 'aje',
      },
      {
        id: 'eng-northstar-ixbrl',
        clientName: 'Northstar UK Sub Ltd',
        deliverable: 'FRS 102 Statutory Accounts (iXBRL)',
        practice: 'Tax',
        ownerId: 'mem-lucas',
        stage: 'Complete',
        progressPct: 100,
        dueDateLabel: 'Filed',
        pluginRoute: 'pdf',
        anchor: '§4.2',
      },
      {
        id: 'eng-northstar-msa',
        clientName: 'Northstar UK Sub Ltd',
        deliverable: 'Vendor MSA Liability Redline',
        practice: 'Audit',
        ownerId: 'mem-elena',
        stage: 'Complete',
        progressPct: 100,
        dueDateLabel: 'Filed',
        pluginRoute: 'diff',
      },
    ],
  };
}

export function selectClientEngagementGroups(
  state: FirmAdminState
): ReadonlyArray<ClientEngagementGroup> {
  const memberMap = new Map(state.members.map((m) => [m.id, m]));
  const grouped = new Map<string, FirmEngagement[]>();

  for (const eng of state.engagements) {
    const existing = grouped.get(eng.clientName);
    if (existing) existing.push(eng);
    else grouped.set(eng.clientName, [eng]);
  }

  const out: ClientEngagementGroup[] = [];
  for (const [clientName, list] of grouped.entries()) {
    const enriched = list.map((eng) => {
      const owner = memberMap.get(eng.ownerId);
      return {
        ...eng,
        ownerName: owner?.fullName ?? 'Unassigned',
        ownerInitials: owner?.initials ?? '--',
      };
    });
    const avg = Math.round(
      enriched.reduce((sum, item) => sum + item.progressPct, 0) / enriched.length
    );
    const completedCount = enriched.filter((e) => e.stage === 'Complete').length;
    const firstOpen = enriched.find((e) => e.stage !== 'Complete');

    out.push({
      clientName,
      averageProgressPct: avg,
      completedCount,
      totalCount: enriched.length,
      nextDueLabel: firstOpen ? firstOpen.dueDateLabel : 'Complete',
      engagements: enriched,
    });
  }

  return out;
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
        department: input.department,
        authority: input.authority,
        utilizationPct: 0,
        workpapersCompleted: 0,
      };

      store.update((state) => ({
        ...state,
        members: [...state.members, newMember],
      }));
      return id;
    },

    removeMember(memberId) {
      store.update((state) => {
        if (state.members.length <= 1) return state;
        if (!state.members.some((m) => m.id === memberId)) return state;

        const remaining = state.members.filter((m) => m.id !== memberId);
        const fallbackOwner =
          remaining.find((m) => m.authority === 'Partner') ?? remaining[0]!;

        return {
          ...state,
          members: remaining,
          engagements: state.engagements.map((eng) =>
            eng.ownerId === memberId ? { ...eng, ownerId: fallbackOwner.id } : eng
          ),
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
        if (!state.members.some((m) => m.id === nextOwnerId)) return state;
        return {
          ...state,
          engagements: state.engagements.map((eng) =>
            eng.id === engagementId ? { ...eng, ownerId: nextOwnerId } : eng
          ),
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
                progressPct: STAGE_DEFAULT_PROGRESS[nextStage],
                atRisk: nextStage === 'Complete' ? false : eng.atRisk,
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
          state.members.find((m) => m.authority === 'Partner') ?? state.members[0]!;
        const ownerId = state.members.some((m) => m.id === input.ownerId)
          ? input.ownerId
          : partner.id;

        const created: FirmEngagement = {
          id,
          clientName: client,
          deliverable,
          practice: input.practice,
          ownerId,
          stage: 'Intake',
          progressPct: 20,
          dueDateLabel: input.dueDateLabel.trim() || '15 Dec',
          pluginRoute:
            input.practice === 'Tax' ? 'tax' : input.practice === 'CAS' ? 'recon' : 'tb',
        };

        return {
          ...state,
          engagements: [created, ...state.engagements],
        };
      });
      return id;
    },
  };
}

export const defaultFirmAdmin = createFirmAdminController();
