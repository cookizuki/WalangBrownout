import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { ThemeToggle } from '@/Components/ThemeToggle';
import { NotificationBell } from '@/Components/NotificationBell';
import { QuickActionMenu } from '@/Components/QuickActionMenu';
import { CommandPalette } from '@/Components/CommandPalette';
import { FadeContent } from '@/Components/FadeContent';
import { roleLabel } from '@/lib/roles';
import wbLogo from '@/assets/WB LOGO.jpg';
import { LayoutDashboard, Package, Layers, Bell, CalendarCheck2, ClipboardList, History, ShoppingCart, Boxes, Truck, ShieldCheck, BarChart3, Receipt, FileCheck2, Tags, Warehouse, KeyRound, LogOut, Menu, X, type LucideIcon } from 'lucide-react';
export type NavItem = { key: string; title: string; subtitle: string; url: string };
const SearchContext = createContext({ query: '', setQuery: (_value: string) => {} });
export const useAppSearch = () => useContext(SearchContext);
const TAB_ICONS: Record<string, LucideIcon> = {
  overview: LayoutDashboard,
  inventory: Package,
  batches: Layers,
  alerts: Bell,
  myday: CalendarCheck2,
  counts: ClipboardList,
  txlog: History,
  reorder: ShoppingCart,
  picks: Boxes,
  receiving: Truck,
  admin: ShieldCheck,
  reports: BarChart3,
  salesorders: Receipt,
  poapprovals: FileCheck2,
  products: Tags,
  suppliers: Warehouse,
  permissions: KeyRound,
};

export default function AppLayout({ children }: { children: ReactNode }) {
  const page = usePage(); const user = page.props.auth.user;
  const shell = page.props.shell as { navigation: NavItem[]; openAlerts: number };
  const nav = shell?.navigation ?? []; const pages = Object.fromEntries(nav.map(item => [item.key, item]));
  const current = nav.find(item => page.url.split('?')[0] === item.url);
  const [query, setQuery] = useState(''); const [mobile, setMobile] = useState(false); const [paletteOpen, setPaletteOpen] = useState(false);
  useEffect(() => { setMobile(false); }, [page.url]);
  const select = (key: string) => { setMobile(false); router.visit(pages[key].url); };
  const sidebar = { tab: current?.key ?? '', tabs: nav.map(item => item.key), pages, setTab: select, openAlerts: shell?.openAlerts ?? 0, name: user.name, role: roleLabel(user.role!), onSignOut: () => router.post(route('logout')) };
  return <SearchContext.Provider value={{ query, setQuery }}><div className="flex min-h-screen bg-background text-foreground">
    <SideNav {...sidebar} />
    <Dialog open={mobile} onClose={setMobile} className="relative z-50 md:hidden"><div className="fixed inset-0 bg-foreground/50" aria-hidden="true" /><DialogPanel className="fixed inset-y-0 left-0 w-64 max-w-[85vw] overflow-y-auto"><DialogTitle className="sr-only">Navigation</DialogTitle><button className="absolute right-2 top-2 z-10 p-2" aria-label="Close navigation" onClick={() => setMobile(false)}><X className="h-4 w-4" /></button><SideNav {...sidebar} mobile /></DialogPanel></Dialog>
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="print:hidden sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur-md sm:px-6">
        <button className="rounded-lg border border-border p-2 md:hidden" aria-label="Open navigation" onClick={() => setMobile(true)}><Menu className="h-5 w-5" /></button>
        <div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{roleLabel(user.role!)}</p><h1 className="truncate font-display text-xl font-bold">{current?.title ?? (page.url.startsWith('/admin/audit') ? 'Audit Log' : 'Profile')}</h1><p className="hidden text-xs text-muted-foreground sm:block">{current?.subtitle}</p></div>
        {['overview','inventory'].includes(current?.key ?? '') && <input aria-label="Search products and SKUs" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search products, SKUs..." className="order-last w-full rounded-xl border border-border bg-muted/50 px-4 py-2 text-sm md:order-none md:w-64" />}
        <button aria-label="Open command palette" onClick={() => setPaletteOpen(true)} className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground">Ctrl / ⌘ K</button><NotificationBell />
      </header>
      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-7"><FadeContent key={page.component}>{children}</FadeContent></main>
      <div className="print:hidden">{(user.role === 'ADMIN' || user.role === 'WAREHOUSE_STAFF') && <QuickActionMenu />}</div>
      <CommandPalette navigation={nav} role={user.role!} open={paletteOpen} setOpen={setPaletteOpen} />
    </div>
  </div></SearchContext.Provider>;
}
function SideNav({
  tab, setTab, openAlerts, tabs, name, role, onSignOut, pages, mobile = false,
}: {
  tab: string; setTab: (t: string) => void; openAlerts: number; tabs: string[];
  pages: Record<string, NavItem>; name: string; role: string; onSignOut: () => void; mobile?: boolean;
}) {
  return (
    <aside
      className={
        mobile
          ? "flex h-full w-full flex-col bg-surface"
          : "print:hidden hidden w-60 shrink-0 flex-col border-r border-border bg-surface md:sticky md:top-0 md:flex md:h-screen md:overflow-y-auto"
      }
    >
      {/* Logo */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-foreground shadow-sm">
            <img src={wbLogo} alt="WalangBrownout logo" className="h-5 w-5 rounded-md object-cover brightness-0 invert dark:brightness-100 dark:invert-0" />
          </div>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-bold tracking-tight">WalangBrownout</div>
            <div className="text-[10px] text-muted-foreground">Inventory OS</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div className="px-3 pb-2">
        <p className="px-2 pb-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground/60">Navigation</p>
        <nav className="flex flex-col gap-0.5">
          {tabs.map(key => {
            const active = tab === key;
            const Icon = TAB_ICONS[key];
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-all duration-150 ${
                  active
                    ? "bg-foreground font-semibold text-background shadow-sm"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2.5 : 2} />
                  {pages[key].title}
                </span>
                {key === "alerts" && openAlerts > 0 && (
                  <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${active ? "bg-background text-foreground" : "bg-danger text-white"}`}>
                    {openAlerts}
                  </span>
                )}
                {key === "admin" && (
                  <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${active ? "bg-background/20 text-background" : "bg-muted text-muted-foreground"}`}>
                    ADM
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom section */}
      <div className="mt-auto border-t border-border px-5 py-5">
        <div className="mb-4">
          <LiveClock />
        </div>

        {/* User card */}
        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-foreground text-[11px] font-bold text-background">
              {name.split(" ").map(w => w[0]).slice(0, 2).join("")}
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-sm font-semibold">{name}</div>
              <div className="truncate text-[10px] text-muted-foreground">{role}</div>
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between">
            <ThemeToggle />
          </div>
          <button
            onClick={onSignOut}
            className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-background/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}

function LiveClock() {
  const [now, setNow] = useState<string>("");

  useEffect(() => {
    const tick = () => setNow(new Date().toLocaleTimeString("en-PH", { hour12: true }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="text-left">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
        Live system clock
      </p>
      <div className="flex items-center justify-start gap-1.5 font-mono text-sm text-foreground">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
        {now || "--:--:--"}
      </div>
    </div>
  );
}

