import { useMemo } from "react";
import { useOps } from "@/lib/ops-store";
import { money } from "@/lib/inventory-data";

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function ReportsPage() {
  const { transactions, products } = useOps();

  const productLookup = useMemo(
    () => Object.fromEntries(products.map(p => [p.sku, p])),
    [products],
  );

  // --- End-of-month shrinkage: ADJUSTMENT (negative) + WRITE_OFF transactions ---
  const shrinkageByMonth = useMemo(() => {
    const buckets: Record<string, { units: number; cost: number }> = {};
    for (const t of transactions) {
      const isShrinkage =
        (t.type === "ADJUSTMENT" && t.quantityDelta < 0) || t.type === "WRITE_OFF";
      if (!isShrinkage) continue;
      const d = new Date(t.timestamp);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const p = productLookup[t.sku];
      const units = Math.abs(t.quantityDelta);
      const cost = units * (p?.unitCost ?? 0);
      buckets[key] ??= { units: 0, cost: 0 };
      buckets[key].units += units;
      buckets[key].cost += cost;
    }
    return Object.entries(buckets)
      .map(([key, v]) => {
        const [year, month] = key.split("-").map(Number);
        return { label: `${MONTH_LABELS[month]} ${year}`, ...v };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [transactions, productLookup]);

  const totalShrinkageCost = shrinkageByMonth.reduce((s, m) => s + m.cost, 0);

  // --- Sales velocity: SALE transactions grouped by SKU ---
  const velocityBySku = useMemo(() => {
    const buckets: Record<string, number> = {};
    for (const t of transactions) {
      if (t.type !== "SALE") continue;
      buckets[t.sku] = (buckets[t.sku] ?? 0) + Math.abs(t.quantityDelta);
    }
    return Object.entries(buckets)
      .map(([sku, units]) => ({ sku, units, name: productLookup[sku]?.name ?? sku, abc: productLookup[sku]?.abc }))
      .sort((a, b) => b.units - a.units);
  }, [transactions, productLookup]);

  const maxVelocity = Math.max(1, ...velocityBySku.map(v => v.units));

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Shrinkage report — aggregated from Adjustment and Write-Off transactions
        </p>
        <div className="card-surface overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold">End-of-Month Shrinkage</h2>
            <span className="rounded-full border border-danger/40 px-3 py-1 text-[11px] font-semibold text-danger">
              {money(totalShrinkageCost)} total
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-sm">
              <thead className="text-left text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-5 py-3 font-semibold">Month</th>
                  <th className="px-5 py-3 font-semibold">Units Lost</th>
                  <th className="px-5 py-3 font-semibold">Estimated Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dashed divide-border">
                {shrinkageByMonth.map(m => (
                  <tr key={m.label} className="hover:bg-muted/40">
                    <td className="px-5 py-3 font-medium">{m.label}</td>
                    <td className="px-5 py-3 font-mono text-danger">{m.units}</td>
                    <td className="px-5 py-3 font-mono text-xs">{money(m.cost)}</td>
                  </tr>
                ))}
                {shrinkageByMonth.length === 0 && (
                  <tr><td colSpan={3} className="px-5 py-8 text-center text-muted-foreground">No shrinkage recorded yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="border-t border-border px-5 py-3 text-[10px] uppercase tracking-widest text-muted-foreground">
            Includes damage, loss, and write-off transactions — not correction adjustments
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Sales velocity — helps decide when to move a SKU between ABC classes
        </p>
        <div className="card-surface overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold">Historical Sales Velocity</h2>
          </div>
          <div className="space-y-3 px-5 py-4">
            {velocityBySku.map(v => (
              <div key={v.sku} className="flex items-center gap-3">
                <span className="w-40 shrink-0 truncate text-xs font-medium">{v.name}</span>
                <span className="inline-grid h-5 w-5 shrink-0 place-items-center rounded border border-border text-[10px] font-semibold">
                  {v.abc}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-foreground transition-[width] duration-500 ease-out"
                    style={{ width: `${(v.units / maxVelocity) * 100}%` }}
                  />
                </div>
                <span className="w-16 shrink-0 text-right font-mono text-xs text-muted-foreground">{v.units} sold</span>
              </div>
            ))}
            {velocityBySku.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No sales recorded yet.</p>
            )}
          </div>
          <p className="border-t border-border px-5 py-3 text-[10px] uppercase tracking-widest text-muted-foreground">
            Consistently high-volume Class B/C items may be candidates for reclassification to Class A
          </p>
        </div>
      </div>
    </div>
  );
}