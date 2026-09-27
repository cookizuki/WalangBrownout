import { useState } from 'react';
import { router, usePoll, Head } from '@inertiajs/react';
import { useAppSearch } from '@/Layouts/AppLayout';
import { AnimatedItem } from '@/Components/AnimatedList';
import { Kpi } from '@/Components/Kpi';
import { TimeAgo, daysLeft, titleCase, EmptyState } from '@/Components/ui-bits';
import { TxTypeBadge } from '@/lib/txTypeStyles';
import { Package, Bell, Clock, RefreshCw, CheckCircle2, Inbox, TrendingDown, Sun, Scale, Truck, type LucideIcon } from 'lucide-react';
import type { OverviewProps, Alert } from '@/types/dashboard';
export default function OverviewPage({ products, batches, transactions, alerts }: OverviewProps) {
  const { query } = useAppSearch();
  usePoll(15000);
  const onAck = (id: string) => router.post(route('alerts.acknowledge', id), { return_to: 'overview' }, { preserveScroll: true });
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
    <div className="space-y-6"><Head title="Overview" />
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi value={products.length} label="Active SKUs Tracked" icon={Package} />
        <Kpi value={alerts.length} label="Open Alerts" icon={Bell} />
        <Kpi value={nearExpiry} label="Batches Nearing Expiry" icon={Clock} />
        <Kpi value={0} suffix="s" label="Sync Delay" icon={RefreshCw} />
      </section>

      <section className="grid gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="card-surface overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <h2 className="text-base font-bold tracking-tight">Live Transaction Feed</h2>
              <span className="chip bg-success/10 text-success">
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
                    className="flex items-center justify-between gap-3 px-5 py-3 text-sm transition-colors hover:bg-muted/30"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <TxTypeBadge type={tx.type} />
                      <span className="truncate">
                        {p?.name}{" "}
                        <span className={`font-mono font-semibold ${tx.quantityDelta < 0 ? "text-danger" : "text-success"}`}>
                          {tx.quantityDelta > 0 ? "+" : ""}{tx.quantityDelta}
                        </span>{" "}
                        <span className="text-muted-foreground">· {titleCase(tx.channel)}</span>
                      </span>
                    </div>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground"><TimeAgo iso={tx.timestamp} /></span>
                  </AnimatedItem>
                );
              })}
              {feed.length === 0 && (
                <li className="px-5 py-10 text-center text-sm text-muted-foreground">No matching transactions</li>
              )}
            </ul>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="card-surface flex h-full flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <h2 className="text-base font-bold tracking-tight">Active Alerts</h2>
              {alerts.length > 0 && (
                <span className="rounded-full border border-danger/30 bg-danger/8 px-2.5 py-0.5 text-[10px] font-bold text-danger">
                  {alerts.length} open
                </span>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-3 p-4">
              {alerts.slice(0, 3).map(a => (
                <AlertCard key={a.id} alert={a} onAck={onAck} compact />
              ))}
              <EmptyState
                icon={alerts.length === 0 ? CheckCircle2 : Inbox}
                message={
                  alerts.length === 0
                    ? "All clear · nothing to reorder"
                    : "No other alerts — you're all caught up"
                }
                className="flex-1"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

const ALERT_ICONS: Record<Alert["type"], LucideIcon> = {
  LOW_STOCK: TrendingDown,
  SEASONAL_REORDER: Sun,
  NEAR_EXPIRY: Clock,
  VARIANCE: Scale,
  PO_OVERDUE: Truck,
};

function AlertCard({ alert, onAck, compact = false }: { alert: Alert; onAck: (id: string) => void; compact?: boolean }) {

  const tag = { LOW_STOCK: "STANDARD", SEASONAL_REORDER: "SEASONAL", NEAR_EXPIRY: "FIFO", VARIANCE: "VARIANCE", PO_OVERDUE: "PO OVERDUE"}[alert.type as Alert["type"]];
  const title = alert.batchId ? `${alert.productName} — Batch ${alert.batchId}` : alert.productName;
  const Icon = ALERT_ICONS[alert.type as Alert["type"]];
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
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-border bg-muted text-muted-foreground">
          <Icon className="h-4 w-4" strokeWidth={2} />
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

