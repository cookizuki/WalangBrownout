import { useForm } from '@inertiajs/react';

type AdjustmentReason = 'DAMAGE' | 'LOSS' | 'CORRECTION';
const REASONS: { key: AdjustmentReason; label: string }[] = [
  { key: 'DAMAGE', label: 'Damage' }, { key: 'LOSS', label: 'Loss' }, { key: 'CORRECTION', label: 'Correction' },
];

export function AdjustmentForm({ batchId, onClose }: { batchId: string; onClose: () => void }) {
  const { data, setData, post, processing, errors } = useForm({
    batch_id: batchId, reason: 'DAMAGE' as AdjustmentReason, quantity: '', notes: '',
  });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post(route('batches.adjustment', batchId), { preserveScroll: true, onSuccess: onClose });
  };
  return (
    <form onSubmit={submit} className="rounded-lg border border-border bg-surface p-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        Report adjustment — batch {batchId}
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-[auto_120px_1fr_auto] sm:items-end">
        <div>
          <label className="text-xs text-muted-foreground">Adjustment type</label>
          <div className="mt-1 flex flex-wrap gap-2">
            {REASONS.map(r => (
              <button
                key={r.key}
                type="button" aria-pressed={data.reason === r.key}
                onClick={() => setData("reason", r.key)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  data.reason === r.key ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Quantity</label>
          <input
            aria-label="Quantity" inputMode="numeric"
            value={data.quantity}
            onChange={e => setData("quantity", e.target.value.replace(data.reason === "CORRECTION" ? /[^\d-]/g : /[^\d]/g, "").slice(0, 7))}
            placeholder={data.reason === "CORRECTION" ? "+/- qty" : "qty"}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 font-mono text-xs outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Notes</label>
          <input
            aria-label="Notes" maxLength={255} value={data.notes}
            onChange={e => setData("notes", e.target.value)}
            placeholder="What happened?"
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-primary"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={processing || !Number(data.quantity)}
            className="rounded-md bg-foreground px-3 py-1.5 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Submit
          </button>
          <button type="button" disabled={processing} onClick={onClose} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted">
            Cancel
          </button>
        </div>
      </div>
      {Object.entries(errors).map(([field, message]) => <p key={field} role="alert" className="mt-2 text-xs text-danger">{message}</p>)}
      <p className="mt-3 text-[10px] uppercase tracking-widest text-muted-foreground">
        Submitting logs an Adjustment transaction and updates quantity remaining
      </p>
    </form>
  );
}
