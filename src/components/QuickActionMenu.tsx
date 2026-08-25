import { useState } from "react";
import { useOps, logMovement } from "@/lib/ops-store";
import { locations, products } from "@/lib/inventory-data";

type MoveType = "RETURN" | "TRANSFER" | "WRITE_OFF";
const OPTIONS: { key: MoveType; label: string }[] = [
  { key: "RETURN", label: "Log a Return" },
  { key: "TRANSFER", label: "Log a Transfer" },
  { key: "WRITE_OFF", label: "Log a Write-Off" },
];

export function QuickActionMenu() {
  const { batches } = useOps();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<MoveType | null>(null);
  const [batchId, setBatchId] = useState("");
  const [qty, setQty] = useState("");
  const [toLoc, setToLoc] = useState("");

  const reset = () => { setActive(null); setBatchId(""); setQty(""); setToLoc(""); setOpen(false); };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!active || !batchId || !Number(qty)) return;
    logMovement({
      batchId,
      type: active,
      quantity: Number(qty),
      toLocationId: active === "TRANSFER" ? Number(toLoc) : undefined,
    });
    reset();
  };

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {active && (
        <form
          onSubmit={submit}
          className="mb-3 w-72 rounded-xl border border-border bg-surface p-4 shadow-xl"
        >
          <p className="text-sm font-semibold">{OPTIONS.find(o => o.key === active)?.label}</p>

          <label className="mt-3 block text-xs text-muted-foreground">
            Batch
            <select
              value={batchId}
              onChange={e => setBatchId(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary"
            >
              <option value="">Select batch…</option>
              {batches.filter(b => b.quantityRemaining > 0 || active === "RETURN").map(b => {
                const p = products.find(pp => pp.sku === b.sku);
                return <option key={b.id} value={b.id}>{b.id} · {p?.name}</option>;
              })}
            </select>
          </label>

          <label className="mt-2 block text-xs text-muted-foreground">
            Quantity
            <input
              inputMode="numeric"
              value={qty}
              onChange={e => setQty(e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
              className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary"
            />
          </label>

          {active === "TRANSFER" && (
            <label className="mt-2 block text-xs text-muted-foreground">
              Move to location
              <select
                value={toLoc}
                onChange={e => setToLoc(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary"
              >
                <option value="">Select location…</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.code}</option>)}
              </select>
            </label>
          )}

          <div className="mt-3 flex gap-2">
            <button type="submit" className="flex-1 rounded-md bg-foreground px-3 py-1.5 text-xs font-semibold text-background hover:opacity-90">
              Submit
            </button>
            <button type="button" onClick={reset} className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted">
              Cancel
            </button>
          </div>
        </form>
      )}

      {open && !active && (
        <div className="mb-3 w-52 overflow-hidden rounded-xl border border-border bg-surface shadow-xl">
          {OPTIONS.map(o => (
            <button
              key={o.key}
              onClick={() => setActive(o.key)}
              className="block w-full px-4 py-2.5 text-left text-xs font-medium hover:bg-muted"
            >
              {o.label}
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => (active ? reset() : setOpen(v => !v))}
        aria-label="Quick actions"
        className="grid h-12 w-12 place-items-center rounded-full border border-border bg-foreground text-lg font-bold text-background shadow-lg hover:opacity-90"
      >
        {open || active ? "×" : "+"}
      </button>
    </div>
  );
}