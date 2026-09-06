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
import { computeDeadStock, computeValuation, computeTurnover } from "@/lib/ops-store";

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
    const { batches } = useOps();
  const deadStock = useMemo(
    () => computeDeadStock({ products, batches, transactions }),
    [products, batches, transactions],
  );
    const valuation = useMemo(() => computeValuation({ products, batches }), [products, batches]);
  const turnover = useMemo(() => computeTurnover({ products, batches, transactions }), [products, batches, transactions]);
  const totalTiedUp = deadStock.reduce((s, r) => s + r.tiedUpValue, 0);

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
              <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Inventory valuation — total capital currently held, by ABC class
        </p>
        <div className="card-surface overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold">Inventory Valuation</h2>
            <span className="rounded-full border border-info/40 px-3 py-1 text-[11px] font-semibold text-info">
              {money(valuation.totalValue)} total
            </span>
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-3">
            {valuation.byClass.map(row => {
              const pct = valuation.totalValue > 0 ? (row.value / valuation.totalValue) * 100 : 0;
              return (
                <div key={row.abc} className="rounded-lg border border-dashed border-border p-4">
                  <div className="flex items-center justify-between">
                    <span className="inline-grid h-6 w-6 place-items-center rounded border border-border text-xs font-semibold">{row.abc}</span>
                    <span className="text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
                  </div>
                  <p className="mt-3 font-mono text-lg font-semibold">{money(row.value)}</p>
                  <p className="text-xs text-muted-foreground">{row.units} units on hand</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-foreground transition-[width] duration-500 ease-out" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="border-t border-border px-5 py-3 text-[10px] uppercase tracking-widest text-muted-foreground">
            Valuation = on-hand quantity × unit cost, per active batch
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Turnover — how efficiently held stock converts to sales
        </p>
        <div className="card-surface overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold">Inventory Turnover</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-150 text-sm">
              <thead className="text-left text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-5 py-3 font-semibold">Product</th>
                  <th className="px-5 py-3 font-semibold">Class</th>
                  <th className="px-5 py-3 font-semibold">On Hand</th>
                  <th className="px-5 py-3 font-semibold">Turnover Rate</th>
                  <th className="px-5 py-3 font-semibold">Days of Inventory</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dashed divide-border">
                {turnover.map(r => (
                  <tr key={r.sku} className="hover:bg-muted/40">
                    <td className="px-5 py-3 font-medium">{r.name}</td>
                    <td className="px-5 py-3">
                      <span className="inline-grid h-5 w-5 place-items-center rounded border border-border text-[10px] font-semibold">{r.abc}</span>
                    </td>
                    <td className="px-5 py-3 font-mono">{r.avgOnHand}</td>
                    <td className="px-5 py-3 font-mono">{r.turnoverRate !== null ? `${r.turnoverRate}×/yr` : "—"}</td>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                      {r.daysOfInventory !== null ? `${r.daysOfInventory} days` : "—"}
                    </td>
                  </tr>
                ))}
                {turnover.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">No stock currently on hand to evaluate.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="border-t border-border px-5 py-3 text-[10px] uppercase tracking-widest text-muted-foreground">
            Turnover = (units sold in last 90 days ÷ current on-hand), annualized · Days of Inventory = 365 ÷ turnover rate
          </p>
        </div>
      </div>
        <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Dead stock — SKUs with no recent sales activity, still tying up capital
        </p>
        <div className="card-surface overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold">Dead / Slow-Moving Stock</h2>
            <span className="rounded-full border border-warning/40 px-3 py-1 text-[11px] font-semibold text-warning">
              {money(totalTiedUp)} tied up
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-160 text-sm">
              <thead className="text-left text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-5 py-3 font-semibold">SKU</th>
                  <th className="px-5 py-3 font-semibold">Product</th>
                  <th className="px-5 py-3 font-semibold">Class</th>
                  <th className="px-5 py-3 font-semibold">On Hand</th>
                  <th className="px-5 py-3 font-semibold">Last Sale</th>
                  <th className="px-5 py-3 font-semibold">Age</th>
                  <th className="px-5 py-3 font-semibold">Value Tied Up</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dashed divide-border">
                {deadStock.map(r => (
                  <tr key={r.sku} className="hover:bg-muted/40">
                    <td className="px-5 py-3 font-mono text-xs">{r.sku}</td>
                    <td className="px-5 py-3 font-medium">{r.name}</td>
                    <td className="px-5 py-3">
                      <span className="inline-grid h-5 w-5 place-items-center rounded border border-border text-[10px] font-semibold">{r.abc}</span>
                    </td>
                    <td className="px-5 py-3 font-mono">{r.onHand}</td>
                    <td className="px-5 py-3 text-muted-foreground">{r.lastSaleDate ?? "Never sold"}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                        r.bucket === "180+" ? "border-danger/50 text-danger"
                        : r.bucket === "90+" ? "border-warning/50 text-warning"
                        : "border-border text-muted-foreground"
                      }`}>
                        {r.daysSinceLastSale === null ? "Never" : `${r.daysSinceLastSale}d`} · {r.bucket}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs">{money(r.tiedUpValue)}</td>
                  </tr>
                ))}
                {deadStock.length === 0 && (
                  <tr><td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">No dead stock detected — everything is moving.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="border-t border-border px-5 py-3 text-[10px] uppercase tracking-widest text-muted-foreground">
            Flagged at 30+ days without a sale · consider markdown, bundling, or reclassifying to Class C
          </p>
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