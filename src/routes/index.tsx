import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  batches, cycleCounts, locations, onHand, pickTasks, products,
  purchaseOrders, receivingLines, ropSeasonal, ropStandard, suppliers, transactions,
  money, type ABC, type Alert, type AlertType,
} from "@/lib/inventory-data";
import { ThemeToggle } from "@/components/ThemeToggle";
import { roleLabel, useSession, type Role } from "@/lib/auth";
import { CountUp } from "@/components/CountUp";
import { AnimatedItem } from "@/components/AnimatedList";
import { AdminPage } from "@/components/AdminPage";
import { StockCountsPage, TransactionLogPage, BatchesPage } from "@/components/ops-pages";
import {
  Th, Td, SectionLabel, Panel, TaskPill, StatusPill, AnimatedRow,
  TimeAgo, daysLeft, titleCase,
} from "@/components/ui-bits";
import { DraftPOAction } from "@/components/DraftPOAction";
import { useOps, useAlerts } from "@/lib/ops-store";
import { FIFOExceptionPopover } from "@/components/FIFOExceptionPopover";
import { ReceivingEntryModal } from "@/components/ReceivingEntryModal";
import { QuickActionMenu } from "@/components/QuickActionMenu";
import { SeasonalConfigPanel } from "@/components/SeasonalConfigPanel";
import { ReportsPage } from "@/components/ReportsPage";
import { ScanInput } from "@/components/ScanInput";
import { toast } from "sonner";
import { CommandPalette } from "@/components/CommandPalette";
import { TxTypeBadge } from "@/lib/tx-type-styles";
import wbLogo from "@/assets/WB LOGO.jpg";



export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "WalangBrownout · Real-Time Inventory OS" },
      { name: "description", content: "Walang Kulang, Walang Sobra — real-time inventory management for WalangBrownout Appliances. FIFO batches, ABC classification, seasonal reorder alerts." },
      { property: "og:title", content: "WalangBrownout · Real-Time Inventory OS" },
      { property: "og:description", content: "Walang Kulang, Walang Sobra — real-time inventory management for WalangBrownout Appliances. FIFO batches, ABC classification, seasonal reorder alerts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

type Tab =
  | "overview" | "inventory" | "batches" | "alerts"
  | "myday" | "counts" | "txlog" | "reorder"
  | "picks" | "receiving" | "admin" | "reports";

const PAGE_META: Record<Tab, { title: string; subtitle: string }> = {
  overview: { title: "Overview", subtitle: "Real-time status" },
  inventory: { title: "Inventory", subtitle: "All tracked SKUs, live stock levels" },
  batches: { title: "Batches", subtitle: "FIFO-ordered lots and expiry tracking" },
  alerts: { title: "Alerts", subtitle: "Reorder and expiry notifications" },
  myday: { title: "My Day", subtitle: "Your assigned work for today" },
  counts: { title: "Stock Counts", subtitle: "Cycle counts and variance logging" },
  txlog: { title: "Transaction Log", subtitle: "Every recorded stock movement" },
  reorder: { title: "Reorder Review", subtitle: "ROP breaches queued for purchasing" },
  picks: { title: "Pick Tasks", subtitle: "FIFO-enforced picking queue" },
  receiving: { title: "Receiving", subtitle: "Inbound POs, putaway and location" },
  admin: { title: "Admin", subtitle: "User management and purchase order approvals" },
  reports: { title: "Reports", subtitle: "Shrinkage and sales velocity history" },
};

const ROLE_NAV: Record<Role, Tab[]> = {
  ADMIN: ["overview", "inventory", "batches", "alerts", "reports", "admin"],
  INVENTORY_STAFF: ["myday", "inventory", "counts", "txlog", "reorder", "batches", "alerts"],
  WAREHOUSE_STAFF: ["myday", "counts", "picks", "receiving", "batches", "alerts"],
};

function Dashboard() {
  const navigate = useNavigate();
  const { account, ready, signOut } = useSession();
  const [tab, setTab] = useState<Tab>("overview");
  const [query, setQuery] = useState("");
  const [acked, setAcked] = useState<string[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (ready && !account) navigate({ to: "/login", replace: true });
  }, [ready, account, navigate]);

  useEffect(() => {
    if (account) setTab(ROLE_NAV[account.role][0]!);
  }, [account?.role]);

  const allAlerts = useAlerts();
  const alerts = allAlerts.filter(a => !acked.includes(a.id));
  const openAlerts = alerts.length;

  if (!ready || !account) {
    return (
      <div className="grid min-h-screen place-items-center bg-muted/40 text-sm text-muted-foreground">
        Loading your workspace…
      </div>
    );
  }

  const navTabs = ROLE_NAV[account.role];
  if (!navTabs.includes(tab)) setTab(navTabs[0]!);
  const meta = PAGE_META[tab];
  const showSearch = tab === "overview" || tab === "inventory";

  const select = (t: Tab) => {
    setTab(t);
    setMenuOpen(false);
  };

  const handleSignOut = () => {
    signOut();
    navigate({ to: "/login", replace: true });
  };

  const nav = (
    <SideNav
      tab={tab}
      setTab={select}
      openAlerts={openAlerts}
      tabs={navTabs}
      name={account.name}
      role={roleLabel(account.role)}
      onSignOut={handleSignOut}
    />
  );

  return (
    <div className="flex min-h-screen bg-muted/40">
      {nav}

      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/40 md:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden
        />
      )}
      {menuOpen && (
        <div className="fixed inset-y-0 left-0 z-50 w-64 max-w-[80vw] md:hidden">
          <SideNav
            tab={tab}
            setTab={select}
            openAlerts={openAlerts}
            tabs={navTabs}
            name={account.name}
            role={roleLabel(account.role)}
            onSignOut={handleSignOut}
            mobile
          />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3 md:hidden">
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Open navigation"
            className="relative shrink-0 rounded-md border border-border px-3 py-1.5 text-sm"
          >
            ☰
            {openAlerts > 0 && (
              <span className="absolute -right-1.5 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-bold text-background">
                {openAlerts}
              </span>
            )}
          </button>
          <div className="flex min-w-0 items-center justify-end gap-2">
            <span className="truncate font-semibold">Inventory OS</span>
            <img
              src={wbLogo}
              alt="WalangBrownout logo"
              className="h-7 w-7 shrink-0 rounded-md object-cover"
            />

          </div>
        </div>

        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-surface px-4 py-4 sm:px-6 md:flex md:flex-wrap md:gap-4">
          <div className="min-w-0 md:flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {roleLabel(account.role)}
            </p>
            <h1 className="truncate font-display text-xl font-semibold leading-tight sm:text-2xl">{meta.title}</h1>
            <p className="truncate text-xs text-muted-foreground">{meta.subtitle}</p>
          </div>
          <span className="hidden shrink-0 items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[10px] font-medium text-muted-foreground sm:flex">
            <kbd className="font-sans">ctrl + K</kbd> to search
          </span>
          {showSearch && (
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search…"
              className="col-span-2 w-full rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:border-primary md:order-0 md:col-span-1 md:w-56"
            />
          )}
        </header>

        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6">
          {tab === "overview" && (
            <OverviewPage query={query} alerts={alerts} onAck={id => setAcked(a => [...a, id])} />
          )}
          {tab === "inventory" && (
            <InventoryPage query={query} canExport={account.role === "INVENTORY_STAFF"} />
          )}
          {tab === "batches" && <BatchesPage canAdjust={account.role !== "INVENTORY_STAFF"} />}
          {tab === "alerts" && <AlertsPage alerts={alerts} onAck={id => setAcked(a => [...a, id])} />}
          {tab === "myday" && <MyDayPage role={account.role} name={account.name} alerts={alerts} />}
          {tab === "counts" && (
            <StockCountsPage mode={account.role === "WAREHOUSE_STAFF" ? "entry" : "review"} />
          )}
          {tab === "txlog" && <TransactionLogPage />}
          {tab === "reorder" && <ReorderReviewPage requestedBy={account.name} />}
          {tab === "picks" && <PickTasksPage />}
          {tab === "receiving" && <ReceivingPage />}
          {tab === "admin" && account.role === "ADMIN" && <AdminPage />}
          {tab === "reports" && account.role === "ADMIN" && <ReportsPage />}
        </main>
        {(account.role === "WAREHOUSE_STAFF" || account.role === "ADMIN") && <QuickActionMenu />}
        <CommandPalette onNavigate={t => setTab(t as Tab)} />
      </div>
    </div>
  );
}


/* ------------------------------- Sidebar -------------------------------- */

function SideNav({
  tab, setTab, openAlerts, tabs, name, role, onSignOut, mobile = false,
}: {
  tab: Tab; setTab: (t: Tab) => void; openAlerts: number; tabs: Tab[];
  name: string; role: string; onSignOut: () => void; mobile?: boolean;
}) {
  return (
    <aside
      className={
        mobile
          ? "flex h-full w-full flex-col border-r border-border bg-surface"
          : "hidden w-60 shrink-0 flex-col border-r border-border bg-surface md:flex"
      }
    >
      <div className="px-5 py-5">
        <div className="flex items-center gap-2">
          <img
            src={wbLogo}
            alt="WalangBrownout logo"
            className="h-7 w-7 rounded-md object-cover"
          />
          <span className="font-semibold">Inventory OS</span>
        </div>
      </div>

      <p className="px-5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Main navigation</p>
      <nav className="mt-2 flex flex-col gap-1 px-3">
        {tabs.map(key => {
          const active = tab === key;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors ${
                active
                  ? "border-border bg-muted font-semibold text-foreground"
                  : "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              <span>{PAGE_META[key].title}</span>
              {key === "admin" && (
                <span className="inline-flex items-center justify-center rounded-full border border-border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                  Admin
                </span>
              )}
              {key === "alerts" && openAlerts > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1.5 text-[10px] font-bold text-background">
                  {openAlerts}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* --- BOTTOM SECTION --- */}
      <div className="mt-auto px-5 py-5">
        
        {/* 1. Live Clock injected here with a bottom margin for spacing */}
        <div className="mb-6">
          <LiveClock />
        </div>

        {/* 2. Existing User Profile Section */}
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">User profile / account</p>
        <div className="mt-2 flex items-center gap-2 border-t border-dashed border-border pt-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-bold">
            {name.split(" ").map(w => w[0]).slice(0, 2).join("")}
          </span>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-medium">{name}</div>
            <div className="truncate text-xs text-muted-foreground">{role}</div>
          </div>
        </div>
        <div className="mt-3">
          <ThemeToggle />
        </div>
        <button
          onClick={onSignOut}
          className="mt-2 w-full rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted">
          Sign out
        </button>
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

/* ------------------------------- Overview ------------------------------- */

function OverviewPage({ query, alerts, onAck }: { query: string; alerts: Alert[]; onAck: (id: string) => void }) {
  const q = query.trim().toLowerCase();
  const feed = transactions.filter(tx => {
    if (!q) return true;
    const p = products.find(pp => pp.sku === tx.sku);
    return tx.sku.toLowerCase().includes(q) || (p?.name.toLowerCase().includes(q) ?? false);
  });
  const nearExpiry = batches.filter(b => {
    const d = daysLeft(b.expirationDate);
    return d !== null && d <= 30;
  }).length;

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-foreground">KPI Summary Cards</h2>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi value={products.length} label="Active SKUs Tracked" />
        <Kpi value={alerts.length} label="Open Alerts" />
        <Kpi value={nearExpiry} label="Batches Nearing Expiry" />
        <Kpi value={0} suffix="s" label="Sync Delay" />
      </section>

      <section className="grid gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Panel — auto-refreshes every ~3.5s
          </p>
          <div className="card-surface">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h2 className="text-lg font-semibold">Live Transaction Feed</h2>
              <span className="chip bg-success/15 text-success">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" /> streaming
              </span>
            </div>
            <ul className="divide-y divide-dashed divide-border">
              {feed.map((tx, i) => {
                const p = products.find(pp => pp.sku === tx.sku);
                return (
                  <AnimatedItem
                    key={tx.id}
                    delay={i * 60}
                    className="flex items-center justify-between gap-3 px-5 py-3 text-sm transition-colors hover:bg-muted/40"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <TxTypeBadge type={tx.type} />
                      <span className="truncate">
                        {p?.name}{" "}
                        <span className={tx.quantityDelta < 0 ? "text-danger" : "text-success"}>
                          {tx.quantityDelta > 0 ? "+" : ""}{tx.quantityDelta}
                        </span>{" "}
                        <span className="text-muted-foreground">· {titleCase(tx.channel)}</span>
                      </span>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground"><TimeAgo iso={tx.timestamp} /></span>
                  </AnimatedItem>
                );
              })}
              {feed.length === 0 && (
                <li className="px-5 py-8 text-center text-sm text-muted-foreground">No matching transactions</li>
              )}
            </ul>
          </div>
        </div>

        <div className="lg:col-span-2">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Panel — mirrors Alerts screen, top 3
          </p>
          <div className="card-surface flex h-full flex-col">
            <div className="border-b border-border px-5 py-3">
              <h2 className="text-lg font-semibold">Active Alerts</h2>
            </div>
            <div className="flex flex-1 flex-col gap-3 p-4">
              {alerts.slice(0, 3).map(a => (
                <AlertCard key={a.id} alert={a} onAck={onAck} compact />
              ))}
              <EmptyState
                label={
                  alerts.length === 0
                    ? "All clear · nothing to reorder"
                    : "No other alerts — you're all caught up"
                }
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
      {label}
    </div>
  );
}

function Kpi({ value, label, suffix }: { value: number; label: string; suffix?: string }) {
  return (
    <div className="card-surface p-5 transition-colors hover:bg-muted/30">
      <div className="font-display text-3xl font-semibold">
        <CountUp to={value} suffix={suffix} />
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}


/* ------------------------------ Inventory ------------------------------- */

type Pill = "All" | "Class A" | "Class B" | "Class C" | "FIFO-critical";

function InventoryPage({ query, canExport = false }: { query: string; canExport?: boolean }) {
  const [pill, setPill] = useState<Pill>("All");
  const { products } = useOps();
  const q = query.trim().toLowerCase();

  const rows = products
    .filter(p => {
      if (pill === "All") return true;
      if (pill === "FIFO-critical") return p.isFifoCritical;
      return p.abc === (pill.slice(-1) as ABC);
    })
    .filter(p => !q || p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q));

  const exportCSV = () => {
    const header = ["SKU", "Product", "Class", "Qty", "ROP", "Status"];
    const lines = rows.map(p => {
      const qty = onHand(p.sku);
      const rop = p.seasonalFlag ? ropSeasonal(p) : ropStandard(p);
      const ratio = Math.min(qty / Math.max(rop, 1), 1.5);
      const status = qty <= rop ? "REORDER" : ratio < 1.35 ? "WATCH" : "OK";
      return [p.sku, p.name, p.abc, qty, rop, status].join(",");
    });
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold text-foreground">Product Table Panel</h2>
        {canExport && (
          <button
            onClick={exportCSV}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
          >
            Export CSV
          </button>
        )}
      </div>
      <div className="card-surface overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-4">

          {(["All", "Class A", "Class B", "Class C", "FIFO-critical"] as Pill[]).map(v => (
            <button
              key={v}
              onClick={() => setPill(v)}
              className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
                pill === v
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {v === "Class A"
                ? "Class A (Top Value)"
                : v === "Class B"
                ? "Class B (Regular Value)"
                : v === "Class C"
                ? "Class C (Low Value)"
                : v}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
        <table className="w-full min-w-180 text-sm">
          <thead className="text-left text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr className="border-b border-border">
              <Th>SKU</Th><Th>Product</Th><Th>Class</Th><Th>Stock Level</Th>
              <Th>Qty / ROP</Th><Th>Status</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dashed divide-border">
            {rows.map((p, i) => {
              const qty = onHand(p.sku);
              const rop = p.seasonalFlag ? ropSeasonal(p) : ropStandard(p);
              const ratio = Math.min(qty / Math.max(rop, 1), 1.5);
              const status = qty <= rop ? "REORDER" : ratio < 1.35 ? "WATCH" : "OK";
              return (
                <AnimatedRow key={`${pill}-${p.sku}`} delay={i * 50}>
                  <Td className="font-mono text-xs">{p.sku}</Td>
                  <Td className="font-medium">{p.name}</Td>
                  <Td>
                    <span className="inline-grid h-6 w-6 place-items-center rounded border border-border text-[11px] font-semibold">
                      {p.abc}
                    </span>
                  </Td>
                  <Td>
                    <StockBar
                      percent={Math.min((ratio / 1.5) * 100, 100)}
                      status={status}
                      delay={i * 50}
                    />
                  </Td>
                  <Td className="font-mono text-xs">{qty} / {rop}</Td>
                  <Td><StatusPill status={status} /></Td>
                </AnimatedRow>
              );
            })}
          </tbody>

        </table>
        </div>
        <p className="px-5 py-3 text-[10px] uppercase tracking-widest text-muted-foreground">
          Stock-level bar: filled = qty vs. reorder point · status pill: OK / WATCH / REORDER
        </p>
      </div>
    </div>
  );
}

function StockBar({
  percent, status, delay = 0,
}: { percent: number; status: "OK" | "WATCH" | "REORDER"; delay?: number }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = window.setTimeout(() => setW(percent), delay + 60);
    return () => window.clearTimeout(t);
  }, [percent, delay]);
  return (
    <div className="h-2 w-40 overflow-hidden rounded-full bg-muted">
      <div
        className={`h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none ${
          status === "REORDER" ? "bg-danger" : status === "WATCH" ? "bg-warning" : "bg-success"
        }`}
        style={{ width: `${w}%` }}
      />
    </div>
  );
}

/* -------------------------------- Alerts -------------------------------- */

function AlertsPage({ alerts, onAck }: { alerts: Alert[]; onAck: (id: string) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        </p>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Open-count badge</p>
      </div>
      <div className="card-surface">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-xl font-bold text-foreground">All Alerts</h2>
          <span className="rounded-full border border-border px-3 py-1 text-[11px] font-semibold text-muted-foreground">
            {alerts.length} OPEN
          </span>
        </div>
        <ul className="divide-y divide-border">
          {alerts.map((a, i) => (
            <AnimatedItem key={a.id} delay={i * 60} className="px-5 py-4">
              <AlertCard alert={a} onAck={onAck} />
            </AnimatedItem>
          ))}
        </ul>
        <div className="px-5 pb-5 pt-1">
          <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            {alerts.length === 0
              ? "Nothing to reorder or expire soon. Enjoy the calm."
              : "No other alerts — you're all caught up"}
          </div>
        </div>
        <p className="border-t border-border px-5 py-3 text-[10px] uppercase tracking-widest text-muted-foreground">
          Alert row — type icon, title (item), detail (threshold math), tag, timestamp
        </p>
      </div>
    </div>
  );
}

function AlertCard({ alert, onAck, compact = false }: { alert: Alert; onAck: (id: string) => void; compact?: boolean }) {
  const p = products.find(pp => pp.sku === alert.sku);
  const tag = { LOW_STOCK: "STANDARD", SEASONAL_REORDER: "SEASONAL", NEAR_EXPIRY: "FIFO", VARIANCE: "VARIANCE", PO_OVERDUE: "PO OVERDUE"}[alert.type as AlertType];
  const title = alert.batchId ? `${p?.name} — Batch ${alert.batchId}` : p?.name;
  const [acking, setAcking] = useState(false);

  const handleAck = () => {
    if (acking) return;
    setAcking(true);
    window.setTimeout(() => onAck(alert.id), 350);
  };

  return (
    <div
      className={`transition-opacity duration-300 ease-out motion-reduce:transition-none ${acking ? "opacity-40" : "opacity-100"} ${
        compact ? "rounded-lg border border-dashed border-border p-3" : "flex items-start justify-between gap-4"
      }`}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-border bg-muted text-sm font-bold">
          !
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{title}</div>
          <p className="text-xs text-muted-foreground">{alert.message}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="rounded-full border border-border px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground">{tag}</span>
            <span className="text-[10px] text-muted-foreground"><TimeAgo iso={alert.createdAt} /></span>
          </div>
        </div>
      </div>
      <button
        onClick={handleAck}
        disabled={acking}
        className={`shrink-0 rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60 ${compact ? "mt-3 w-full" : ""}`}
      >
        {acking ? "Acknowledged" : "Acknowledge"}
      </button>
    </div>
  );
}

/* -------------------------------- My Day --------------------------------- */

function MyDayPage({ role, name, alerts }: { role: Role; name: string; alerts: Alert[] }) {
  const isWarehouse = role === "WAREHOUSE_STAFF";
  const openPicks = pickTasks.filter(t => t.status !== "DONE");
  const openCounts = cycleCounts.filter(c => c.status !== "DONE");
  const inbound = receivingLines.filter(r => r.status !== "PUT_AWAY");
  const variances = cycleCounts.filter(c => c.countedQty !== null && c.countedQty !== c.systemQty);

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-foreground">KPI Summary Cards</h2>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isWarehouse ? (
          <>
            <Kpi value={openPicks.length} label="Open Pick Tasks" />
            <Kpi value={openPicks.filter(t => t.priority === "HIGH").length} label="High Priority" />
            <Kpi value={inbound.length} label="Inbound Deliveries" />
            <Kpi value={batches.filter(b => { const d = daysLeft(b.expirationDate); return d !== null && d <= 30; }).length} label="Lots Expiring ≤30d" />
          </>
        ) : (
          <>
            <Kpi value={openCounts.length} label="Counts Due Today" />
            <Kpi value={variances.length} label="Variances Logged" />
            <Kpi value={alerts.filter(a => a.type !== "NEAR_EXPIRY").length} label="ROP Breaches" />
            <Kpi value={products.length} label="SKUs In Scope" />
          </>
        )}
      </section>

      <section className="grid gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <SectionLabel>Panel — your queue for today</SectionLabel>
          <div className="mt-1.5">
            <Panel title={isWarehouse ? "Assigned Pick Tasks" : "Assigned Cycle Counts"} right={<span className="chip bg-info/15 text-info">{name}</span>}>
              <ul className="divide-y divide-dashed divide-border">
                {isWarehouse
                  ? openPicks.map(t => {
                      const p = products.find(pp => pp.sku === t.sku);
                      const loc = locations.find(l => l.id === t.locationId);
                      return (
                        <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                          <div className="min-w-0">
                            <div className="truncate font-medium">{p?.name} · {t.quantity} pcs</div>
                            <div className="text-xs text-muted-foreground">
                              {t.id} · Batch {t.batchId} · {loc?.code} · {t.orderRef}
                            </div>
                          </div>
                          <TaskPill status={t.status} />
                        </li>
                      );
                    })
                  : openCounts.map(c => {
                      const p = products.find(pp => pp.sku === c.sku);
                      const loc = locations.find(l => l.id === c.locationId);
                      return (
                        <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                          <div className="min-w-0">
                            <div className="truncate font-medium">{p?.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {c.id} · {loc?.code} · system {c.systemQty} · due {c.dueDate}
                            </div>
                          </div>
                          <TaskPill status={c.status} />
                        </li>
                      );
                    })}
              </ul>
            </Panel>
          </div>
        </div>

        <div className="lg:col-span-2">
          <SectionLabel>Panel — what needs your eyes</SectionLabel>
          <div className="mt-1.5">
            <Panel title={isWarehouse ? "Inbound Today" : "Reorder Watchlist"}>
              <ul className="divide-y divide-dashed divide-border">
                {isWarehouse
                  ? inbound.map(r => {
                      const p = products.find(pp => pp.sku === r.sku);
                      return (
                        <li key={r.id} className="px-5 py-3 text-sm">
                          <div className="truncate font-medium">{p?.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {r.poNumber} · {r.quantityOrdered} pcs · ETA {r.expectedDate}
                          </div>
                        </li>
                      );
                    })
                  : alerts.slice(0, 4).map(a => (
                      <li key={a.id} className="px-5 py-3 text-sm">
                        <div className="truncate font-medium">{products.find(p => p.sku === a.sku)?.name}</div>
                        <p className="text-xs text-muted-foreground">{a.message}</p>
                      </li>
                    ))}
                {(isWarehouse ? inbound : alerts).length === 0 && (
                  <li className="px-5 py-8 text-center text-sm text-muted-foreground">Nothing pending.</li>
                )}
              </ul>
            </Panel>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ------------------------ Inventory staff: reorder ------------------------ */

function ReorderReviewPage({ requestedBy }: { requestedBy: string }) {

  const { products: liveProducts, suppliers: liveSuppliers} = useOps();
  const rows = liveProducts
    .map(p => {
      const qty = onHand(p.sku);
      const rop = p.seasonalFlag ? ropSeasonal(p) : ropStandard(p);
      return { p, qty, rop, gap: rop - qty };
    })
    .filter(r => r.gap >= 0)
    .sort((a, b) => b.gap - a.gap);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <SectionLabel>Reorder queue — ROP breaches ready for purchasing</SectionLabel>
        <Panel title="Suggested Reorders" footer="Standard ROP = ADU × Lead Time + Safety Stock · Seasonal ROP multiplies ADU by the seasonal factor">
          <div className="overflow-x-auto">
            <table className="w-full min-w-200 text-sm">
              <thead className="text-left text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr className="border-b border-border">
                  <Th>SKU</Th><Th>Product</Th><Th>On Hand / ROP</Th><Th>Formula</Th>
                  <Th>Suggested Qty</Th><Th>Est. Cost</Th><Th>{" "}</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dashed divide-border">
                {rows.map(({ p, qty, rop }) => (
                  <tr key={p.sku} className="hover:bg-muted/40">
                    <Td className="font-mono text-xs">{p.sku}</Td>
                    <Td className="font-medium">{p.name}</Td>
                    <Td className="font-mono text-xs">{qty} / {rop}</Td>
                    <Td className="text-xs text-muted-foreground">
                      {p.seasonalFlag
                        ? `${p.avgDailyUsage} × ${p.seasonalFactor} × ${p.leadTimeDays} + ${p.safetyStock}`
                        : `${p.avgDailyUsage} × ${p.leadTimeDays} + ${p.safetyStock}`}
                    </Td>
                    <Td className="font-mono">{p.reorderQuantity}</Td>
                    <Td className="font-mono text-xs">{money(p.reorderQuantity * p.unitCost)}</Td>
                                        <Td>
                      <DraftPOAction
                        sku={p.sku}
                        productName={p.name}
                        quantity={p.reorderQuantity}
                        requestedBy={requestedBy}
                        unitCost={p.unitCost}
                        onHand={qty}
                        rop={rop}
                        formulaLabel={
                          p.seasonalFlag
                            ? `${p.avgDailyUsage} × ${p.seasonalFactor} × ${p.leadTimeDays} + ${p.safetyStock} (seasonal)`
                            : `${p.avgDailyUsage} × ${p.leadTimeDays} + ${p.safetyStock} (standard)`
                        }
                        supplierName={liveSuppliers.find(s => s.id === p.supplierId)?.name ?? "Unknown supplier"}
                        supplierContact={liveSuppliers.find(s => s.id === p.supplierId)?.contact ?? "—"}
                        supplierTin={liveSuppliers.find(s => s.id === p.supplierId)?.tin}
                      />
                    </Td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><Td className="py-8 text-center text-muted-foreground">Nothing below reorder point.</Td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <div className="space-y-2">
        <SectionLabel>Purchase orders already raised</SectionLabel>
        <Panel title="Open Purchase Orders">
          <ul className="divide-y divide-dashed divide-border">
            {purchaseOrders.map(po => {
              const p = products.find(pp => pp.sku === po.sku);
              const s = liveSuppliers.find(su => su.id === po.supplierId);
              return (
                <li key={po.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{po.id} · {p?.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {s?.name} · {po.quantity} pcs · {money(po.quantity * po.unitCost)}
                    </div>
                  </div>
                  <span className="rounded-full border border-border px-3 py-1 text-[11px] font-semibold text-muted-foreground">
                    {titleCase(po.status)}
                  </span>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
      <div className="space-y-2">
        <SectionLabel>Seasonal reorder settings — Inventory Manager responsibility</SectionLabel>
        <SeasonalConfigPanel />
      </div>
    </div>
  );
}

/* ------------------- Warehouse staff: picks & receiving ------------------- */

function PickTasksPage() {
  const { pickTasks } = useOps();
  const [done, setDone] = useState<string[]>([]);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const order = { HIGH: 0, NORMAL: 1, LOW: 2 } as const;
  const rows = [...pickTasks].sort((a, b) => order[a.priority] - order[b.priority]);

  const handleScan = (code: string) => {
    const match = rows.find(
      t => t.sku.toLowerCase() === code.toLowerCase() || t.batchId.toLowerCase() === code.toLowerCase(),
    );
    if (match) {
      setHighlighted(match.id);
      toast.success("Match found", { description: `${match.id} · ${products.find(p => p.sku === match.sku)?.name}` });
      window.setTimeout(() => setHighlighted(null), 2200);
    } else {
      toast.error("No matching task", { description: `"${code}" doesn't match any SKU or Batch ID in this queue` });
    }
  };

  return (
    <div className="space-y-2">
      <SectionLabel>Pick queue — batch is pre-assigned by FIFO, oldest lot first</SectionLabel>
      <ScanInput onScan={handleScan} />
      <Panel
        title="Pick Tasks"
        right={
          <span className="rounded-full border border-border px-3 py-1 text-[11px] font-semibold text-muted-foreground">
            {rows.filter(t => t.status !== "DONE" && !done.includes(t.id)).length} OPEN
          </span>
        }
        footer="Picking a different lot than the assigned batch breaks FIFO and raises a variance alert"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-225 text-sm">
            <thead className="text-left text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr className="border-b border-border">
                <Th>Task</Th><Th>Product</Th><Th>Pick From</Th><Th>Qty</Th>
                <Th>Order</Th><Th>Priority</Th><Th>Status</Th><Th>{" "}</Th><Th>{" "}</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dashed divide-border">
              {rows.map(t => {
                const p = products.find(pp => pp.sku === t.sku);
                const loc = locations.find(l => l.id === t.locationId);
                const status = done.includes(t.id) ? "DONE" : t.status;
                return (
                  <tr key={t.id} className={`transition-colors duration-500 hover:bg-muted/40 ${highlighted === t.id ? "bg-success/10" : ""}`}>
                    <Td className="font-mono text-xs">{t.id}</Td>
                    <Td className="font-medium">{p?.name}</Td>
                    <Td className="font-mono text-xs">
                      {t.batchId} <span className="text-muted-foreground">· {loc?.code}</span>
                    </Td>
                    <Td className="font-mono">{t.quantity}</Td>
                    <Td className="font-mono text-xs text-muted-foreground">{t.orderRef}</Td>
                    <Td>
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                        t.priority === "HIGH" ? "border-danger/50 text-danger"
                        : t.priority === "NORMAL" ? "border-border text-muted-foreground"
                        : "border-dashed border-border text-muted-foreground"
                      }`}>
                        {t.priority}
                      </span>
                    </Td>
                    <Td><TaskPill status={status} /></Td>
                    <Td>
                      {status !== "DONE" && (
                        <button
                          onClick={() => setDone(d => [...d, t.id])}
                          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                        >
                          Mark picked
                        </button>
                      )}
                    </Td>
                    <Td>
                      {status !== "DONE" && <FIFOExceptionPopover taskId={t.id} />}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function ReceivingPage() {
  const { receivingLines, batches } = useOps();
  const [receivingLine, setReceivingLine] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState<string | null>(null);

  const handleScan = (code: string) => {
    const match = receivingLines.find(
      r => r.sku.toLowerCase() === code.toLowerCase() || r.poNumber.toLowerCase() === code.toLowerCase(),
    );
    if (match) {
      setHighlighted(match.id);
      toast.success("Match found", { description: `${match.id} · ${match.poNumber}` });
      window.setTimeout(() => setHighlighted(null), 2200);
    } else {
      toast.error("No matching line", { description: `"${code}" doesn't match any SKU or PO number in this queue` });
    }
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <SectionLabel>Inbound panel — one row per PO line</SectionLabel>
        <ScanInput onScan={handleScan} placeholder="Scan or type a SKU / PO number, then press Enter" />
        <Panel title="Receiving & Putaway" footer="Receiving creates a new inventory batch stamped with date received and its warehouse location">
          <div className="overflow-x-auto">
            <table className="w-full min-w-220 text-sm">
              <thead className="text-left text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr className="border-b border-border">
                  <Th>Line</Th><Th>PO</Th><Th>Product</Th><Th>Supplier</Th>
                  <Th>Ordered / Received</Th><Th>ETA</Th><Th>Putaway</Th><Th>Status</Th><Th>{" "}</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dashed divide-border">
                {receivingLines.map(r => {
                  const p = products.find(pp => pp.sku === r.sku);
                  const s = suppliers.find(su => su.id === r.supplierId);
                  const loc = locations.find(l => l.id === r.locationId);
                  const canReceive = r.status !== "PUT_AWAY" && r.quantityReceived < r.quantityOrdered;
                  return (
                    <tr key={r.id} className={`transition-colors duration-500 hover:bg-muted/40 ${highlighted === r.id ? "bg-success/10" : ""}`}>
                      <Td className="font-mono text-xs">{r.id}</Td>
                      <Td className="font-mono text-xs">{r.poNumber}</Td>
                      <Td className="font-medium">{p?.name}</Td>
                      <Td className="text-muted-foreground">{s?.name}</Td>
                      <Td className="font-mono text-xs">{r.quantityOrdered} / {r.quantityReceived}</Td>
                      <Td className="text-muted-foreground">{r.expectedDate}</Td>
                      <Td className="font-mono text-xs">{loc?.code}</Td>
                      <Td>
                        <span className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                          r.status === "IN_TRANSIT" ? "border-warning/50 text-warning"
                          : r.status === "ARRIVED" ? "border-info/50 text-info"
                          : "border-success/40 text-success"
                        }`}>
                          {titleCase(r.status)}
                        </span>
                      </Td>
                      <Td>
                        {canReceive && (
                          <button
                            onClick={() => setReceivingLine(r.id)}
                            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                          >
                            Receive
                          </button>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <div className="space-y-2">
        <SectionLabel>Storage map — where the lots live</SectionLabel>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {locations.map(l => {
            const lots = batches.filter(b => b.locationId === l.id);
            const qty = lots.reduce((s, b) => s + b.quantityRemaining, 0);
            return (
              <div key={l.id} className="card-surface p-5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-semibold">{l.code}</span>
                  <span className="chip border border-border text-muted-foreground">{lots.length} lots</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{l.description}</p>
                <div className="mt-3 font-display text-2xl font-semibold">{qty}</div>
                <div className="text-xs text-muted-foreground">units on hand</div>
              </div>
            );
          })}
        </div>
      </div>

      {receivingLine && (() => {
        const line = receivingLines.find(r => r.id === receivingLine);
        if (!line) return null;
        const productName = products.find(pp => pp.sku === line.sku)?.name ?? line.sku;
        return (
          <ReceivingEntryModal
            line={line}
            productName={productName}
            onClose={() => setReceivingLine(null)}
          />
        );
      })()}
    </div>
  );
}