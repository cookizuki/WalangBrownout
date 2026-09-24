import { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { FadeContent } from '@/Components/FadeContent';
import { DotField } from '@/Components/DotField';
import { AuthThemeToggle } from '@/Components/AuthThemeToggle';
import { BlurText } from '@/Components/BlurText';
import DriftWall from '@/Components/DriftWall';
import { PasswordInput } from '@/Components/PasswordInput';
import { PRODUCT_TILES } from '@/lib/product-tiles';
import { ROLES, type Role } from '@/lib/roles';
import wbLogo from '@/assets/WB LOGO.jpg';

const labelCls =
    'mb-1.5 block text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors group-focus-within:text-foreground';
const inputCls =
    'w-full rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none transition-all duration-200 focus:border-foreground/60 focus:bg-background focus:shadow-[0_0_0_3px_hsl(var(--foreground)/0.08)]';

export default function Register() {
    const { data, setData, post, processing, errors } = useForm<{
        name: string;
        email: string;
        password: string;
        password_confirmation: string;
        role: Role | '';
    }>({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        role: '',
    });

    // Split name into first/last for the UI, then combine on submit
    const [first, setFirst] = useState('');
    const [last, setLast] = useState('');

    const handleFirstChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFirst(e.target.value);
        setData('name', `${e.target.value.trim()} ${last.trim()}`.trim());
    };

    const handleLastChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLast(e.target.value);
        setData('name', `${first.trim()} ${e.target.value.trim()}`.trim());
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('register'));
    };

    return (
        <>
            <Head title="Create an account · WalangBrownout Inventory OS" />

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
                                            <input
                                                value={first}
                                                onChange={handleFirstChange}
                                                maxLength={40}
                                                placeholder="Kim"
                                                className={inputCls}
                                            />
                                        </div>
                                        <div className="group">
                                            <label className={labelCls}>Last name</label>
                                            <input
                                                value={last}
                                                onChange={handleLastChange}
                                                maxLength={40}
                                                placeholder="Maturan"
                                                className={inputCls}
                                            />
                                        </div>
                                    </div>
                                    {errors.name && (
                                        <p className="text-xs font-semibold text-red-500">{errors.name}</p>
                                    )}

                                    {/* Email */}
                                    <div className="group">
                                        <label className={labelCls}>Email</label>
                                        <input
                                            type="email"
                                            value={data.email}
                                            onChange={(e) => setData('email', e.target.value)}
                                            maxLength={120}
                                            placeholder="you@walangbrownout.ph"
                                            className={inputCls}
                                        />
                                        {errors.email && (
                                            <p className="mt-1.5 text-xs font-semibold text-red-500">{errors.email}</p>
                                        )}
                                    </div>

                                    {/* Password row */}
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="group">
                                            <label className={labelCls}>Password</label>
                                            <PasswordInput
                                                value={data.password}
                                                onChange={(e) => setData('password', e.target.value)}
                                                placeholder="••••••••••"
                                                autoComplete="new-password"
                                                className={inputCls}
                                            />
                                            {errors.password && (
                                                <p className="mt-1.5 text-xs font-semibold text-red-500">{errors.password}</p>
                                            )}
                                        </div>
                                        <div className="group">
                                            <label className={labelCls}>Confirm password</label>
                                            <PasswordInput
                                                value={data.password_confirmation}
                                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                                placeholder="••••••••••"
                                                autoComplete="new-password"
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
                                            {ROLES.map((r) => {
                                                const active = data.role === r.key;
                                                return (
                                                    <button
                                                        key={r.key}
                                                        type="button"
                                                        role="radio"
                                                        aria-checked={active}
                                                        onClick={() => setData('role', r.key)}
                                                        className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-200 ${
                                                            active
                                                                ? 'border-foreground bg-foreground text-background shadow-lg'
                                                                : 'border-border bg-muted/20 hover:border-foreground/30 hover:bg-muted/40'
                                                        }`}
                                                    >
                                                        <span
                                                            className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 transition-colors ${
                                                                active ? 'border-background' : 'border-border'
                                                            }`}
                                                        >
                                                            {active && (
                                                                <span className="h-1.5 w-1.5 rounded-full bg-background" />
                                                            )}
                                                        </span>
                                                        <span className="text-sm font-semibold">{r.label}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {errors.role && (
                                            <p className="mt-1.5 text-xs font-semibold text-red-500">{errors.role}</p>
                                        )}
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="w-full rounded-xl bg-foreground px-6 py-3.5 text-sm font-bold text-background shadow-lg transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
                                    >
                                        {processing ? 'Creating account…' : 'Sign Up'}
                                    </button>
                                </form>
                            </div>

                            {/* Footer link */}
                            <p className="mt-6 text-center text-xs text-muted-foreground">
                                Already have an account?{' '}
                                <Link
                                    href={route('login')}
                                    className="font-bold text-foreground underline underline-offset-4 decoration-foreground/30 hover:decoration-foreground transition-all"
                                >
                                    Log in
                                </Link>
                            </p>
                        </FadeContent>
                    </div>
                </div>

                <AuthThemeToggle />
            </div>
        </>
    );
}
