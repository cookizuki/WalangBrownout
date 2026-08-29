import { useState } from "react";

export interface SupplierFormValues {
  name: string; contact: string; contactRole: string; email: string; phone: string; address: string; landline: string;
}

export function SupplierDirectoryForm({
  onClose, onSave,
}: { onClose: () => void; onSave: (v: SupplierFormValues) => void }) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [contactRole, setContactRole] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [landline, setLandline] = useState("");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !contact.trim()) return setError("Supplier Name and Contact Person are required.");
    onSave({
      name: name.trim(), contact: contact.trim(), contactRole: contactRole.trim(),
      email: email.trim(), phone: phone.trim(), address: address.trim(), landline: landline.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 px-4" onClick={onClose}>
      <form onSubmit={submit} onClick={e => e.stopPropagation()} className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-display text-lg font-semibold">Add Supplier</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-md border border-border text-sm text-muted-foreground hover:bg-muted">✕</button>
        </div>

        <label className="mt-4 block text-xs">
          <span className="font-semibold text-muted-foreground">Supplier Name</span>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="CoolAir Distributors PH" className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
        </label>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs">
            <span className="font-semibold text-muted-foreground">Contact Person</span>
            <input value={contact} onChange={e => setContact(e.target.value)} placeholder="Ana Reyes" className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
          </label>
          <label className="block text-xs">
            <span className="font-semibold text-muted-foreground">Role in Company</span>
            <input value={contactRole} onChange={e => setContactRole(e.target.value)} placeholder="Sales Manager" className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
          </label>
        </div>

        <label className="mt-3 block text-xs">
          <span className="font-semibold text-muted-foreground">Company Address</span>
          <input value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Industrial Ave, Cabuyao, Laguna" className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
        </label>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs">
            <span className="font-semibold text-muted-foreground">Email</span>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ana@coolair.ph" className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
          </label>
          <label className="block text-xs">
            <span className="font-semibold text-muted-foreground">Mobile</span>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="0917 000 0000" className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
          </label>
        </div>

        <label className="mt-3 block text-xs">
          <span className="font-semibold text-muted-foreground">Landline</span>
          <input value={landline} onChange={e => setLandline(e.target.value)} placeholder="(049) 123-4567" className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
        </label>

        {error && <p className="mt-3 text-xs font-medium text-danger">{error}</p>}

        <div className="mt-5 flex gap-2">
          <button type="submit" className="flex-1 rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background hover:opacity-90">Save supplier</button>
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted">Cancel</button>
        </div>
      </form>
    </div>
  );
}