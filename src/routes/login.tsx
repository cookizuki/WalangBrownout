import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { authenticate, listAccounts, roleLabel, ROLES, signIn, DEMO_PASSWORD, type Account, type Role } from "@/lib/auth";
import { FadeContent } from "@/components/FadeContent";
import wbLogo from "@/assets/WB LOGO.jpg";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in · WalangBrownout Inventory OS" },
      { name: "description", content: "Log in to WalangBrownout Inventory OS with your email and password, or try a demo account for each role." },
      { property: "og:title", content: "Log in · WalangBrownout Inventory OS" },
      { property: "og:description", content: "Sign in to the inventory command center built for your role." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

const initials = (name: string) => name.split(" ").map(w => w[0]).slice(0, 2).join("");

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [autofilled, setAutofilled] = useState(false);
  const [error, setError] = useState("");
  const [demoOpen, setDemoOpen] = useState(false);

  const fillFrom = (a: Account) => {
    setEmail(a.email);
    setPassword(a.password ?? DEMO_PASSWORD);
    setAutofilled(true);
    setError("");
    setDemoOpen(false);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) return setError("Enter your email and password.");
    const acct = authenticate(email, password);
    if (!acct) return setError("Those credentials don't match any account.");
    signIn(acct.id);
    navigate({ to: "/", replace: true });
  };

  return (
    <div className="min-h-screen bg-muted/40 px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto w-full max-w-md">
        <FadeContent>
          <div className="flex flex-col items-center text-center">
            <img
              src={wbLogo}
              alt="WalangBrownout logo"
              className="h-12 w-12 rounded-xl object-contain"
            />
          </div>
        </FadeContent>

        <FadeContent delay={60}>
          <form onSubmit={submit} className="card-surface mt-6 p-6 sm:p-8">
            <div className="text-center">
              <h1 className="font-display text-2xl font-semibold sm:text-3xl">Log In</h1>
              <p className="mt-1 text-sm text-muted-foreground">Walang Kulang, Walang Sobra.</p>
            </div>

            <label className="mt-6 block">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Email</span>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setAutofilled(false); }}
                placeholder="kim@walangbrownout.ph"
                autoComplete="email"
                className="mt-1.5 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary"
              />
            </label>

            <label className="mt-4 block">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Password</span>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setAutofilled(false); }}
                placeholder="••••••••••"
                autoComplete="current-password"
                className="mt-1.5 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary"
              />
            </label>

            {autofilled && (
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Auto-filled from demo account → click Log In to continue
              </p>
            )}

            {error && <p className="mt-3 text-xs font-medium text-danger">{error}</p>}

            <button
              type="submit"
              className="mt-5 w-full rounded-lg bg-foreground px-6 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90"
            >
              Log In
            </button>

            <p className="mt-5 text-center text-xs text-muted-foreground">
              No account yet?{" "}
              <Link to="/signup" className="font-semibold text-foreground underline underline-offset-2">
                Sign up
              </Link>
            </p>

            <div className="mt-6 border-t border-dashed border-border pt-5 text-center">
              <button
                type="button"
                onClick={() => setDemoOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
                Try a demo account
              </button>
            </div>
          </form>
        </FadeContent>
      </div>

      {demoOpen && (
        <DemoCredentialsModal onClose={() => setDemoOpen(false)} onPick={fillFrom} />
      )}
    </div>
  );
}

function DemoCredentialsModal({
  onClose, onPick,
}: { onClose: () => void; onPick: (a: Account) => void }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [filter, setFilter] = useState<Role | "ALL">("ALL");
  const [shown, setShown] = useState(false);

  useEffect(() => {
    setAccounts(listAccounts());
    const t = window.setTimeout(() => setShown(true), 10);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const rows = accounts.filter(a => filter === "ALL" || a.role === filter);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 px-4 transition-opacity duration-200 ${
        shown ? "opacity-100" : "opacity-0"
      }`}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className={`w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-xl transition-all duration-200 sm:p-7 ${
          shown ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-95 opacity-0"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold">Try a demo account</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick a role — it fills the login form. You still click Log In.
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

        <div className="mt-4 flex flex-wrap gap-2">
          {(["ALL", ...ROLES.map(r => r.key)] as (Role | "ALL")[]).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                filter === f
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "ALL" ? "All roles" : roleLabel(f)}
            </button>
          ))}
        </div>

        <ul className="mt-4 max-h-80 space-y-2.5 overflow-y-auto">
          {rows.map(a => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => onPick(a)}
                className="flex w-full items-center gap-3 rounded-xl border border-dashed border-border px-3.5 py-3 text-left transition-colors hover:border-foreground hover:bg-muted/50"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-bold">
                  {initials(a.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{a.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{a.email}</span>
                </span>
                <span className="hidden shrink-0 rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold text-muted-foreground sm:inline">
                  {roleLabel(a.role)}
                </span>
              </button>
            </li>
          ))}
          {rows.length === 0 && (
            <li className="py-10 text-center text-sm text-muted-foreground">No accounts for this role yet.</li>
          )}
        </ul>

        <p className="mt-5 border-t border-dashed border-border pt-4 text-xs text-muted-foreground">
          Selecting a row fills the form behind this modal, then closes it automatically.
        </p>
      </div>
    </div>
  );
}