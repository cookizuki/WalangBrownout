import { useState } from "react";
import { updateAccount, ROLES, type Account, type Role } from "@/lib/auth";

export function EditUserModal({
  user, onClose, onSaved,
}: { user: Account; onClose: () => void; onSaved: (a: Account) => void }) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<Role>(user.role);
  const [status, setStatus] = useState<"Active" | "Inactive">(user.status ?? "Active");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return setError("Name and email are required.");
    const updated = updateAccount(user.id, { name, email, role, status });
    if (updated) onSaved(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 px-4" onClick={onClose}>
      <form onSubmit={submit} onClick={e => e.stopPropagation()} className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-display text-lg font-semibold">Edit User</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-md border border-border text-sm text-muted-foreground hover:bg-muted">✕</button>
        </div>

        <label className="mt-4 block text-xs">
          <span className="font-semibold text-muted-foreground">Name</span>
          <input value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
        </label>

        <label className="mt-3 block text-xs">
          <span className="font-semibold text-muted-foreground">Email</span>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
        </label>

        <div className="mt-4">
          <p className="text-xs font-semibold text-muted-foreground">Role</p>
          <div className="mt-2 grid gap-2">
            {ROLES.map(r => {
              const active = role === r.key;
              return (
                <button
                  type="button"
                  key={r.key}
                  onClick={() => setRole(r.key)}
                  className={`rounded-lg border px-3 py-2 text-left text-xs font-semibold transition-colors ${
                    active ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold text-muted-foreground">Account Status</p>
          <div className="mt-2 flex gap-2">
            {(["Active", "Inactive"] as const).map(s => (
              <button
                type="button"
                key={s}
                onClick={() => setStatus(s)}
                className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                  status === s
                    ? s === "Active"
                      ? "border-success/50 bg-success/10 text-success"
                      : "border-danger/50 bg-danger/10 text-danger"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          {status === "Inactive" && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Inactive users cannot log in, even with correct credentials.
            </p>
          )}
        </div>

        {error && <p className="mt-3 text-xs font-medium text-danger">{error}</p>}

        <div className="mt-5 flex gap-2">
          <button type="submit" className="flex-1 rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background hover:opacity-90">Save changes</button>
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted">Cancel</button>
        </div>
      </form>
    </div>
  );
}