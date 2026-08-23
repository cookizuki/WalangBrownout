import { useEffect, useState, type ReactNode } from "react";
import { AnimatedItem } from "@/components/AnimatedList";
import { FadeContent } from "@/components/FadeContent";
import { money, pendingApprovals, type PendingPO } from "@/lib/inventory-data";
import { createAccount, DEMO_PASSWORD, listAccounts, ROLES, roleLabel, type Account, type Role } from "@/lib/auth";

const initials = (name: string) =>
  name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

export function AdminPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [pending, setPending] = useState<PendingPO[]>(pendingApprovals);
  const [leaving, setLeaving] = useState<string[]>([]);

  useEffect(() => setAccounts(listAccounts()), []);

  const resolvePO = (id: string) => {
    if (leaving.includes(id)) return;
    setLeaving(l => [...l, id]);
    window.setTimeout(() => setPending(p => p.filter(po => po.id !== id)), 350);
  };

  return (
    <div className="space-y-6">
      {/* Section 1 — user management */}
      <section className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Section 1 — user management (System Administrator responsibility)
        </p>
        <div className="card-surface">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold">Users</h2>
              <p className="text-xs text-muted-foreground">Manage accounts, roles, and access</p>
            </div>
            <button
              onClick={() => setShowForm(v => !v)}
              className="rounded-md bg-foreground px-4 py-2 text-xs font-semibold text-background transition-opacity hover:opacity-90"
            >
              {showForm ? "Cancel" : "+ Add User"}
            </button>
          </div>

          {showForm && (
            <FadeContent className="border-b border-border px-5 py-4">
              <AddUserForm
                onCreate={acct => {
                  setAccounts(a => [...a, acct]);
                  setShowForm(false);
                }}
              />
            </FadeContent>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-semibold">User</th>
                  <th className="px-5 py-3 font-semibold">Email</th>
                  <th className="px-5 py-3 font-semibold">Role</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {accounts.map((a, i) => (
                  <AnimatedRow key={a.id} delay={i * 60}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-bold">
                          {initials(a.name)}
                        </span>
                        <span className="font-semibold">{a.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{a.email}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex rounded-full border border-border px-3 py-1 text-[11px] font-semibold text-muted-foreground">
                        {roleLabel(a.role)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-success">
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        Active
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <button className="text-xs font-medium underline underline-offset-4 hover:text-foreground/70">
                        Edit
                      </button>
                    </td>
                  </AnimatedRow>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-border px-5 py-3 text-[10px] uppercase tracking-widest text-muted-foreground">
            User table — mirrors the Users entity (UserID, RoleID, Status)
          </p>
        </div>
      </section>

      {/* Section 2 — PO approval queue */}
      <section className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Section 2 — purchase order approval queue (Purchasing Manager responsibility)
        </p>
        <div className="card-surface">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold">Pending Purchase Orders</h2>
            <span className="rounded-full border border-border px-3 py-1 text-[11px] font-semibold text-muted-foreground">
              {pending.length} PENDING
            </span>
          </div>

          <ul className="space-y-3 px-5 py-4">
            {pending.map((po, i) => (
              <AnimatedItem key={po.id} delay={i * 60}>
                <div
                  className={`rounded-lg border border-dashed border-border p-4 transition-opacity duration-300 ease-out motion-reduce:transition-none ${
                    leaving.includes(po.id) ? "opacity-40" : "opacity-100"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-baseline gap-3">
                        <span className="text-sm font-semibold">{po.id}</span>
                        <span className="text-sm text-muted-foreground">{po.supplier}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-muted-foreground">
                        <span>{po.itemLabel} × {po.quantity}</span>
                        <span className="font-semibold text-foreground">{money(po.totalCost)}</span>
                        <span>
                          Requested by {po.requestedBy} ·{" "}
                          {new Date(po.requestedAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => resolvePO(po.id)}
                        disabled={leaving.includes(po.id)}
                        className="rounded-md bg-foreground px-4 py-1.5 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {leaving.includes(po.id) ? "Approved" : "Approve"}
                      </button>
                      <button
                        onClick={() => resolvePO(po.id)}
                        disabled={leaving.includes(po.id)}
                        className="rounded-md border border-border px-4 py-1.5 text-xs font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              </AnimatedItem>
            ))}
          </ul>

          <div className="px-5 pb-5">
            <div className="flex min-h-24 items-center justify-center rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              {pending.length === 0
                ? "No purchase orders waiting — the queue is clear."
                : "No other approvals pending — you're all caught up"}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function AddUserForm({ onCreate }: { onCreate: (a: Account) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("INVENTORY_STAFF");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return setError("Name and email are required.");
    setError("");
    onCreate(createAccount({ name, email, password: DEMO_PASSWORD, role }));
    setName("");
    setEmail("");
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs font-medium">
          <span>Name</span>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Full name"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </label>
        <label className="space-y-1 text-xs font-medium">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="name@walangbrownout.ph"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </label>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium">Role</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {ROLES.map(r => {
            const active = role === r.key;
            return (
              <button
                type="button"
                key={r.key}
                onClick={() => setRole(r.key)}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <button
        type="submit"
        className="rounded-md bg-foreground px-4 py-2 text-xs font-semibold text-background transition-opacity hover:opacity-90"
      >
        Create user
      </button>
    </form>
  );
}

function AnimatedRow({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setShown(true), delay);
    return () => window.clearTimeout(t);
  }, [delay]);
  return (
    <tr
      className={`transition-all duration-300 ease-out hover:bg-muted/50 motion-reduce:transition-none ${
        shown ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
      }`}
    >
      {children}
    </tr>
  );
}
