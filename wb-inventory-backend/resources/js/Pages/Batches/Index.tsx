import { Fragment, useEffect, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { PackageSearch } from 'lucide-react';
import { Th, Td, AnimatedRow, EmptyState } from '@/Components/ui-bits';
import { GlareHover } from '@/Components/GlareHover';
import { AdjustmentForm } from '@/Components/AdjustmentForm';

type Batch = {
  id: string; sku: string; locationCode: string; quantityRemaining: number;
  dateReceived: string; expirationDate: string | null; daysLeft: number | null; pickOrder: number | null;
};

export default function BatchesIndex({ batches, canAdjust, filters }: {
  batches: Batch[]; canAdjust: boolean; filters: { q: string };
}) {
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const [q, setQ] = useState(filters.q);
  useEffect(() => {
    if (q.trim() === filters.q) return;
    const timer = window.setTimeout(() => {
      router.get(route('batches.index'), { q }, { preserveState: true, preserveScroll: true, replace: true });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [q, filters.q]);
  return (
    <main className="mx-auto max-w-7xl space-y-2 p-4 sm:p-8">
      <Head title="Inventory Batches" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-foreground">
          Batch Tracking Panel{canAdjust ? "" : " · read-only"}
        </h2>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          aria-label="Search product or SKU" placeholder="Search product or SKU…"
          className="w-56 rounded-full border border-border bg-background px-4 py-1.5 text-xs outline-none focus:border-primary"
        />
      </div>
      <div className="card-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-205 text-sm">
            <thead className="text-left text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr className="border-b border-border">
                <Th>Batch ID</Th><Th>SKU</Th><Th>Qty Remaining</Th><Th>Received</Th>
                <Th>Expiry</Th><Th>Days Left</Th><Th>Pick Order</Th>
                {canAdjust && <Th>{" "}</Th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-dashed divide-border">
              {batches.map((b, i) => {
                const d = b.daysLeft;
                const soon = d !== null && d <= 30;
                return (
                  <Fragment key={b.id}>
                    <AnimatedRow delay={i * 50}>
                      <Td className="font-mono text-xs">{b.id}</Td>
                      <Td className="font-mono text-xs">
                        {b.sku} <span className="text-muted-foreground">· {b.locationCode}</span>
                      </Td>
                      <Td className="font-mono">{b.quantityRemaining}</Td>
                      <Td className="text-muted-foreground">{b.dateReceived}</Td>
                      <Td className="text-muted-foreground">{b.expirationDate ?? "—"}</Td>
                      <Td className={soon ? "font-semibold text-danger" : "text-muted-foreground"}>
                        {d === null ? "—" : `${d} days`}
                      </Td>
                      <Td>
                        <div className="flex items-center gap-2">
                          {b.pickOrder === 1 ? (
                            <GlareHover className="rounded-full">
                              <span className="block rounded-full bg-foreground px-2.5 py-1 text-[10px] font-bold text-background">#1 NEXT</span>
                            </GlareHover>
                          ) : (
                            <span className="rounded-full border border-border px-2.5 py-1 text-[10px] text-muted-foreground">{b.pickOrder === null ? "DEPLETED" : `#${b.pickOrder}`}</span>
                          )}
                          {d !== null && (
                            <span className={`rounded-full border border-dashed px-2.5 py-1 text-[10px] font-semibold ${soon ? "border-danger/50 text-danger" : "border-border text-muted-foreground"}`}>
                              {soon ? "EXPIRING SOON" : "FRESH"}
                            </span>
                          )}
                        </div>
                      </Td>
                      {canAdjust && (
                        <Td>
                          <button
                            aria-expanded={adjusting === b.id}
                            onClick={() => setAdjusting(adjusting === b.id ? null : b.id)}
                            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                          >
                            Report Adjustment
                          </button>
                        </Td>
                      )}
                    </AnimatedRow>
                    {canAdjust && adjusting === b.id && (
                      <tr className="bg-muted/30">
                        <td colSpan={8} className="px-5 py-4">
                          <AdjustmentForm batchId={b.id} onClose={() => setAdjusting(null)} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {batches.length === 0 && (
                <tr>
                  <td colSpan={canAdjust ? 8 : 7}>
                    <EmptyState icon={PackageSearch} message="No batches match this search." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="border-t border-border px-5 py-3 text-[10px] uppercase tracking-widest text-muted-foreground">
          Days-left countdown drives the expiry markdown flag · pick-order badge #1 = oldest lot with stock remaining
        </p>
      </div>
    </main>
  );
}
