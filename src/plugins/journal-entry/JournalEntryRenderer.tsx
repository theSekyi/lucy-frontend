import { useState } from 'preact/hooks';
import { evaluateJournalEntryTieOut } from '../../core/ledger';
import { formatAuditTimestamp, formatMoneyMinor } from '../../core/money';
import type { LoadedRenderer, RendererContext } from '../../core/renderers';
import { MoneyInput } from '../../ui/primitives/MoneyInput';
import '../accounting.css';
import type { JournalEntryGateData } from './sample';

function JournalEntryInlineCard({
  context,
}: {
  context: RendererContext<JournalEntryGateData>;
}) {
  const baseline = context.block.data;
  const [localDraft, setLocalDraft] = useState<JournalEntryGateData | null>(null);
  const entry = context.draft ?? localDraft ?? baseline;
  const currency = entry.currency ?? 'GBP';
  const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '£';

  const tieOut = evaluateJournalEntryTieOut(entry.lines);
  const baselineLines = new Map(baseline.lines.map((l) => [l.id, l]));
  const isPosted = Boolean(entry.posted);

  function applyDraft(next: JournalEntryGateData) {
    if (context.onUpdateDraft) {
      context.onUpdateDraft(next);
    } else {
      setLocalDraft(next);
    }
  }

  function updateAmount(idx: number, field: 'debit' | 'credit', nextVal: number) {
    applyDraft({
      ...entry,
      posted: false,
      lines: entry.lines.map((line, i) =>
        i === idx ? { ...line, [field]: Math.max(0, nextVal) } : line
      ),
    });
  }

  function addLine() {
    applyDraft({
      ...entry,
      posted: false,
      lines: [
        ...entry.lines,
        {
          id: `jl-${entry.lines.length + 1}-${Date.now()}`,
          account: '6890 · Bank & Merchant Charges',
          entity: entry.lines[0]?.entity ?? 'UK Parent',
          debit: 0,
          credit: 0,
          memo: 'Additional adjustment line',
        },
      ],
    });
  }

  function postJournalToErp() {
    if (!tieOut.isBalanced) return;
    const nowIso = new Date().toISOString();
    const actor = context.actorName ?? 'Elena Carter';
    const nextData: JournalEntryGateData = {
      ...entry,
      posted: true,
      approvedBy: actor,
      approvedAt: nowIso,
    };
    const totalFmt = formatMoneyMinor(tieOut.totalDebitMinor, { currency, decimals: 2 });
    context.onCommitRevision?.(nextData, [
      `Posted ${entry.entryNumber} (${totalFmt} balanced across ${entry.lines.length} lines) to ${entry.erpTarget}`,
    ]);
    setLocalDraft(nextData);
  }

  return (
    <div class="inline-control-card">
      <div class="inline-control-header">
        <div class="inline-header-meta">
          <span class="artifact-badge accent-emerald">AJE</span>
          <strong>{entry.entryNumber}</strong>
          <span class="sheet-meta-count">
            {entry.erpTarget} · {entry.effectiveDate}
          </span>
        </div>

        <span class={`tickmark-pill ${tieOut.isBalanced ? 'tick-tied' : 'tick-exception'}`}>
          {tieOut.isBalanced
            ? `Balanced (${symbol}0.00)`
            : `Imbalance: ${formatMoneyMinor(Math.abs(tieOut.imbalanceMinor), { currency, decimals: 2 })}`}
        </span>
      </div>

      <div class="acct-table-scroll">
        <table class="acct-table">
          <thead>
            <tr>
              <th scope="col">Account</th>
              <th scope="col">Memo</th>
              <th scope="col" class="is-num">
                Debit ({symbol})
              </th>
              <th scope="col" class="is-num">
                Credit ({symbol})
              </th>
            </tr>
          </thead>
          <tbody>
            {entry.lines.map((line, idx) => {
              const orig = baselineLines.get(line.id);
              return (
                <tr key={line.id}>
                  <td>
                    <strong>{line.account}</strong>
                  </td>
                  <td class="acct-muted-cell">{line.memo}</td>
                  <td class="is-num">
                    <MoneyInput
                      value={line.debit}
                      baselineValue={orig?.debit}
                      decimals={2}
                      allowNegative={false}
                      placeholder="0.00"
                      ariaLabel={`Debit amount for ${line.account}`}
                      onChange={(val) => updateAmount(idx, 'debit', val)}
                    />
                  </td>
                  <td class="is-num">
                    <MoneyInput
                      value={line.credit}
                      baselineValue={orig?.credit}
                      decimals={2}
                      allowNegative={false}
                      placeholder="0.00"
                      ariaLabel={`Credit amount for ${line.account}`}
                      onChange={(val) => updateAmount(idx, 'credit', val)}
                    />
                  </td>
                </tr>
              );
            })}
            <tr class="acct-totals-row">
              <td colSpan={2}>Totals</td>
              <td class="is-num">
                {formatMoneyMinor(tieOut.totalDebitMinor, { currency, decimals: 2 })}
              </td>
              <td class="is-num">
                {formatMoneyMinor(tieOut.totalCreditMinor, { currency, decimals: 2 })}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="inline-control-footer">
        <button type="button" class="ghost-pill" onClick={addLine}>
          + Add line
        </button>

        <div class="stage-subbar-group">
          {!tieOut.isBalanced ? (
            <span class="guard-reason-hint">
              Debits must equal credits before posting
            </span>
          ) : isPosted && entry.approvedBy ? (
            <span class="sheet-meta-count">
              Posted by {entry.approvedBy}
              {entry.approvedAt ? ` · ${formatAuditTimestamp(entry.approvedAt)}` : ''}
            </span>
          ) : (
            <span class="sheet-meta-count">{entry.preparer}</span>
          )}
          <button
            type="button"
            class="primary-stage-btn"
            disabled={!tieOut.isBalanced}
            onClick={postJournalToErp}
          >
            {isPosted ? 'Posted to ERP' : 'Post to ERP'}
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
