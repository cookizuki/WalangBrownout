import { Head, useForm } from '@inertiajs/react';
import { TrendingDown, Sun, Clock, Scale, Truck, CheckCircle2, Inbox, type LucideIcon } from 'lucide-react';
import { EmptyState, TimeAgo } from '@/Components/ui-bits';
type AlertType = 'LOW_STOCK' | 'SEASONAL_REORDER' | 'NEAR_EXPIRY' | 'VARIANCE' | 'PO_OVERDUE';
type Alert = { id: string; sku: string; productName: string; batchId?: string; type: AlertType; message: string; status: 'OPEN'; createdAt: string };

export default function AlertsPage({ alerts }: { alerts: Alert[] }) {
  return (
    <main className="mx-auto max-w-7xl space-y-4 p-4 sm:p-8">
      <Head title="Alerts" />
      <div className="card-surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="text-base font-bold tracking-tight">All Alerts</h2>
          <span className={`rounded-full border px-3 py-1 text-[11px] font-bold ${alerts.length > 0 ? "border-danger/30 bg-danger/8 text-danger" : "border-border text-muted-foreground"}`}>
            {alerts.length} open
          </span>
        </div>
        <ul className="divide-y divide-border">
          {alerts.map((a) => (
            <li key={a.id} className="px-5 py-4">
              <AlertCard alert={a} />
            </li>
          ))}
        </ul>
        <div className="px-5 pb-5 pt-1">
          <div className="min-h-32 rounded-xl border border-dashed border-border">
            <EmptyState
              icon={alerts.length === 0 ? CheckCircle2 : Inbox}
              message={
                alerts.length === 0
                  ? "Nothing to reorder or expire soon. Enjoy the calm."
                  : "No other alerts — you're all caught up"
              }
            />
          </div>
        </div>
      </div>
    </main>
  );
}

const ALERT_ICONS: Record<AlertType, LucideIcon> = {
  LOW_STOCK: TrendingDown,
  SEASONAL_REORDER: Sun,
  NEAR_EXPIRY: Clock,
  VARIANCE: Scale,
  PO_OVERDUE: Truck,
};

function AlertCard({ alert, compact = false }: { alert: Alert; compact?: boolean }) {
  const tag = { LOW_STOCK: "STANDARD", SEASONAL_REORDER: "SEASONAL", NEAR_EXPIRY: "FIFO", VARIANCE: "VARIANCE", PO_OVERDUE: "PO OVERDUE"}[alert.type as AlertType];
  const title = alert.batchId ? `${alert.productName} — Batch ${alert.batchId}` : alert.productName;
  const Icon = ALERT_ICONS[alert.type as AlertType];
  const { post, processing: acking, errors } = useForm({});
  const handleAck = () => post(route('alerts.acknowledge', alert.id), { preserveScroll: true });

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
          {Object.values(errors).map((error, i) => <p role="alert" key={i} className="text-xs text-danger">{String(error)}</p>)}
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
        {acking ? "Acknowledging..." : "Acknowledge"}
      </button>
    </div>
  );
}

