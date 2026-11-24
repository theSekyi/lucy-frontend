import { useState } from 'preact/hooks';
import type { LoadedRenderer, RendererContext } from '../../core/renderers';
import '../accounting.css';
import type { PbcStatus, PbcTrackerData } from './sample';

const PBC_ORDER: PbcStatus[] = ['overdue', 'pending', 'received'];

function PbcInlineCard({ context }: { context: RendererContext<PbcTrackerData> }) {
  const data = context.block.data;
  const [statuses, setStatuses] = useState<Record<string, PbcStatus>>(() =>
    Object.fromEntries(data.items.map((i) => [i.id, i.status]))
  );
  const [reminded, setReminded] = useState(false);

  const openCount = data.items.filter((i) => statuses[i.id] !== 'received').length;

  function cycleStatus(id: string) {
    setReminded(false);
    setStatuses((prev) => {
      const curr = prev[id] ?? 'pending';
      const next = PBC_ORDER[(PBC_ORDER.indexOf(curr) + 1) % PBC_ORDER.length]!;
      return { ...prev, [id]: next };
    });
  }

  return (
    <div class="inline-control-card">
      <div class="inline-control-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span class="artifact-badge accent-amber">PBC</span>
          <strong>{data.engagementName}</strong>
          <span class="sheet-meta-count">{data.clientName}</span>
        </div>

        <span class={`tickmark-pill ${openCount === 0 ? 'tick-tied' : 'tick-pbc'}`}>
          {openCount === 0 ? '✓ All PBC Received' : `${openCount} Open`}
        </span>
      </div>

      <table class="acct-table">
        <thead>
          <tr>
            <th>Ref</th>
            <th>Client Support Item</th>
            <th>Owner</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item) => {
            const st = statuses[item.id] ?? item.status;
            const cls =
              st === 'received'
                ? 'tick-tied'
                : st === 'overdue'
                  ? 'tick-exception'
                  : 'tick-pbc';
            const label =
              st === 'received'
                ? '✓ Received'
                : st === 'overdue'
                  ? item.aging
                  : item.aging;

            return (
              <tr key={item.id}>
                <td>
                  <strong>{item.code}</strong>
                </td>
                <td>{item.requestTitle}</td>
                <td style={{ color: '#a1a1aa' }}>{item.clientOwner}</td>
                <td>
                  <button
                    type="button"
                    class={`tickmark-pill ${cls}`}
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

      <div class="inline-control-footer">
        <span class="sheet-meta-count">Click any status badge to update receipt state</span>
        <button
          type="button"
          class="primary-stage-btn"
          disabled={openCount === 0}
          style={openCount === 0 ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
          onClick={() => setReminded(true)}
        >
          {reminded
            ? `✓ Portal reminder sent (${openCount})`
            : `Request ${openCount} open from client`}
        </button>
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
