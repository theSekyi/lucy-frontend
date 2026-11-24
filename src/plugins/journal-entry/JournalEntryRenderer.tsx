import { useState } from 'preact/hooks';
import type { LoadedRenderer, RendererContext } from '../../core/renderers';
import '../accounting.css';
import type { JournalEntryGateData, JournalLine } from './sample';

function fmtJe(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function JournalEntryInlineCard({
  context,
}: {
  context: RendererContext<JournalEntryGateData>;
}) {
  const entry = context.block.data;
  const [lines, setLines] = useState<JournalLine[]>(() => [...entry.lines]);
  const [approved, setApproved] = useState(false);

  const totalDebit = Number(lines.reduce((s, l) => s + l.debit, 0).toFixed(2));
  const totalCredit = Number(lines.reduce((s, l) => s + l.credit, 0).toFixed(2));
  const variance = Number((totalDebit - totalCredit).toFixed(2));
  const isBalanced = Math.abs(variance) < 0.005 && totalDebit > 0;

  function updateAmount(idx: number, field: 'debit' | 'credit', raw: string) {
    setApproved(false);
    const val = Math.max(0, Number(raw) || 0);
    setLines((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, [field]: val } : l))
    );
  }

  function addLine() {
    setApproved(false);
    setLines((prev) => [
      ...prev,
      {
        id: `jl-${Date.now()}`,
        account: '6890 · Bank & Merchant Charges',
        entity: 'US Parent',
        debit: 0,
        credit: 0,
        memo: 'Additional adjustment line',
      },
    ]);
  }

  return (
    <div class="inline-control-card">
      <div class="inline-control-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span class="artifact-badge accent-emerald">AJE</span>
          <strong>{entry.entryNumber}</strong>
          <span class="sheet-meta-count">
            {entry.erpTarget} · {entry.effectiveDate}
          </span>
        </div>

        <span class={`tickmark-pill ${isBalanced ? 'tick-tied' : 'tick-exception'}`}>
          {isBalanced
            ? '✓ Balanced ($0.00)'
            : `⊗ Out of balance: $${fmtJe(Math.abs(variance))}`}
        </span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table class="acct-table">
          <thead>
            <tr>
              <th>Account</th>
              <th>Memo</th>
              <th class="is-num">Debit ($)</th>
              <th class="is-num">Credit ($)</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, idx) => (
              <tr key={line.id}>
                <td>
                  <strong>{line.account}</strong>
                </td>
                <td style={{ color: '#a1a1aa' }}>{line.memo}</td>
                <td class="is-num">
                  <input
                    type="number"
                    step="100"
                    class="acct-inline-num-input"
                    value={line.debit || ''}
                    placeholder="0.00"
                    aria-label={`Debit line ${idx + 1}`}
                    onInput={(e) =>
                      updateAmount(idx, 'debit', (e.currentTarget as HTMLInputElement).value)
                    }
                  />
                </td>
                <td class="is-num">
                  <input
                    type="number"
                    step="100"
                    class="acct-inline-num-input"
                    value={line.credit || ''}
                    placeholder="0.00"
                    aria-label={`Credit line ${idx + 1}`}
                    onInput={(e) =>
                      updateAmount(idx, 'credit', (e.currentTarget as HTMLInputElement).value)
                    }
                  />
                </td>
              </tr>
            ))}
            <tr style={{ background: '#15151b', fontWeight: 700 }}>
              <td colSpan={2}>Totals</td>
              <td class="is-num">${fmtJe(totalDebit)}</td>
              <td class="is-num">${fmtJe(totalCredit)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="inline-control-footer">
        <button type="button" class="ghost-pill" onClick={addLine}>
          + Add line
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span class="sheet-meta-count">{entry.preparer}</span>
          <button
            type="button"
            class="primary-stage-btn"
            disabled={!isBalanced}
            style={!isBalanced ? { opacity: 0.35, cursor: 'not-allowed' } : undefined}
            onClick={() => setApproved(true)}
          >
            {approved ? '✓ Approved & Staged to ERP' : 'Approve & Stage to ERP'}
          </button>
        </div>
      </div>
    </div>
  );
}

export const journalEntryRendererModule: LoadedRenderer<
  preact.ComponentChildren,
  JournalEntryGateData
> = {
  render(context) {
    return <JournalEntryInlineCard context={context} />;
  },
};
