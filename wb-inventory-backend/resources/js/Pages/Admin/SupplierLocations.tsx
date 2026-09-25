import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { SupplierDirectoryForm, type Supplier } from '@/Components/SupplierDirectoryForm';
import { LocationSetupWidget } from '@/Components/LocationSetupWidget';

type WarehouseLocation = { id: number; code: string; description: string };

function LocationRow({ location }: { location: WarehouseLocation }) {
  const [editing, setEditing] = useState(false);
  const { data, setData, put, processing, errors, clearErrors } = useForm({ description: location.description });

  return (
    <li className="flex items-center justify-between gap-3 py-2 text-sm">
      <span className="shrink-0 font-mono text-xs font-semibold">{location.code}</span>
      {editing ? (
        <form className="min-w-0 flex-1" onSubmit={e => {
          e.preventDefault();
          put(route('admin.locations.update', location.id), { preserveScroll: true, onSuccess: () => setEditing(false) });
        }}>
          <div className="flex items-center gap-2">
            <input aria-label={`Description for ${location.code}`} value={data.description} onChange={e => setData('description', e.target.value)} autoFocus className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs outline-none focus:border-primary" />
            <button disabled={processing} className="shrink-0 text-xs font-semibold underline underline-offset-4 disabled:opacity-50">Save</button>
            <button type="button" disabled={processing} onClick={() => setEditing(false)} className="shrink-0 text-xs text-muted-foreground underline underline-offset-4">Cancel</button>
          </div>
          {errors.description && <p role="alert" className="mt-2 text-xs text-danger">{errors.description}</p>}
        </form>
      ) : (
        <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
          <span className="truncate text-xs text-muted-foreground">{location.description}</span>
          <button onClick={() => { setData('description', location.description); clearErrors(); setEditing(true); }} aria-label={`Edit ${location.code}`} className="shrink-0 text-xs font-medium underline underline-offset-4 hover:text-foreground/70">Edit</button>
        </div>
      )}
    </li>
  );
}

export default function SupplierLocations({ suppliers, locations }: { suppliers: Supplier[]; locations: WarehouseLocation[] }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Supplier>();

  return (
    <main className="mx-auto max-w-7xl space-y-2 p-4 sm:p-8">
      <Head title="Suppliers & Locations" />
      <h1 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">supplier directory & warehouse locations (System Administrator responsibility)</h1>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card-surface">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold">Suppliers</h2>
              <p className="text-xs text-muted-foreground">{suppliers.length} on file</p>
            </div>
            <button onClick={() => setShowForm(true)} className="rounded-md bg-foreground px-4 py-2 text-xs font-semibold text-background transition-opacity hover:opacity-90">+ Add Supplier</button>
          </div>
          <ul className="divide-y divide-dashed divide-border">
            {suppliers.map(supplier => (
              <li key={supplier.id} className="flex items-start justify-between gap-3 px-5 py-3 text-sm">
                <div className="min-w-0">
                  <div className="font-medium">{supplier.name}</div>
                  <div className="text-xs text-muted-foreground">{supplier.contact}{supplier.contactRole ? ` · ${supplier.contactRole}` : ''}</div>
                  {(supplier.email || supplier.phone) && <div className="mt-0.5 break-words text-[11px] text-muted-foreground">{[supplier.email, supplier.phone].filter(Boolean).join(' · ')}</div>}
                  {(supplier.address || supplier.landline) && <div className="mt-0.5 text-[11px] text-muted-foreground">{[supplier.address, supplier.landline].filter(Boolean).join(' · ')}</div>}
                  {supplier.tin && <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">TIN: {supplier.tin}</div>}
                </div>
                <button onClick={() => setEditing(supplier)} aria-label={`Edit ${supplier.name}`} className="shrink-0 text-xs font-medium underline underline-offset-4 hover:text-foreground/70">Edit</button>
              </li>
            ))}
          </ul>
          {suppliers.length === 0 && <p className="px-5 py-4 text-sm text-muted-foreground">No suppliers yet.</p>}
        </div>
        <div className="card-surface p-5">
          <div className="mb-3">
            <h2 className="text-lg font-semibold">Warehouse Locations</h2>
            <p className="text-xs text-muted-foreground">{locations.length} zones mapped</p>
          </div>
          <LocationSetupWidget />
          <ul className="mt-4 divide-y divide-dashed divide-border">
            {locations.map(location => <LocationRow key={location.id} location={location} />)}
          </ul>
          {locations.length === 0 && <p className="mt-4 text-sm text-muted-foreground">No locations yet.</p>}
        </div>
      </div>
      {showForm && <SupplierDirectoryForm onClose={() => setShowForm(false)} />}
      {editing && <SupplierDirectoryForm initial={editing} onClose={() => setEditing(undefined)} />}
    </main>
  );
}
