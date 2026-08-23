import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { createAccount, emailTaken, ROLES, signIn, type Role } from "@/lib/auth";
import { FadeContent } from "@/components/FadeContent";
import { DotField } from "@/components/DotField";
import { AuthThemeToggle } from "@/components/AuthThemeToggle";
import wbLogo from "@/assets/WB LOGO.jpg";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create an account · WalangBrownout Inventory OS" },
      { name: "description", content: "Create a WalangBrownout Inventory OS account as an administrator, inventory staff, or warehouse staff and get a workspace built for your role." },
      { property: "og:title", content: "Create an account · WalangBrownout Inventory OS" },
      { property: "og:description", content: "Pick your role — administrator, inventory staff, or warehouse staff — and get a workspace built for it." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SignUpPage,
});

const labelCls = "text-[10px] font-semibold uppercase tracking-widest text-muted-foreground";
const inputCls =
  "mt-1.5 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary";

function SignUpPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role | null>(null);
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (first.trim().length < 2 || last.trim().length < 2) return setError("Enter your first and last name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Enter a valid email address.");
    if (emailTaken(email)) return setError("An account with that email already exists.");
    if (username.trim().length < 3) return setError("Pick a username with at least 3 characters.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    if (!role) return setError("Select the role this account will use.");

    const acct = createAccount({
      name: `${first.trim()} ${last.trim()}`,
      email,
      username,
      password,
      role,
    });
    signIn(acct.id);
    navigate({ to: "/", replace: true });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-muted/40 px-4 py-10 sm:px-6 sm:py-16">
      <DotField />
      <AuthThemeToggle />

      <div className="relative z-10 mx-auto w-full max-w-xl">
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
              <h1 className="font-display text-2xl font-semibold sm:text-3xl">Create an account</h1>
              <p className="mt-1 text-sm text-muted-foreground">Walang Kulang, Walang Sobra.</p>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={labelCls}>First name</span>
                <input value={first} onChange={e => setFirst(e.target.value)} maxLength={40} placeholder="Kim" className={inputCls} />
              </label>
              <label className="block">
                <span className={labelCls}>Last name</span>
                <input value={last} onChange={e => setLast(e.target.value)} maxLength={40} placeholder="Maturan" className={inputCls} />
              </label>
            </div>

            <label className="mt-4 block">
              <span className={labelCls}>Email</span>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                maxLength={120}
                placeholder="kim@walangbrownout.ph"
                className={inputCls}
              />
            </label>

            <label className="mt-4 block">
              <span className={labelCls}>Username</span>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                maxLength={40}
                placeholder="kmaturan"
                className={inputCls}
              />
            </label>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={labelCls}>Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className={labelCls}>Confirm password</span>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••••"
                  className={inputCls}
                />
              </label>
            </div>

            <div className="mt-5">
              <p className={labelCls}>Role — select one</p>
              <div className="mt-2 grid gap-3 sm:grid-cols-3">
                {ROLES.map(r => {
                  const active = role === r.key;
                  return (
                    <button
                      key={r.key}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => { setRole(r.key); setError(""); }}
                      className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-left transition-colors ${
                        active
                          ? "border-foreground bg-foreground text-background"
                          : "border-dashed border-border hover:bg-muted/50"
                      }`}
                    >
                      <span
                        className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${
                          active ? "border-background" : "border-border"
                        }`}
                      >
                        {active && <span className="h-1.5 w-1.5 rounded-full bg-background" />}
                      </span>
                      <span className="text-sm font-semibold leading-tight">{r.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {error && <p className="mt-4 text-xs font-medium text-danger">{error}</p>}

            <button
              type="submit"
              className="mt-5 w-full rounded-lg bg-foreground px-6 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90"
            >
              Sign Up
            </button>

            <p className="mt-5 text-center text-xs text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-foreground underline underline-offset-2">
                Log in
              </Link>
            </p>
          </form>
        </FadeContent>
      </div>
    </div>
  );
}