import { useState } from "react";
import type { ABC } from "@/lib/inventory-data";

export interface ProductFormValues {
  sku: string;
  name: string;
  unitCost: number;
  reorderPoint: number;
  leadTimeDays: number;
  abc: ABC;
  seasonalFlag: boolean;
}

export function ProductFormModal({
  onClose, onSave, initial,
}: { onClose: () => void; onSave: (v: ProductFormValues) => void; initial?: Partial<ProductFormValues> }) {
  const [sku, setSku] = useState(initial?.sku ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [unitCost, setUnitCost] = useState(String(initial?.unitCost ?? ""));
  const [reorderPoint, setReorderPoint] = useState(String(initial?.reorderPoint ?? ""));
  const [leadTimeDays, setLeadTimeDays] = useState(String(initial?.leadTimeDays ?? ""));
  const [abc, setAbc] = useState<ABC>(initial?.abc ?? "B");
  const [seasonalFlag, setSeasonalFlag] = useState(initial?.seasonalFlag ?? false);
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku.trim() || !name.trim()) return setError("SKU and Product Name are required.");
    if (!Number(unitCost) || !Number(reorderPoint) || !Number(leadTimeDays)) {
      return setError("Unit Cost, Reorder Point, and Lead Time must be positive numbers.");
    }
    onSave({
      sku: sku.trim(), name: name.trim(), abc, seasonalFlag,
      unitCost: Number(unitCost), reorderPoint: Number(reorderPoint), leadTimeDays: Number(leadTimeDays),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 px-4" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-display text-lg font-semibold">{initial ? "Edit Product" : "Add Product"}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-md border border-border text-sm text-muted-foreground hover:bg-muted">✕</button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs">
            <span className="font-semibold text-muted-foreground">SKU</span>
            <input
              value={sku}
              onChange={e => setSku(e.target.value)}
              placeholder="ACU-014"
              disabled={!!initial}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
          <label className="block text-xs">
            <span className="font-semibold text-muted-foreground">Product Name</span>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Portable AC Unit" className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
          </label>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="block text-xs">
            <span className="font-semibold text-muted-foreground">Unit Cost (₱)</span>
            <input inputMode="numeric" value={unitCost} onChange={e => setUnitCost(e.target.value.replace(/[^\d]/g, ""))} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
          </label>
          <label className="block text-xs">
            <span className="font-semibold text-muted-foreground">Reorder Point</span>
            <input inputMode="numeric" value={reorderPoint} onChange={e => setReorderPoint(e.target.value.replace(/[^\d]/g, ""))} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
          </label>
          <label className="block text-xs">
            <span className="font-semibold text-muted-foreground">Lead Time (days)</span>
            <input inputMode="numeric" value={leadTimeDays} onChange={e => setLeadTimeDays(e.target.value.replace(/[^\d]/g, ""))} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
          </label>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4">
          <label className="block text-xs">
            <span className="font-semibold text-muted-foreground">ABC Category</span>
            <select value={abc} onChange={e => setAbc(e.target.value as ABC)} className="mt-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary">
              <option value="A">A</option><option value="B">B</option><option value="C">C</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            Seasonal
            <button
              type="button"
              onClick={() => setSeasonalFlag(v => !v)}
              className={`relative h-5 w-9 rounded-full transition-colors ${seasonalFlag ? "bg-foreground" : "bg-muted"}`}
            >
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-background transition-all ${seasonalFlag ? "left-4" : "left-0.5"}`} />
            </button>
          </label>
        </div>

        {error && <p className="mt-3 text-xs font-medium text-danger">{error}</p>}

        <div className="mt-5 flex gap-2">
          <button type="submit" className="flex-1 rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background hover:opacity-90">Save product</button>
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted">Cancel</button>
        </div>
      </form>
    </div>
  );
}