import { useForm } from '@inertiajs/react';
import { Dialog, DialogPanel } from '@headlessui/react';

export interface SupplierFormValues {
  name: string; contact: string; contactRole: string; email: string; phone: string;
  address: string; landline: string; tin: string;
}
export type Supplier = SupplierFormValues & { id: number };

export function SupplierDirectoryForm({ onClose, initial }: {
  onClose: () => void; initial?: Supplier;
}) {
  const { data, setData, post, put, processing, errors } = useForm({
    name: initial?.name ?? '', contact: initial?.contact ?? '',
    contactRole: initial?.contactRole ?? '', email: initial?.email ?? '',
    phone: initial?.phone ?? '', address: initial?.address ?? '',
    landline: initial?.landline ?? '', tin: initial?.tin ?? '',
  });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const options = { preserveScroll: true, onSuccess: onClose };
    if (initial) put(route('admin.suppliers.update', initial.id), options);
    else post(route('admin.suppliers.store'), options);
  };
  return (
    <Dialog open onClose={() => { if (!processing) onClose(); }} aria-labelledby="directory-form-title" className="fixed inset-0 z-50 overflow-y-auto bg-foreground/40 px-4 py-6">
      <div className="flex min-h-full items-center justify-center">
      <DialogPanel as="form" onSubmit={submit} onClick={e => e.stopPropagation()} className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <h2 id="directory-form-title" className="font-display text-lg font-semibold">{initial ? "Edit Supplier" : "Add Supplier"}</h2>
          <button type="button" onClick={onClose} disabled={processing} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-md border border-border text-sm text-muted-foreground hover:bg-muted">✕</button>
        </div>

        <label className="mt-4 block text-xs">
          <span className="font-semibold text-muted-foreground">Supplier Name</span>
          <input value={data.name} onChange={e => setData('name', e.target.value)} placeholder="CoolAir Distributors PH" className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
        </label>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs">
            <span className="font-semibold text-muted-foreground">Contact Person</span>
            <input value={data.contact} onChange={e => setData('contact', e.target.value)} placeholder="Ana Reyes" className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
          </label>
          <label className="block text-xs">
            <span className="font-semibold text-muted-foreground">Role in Company</span>
            <input value={data.contactRole} onChange={e => setData('contactRole', e.target.value)} placeholder="Sales Manager" className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
          </label>
        </div>

        <label className="mt-3 block text-xs">
          <span className="font-semibold text-muted-foreground">Company Address</span>
          <input value={data.address} onChange={e => setData('address', e.target.value)} placeholder="123 Industrial Ave, Cabuyao, Laguna" className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
        </label>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs">
            <span className="font-semibold text-muted-foreground">Email</span>
            <input type="email" value={data.email} onChange={e => setData('email', e.target.value)} placeholder="ana@coolair.ph" className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
          </label>
          <label className="block text-xs">
            <span className="font-semibold text-muted-foreground">Mobile</span>
            <input value={data.phone} onChange={e => setData('phone', e.target.value)} placeholder="0917 000 0000" className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
          </label>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs">
            <span className="font-semibold text-muted-foreground">Landline</span>
            <input value={data.landline} onChange={e => setData('landline', e.target.value)} placeholder="(049) 123-4567" className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
          </label>
          <label className="block text-xs">
            <span className="font-semibold text-muted-foreground">TIN</span>
            <input
              value={data.tin}
              onChange={e => setData('tin', e.target.value.replace(/[^\d-]/g, "").slice(0, 15))}
              placeholder="123-456-789-000"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
        </div>

        {Object.entries(errors).map(([field, message]) => (
          <p key={field} role="alert" className="mt-2 text-xs font-medium text-danger">{message}</p>
        ))}

        <div className="mt-5 flex gap-2">
          <button type="submit" disabled={processing} className="flex-1 rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-50">{initial ? "Save changes" : "Save supplier"}</button>
          <button type="button" onClick={onClose} disabled={processing} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted">Cancel</button>
        </div>
      </DialogPanel>
      </div>
    </Dialog>
  );
}