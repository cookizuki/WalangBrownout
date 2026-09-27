import { useState, useEffect } from 'react';
import { Head, usePoll } from '@inertiajs/react';
import { useAppSearch } from '@/Layouts/AppLayout';
import { Package } from 'lucide-react';
import { Th, Td, AnimatedRow, StatusPill } from '@/Components/ui-bits';
import type { Product } from '@/types/dashboard';
type Pill = "All" | "Class A" | "Class B" | "Class C" | "FIFO-critical";

export default function InventoryPage({ products, canExport }: { products: Product[]; canExport: boolean }) {
  const { query } = useAppSearch();
  usePoll(15000);
  const [pill, setPill] = useState<Pill>("All");

  const q = query.trim().toLowerCase();

  const rows = products
    .filter(p => {
      if (pill === "All") return true;
      if (pill === "FIFO-critical") return p.isFifoCritical;
      return p.abc === (pill.slice(-1) as Product['abc']);
    })
    .filter(p => !q || p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q));

  const exportCSV = () => {
    const header = ["SKU", "Product", "Class", "Qty", "ROP", "Status"];
    const lines = rows.map(p => {
      const qty = p.onHand;
      const rop = p.rop;
      const ratio = Math.min(qty / Math.max(rop, 1), 1.5);
      const status = qty <= rop ? "REORDER" : ratio < 1.35 ? "WATCH" : "OK";
      return [p.sku, p.name, p.abc, qty, rop, status].map(value => { const text = String(value); const safe = /^[=+@\-]/.test(text) ? "'" + text : text; return '"' + safe.replace(/"/g, '\"\"') + '"'; }).join(',');
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
    <div className="space-y-4"><Head title="Inventory" />
      <div className="flex items-center justify-between gap-2">
        {canExport && (
          <button
            onClick={exportCSV}
            className="ml-auto rounded-xl border border-border bg-muted/40 px-4 py-2 text-xs font-semibold transition-colors hover:bg-muted"
          >
            Export CSV
          </button>
        )}
      </div>
      <div className="card-surface overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-4">
          <Package className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
          <span className="text-sm font-bold tracking-tight">Inventory</span>
          <div className="ml-auto flex flex-wrap gap-2">
            {(["All", "Class A", "Class B", "Class C", "FIFO-critical"] as Pill[]).map(v => (
              <button
                key={v}
                onClick={() => setPill(v)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  pill === v
                    ? "border-foreground bg-foreground text-background shadow-sm"
                    : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                }`}
              >
                {v === "Class A" ? "A — Top Value"
                  : v === "Class B" ? "B — Regular"
                  : v === "Class C" ? "C — Low Value"
                  : v}
              </button>
            ))}
          </div>
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
              const qty = p.onHand;
              const rop = p.rop;
              const ratio = Math.min(qty / Math.max(rop, 1), 1.5);
              const status = qty <= rop ? "REORDER" : ratio < 1.35 ? "WATCH" : "OK";
              return (
                <AnimatedRow
                  key={`${pill}-${p.sku}`}
                  delay={i * 50}
                  className={i % 2 === 1 ? "bg-muted/20" : ""}
                >
                  <Td className="font-mono text-xs text-muted-foreground">{p.sku}</Td>
                  <Td className="font-medium">{p.name}</Td>
                  <Td>
                    <span className="inline-grid h-6 w-6 place-items-center rounded-md border border-border bg-muted text-[11px] font-semibold">
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

