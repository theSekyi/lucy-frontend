import type { SampleTurnPayload } from '../../core/renderers';

export type PbcStatus = 'overdue' | 'pending' | 'received';

export interface PbcItem {
  readonly id: string;
  readonly code: string;
  readonly requestTitle: string;
  readonly clientOwner: string;
  readonly aging: string;
  readonly status: PbcStatus;
}

export interface PbcTrackerData {
  readonly engagementName: string;
  readonly clientName: string;
  readonly items: ReadonlyArray<PbcItem>;
}

export const PBC_SAMPLE: PbcTrackerData = {
  engagementName: 'Q4 Audit & Close Fieldwork',
  clientName: 'Acme Holdings Corp',
  items: [
    {
      id: 'pbc-1',
      code: 'PBC-04',
      requestTitle: 'Chase #4821 Dec 1–5 Cutoff Bank Statement',
      clientOwner: 'Controller',
      aging: 'Overdue 4d',
      status: 'overdue',
    },
    {
      id: 'pbc-2',
      code: 'PBC-09',
      requestTitle: 'Signed Hudson Yards Suite 810 CAM Escalation Notice',
      clientOwner: 'VP Workplace',
      aging: 'Due in 2d',
      status: 'pending',
    },
    {
      id: 'pbc-3',
      code: 'PBC-12',
      requestTitle: 'Board Minutes Approving Q4 Equity Grants',
      clientOwner: 'General Counsel',
      aging: 'Overdue 2d',
      status: 'overdue',
    },
    {
      id: 'pbc-4',
      code: 'PBC-15',
      requestTitle: 'Executed Baker McKenzie Audit Legal Inquiry Letter',
      clientOwner: 'External Counsel',
      aging: 'Verified Nov 22',
      status: 'received',
    },
  ],
};

export function buildPbcSampleTurn(nextId: (p: string) => string): SampleTurnPayload {
  return {
    prose:
      'Current **PBC (Provided-By-Client) Open-Item Tracker** for Q4 fieldwork — click any status pill to mark support received or send a single consolidated client reminder:',
    artifact: {
      id: nextId('block-pbc'),
      kind: 'pbc-tracker',
      title: 'PBC Open-Item Tracker',
      summary: '3 open requests (2 overdue) · 1 received',
      data: PBC_SAMPLE,
    },
  };
}
