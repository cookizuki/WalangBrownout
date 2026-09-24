import { useEffect, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { FadeContent } from '@/Components/FadeContent';
import { DotField } from '@/Components/DotField';
import { AuthThemeToggle } from '@/Components/AuthThemeToggle';
import { BlurText } from '@/Components/BlurText';
import DriftWall from '@/Components/DriftWall';
import { PasswordInput } from '@/Components/PasswordInput';
import { PRODUCT_TILES } from '@/lib/product-tiles';
import { ROLES, roleLabel, type Role } from '@/lib/roles';
import wbLogo from '@/assets/WB LOGO.jpg';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DemoAccount {
    id: number;
    name: string;
    email: string;
    role: Role;
    roleLabel: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const initials = (name: string) =>
    name
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('');

// ---------------------------------------------------------------------------
// Login page
// ---------------------------------------------------------------------------

export default function Login({
    status,
    canResetPassword,
}: {
    status?: string;
    canResetPassword: boolean;
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false as boolean,
    });

    const [autofilled, setAutofilled] = useState(false);
    const [demoOpen, setDemoOpen] = useState(false);

    const fillFrom = (account: DemoAccount) => {
        setData((prev) => ({ ...prev, email: account.email, password: 'walangbrownout' }));
        setAutofilled(true);
        setDemoOpen(false);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
            onSuccess: () => setAutofilled(false),
        });
    };

    return (
        <>
            <Head title="Log in · WalangBrownout Inventory OS" />

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

                    {/* Ambient glow blobs — purely decorative */}
                    <div className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-foreground/4 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-foreground/3 blur-2xl" />

                    <div className="relative z-10 w-full max-w-sm">
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
                                    Log In
                                </h1>
                                <p className="mt-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                    <BlurText text="Walang Kulang, Walang Sobra." delay={300} />
                                </p>
                            </div>

                            {/* Form card */}
                            <div className="mt-8 rounded-2xl border border-border/50 bg-background/80 p-7 shadow-2xl shadow-black/[0.07] backdrop-blur-xl">
                                <form onSubmit={submit} className="space-y-5">
                                    {status && (
                                        <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
                                            {status}
                                        </p>
                                    )}

                                    {/* Email */}
                                    <div className="group">
                                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors group-focus-within:text-foreground">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            value={data.email}
                                            onChange={(e) => {
                                                setData('email', e.target.value);
                                                setAutofilled(false);
                                            }}
                                            placeholder="you@walangbrownout.ph"
                                            autoComplete="email"
                                            className="w-full rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none transition-all duration-200 focus:border-foreground/60 focus:bg-background focus:shadow-[0_0_0_3px_hsl(var(--foreground)/0.08)]"
                                        />
                                        {errors.email && (
                                            <p className="mt-1.5 text-xs font-semibold text-red-500">{errors.email}</p>
                                        )}
                                    </div>

                                    {/* Password */}
                                    <div className="group">
                                        <div className="mb-1.5 flex items-center justify-between">
                                            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors group-focus-within:text-foreground">
                                                Password
                                            </label>
                                            {canResetPassword && (
                                                <Link
                                                    href={route('password.request')}
                                                    className="text-[11px] font-semibold text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
                                                >
                                                    Forgot password?
                                                </Link>
                                            )}
                                        </div>
                                        <PasswordInput
                                            value={data.password}
                                            onChange={(e) => {
                                                setData('password', e.target.value);
                                                setAutofilled(false);
                                            }}
                                            placeholder="••••••••••"
                                            autoComplete="current-password"
                                            className="w-full rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none transition-all duration-200 focus:border-foreground/60 focus:bg-background focus:shadow-[0_0_0_3px_hsl(var(--foreground)/0.08)]"
                                        />
                                        {errors.password && (
                                            <p className="mt-1.5 text-xs font-semibold text-red-500">{errors.password}</p>
                                        )}
                                    </div>

                                    {autofilled && (
                                        <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                                            ✓ Auto-filled — click Log In to continue
                                        </p>
                                    )}

                                    {/* Primary CTA */}
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="relative w-full overflow-hidden rounded-xl bg-foreground px-6 py-3.5 text-sm font-bold text-background shadow-lg transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
                                    >
                                        {processing ? 'Logging in…' : 'Log In'}
                                    </button>
                                </form>

                                {/* Divider */}
                                <div className="my-5 flex items-center gap-3">
                                    <div className="h-px flex-1 bg-border/60" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                                        or
                                    </span>
                                    <div className="h-px flex-1 bg-border/60" />
                                </div>

                                {/* Demo access */}
                                <button
                                    type="button"
                                    onClick={() => setDemoOpen(true)}
                                    className="w-full rounded-xl border border-border/80 bg-muted/20 px-6 py-3 text-sm font-semibold text-foreground/80 shadow-sm transition-all duration-200 hover:border-foreground/30 hover:bg-muted/40 hover:text-foreground active:scale-[0.98]"
                                >
                                    Request Demo Access
                                </button>
                            </div>

                            {/* Footer link */}
                            <p className="mt-6 text-center text-xs text-muted-foreground">
                                No account yet?{' '}
                                <Link
                                    href={route('register')}
                                    className="font-bold text-foreground underline underline-offset-4 decoration-foreground/30 hover:decoration-foreground transition-all"
                                >
                                    Create one
                                </Link>
                            </p>
                        </FadeContent>
                    </div>
                </div>

                <AuthThemeToggle />

                {demoOpen && (
                    <DemoCredentialsModal onClose={() => setDemoOpen(false)} onPick={fillFrom} />
                )}
            </div>
        </>
    );
}

// ---------------------------------------------------------------------------
// Demo credentials modal
// ---------------------------------------------------------------------------

function DemoCredentialsModal({
    onClose,
    onPick,
}: {
    onClose: () => void;
    onPick: (a: DemoAccount) => void;
}) {
    const [accounts, setAccounts] = useState<DemoAccount[]>([]);
    const [filter, setFilter] = useState<Role | 'ALL'>('ALL');
    const [shown, setShown] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch demo accounts from the backend (no passwords returned)
        fetch(route('demo-accounts.index'))
            .then((r) => r.json())
            .then((data: DemoAccount[]) => {
                setAccounts(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));

        const t = window.setTimeout(() => setShown(true), 10);
        return () => window.clearTimeout(t);
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const rows = accounts.filter((a) => filter === 'ALL' || a.role === filter);

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 px-4 transition-opacity duration-200 ${shown ? 'opacity-100' : 'opacity-0'}`}
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className={`w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-xl transition-all duration-200 sm:p-7 ${shown ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-95 opacity-0'}`}
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
                    {(['ALL', ...ROLES.map((r) => r.key)] as (Role | 'ALL')[]).map((f) => (
                        <button
                            key={f}
                            type="button"
                            onClick={() => setFilter(f)}
                            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                                filter === f
                                    ? 'border-foreground bg-foreground text-background'
                                    : 'border-border text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {f === 'ALL' ? 'All roles' : roleLabel(f)}
                        </button>
                    ))}
                </div>

                <ul className="mt-4 max-h-80 space-y-2.5 overflow-y-auto">
                    {loading && (
                        <li className="py-10 text-center text-sm text-muted-foreground">Loading accounts…</li>
                    )}
                    {!loading &&
                        rows.map((a) => (
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
                                        {a.roleLabel}
                                    </span>
                                </button>
                            </li>
                        ))}
                    {!loading && rows.length === 0 && (
                        <li className="py-10 text-center text-sm text-muted-foreground">
                            No accounts for this role yet.
                        </li>
                    )}
                </ul>

                <p className="mt-5 border-t border-dashed border-border pt-4 text-xs text-muted-foreground">
                    Selecting a row fills the form behind this modal, then closes it automatically.
                </p>
            </div>
        </div>
    );
}
