import { useForm } from '@inertiajs/react';

export function LocationSetupWidget() {
  const { data, setData, post, processing, errors, reset } = useForm({
    zone: '', aisle: '', description: '',
  });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post(route('admin.locations.store'), {
      preserveScroll: true, onSuccess: () => reset(),
    });
  };
  return (
    <form onSubmit={submit} className="rounded-lg border border-dashed border-border p-4">
      <p className="text-xs font-semibold text-muted-foreground">Add warehouse location</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-[80px_100px_1fr_auto] sm:items-end">
        <label className="block text-xs">
          <span className="text-muted-foreground">Zone</span>
          <input value={data.zone} onChange={e => setData('zone', e.target.value)} placeholder="A" maxLength={2} className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary" />
        </label>
        <label className="block text-xs">
          <span className="text-muted-foreground">Aisle</span>
          <input value={data.aisle} onChange={e => setData('aisle', e.target.value)} placeholder="01" maxLength={4} className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary" />
        </label>
        <label className="block text-xs">
          <span className="text-muted-foreground">Description</span>
          <input value={data.description} onChange={e => setData('description', e.target.value)} placeholder="Cooling appliances" className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary" />
        </label>
        <button type="submit" disabled={processing} className="rounded-md bg-foreground px-3 py-1.5 text-xs font-semibold text-background hover:opacity-90 disabled:opacity-50">Add</button>
      </div>
      {Object.entries(errors).map(([field, message]) => (
          <p key={field} role="alert" className="mt-2 text-xs font-medium text-danger">{message}</p>
        ))}
    </form>
  );
}