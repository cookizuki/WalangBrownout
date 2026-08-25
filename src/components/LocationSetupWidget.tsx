import { useState } from "react";

export interface LocationFormValues { zone: string; aisle: string; description: string; }

export function LocationSetupWidget({
  onSave,
}: { onSave: (v: LocationFormValues) => void }) {
  const [zone, setZone] = useState("");
  const [aisle, setAisle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!zone.trim() || !aisle.trim()) return setError("Zone and Aisle are required.");
    onSave({ zone: zone.trim().toUpperCase(), aisle: aisle.trim(), description: description.trim() });
    setZone(""); setAisle(""); setDescription(""); setError("");
  };

  return (
    <form onSubmit={submit} className="rounded-lg border border-dashed border-border p-4">
      <p className="text-xs font-semibold text-muted-foreground">Add warehouse location</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-[80px_100px_1fr_auto] sm:items-end">
        <label className="block text-xs">
          <span className="text-muted-foreground">Zone</span>
          <input value={zone} onChange={e => setZone(e.target.value)} placeholder="A" maxLength={2} className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary" />
        </label>
        <label className="block text-xs">
          <span className="text-muted-foreground">Aisle</span>
          <input value={aisle} onChange={e => setAisle(e.target.value)} placeholder="01" maxLength={4} className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary" />
        </label>
        <label className="block text-xs">
          <span className="text-muted-foreground">Description</span>
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Cooling appliances" className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary" />
        </label>
        <button type="submit" className="rounded-md bg-foreground px-3 py-1.5 text-xs font-semibold text-background hover:opacity-90">Add</button>
      </div>
      {error && <p className="mt-2 text-xs font-medium text-danger">{error}</p>}
    </form>
  );
}