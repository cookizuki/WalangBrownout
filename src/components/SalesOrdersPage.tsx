import { Fragment, useMemo, useState } from "react";
import { products, locations } from "@/lib/inventory-data";
import { useSalesOrders } from "@/lib/ops-store";
import { Panel, SectionLabel, Th, Td, TaskPill, AnimatedRow } from "@/components/ui-bits";
import type { Priority } from "@/lib/inventory-data";

const productName = (sku: string) => products.find(p => p.sku === sku)?.name ?? sku;
const locCode = (id: number) => locations.find(l => l.id === id)?.code ?? "—";

function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
        priority === "HIGH"
          ? "border-danger/50 text-danger"
          : priority === "NORMAL"
          ? "border-border text-muted-foreground"
          : "border-dashed border-border text-muted-foreground"
      }`}
    >
      {priority}
    </span>
  );
}

export function SalesOrdersPage() {
  const orders = useSalesOrders();
  const [open, setOpen] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return orders;
    return orders.filter(
      o =>
        o.orderRef.toLowerCase().includes(needle) ||
        o.lines.some(
          l => productName(l.sku).toLowerCase().includes(needle) || l.sku.toLowerCase().includes(needle),
        ),
    );
  }, [orders, q]);

  return (
    <div className="space-y-2">
      <SectionLabel>
        Sales orders — derived from the pick queue; fulfillment status at a glance
      </SectionLabel>
      <Panel
        title="Sales Orders"
        right={
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search order or product…"
            className="w-48 rounded-full border border-border bg-background px-3.5 py-1.5 text-xs outline-none focus:border-primary"
          />
        }
        footer="Status rolls up from pick tasks — Pending until picking starts, In Progress while any line is being picked, Done once every line is picked"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-190 text-sm">
            <thead className="text-left text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr className="border-b border-border">
                <Th>Order</Th><Th>Lines</Th><Th>Total Qty</Th>
                <Th>Priority</Th><Th>Status</Th><Th>{" "}</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dashed divide-border">
              {rows.map((o, i) => (
                <Fragment key={o.orderRef}>
                  <AnimatedRow
                    delay={i * 50}
                    className="cursor-pointer"
                    onClick={() => setOpen(open === o.orderRef ? null : o.orderRef)}
                  >
                    <Td className="font-mono text-xs font-semibold">{o.orderRef}</Td>
                    <Td className="text-muted-foreground">
                      {o.lines.length} item{o.lines.length === 1 ? "" : "s"}
                    </Td>
                    <Td className="font-mono">{o.totalQty}</Td>
                    <Td><PriorityBadge priority={o.priority} /></Td>
                    <Td><TaskPill status={o.status} /></Td>
                    <Td className="text-xs text-muted-foreground">
                      {open === o.orderRef ? "Hide" : "View lines"}
                    </Td>
                  </AnimatedRow>
                  {open === o.orderRef && (
                    <tr className="bg-muted/30">
                      <td colSpan={6} className="px-5 py-4">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                          Line items — {o.orderRef}
                        </p>
                        <ul className="mt-2 divide-y divide-dashed divide-border rounded-lg border border-border bg-surface">
                          {o.lines.map((l, li) => (
                            <li
                              key={`${o.orderRef}-${li}`}
                              className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-xs"
                            >
                              <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                                {productName(l.sku)}
                              </span>
                              <span className="font-mono text-muted-foreground">{l.sku}</span>
                              <span className="font-mono text-muted-foreground">
                                Batch {l.batchId} · {locCode(l.locationId)}
                              </span>
                              <span className="font-mono">{l.quantity} pcs</span>
                              <TaskPill status={l.status} />
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                    No sales orders match this search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}