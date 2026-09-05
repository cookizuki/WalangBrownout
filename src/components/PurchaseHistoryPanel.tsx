import { useState } from "react";
import { products, money } from "@/lib/inventory-data";
import { usePurchaseHistory } from "@/lib/ops-store";
import { Th, Td } from "@/components/ui-bits";

export function PurchaseHistoryPanel() {
  const [sku, setSku] = useState(products[0]?.sku ?? "");
  const history = usePurchaseHistory(sku);
  const totalUnits = history.reduce((s, h) => s + h.quantityReceived, 0);
  const totalSpend = history.reduce((s, h) => s + h.totalCost, 0);

  return (
    <div className="card-surface overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold">Purchase History</h2>
          <p className="text-xs text-muted-foreground">Every completed delivery for a SKU — supplier, quantity, date, price</p>
        </div>
        <select
          value={sku}
          onChange={e => setSku(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-primary"
        >
          {products.map(p => (
            <option key={p.sku} value={p.sku}>{p.sku} · {p.name}</option>
          ))}
        </select>
      </div>

      {history.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No completed deliveries on record for this SKU yet.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-160 text-sm">
              <thead className="text-left text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr className="border-b border-border">
                  <Th>Date</Th><Th>PO</Th><Th>Supplier</Th>
                  <Th>Qty Received</Th><Th>Unit Cost</Th><Th>Total</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dashed divide-border">
                {history.map((h, i) => (
                  <tr key={`${h.poNumber}-${i}`} className="hover:bg-muted/40">
                    <Td className="text-muted-foreground">{h.date}</Td>
                    <Td className="font-mono text-xs">{h.poNumber}</Td>
                    <Td className="font-medium">{h.supplierName}</Td>
                    <Td className="font-mono">{h.quantityReceived}</Td>
                    <Td className="font-mono">
                      {money(h.unitCost)}
                      {h.costSource === "estimated" && (
                        <span className="ml-1.5 rounded-full border border-dashed border-border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
                          Est.
                        </span>
                      )}
                    </Td>
                    <Td className="font-mono font-semibold">{money(h.totalCost)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-3 text-xs">
            <span className="text-muted-foreground">{history.length} deliveries · {totalUnits} units total</span>
            <span className="font-semibold">{money(totalSpend)} total spend</span>
          </div>
        </>
      )}

      <p className="border-t border-border px-5 py-3 text-[10px] uppercase tracking-widest text-muted-foreground">
        "Est." = no matching Purchase Order record on file — priced at current catalog cost, not the actual historical price
      </p>
    </div>
  );
}