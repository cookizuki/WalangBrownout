import { useEffect, useState } from "react";
import { receiveDelivery } from "@/lib/ops-store";
import type { ReceivingLine } from "@/lib/inventory-data";
import { toast } from "sonner";
import { printBatchLabel } from "@/components/BatchLabel";

export function ReceivingEntryModal({
  line, productName, onClose,
}: { line: ReceivingLine; productName: string; onClose: () => void }) {
  const [qty, setQty] = useState(String(line.quantityOrdered));
  const [expiry, setExpiry] = useState("");
  const [error, setError] = useState("");
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setShown(true), 10);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = Number(qty);
    if (!q || q <= 0) return setError("Enter a valid quantity received.");
    if (!expiry) return setError("Expiration date is required to create the batch.");
    const newBatch = receiveDelivery({ lineId: line.id, quantityReceived: q, expirationDate: expiry });
    toast.success("Delivery received", {
      description: `New batch created for ${productName} — ${q} units`,
      action: newBatch ? {
        label: "Print label",
        onClick: () => printBatchLabel({
          sku: newBatch.sku,
          productName,
          batchId: newBatch.id,
          quantity: newBatch.quantityReceived,
          dateReceived: newBatch.dateReceived,
          expirationDate: newBatch.expirationDate,
        }),
      } : undefined,
    });
    onClose();
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 px-4 transition-opacity duration-200 ${
        shown ? "opacity-100" : "opacity-0"
      }`}
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={e => e.stopPropagation()}
        className={`w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl transition-all duration-200 ${
          shown ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-95 opacity-0"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold">Receive delivery</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {line.id} · {productName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-border text-sm text-muted-foreground hover:bg-muted"
          >
            ✕
          </button>
        </div>

        <label className="mt-5 block">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Quantity received
          </span>
          <input
            inputMode="numeric"
            value={qty}
            onChange={e => setQty(e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
            placeholder={String(line.quantityOrdered)}
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary"
          />
          <span className="mt-1 block text-xs text-muted-foreground">
            Ordered: {line.quantityOrdered}
          </span>
        </label>

        <label className="mt-4 block">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Expiration date <span className="text-danger">*</span>
          </span>
          <input
            type="date"
            value={expiry}
            onChange={e => setExpiry(e.target.value)}
            required
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary"
          />
        </label>

        {error && <p className="mt-3 text-xs font-medium text-danger">{error}</p>}

        <div className="mt-5 flex gap-2">
          <button
            type="submit"
            className="flex-1 rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
          >
            Confirm receipt
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted"
          >
            Cancel
          </button>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Confirming creates a new Inventory Batch stamped with today's date and this line's warehouse location.
        </p>
      </form>
    </div>
  );
}