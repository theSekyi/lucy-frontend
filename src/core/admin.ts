import { createStore, type ReadableStore } from './store';

export type PracticeLine = 'Bookkeeping' | 'Audit' | 'Tax';

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

export type MonthCloseStatus = 'closed' | 'in-progress' | 'upcoming';

export interface BookkeepingTask {
  readonly id: string;
  readonly title: string;
  readonly metric: string;
  readonly ownerId: string;
  readonly done: boolean;
  readonly pluginRoute?: string;
}

export interface MonthlyBookkeepingPeriod {
  readonly monthKey: string; // e.g. '2026-11'
  readonly shortLabel: string; // e.g. 'Nov'
  readonly fullLabel: string; // e.g. 'November 2026'
  readonly status: MonthCloseStatus;
  readonly bankMatchPct: number;
  readonly uncategorizedCount: number;
  readonly tasks: ReadonlyArray<BookkeepingTask>;
}

export interface ClientProfile {
  readonly id: string;
  readonly name: string;
  readonly ledger: string;
  readonly yearEnd: string;
  readonly activeMonthKey: string;
  readonly periods: ReadonlyArray<MonthlyBookkeepingPeriod>;
}

export interface EngagementTaskItem {
  readonly id: string;
  readonly title: string;
  readonly done: boolean;
  readonly pluginRoute?: string;
  readonly anchor?: string;
}

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
  readonly clientId: string;
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
  readonly tasks: ReadonlyArray<EngagementTaskItem>;
}

export interface ClientEngagementGroup {
  readonly clientId: string;
  readonly clientName: string;
  readonly ledger: string;
  readonly yearEnd: string;
  readonly currentMonthLabel: string;
  readonly currentMonthStatus: MonthCloseStatus;
  readonly currentMonthProgressPct: number;
  readonly averageProgressPct: number;
  readonly completedCount: number;
  readonly totalCount: number;
  readonly nextDueLabel: string;
  readonly periods: ReadonlyArray<MonthlyBookkeepingPeriod>;
  readonly activeMonthKey: string;
  readonly engagements: ReadonlyArray<
    FirmEngagement & {
      readonly ownerName: string;
      readonly ownerInitials: string;
    }
  >;
}

export interface FirmAdminState {
  readonly clients: ReadonlyArray<ClientProfile>;
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
  toggleEngagementTask: (engagementId: string, taskId: string) => void;
  setActiveBookkeepingMonth: (clientId: string, monthKey: string) => void;
  toggleBookkeepingTask: (clientId: string, monthKey: string, taskId: string) => void;
  toggleBookkeepingMonthLock: (clientId: string, monthKey: string) => void;
  addEngagement: (input: NewEngagementInput) => string | null;
}

const STAGE_DEFAULT_PROGRESS: Readonly<Record<EngagementStage, number>> = {
  Intake: 20,
  Fieldwork: 55,
  Review: 80,
  'Sign-Off': 92,
  Complete: 100,
};

const MONTHS_2026: ReadonlyArray<{ key: string; short: string; full: string }> = [
  { key: '2026-01', short: 'Jan', full: 'January 2026' },
  { key: '2026-02', short: 'Feb', full: 'February 2026' },
  { key: '2026-03', short: 'Mar', full: 'March 2026' },
  { key: '2026-04', short: 'Apr', full: 'April 2026' },
  { key: '2026-05', short: 'May', full: 'May 2026' },
  { key: '2026-06', short: 'Jun', full: 'June 2026' },
  { key: '2026-07', short: 'Jul', full: 'July 2026' },
  { key: '2026-08', short: 'Aug', full: 'August 2026' },
  { key: '2026-09', short: 'Sep', full: 'September 2026' },
  { key: '2026-10', short: 'Oct', full: 'October 2026' },
  { key: '2026-11', short: 'Nov', full: 'November 2026' },
  { key: '2026-12', short: 'Dec', full: 'December 2026' },
];

function buildClientPeriods(
  clientId: string,
  bankLabel: string,
  novConfig: {
    status: MonthCloseStatus;
    bankMatchPct: number;
    uncategorizedCount: number;
    tasksDone: readonly [boolean, boolean, boolean, boolean, boolean];
    apNote: string;
    accrualNote: string;
    tbNote: string;
  }
): ReadonlyArray<MonthlyBookkeepingPeriod> {
  return MONTHS_2026.map((m, idx) => {
    const isPast = idx < 10; // Jan..Oct closed
    const isNov = idx === 10;

    if (isPast) {
      return {
        monthKey: m.key,
        shortLabel: m.short,
        fullLabel: m.full,
        status: 'closed',
        bankMatchPct: 100,
        uncategorizedCount: 0,
        tasks: [
          {
            id: `${clientId}-${m.key}-bank`,
            title: 'Bank & credit card feeds',
            metric: `${bankLabel} · 100% reconciled`,
            ownerId: 'mem-priya',
            done: true,
            pluginRoute: 'recon',
          },
          {
            id: `${clientId}-${m.key}-ap`,
            title: 'AP bills & expense receipts',
            metric: 'All supplier invoices coded',
            ownerId: 'mem-hannah',
            done: true,
            pluginRoute: 'vouch',
          },
          {
            id: `${clientId}-${m.key}-aje`,
            title: 'Payroll, prepayments & accruals',
            metric: 'Recurring journals posted',
            ownerId: 'mem-marcus',
            done: true,
            pluginRoute: 'aje',
          },
          {
            id: `${clientId}-${m.key}-tb`,
            title: 'Trial balance & flux review',
            metric: 'Signed off · $0 variance',
            ownerId: 'mem-elena',
            done: true,
            pluginRoute: 'tb',
          },
          {
            id: `${clientId}-${m.key}-pack`,
            title: 'VAT & management reporting pack',
            metric: 'Published to client',
            ownerId: 'mem-lucas',
            done: true,
            pluginRoute: 'excel',
          },
        ],
      };
    }

    if (isNov) {
      return {
        monthKey: m.key,
        shortLabel: m.short,
        fullLabel: m.full,
        status: novConfig.status,
        bankMatchPct: novConfig.bankMatchPct,
        uncategorizedCount: novConfig.uncategorizedCount,
        tasks: [
          {
            id: `${clientId}-${m.key}-bank`,
            title: 'Bank & credit card feeds',
            metric: `${bankLabel} · ${novConfig.bankMatchPct}% matched (${novConfig.uncategorizedCount} open)`,
            ownerId: 'mem-priya',
            done: novConfig.tasksDone[0],
            pluginRoute: 'recon',
          },
          {
            id: `${clientId}-${m.key}-ap`,
            title: 'AP bills & expense receipts',
            metric: novConfig.apNote,
            ownerId: 'mem-hannah',
            done: novConfig.tasksDone[1],
            pluginRoute: 'vouch',
          },
          {
            id: `${clientId}-${m.key}-aje`,
            title: 'Payroll, prepayments & accruals',
            metric: novConfig.accrualNote,
            ownerId: 'mem-marcus',
            done: novConfig.tasksDone[2],
            pluginRoute: 'aje',
          },
          {
            id: `${clientId}-${m.key}-tb`,
            title: 'Trial balance & flux review',
            metric: novConfig.tbNote,
            ownerId: 'mem-elena',
            done: novConfig.tasksDone[3],
            pluginRoute: 'tb',
          },
          {
            id: `${clientId}-${m.key}-pack`,
            title: 'VAT & management reporting pack',
            metric: novConfig.tasksDone[4] ? 'Issued to CFO' : 'Pending TB lock',
            ownerId: 'mem-lucas',
            done: novConfig.tasksDone[4],
            pluginRoute: 'excel',
          },
        ],
      };
    }

    return {
      monthKey: m.key,
      shortLabel: m.short,
      fullLabel: m.full,
      status: 'upcoming',
      bankMatchPct: 0,
      uncategorizedCount: 0,
      tasks: [
        {
          id: `${clientId}-${m.key}-bank`,
          title: 'Bank & credit card feeds',
          metric: `${bankLabel} · Opens 01 Dec`,
          ownerId: 'mem-priya',
          done: false,
          pluginRoute: 'recon',
        },
        {
          id: `${clientId}-${m.key}-ap`,
          title: 'AP bills & expense receipts',
          metric: 'Dext inbox active',
          ownerId: 'mem-hannah',
          done: false,
          pluginRoute: 'vouch',
        },
        {
          id: `${clientId}-${m.key}-aje`,
          title: 'Payroll, prepayments & accruals',
          metric: 'Scheduled year-end cutoff',
          ownerId: 'mem-marcus',
          done: false,
          pluginRoute: 'aje',
        },
        {
          id: `${clientId}-${m.key}-tb`,
          title: 'Trial balance & flux review',
          metric: 'Not started',
          ownerId: 'mem-elena',
          done: false,
          pluginRoute: 'tb',
        },
        {
          id: `${clientId}-${m.key}-pack`,
          title: 'VAT & management reporting pack',
          metric: 'Due 12 Jan',
          ownerId: 'mem-lucas',
          done: false,
          pluginRoute: 'excel',
        },
      ],
    };
  });
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
    clients: [
      {
        id: 'acme',
        name: 'Acme Holdings Ltd',
        ledger: 'NetSuite',
        yearEnd: '31 Dec',
        activeMonthKey: '2026-11',
        periods: buildClientPeriods('acme', 'Chase #4821', {
          status: 'in-progress',
          bankMatchPct: 97,
          uncategorizedCount: 4,
          tasksDone: [true, true, true, false, false],
          apNote: '42 bills coded · $42.10 Brex FX check',
          accrualNote: 'AJE-2026-042 ($60,058) balanced',
          tbNote: '3 flux lines > $25k materiality',
        }),
      },
      {
        id: 'kensington',
        name: 'Kensington Retail Ltd',
        ledger: 'Xero',
        yearEnd: '31 Mar',
        activeMonthKey: '2026-11',
        periods: buildClientPeriods('kensington', 'Barclays #2290', {
          status: 'in-progress',
          bankMatchPct: 94,
          uncategorizedCount: 6,
          tasksDone: [true, true, false, false, false],
          apNote: '68 store receipts matched via Dext',
          accrualNote: 'Regent St lease ROU remeasurement ($98.5k)',
          tbNote: 'Awaiting lease modification journal',
        }),
      },
      {
        id: 'vela',
        name: 'Vela Bio Systems',
        ledger: 'QuickBooks',
        yearEnd: '31 Dec',
        activeMonthKey: '2026-11',
        periods: buildClientPeriods('vela', 'SVB / Chase #8810', {
          status: 'in-progress',
          bankMatchPct: 99,
          uncategorizedCount: 1,
          tasksDone: [true, true, true, true, false],
          apNote: '19 lab vendor invoices tied',
          accrualNote: 'R&D payroll & clinical accruals posted',
          tbNote: 'Flux cleared · ready for CFO pack',
        }),
      },
      {
        id: 'northstar',
        name: 'Northstar UK Sub Ltd',
        ledger: 'Sage Intacct',
        yearEnd: '31 Mar',
        activeMonthKey: '2026-11',
        periods: buildClientPeriods('northstar', 'NatWest #7710', {
          status: 'closed',
          bankMatchPct: 100,
          uncategorizedCount: 0,
          tasksDone: [true, true, true, true, true],
          apNote: 'All November invoices reconciled',
          accrualNote: 'Intercompany & payroll journals locked',
          tbNote: 'Signed off · £842,190 cash confirmed',
        }),
      },
    ],
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
        department: 'Bookkeeping',
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
        clientId: 'acme',
        clientName: 'Acme Holdings Ltd',
        deliverable: 'FY26 CT600 & Schedule M-1 Return',
        practice: 'Tax',
        ownerId: 'mem-tom',
        stage: 'Sign-Off',
        progressPct: 75,
        dueDateLabel: '30 Nov',
        atRisk: true,
        pluginRoute: 'tax',
        tasks: [
          {
            id: 't-ct-1',
            title: 'Import adjusted Trial Balance from NetSuite ($1,636,500 book profit)',
            done: true,
            pluginRoute: 'tb',
          },
          {
            id: 't-ct-2',
            title: 'Compute IRC §274(n) meals disallowance & -$142k capital allowances',
            done: true,
            pluginRoute: 'tax',
          },
          {
            id: 't-ct-3',
            title: 'Validate HMRC Making Tax Digital iXBRL schema (UTR 4918204110)',
            done: true,
          },
          {
            id: 't-ct-4',
            title: 'Partner final sign-off & HMRC gateway transmission',
            done: false,
            pluginRoute: 'tax',
          },
        ],
      },
      {
        id: 'eng-acme-audit',
        clientId: 'acme',
        clientName: 'Acme Holdings Ltd',
        deliverable: 'FY26 Statutory Financial Audit',
        practice: 'Audit',
        ownerId: 'mem-marcus',
        stage: 'Review',
        progressPct: 67,
        dueDateLabel: '28 Nov',
        atRisk: true,
        pluginRoute: 'tb',
        tasks: [
          {
            id: 't-au-1',
            title: 'Perform Consolidated TB flux analysis ($25,000 Performance Materiality)',
            done: true,
            pluginRoute: 'tb',
          },
          {
            id: 't-au-2',
            title: 'Verify balanced ASC 606 adjusting entry AJE-2026-042 ($60,058)',
            done: true,
            pluginRoute: 'aje',
          },
          {
            id: 't-au-3',
            title: 'Vouch 5 high-value OpEx invoices & collect Hudson Yards CAM PBC',
            done: false,
            pluginRoute: 'vouch',
          },
        ],
      },
      {
        id: 'eng-kensington-lease',
        clientId: 'kensington',
        clientName: 'Kensington Retail Ltd',
        deliverable: 'ASC 842 Flagship Lease Remeasurement',
        practice: 'Audit',
        ownerId: 'mem-hannah',
        stage: 'Fieldwork',
        progressPct: 67,
        dueDateLabel: '04 Dec',
        pluginRoute: 'rollforward',
        tasks: [
          {
            id: 't-ke-1',
            title: 'Extract executed 3-year Regent Street lease extension terms',
            done: true,
            pluginRoute: 'pdf',
          },
          {
            id: 't-ke-2',
            title: 'Rebuild Q1–Q4 ROU asset & liability rollforward ($98,500/qtr)',
            done: true,
            pluginRoute: 'rollforward',
          },
          {
            id: 't-ke-3',
            title: 'Obtain CFO incremental borrowing rate (IBR) memo & post Xero reclass',
            done: false,
            pluginRoute: 'aje',
          },
        ],
      },
      {
        id: 'eng-kensington-vat',
        clientId: 'kensington',
        clientName: 'Kensington Retail Ltd',
        deliverable: 'MTD Q4 VAT Return',
        practice: 'Tax',
        ownerId: 'mem-lucas',
        stage: 'Fieldwork',
        progressPct: 50,
        dueDateLabel: '07 Dec',
        pluginRoute: 'excel',
        tasks: [
          {
            id: 't-kv-1',
            title: 'Reconcile UK store POS output VAT against Xero control account',
            done: true,
            pluginRoute: 'excel',
          },
          {
            id: 't-kv-2',
            title: 'Verify input VAT recovery on Dext supplier receipts & submit MTD',
            done: false,
            pluginRoute: 'vouch',
          },
        ],
      },
      {
        id: 'eng-vela-close',
        clientId: 'vela',
        clientName: 'Vela Bio Systems',
        deliverable: 'R&D Tax Credit & Year-End Tax Provision',
        practice: 'Tax',
        ownerId: 'mem-tom',
        stage: 'Sign-Off',
        progressPct: 67,
        dueDateLabel: '03 Dec',
        pluginRoute: 'tax',
        tasks: [
          {
            id: 't-ve-1',
            title: 'Allocate qualifying clinical R&D wages from Gusto register',
            done: true,
            pluginRoute: 'excel',
          },
          {
            id: 't-ve-2',
            title: 'Tie R&D credit schedule to Schedule M-1 & K-1 partner allocations',
            done: true,
            pluginRoute: 'tax',
          },
          {
            id: 't-ve-3',
            title: 'Partner review & sign-off',
            done: false,
          },
        ],
      },
      {
        id: 'eng-northstar-ixbrl',
        clientId: 'northstar',
        clientName: 'Northstar UK Sub Ltd',
        deliverable: 'FRS 102 Statutory Accounts (iXBRL)',
        practice: 'Tax',
        ownerId: 'mem-lucas',
        stage: 'Complete',
        progressPct: 100,
        dueDateLabel: 'Filed',
        pluginRoute: 'pdf',
        anchor: '§4.2',
        tasks: [
          {
            id: 't-ns-1',
            title: 'Tie NatWest bank audit confirmation (£842,190) to lead schedule',
            done: true,
          },
          {
            id: 't-ns-2',
            title: 'Verify vendor MSA §4.2 3x TTM liability cap & redlines',
            done: true,
            pluginRoute: 'pdf',
            anchor: '§4.2',
          },
          {
            id: 't-ns-3',
            title: 'File AA01 & full iXBRL statutory accounts at Companies House (#09481722)',
            done: true,
          },
        ],
      },
    ],
  };
}

export function selectClientEngagementGroups(
  state: FirmAdminState
): ReadonlyArray<ClientEngagementGroup> {
  const memberMap = new Map(state.members.map((m) => [m.id, m]));

  return state.clients.map((client) => {
    const rawEngs = state.engagements.filter((e) => e.clientId === client.id);
    const enriched = rawEngs.map((eng) => {
      const owner = memberMap.get(eng.ownerId);
      return {
        ...eng,
        ownerName: owner?.fullName ?? 'Unassigned',
        ownerInitials: owner?.initials ?? '--',
      };
    });

    const novPeriod =
      client.periods.find((p) => p.monthKey === '2026-11') ??
      client.periods[client.periods.length - 1]!;
    const bkDone = novPeriod.tasks.filter((t) => t.done).length;
    const bkPct = novPeriod.tasks.length
      ? Math.round((bkDone / novPeriod.tasks.length) * 100)
      : 100;

    const engAvg = enriched.length
      ? Math.round(
          enriched.reduce((sum, item) => sum + item.progressPct, 0) / enriched.length
        )
      : bkPct;

    const overallPct = Math.round((bkPct + engAvg) / 2);
    const completedCount = enriched.filter((e) => e.stage === 'Complete').length;
    const firstOpen = enriched.find((e) => e.stage !== 'Complete');

    return {
      clientId: client.id,
      clientName: client.name,
      ledger: client.ledger,
      yearEnd: client.yearEnd,
      currentMonthLabel: `${novPeriod.shortLabel} Bookkeeping`,
      currentMonthStatus: novPeriod.status,
      currentMonthProgressPct: bkPct,
      averageProgressPct: overallPct,
      completedCount,
      totalCount: enriched.length,
      nextDueLabel: firstOpen ? firstOpen.dueDateLabel : 'Filed',
      periods: client.periods,
      activeMonthKey: client.activeMonthKey,
      engagements: enriched,
    };
  });
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
                tasks:
                  nextStage === 'Complete'
                    ? eng.tasks.map((t) => ({ ...t, done: true }))
                    : eng.tasks,
              }
            : eng
        ),
      }));
    },

    toggleEngagementTask(engagementId, taskId) {
      store.update((state) => ({
        ...state,
        engagements: state.engagements.map((eng) => {
          if (eng.id !== engagementId) return eng;
          const tasks = eng.tasks.map((t) =>
            t.id === taskId ? { ...t, done: !t.done } : t
          );
          const doneCount = tasks.filter((t) => t.done).length;
          const pct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : eng.progressPct;
          const nextStage: EngagementStage =
            pct === 100 ? 'Complete' : pct >= 75 ? 'Sign-Off' : pct >= 50 ? 'Review' : 'Fieldwork';
          return {
            ...eng,
            tasks,
            progressPct: pct,
            stage: nextStage,
            atRisk: nextStage === 'Complete' ? false : eng.atRisk,
          };
        }),
      }));
    },

    setActiveBookkeepingMonth(clientId, monthKey) {
      store.update((state) => ({
        ...state,
        clients: state.clients.map((c) =>
          c.id === clientId ? { ...c, activeMonthKey: monthKey } : c
        ),
      }));
    },

    toggleBookkeepingTask(clientId, monthKey, taskId) {
      store.update((state) => ({
        ...state,
        clients: state.clients.map((client) => {
          if (client.id !== clientId) return client;
          return {
            ...client,
            periods: client.periods.map((period) => {
              if (period.monthKey !== monthKey) return period;
              const tasks = period.tasks.map((t) =>
                t.id === taskId ? { ...t, done: !t.done } : t
              );
              const allDone = tasks.every((t) => t.done);
              return {
                ...period,
                tasks,
                status: allDone ? 'closed' : 'in-progress',
              };
            }),
          };
        }),
      }));
    },

    toggleBookkeepingMonthLock(clientId, monthKey) {
      store.update((state) => ({
        ...state,
        clients: state.clients.map((client) => {
          if (client.id !== clientId) return client;
          return {
            ...client,
            periods: client.periods.map((period) => {
              if (period.monthKey !== monthKey) return period;
              const closing = period.status !== 'closed';
              return {
                ...period,
                status: closing ? 'closed' : 'in-progress',
                tasks: closing
                  ? period.tasks.map((t) => ({ ...t, done: true }))
                  : period.tasks,
              };
            }),
          };
        }),
      }));
    },

    addEngagement(input) {
      const rawClientName = input.clientName.trim();
      const deliverable = input.deliverable.trim();
      if (!rawClientName || !deliverable) return null;

      const id = nextAdminId('eng');
      store.update((state) => {
        const partner =
          state.members.find((m) => m.authority === 'Partner') ?? state.members[0]!;
        const ownerId = state.members.some((m) => m.id === input.ownerId)
          ? input.ownerId
          : partner.id;

        const existingClient = state.clients.find(
          (c) => c.name.toLowerCase() === rawClientName.toLowerCase()
        );
        const clientId =
          existingClient?.id ??
          rawClientName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24);

        const nextClients = existingClient
          ? state.clients
          : [
              ...state.clients,
              {
                id: clientId,
                name: rawClientName,
                ledger: 'Xero',
                yearEnd: '31 Dec',
                activeMonthKey: '2026-11',
                periods: buildClientPeriods(clientId, 'Operating Bank', {
                  status: 'in-progress',
                  bankMatchPct: 90,
                  uncategorizedCount: 2,
                  tasksDone: [true, false, false, false, false],
                  apNote: 'Initial receipt intake',
                  accrualNote: 'Pending setup',
                  tbNote: 'Unadjusted TB imported',
                }),
              },
            ];

        const created: FirmEngagement = {
          id,
          clientId,
          clientName: existingClient ? existingClient.name : rawClientName,
          deliverable,
          practice: input.practice,
          ownerId,
          stage: 'Intake',
          progressPct: 0,
          dueDateLabel: input.dueDateLabel.trim() || '15 Dec',
          pluginRoute:
            input.practice === 'Tax'
              ? 'tax'
              : input.practice === 'Bookkeeping'
                ? 'recon'
                : 'tb',
          tasks: [
            { id: `${id}-t1`, title: 'Client PBC intake & ledger sync', done: false },
            { id: `${id}-t2`, title: 'Substantive workpaper preparation', done: false },
            { id: `${id}-t3`, title: 'Partner review & sign-off', done: false },
          ],
        };

        return {
          ...state,
          clients: nextClients,
          engagements: [created, ...state.engagements],
        };
      });
      return id;
    },
  };
}

export const defaultFirmAdmin = createFirmAdminController();
