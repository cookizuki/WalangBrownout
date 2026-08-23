import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { authenticate, listAccounts, roleLabel, ROLES, signIn, DEMO_PASSWORD, type Account, type Role } from "@/lib/auth";
import { FadeContent } from "@/components/FadeContent";
import wbLogoInfo from "@/assets/wb-logo.jpg.asset.json";
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
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [filter, setFilter] = useState<Role | "ALL">("ALL");
  const [picked, setPicked] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [autofilled, setAutofilled] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setAccounts(listAccounts()), []);

  const rows = accounts.filter(a => filter === "ALL" || a.role === filter);

  const fillFrom = (a: Account) => {
    setPicked(a.id);
    setEmail(a.email);
    setPassword(a.password ?? DEMO_PASSWORD);
    setAutofilled(true);
    setError("");
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
    <div className="min-h-screen bg-muted/40 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-6xl">
        <FadeContent>
          <div className="flex items-center gap-2">
            <img
              src={wbLogo}
              alt="WalangBrownout logo"
              className="h-8 w-8 rounded-md object-contain"
            />
            <span className="font-semibold">WalangBrownout · Inventory OS</span>
          </div>
        </FadeContent>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {/* Login form */}
          <FadeContent delay={60}>
            <div className="h-full">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Login form</p>
              <form onSubmit={submit} className="card-surface h-full p-5 sm:p-7">
                <h1 className="font-display text-2xl font-semibold sm:text-3xl">Log In</h1>
                <p className="mt-1 text-sm text-muted-foreground">Walang Kulang, Walang Sobra.</p>

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
                    Auto-filled from demo panel → click Log In to continue
                  </p>
                )}

                {error && <p className="mt-3 text-xs font-medium text-danger">{error}</p>}

                <button
                  type="submit"
                  className="mt-5 w-full rounded-lg bg-foreground px-6 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90"
                >
                  Log In
                </button>

                <p className="mt-5 text-xs text-muted-foreground">
                  No account yet?{" "}
                  <Link to="/signup" className="font-semibold text-foreground underline underline-offset-2">
                    Sign up
                  </Link>
                </p>
              </form>
            </div>
          </FadeContent>

          {/* Demo credentials panel */}
          <FadeContent delay={140}>
            <div className="h-full">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Demo credentials panel
              </p>
              <div className="card-surface h-full p-5 sm:p-7">
                <h2 className="font-display text-lg font-semibold">Try a demo account</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pick a role — it fills the form on the left. You still click Log In.
                </p>

                <p className="mt-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Role filter pills
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
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

                <ul className="mt-4 space-y-2.5">
                  {rows.map(a => {
                    const active = picked === a.id;
                    return (
                      <li key={a.id}>
                        <button
                          type="button"
                          onClick={() => fillFrom(a)}
                          className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors ${
                            active ? "border-foreground bg-muted" : "border-dashed border-border hover:bg-muted/50"
                          }`}
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
                          <span
                            className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${
                              active ? "border-foreground bg-foreground" : "border-border"
                            }`}
                          >
                            {active && <span className="h-1.5 w-1.5 rounded-full bg-background" />}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                  {rows.length === 0 && (
                    <li className="py-10 text-center text-sm text-muted-foreground">No accounts for this role yet.</li>
                  )}
                </ul>

                <p className="mt-5 border-t border-dashed border-border pt-4 text-xs text-muted-foreground">
                  Clicking a demo row fills Email + Password on the left. It does not log you in automatically.
                </p>
              </div>
            </div>
          </FadeContent>
        </div>
      </div>
    </div>
  );
}
