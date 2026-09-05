import { useMemo } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { useOps, useSupplierPerformance } from "@/lib/ops-store";
import { money } from "@/lib/inventory-data";
import { useChartColors } from "@/hooks/use-chart-colors";
import { Th, Td } from "@/components/ui-bits";
import { PurchaseHistoryPanel } from "@/components/PurchaseHistoryPanel";

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function exportReportsPDF() {
  window.print();
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card-surface px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-muted-foreground">
          {p.name}: <span className="font-mono text-foreground">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

function SupplierTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const s = payload[0].payload;
  return (
    <div className="card-surface px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold">{s.supplierName}</p>
      <p className="text-muted-foreground">
        On-time: <span className="font-mono text-foreground">{s.onTimeRate}%</span>
      </p>
      <p className="text-muted-foreground">
        {s.onTimeCount} on time · {s.lateCount} late{s.avgDaysLate ? ` (avg ${s.avgDaysLate}d)` : ""}
      </p>
      {s.currentlyOverdue > 0 && <p className="text-danger">{s.currentlyOverdue} currently overdue</p>}
    </div>
  );
}

export function ReportsPage() {
  const { transactions, products } = useOps();
  const supplierPerf = useSupplierPerformance();
  const c = useChartColors();

  const productLookup = useMemo(
    () => Object.fromEntries(products.map(p => [p.sku, p])),
    [products],
  );

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

  const velocityBySku = useMemo(() => {
    const buckets: Record<string, number> = {};
    for (const t of transactions) {
      if (t.type !== "SALE") continue;
      buckets[t.sku] = (buckets[t.sku] ?? 0) + Math.abs(t.quantityDelta);
    }
    return Object.entries(buckets)
      .map(([sku, units]) => ({
        sku, units,
        name: productLookup[sku]?.name ?? sku,
        abc: productLookup[sku]?.abc ?? "C",
      }))
      .sort((a, b) => b.units - a.units);
  }, [transactions, productLookup]);

  const abcColor = { A: c["--abc-a"], B: c["--abc-b"], C: c["--abc-c"] } as const;

  return (
    <div id="reports-print-area" className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <p className="text-xs text-muted-foreground"></p>
        <button
          onClick={exportReportsPDF}
          className="rounded-md border border-border px-4 py-2 text-xs font-semibold transition-colors hover:bg-muted"
        >
          Export as PDF
        </button>
      </div>

      <div className="hidden print:block">
        <h1 className="text-2xl font-bold">WalangBrownout Appliances — Inventory Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Generated {new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Shrinkage report — aggregated from Adjustment and Write-Off transactions
        </p>
        <div className="card-surface overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
            <h2 className="text-lg font-semibold">End-of-Month Shrinkage</h2>
            <span className="rounded-full border border-danger/40 px-3 py-1 text-[11px] font-semibold text-danger">
              {money(totalShrinkageCost)} total
            </span>
          </div>
          <div className="px-3 py-4">
            {shrinkageByMonth.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No shrinkage recorded yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={shrinkageByMonth} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={c["--border"]} vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: c["--muted-foreground"], fontSize: 11 }} axisLine={{ stroke: c["--border"] }} tickLine={false} />
                  <YAxis tick={{ fill: c["--muted-foreground"], fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: c["--border"], opacity: 0.3 }} />
                  <Bar dataKey="cost" name="Cost (₱)" fill={c["--danger"]} radius={[6, 6, 0, 0]} maxBarSize={56} />
                </BarChart>
              </ResponsiveContainer>
            )}
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
            <h2 className="text-lg font-semibold">Historical Sales Velocity</h2>
          </div>
          <div className="px-3 py-4">
            {velocityBySku.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No sales recorded yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(180, velocityBySku.length * 46)}>
                <BarChart
                  data={velocityBySku}
                  layout="vertical"
                  margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={c["--border"]} horizontal={false} />
                  <XAxis type="number" tick={{ fill: c["--muted-foreground"], fontSize: 11 }} axisLine={{ stroke: c["--border"] }} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: c["--foreground"], fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={150}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: c["--border"], opacity: 0.3 }} />
                  <Bar dataKey="units" name="Units sold" radius={[0, 6, 6, 0]} maxBarSize={22}>
                    {velocityBySku.map(v => (
                      <Cell key={v.sku} fill={abcColor[v.abc]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex items-center gap-4 border-t border-border px-5 py-3 text-[10px] uppercase tracking-widest text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: c["--abc-a"] }} /> Class A</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: c["--abc-b"] }} /> Class B</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: c["--abc-c"] }} /> Class C</span>
            <span className="ml-auto normal-case tracking-normal">Consistently high-volume B/C items may be candidates for reclassification to A</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Supplier delivery performance — on-time rate from completed receiving lines, Purchasing Manager view
        </p>
        <div className="card-surface overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-lg font-semibold">Supplier Reliability</h2>
          </div>
          <div className="px-3 py-4">
            {supplierPerf.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No completed deliveries recorded yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(180, supplierPerf.length * 56)}>
                <BarChart
                  data={supplierPerf}
                  layout="vertical"
                  margin={{ top: 4, right: 32, left: 8, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={c["--border"]} horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tickFormatter={v => `${v}%`}
                    tick={{ fill: c["--muted-foreground"], fontSize: 11 }}
                    axisLine={{ stroke: c["--border"] }}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="supplierName"
                    tick={{ fill: c["--foreground"], fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={160}
                  />
                  <Tooltip content={<SupplierTooltip />} cursor={{ fill: c["--border"], opacity: 0.3 }} />
                  <Bar dataKey="onTimeRate" name="On-time rate" radius={[0, 6, 6, 0]} maxBarSize={28}>
                    {supplierPerf.map(s => (
                      <Cell
                        key={s.supplierId}
                        fill={s.onTimeRate >= 90 ? c["--success"] : s.onTimeRate >= 70 ? c["--warning"] : c["--danger"]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="overflow-x-auto border-t border-border">
            <table className="w-full min-w-160 text-sm">
              <thead className="text-left text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr className="border-b border-border">
                  <Th>Supplier</Th><Th>Deliveries</Th><Th>On Time</Th>
                  <Th>Late</Th><Th>Avg Days Late</Th><Th>Currently Overdue</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dashed divide-border">
                {supplierPerf.map(s => (
                  <tr key={s.supplierId} className="hover:bg-muted/40">
                    <Td className="font-medium">{s.supplierName}</Td>
                    <Td className="font-mono">{s.totalDeliveries}</Td>
                    <Td className="font-mono text-success">{s.onTimeCount}</Td>
                    <Td className="font-mono text-danger">{s.lateCount}</Td>
                    <Td className="font-mono text-muted-foreground">{s.avgDaysLate ? `${s.avgDaysLate}d` : "—"}</Td>
                    <Td className={s.currentlyOverdue > 0 ? "font-mono font-semibold text-danger" : "font-mono text-muted-foreground"}>
                      {s.currentlyOverdue}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-border px-5 py-3 text-[10px] uppercase tracking-widest text-muted-foreground">
            On-time rate is computed only from fully received (Put Away) lines · green ≥90% · amber 70–89% · red &lt;70%
          </p>
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Purchase history — per-SKU record of what was bought, from whom, and at what price
        </p>
        <PurchaseHistoryPanel />
      </div>
    </div>
  );
}