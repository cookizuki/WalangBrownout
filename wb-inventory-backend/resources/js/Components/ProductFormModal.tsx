import { useForm } from '@inertiajs/react';
import { Dialog, DialogPanel } from '@headlessui/react';

export interface ProductFormValues {
  sku: string; name: string; unitCost: number; reorderPoint: number;
  leadTimeDays: number; abc: 'A' | 'B' | 'C'; seasonalFlag: boolean;
}

export function ProductFormModal({ onClose, initial }: {
  onClose: () => void; initial?: ProductFormValues;
}) {
  const { data, setData, post, put, processing, errors } = useForm({
    sku: initial?.sku ?? '', name: initial?.name ?? '',
    unitCost: String(initial?.unitCost ?? ''),
    reorderPoint: String(initial?.reorderPoint ?? ''),
    leadTimeDays: String(initial?.leadTimeDays ?? ''),
    abc: initial?.abc ?? 'B', seasonalFlag: initial?.seasonalFlag ?? false,
  });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const options = { preserveScroll: true, onSuccess: onClose };
    if (initial) put(route('admin.products.update', initial.sku), options);
    else post(route('admin.products.store'), options);
  };
  return (
    <Dialog open onClose={() => { if (!processing) onClose(); }} aria-labelledby="directory-form-title" className="fixed inset-0 z-50 overflow-y-auto bg-foreground/40 px-4 py-6">
      <div className="flex min-h-full items-center justify-center">
      <DialogPanel as="form"
        onSubmit={submit}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="directory-form-title" className="font-display text-lg font-semibold">{initial ? "Edit Product" : "Add Product"}</h2>
          <button type="button" onClick={onClose} disabled={processing} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-md border border-border text-sm text-muted-foreground hover:bg-muted">✕</button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs">
            <span className="font-semibold text-muted-foreground">SKU</span>
            <input
              value={data.sku}
              onChange={e => setData('sku', e.target.value)}
              placeholder="ACU-014"
              disabled={!!initial}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
          <label className="block text-xs">
            <span className="font-semibold text-muted-foreground">Product Name</span>
            <input value={data.name} onChange={e => setData('name', e.target.value)} placeholder="Portable AC Unit" className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
          </label>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="block text-xs">
            <span className="font-semibold text-muted-foreground">Unit Cost (₱)</span>
            <input type="number" min="0.01" step="0.01" inputMode="decimal" value={data.unitCost} onChange={e => setData('unitCost', e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
          </label>
          <label className="block text-xs">
            <span className="font-semibold text-muted-foreground">Reorder Point</span>
            <input inputMode="numeric" value={data.reorderPoint} onChange={e => setData('reorderPoint', e.target.value.replace(/[^\d]/g, ""))} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
          </label>
          <label className="block text-xs">
            <span className="font-semibold text-muted-foreground">Lead Time (days)</span>
            <input inputMode="numeric" value={data.leadTimeDays} onChange={e => setData('leadTimeDays', e.target.value.replace(/[^\d]/g, ""))} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
          </label>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4">
          <label className="block text-xs">
            <span className="font-semibold text-muted-foreground">ABC Category</span>
            <select value={data.abc} onChange={e => setData('abc', e.target.value as ProductFormValues['abc'])} className="mt-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary">
              <option value="A">A</option><option value="B">B</option><option value="C">C</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            Seasonal
            <button
              type="button" role="switch" aria-label="Seasonal" aria-checked={data.seasonalFlag}
              onClick={() => setData('seasonalFlag', !data.seasonalFlag)}
              className={`relative h-5 w-9 rounded-full transition-colors ${data.seasonalFlag ? "bg-foreground" : "bg-muted"}`}
            >
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-background transition-all ${data.seasonalFlag ? "left-4" : "left-0.5"}`} />
            </button>
          </label>
        </div>

        {Object.entries(errors).map(([field, message]) => (
          <p key={field} role="alert" className="mt-2 text-xs font-medium text-danger">{message}</p>
        ))}

        <div className="mt-5 flex gap-2">
          <button type="submit" disabled={processing} className="flex-1 rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-50">Save product</button>
          <button type="button" onClick={onClose} disabled={processing} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted">Cancel</button>
        </div>
      </DialogPanel>
      </div>
    </Dialog>
  );
}