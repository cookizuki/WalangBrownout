import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { createAccount, emailTaken, ROLES, signIn, type Role } from "@/lib/auth";
import { FadeContent } from "@/components/FadeContent";
import { DotField } from "@/components/DotField";
import { AuthThemeToggle } from "@/components/AuthThemeToggle";
import { BlurText } from "@/components/BlurText";
import DriftWall from "@/components/DriftWall";
import { PRODUCT_TILES } from "@/lib/product-tiles";
import { PasswordInput } from "@/components/PasswordInput";
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

const labelCls = "mb-1.5 block text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors group-focus-within:text-foreground";
const inputCls =
  "w-full rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none transition-all duration-200 focus:border-foreground/60 focus:bg-background focus:shadow-[0_0_0_3px_hsl(var(--foreground)/0.08)]";

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
    <div className="relative flex min-h-screen w-full overflow-hidden">
      {/* Left panel — full-bleed product gallery */}
      <div className="relative hidden w-1/2 bg-[#16181c] md:block">
        <DriftWall
          items={PRODUCT_TILES}
          columns={5}
          tileWidth={160}
          tileHeight={115}
          gap={12}
          radius={12}
          tilt={18}
          turn={-14}
          depth={120}
          perspective={1100}
          speed={28}
          variance={0.38}
          parallax={0.55}
          lift={44}
          fade={0.55}
          dim={0.48}
          overlayColor="#16181c"
          showTooltip
        />
      </div>

      {/* Right panel */}
      <div className="relative flex w-full items-center justify-center overflow-hidden bg-muted/40 px-4 py-12 sm:px-8 md:w-1/2">
        <DotField />

        {/* Ambient glow blobs */}
        <div className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-foreground/[0.04] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-foreground/[0.03] blur-2xl" />

        <div className="relative z-10 w-full max-w-md">
          <FadeContent>
            {/* Top badge */}
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-2.5 rounded-full border border-border/80 bg-background/80 px-4 py-1.5 shadow-sm backdrop-blur-sm">
                <img src={wbLogo} alt="" className="h-5 w-5 rounded-md object-contain" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/60">
                  WalangBrownout Inventory OS
                </span>
              </div>
            </div>

            {/* Heading */}
            <div className="mt-6 text-center">
              <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
                Create an account
              </h1>
              <p className="mt-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                <BlurText text="Walang Kulang, Walang Sobra." delay={300} />
              </p>
            </div>

            {/* Form card */}
            <div className="mt-8 rounded-2xl border border-border/50 bg-background/80 p-7 shadow-2xl shadow-black/[0.07] backdrop-blur-xl">
              <form onSubmit={submit} className="space-y-4">

                {/* Name row */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="group">
                    <label className={labelCls}>First name</label>
                    <input value={first} onChange={e => setFirst(e.target.value)} maxLength={40} placeholder="Kim" className={inputCls} />
                  </div>
                  <div className="group">
                    <label className={labelCls}>Last name</label>
                    <input value={last} onChange={e => setLast(e.target.value)} maxLength={40} placeholder="Maturan" className={inputCls} />
                  </div>
                </div>

                {/* Email */}
                <div className="group">
                  <label className={labelCls}>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    maxLength={120}
                    placeholder="you@walangbrownout.ph"
                    className={inputCls}
                  />
                </div>

                {/* Username */}
                <div className="group">
                  <label className={labelCls}>Username</label>
                  <input
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    maxLength={40}
                    placeholder="kmaturan"
                    className={inputCls}
                  />
                </div>

                {/* Password row */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="group">
                    <label className={labelCls}>Password</label>
                    <PasswordInput
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••••"
                      className={inputCls}
                    />
                  </div>
                  <div className="group">
                    <label className={labelCls}>Confirm password</label>
                    <PasswordInput
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="••••••••••"
                      className={inputCls}
                    />
                  </div>
                </div>

                {/* Role selector */}
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Role — select one
                  </p>
                  <div className="flex flex-col gap-2">
                    {ROLES.map(r => {
                      const active = role === r.key;
                      return (
                        <button
                          key={r.key}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => { setRole(r.key); setError(""); }}
                          className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-200 ${
                            active
                              ? "border-foreground bg-foreground text-background shadow-lg"
                              : "border-border bg-muted/20 hover:border-foreground/30 hover:bg-muted/40"
                          }`}
                        >
                          <span
                            className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 transition-colors ${
                              active ? "border-background" : "border-border"
                            }`}
                          >
                            {active && <span className="h-1.5 w-1.5 rounded-full bg-background" />}
                          </span>
                          <span className="text-sm font-semibold">{r.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {error && (
                  <p className="rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-xs font-semibold text-danger">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full rounded-xl bg-foreground px-6 py-3.5 text-sm font-bold text-background shadow-lg transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
                >
                  Sign Up
                </button>
              </form>
            </div>

            {/* Footer link */}
            <p className="mt-6 text-center text-xs text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="font-bold text-foreground underline underline-offset-4 decoration-foreground/30 hover:decoration-foreground transition-all">
                Log in
              </Link>
            </p>
          </FadeContent>
        </div>
      </div>

      <AuthThemeToggle />
    </div>
  );
}
