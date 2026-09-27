import { Head, usePoll } from '@inertiajs/react';
import { Boxes, AlertTriangle, Truck, Clock, ClipboardList, Scale, TrendingDown, Package } from 'lucide-react';
import { Kpi } from '@/Components/Kpi';
import { SectionLabel, Panel, TaskPill, daysLeft } from '@/Components/ui-bits';
import type { MyDayProps } from '@/types/dashboard';
export default function MyDayPage({ role, name, alerts, products, batches, locations, pickTasks, cycleCounts, receivingLines }: MyDayProps) {
  usePoll(15000);
  const isWarehouse = role === "WAREHOUSE_STAFF";
  const openPicks = pickTasks.filter(t => t.status !== "DONE");
  const openCounts = cycleCounts.filter(c => c.status !== "DONE");
  const inbound = receivingLines.filter(r => r.status !== "PUT_AWAY");
  const variances = cycleCounts.filter(c => c.countedQty !== null && c.countedQty !== c.systemQty);

  return (
    <div className="space-y-6"><Head title="My Day" />
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isWarehouse ? (
          <>
            <Kpi value={openPicks.length} label="Open Pick Tasks" icon={Boxes} />
            <Kpi value={openPicks.filter(t => t.priority === "HIGH").length} label="High Priority" icon={AlertTriangle} />
            <Kpi value={inbound.length} label="Inbound Deliveries" icon={Truck} />
            <Kpi value={batches.filter(b => { const d = daysLeft(b.expirationDate); return d !== null && d <= 30; }).length} label="Lots Expiring ≤30d" icon={Clock} />
          </>
        ) : (
          <>
            <Kpi value={openCounts.length} label="Counts Due Today" icon={ClipboardList} />
            <Kpi value={variances.length} label="Variances Logged" icon={Scale} />
            <Kpi value={alerts.filter(a => a.type !== "NEAR_EXPIRY").length} label="ROP Breaches" icon={TrendingDown} />
            <Kpi value={products.length} label="SKUs In Scope" icon={Package} />
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

