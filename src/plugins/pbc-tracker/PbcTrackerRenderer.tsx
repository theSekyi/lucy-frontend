import { useState } from 'preact/hooks';
import { formatAuditTimestamp } from '../../core/money';
import type { LoadedRenderer, RendererContext } from '../../core/renderers';
import '../accounting.css';
import type { PbcStatus, PbcTrackerData } from './sample';

const PBC_ORDER: PbcStatus[] = ['overdue', 'pending', 'received'];

function PbcInlineCard({ context }: { context: RendererContext<PbcTrackerData> }) {
  const baseline = context.block.data;
  const [localDraft, setLocalDraft] = useState<PbcTrackerData | null>(null);
  const data = context.draft ?? localDraft ?? baseline;

  const openCount = data.items.filter((i) => i.status !== 'received').length;

  function applyDraft(next: PbcTrackerData) {
    if (context.onUpdateDraft) {
      context.onUpdateDraft(next);
    } else {
      setLocalDraft(next);
    }
  }

  function cycleStatus(id: string) {
    applyDraft({
      ...data,
      items: data.items.map((item) => {
        if (item.id !== id) return item;
        const next = PBC_ORDER[(PBC_ORDER.indexOf(item.status) + 1) % PBC_ORDER.length]!;
        return { ...item, status: next };
      }),
    });
  }

  function saveAndSendReminder() {
    const nowIso = new Date().toISOString();
    const updated: PbcTrackerData = {
      ...data,
      lastRemindedAt: openCount > 0 ? nowIso : data.lastRemindedAt,
    };
    const summary = data.items.map((i) => `${i.code} (${i.requestTitle}): ${i.status.toUpperCase()}`);
    context.onCommitRevision?.(updated, summary);
    setLocalDraft(updated);
  }

  return (
    <div class="inline-control-card">
      <div class="inline-control-header">
        <div class="inline-header-meta">
          <span class="artifact-badge accent-amber">PBC</span>
          <strong>{data.engagementName}</strong>
          <span class="sheet-meta-count">{data.clientName}</span>
        </div>

        <span class={`tickmark-pill ${openCount === 0 ? 'tick-tied' : 'tick-pbc'}`}>
          {openCount === 0 ? 'Complete' : `${openCount} Open`}
        </span>
      </div>

      <div class="acct-table-scroll">
        <table class="acct-table">
          <thead>
            <tr>
              <th scope="col">Ref</th>
              <th scope="col">Client Support Item</th>
              <th scope="col">Owner</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => {
              const st = item.status;
              const cls =
                st === 'received'
                  ? 'tick-tied'
                  : st === 'overdue'
                    ? 'tick-exception'
                    : 'tick-pbc';
              const label = st === 'received' ? 'Received' : st === 'pending' ? 'Pending' : item.aging;

              return (
                <tr key={item.id}>
                  <td>
                    <strong>{item.code}</strong>
                  </td>
                  <td>{item.requestTitle}</td>
                  <td class="acct-muted-cell">{item.clientOwner}</td>
                  <td>
                    <button
                      type="button"
                      class={`tickmark-pill ${cls}`}
                      aria-label={`Cycle PBC status for ${item.code} (${label})`}
                      onClick={() => cycleStatus(item.id)}
                    >
                      {label}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div class="inline-control-footer">
        <span class="sheet-meta-count">
          {data.items.length} items
          {data.lastRemindedAt
            ? ` · Reminder logged ${formatAuditTimestamp(data.lastRemindedAt)}`
            : ''}
        </span>

        <div class="stage-subbar-group">
          <button type="button" class="ghost-pill" onClick={saveAndSendReminder}>
            Save status
          </button>
          <button
            type="button"
            class="primary-stage-btn"
            disabled={openCount === 0}
            onClick={saveAndSendReminder}
          >
            {openCount === 0 ? 'All received' : `Send reminder (${openCount})`}
          </button>
        </div>
      </div>
    </div>
  );
}

export const pbcTrackerRendererModule: LoadedRenderer<
  preact.ComponentChildren,
  PbcTrackerData
> = {
  render(context) {
    return <PbcInlineCard context={context} />;
  },
};
