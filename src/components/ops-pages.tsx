// Role-shared operational pages: Stock Counts (entry / review),
// Transaction Log, and Batches (read-only or adjustable).
import { Fragment, useMemo, useState } from "react";
import {
  locations, products, type TxType,
} from "@/lib/inventory-data";
import { fifoBatches, reportAdjustment, submitCount, useOps, type AdjustmentReason, requestRecount } from "@/lib/ops-store";
import { AnimatedRow, Panel, SectionLabel, TaskPill, Td, Th, TimeAgo, daysLeft, titleCase } from "@/components/ui-bits";
import { GlareHover } from "@/components/GlareHover";
import { TxTypeBadge } from "@/lib/tx-type-styles";


const productName = (sku: string) => products.find(p => p.sku === sku)?.name ?? sku;
const locCode = (id: number) => locations.find(l => l.id === id)?.code ?? "—";

/* ----------------------------- Stock Counts ------------------------------ */

export function StockCountsPage({ mode }: { mode: "entry" | "review" }) {
  const { counts, transactions } = useOps();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <SectionLabel>
        {mode === "entry"
          ? "Cycle count entry — record what you physically counted"
          : "Cycle count review — investigate variances against the transaction log"}
      </SectionLabel>
      <Panel
        title="Stock Counts"
        right={
          <span className="rounded-full border border-border px-3 py-1 text-[11px] font-semibold text-muted-foreground">
            {mode === "entry"
              ? `${counts.filter(c => c.status !== "DONE").length} DUE`
              : `${counts.filter(c => c.countedQty !== null && c.countedQty !== c.systemQty).length} VARIANCES`}
          </span>
        }
        footer="Variance drives the Adjustment transaction logged against the batch"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="text-left text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr className="border-b border-border">
                <Th>Count ID</Th><Th>Product</Th><Th>Location</Th><Th>System</Th>
                <Th>Counted</Th><Th>Variance</Th><Th>Status</Th><Th>Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dashed divide-border">
              {counts.map((c, i) => {
                const entered = draft[c.id];
                const value =
                  c.countedQty ?? (entered !== undefined && entered !== "" ? Number(entered) : null);
                const variance = value === null ? null : value - c.systemQty;
                const investigable = mode === "review" && !!variance;
                const related = transactions.filter(
                  t => t.sku === c.sku && (t.batchId === null || true),
                );
                return (
                  <Fragment key={c.id}>
                    <AnimatedRow
                      delay={i * 50}
                      className={investigable ? "cursor-pointer" : ""}
                      onClick={investigable ? () => setOpen(open === c.id ? null : c.id) : undefined}
                    >
                      <Td className="font-mono text-xs">{c.id}</Td>
                      <Td className="font-medium">{productName(c.sku)}</Td>
                      <Td className="text-muted-foreground">{locCode(c.locationId)}</Td>
                      <Td className="font-mono">{c.systemQty}</Td>
                      <Td>
                        {mode === "entry" && c.countedQty === null ? (
                          <input
                            inputMode="numeric"
                            value={entered ?? ""}
                            onChange={e =>
                              setDraft(s => ({ ...s, [c.id]: e.target.value.replace(/[^\d]/g, "").slice(0, 6) }))
                            }
                            placeholder="—"
                            className="w-20 rounded-md border border-border bg-background px-2 py-1 font-mono text-xs outline-none focus:border-primary"
                          />
                        ) : (
                          <span className="font-mono">{c.countedQty ?? "—"}</span>
                        )}
                      </Td>
                      <Td className={`font-mono ${variance ? "font-semibold text-danger" : "text-muted-foreground"}`}>
                        {variance === null ? "—" : variance > 0 ? `+${variance}` : variance}
                      </Td>
                      <Td><TaskPill status={value !== null && c.status === "PENDING" ? "IN_PROGRESS" : c.status} /></Td>
                                            <Td>
                        {mode === "entry" && c.countedQty === null && (
                          <button
                            disabled={!entered}
                            onClick={() => {
                              submitCount(c.id, Number(entered));
                              setDraft(s => ({ ...s, [c.id]: "" }));
                            }}
                            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Submit count
                          </button>
                        )}
                        {mode === "entry" && c.status === "DONE" && (
                          <button
                            onClick={() => requestRecount(c.id)}
                            className="rounded-md border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            Request recount
                          </button>
                        )}
                        {investigable && (
                          <span className="text-xs text-muted-foreground">
                            {open === c.id ? "Hide log" : "Investigate"}
                          </span>
                        )}
                      </Td>
                    </AnimatedRow>
                    {open === c.id && (
                      <tr className="bg-muted/30">
                        <td colSpan={8} className="px-5 py-4">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                            Related transactions — {productName(c.sku)}
                          </p>
                          <ul className="mt-2 divide-y divide-dashed divide-border rounded-lg border border-border bg-surface">
                            {related.map(t => (
                              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs">
                                <span className="font-mono">{t.id} · {t.batchId ?? "—"}</span>
                                <span>{titleCase(t.type)}</span>
                                <span className={`font-mono ${t.quantityDelta < 0 ? "text-danger" : "text-success"}`}>
                                  {t.quantityDelta > 0 ? `+${t.quantityDelta}` : t.quantityDelta}
                                </span>
                                <span className="text-muted-foreground"><TimeAgo iso={t.timestamp} /></span>
                              </li>
                            ))}
                            {related.length === 0 && (
                              <li className="px-4 py-6 text-center text-xs text-muted-foreground">
                                No transactions recorded for this product yet.
                              </li>
                            )}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

/* ---------------------------- Transaction Log ---------------------------- */

const TX_TYPES: (TxType | "ALL")[] = ["ALL", "SALE", "RECEIPT", "RETURN", "ADJUSTMENT", "TRANSFER", "WRITE_OFF"];

export function TransactionLogPage() {
  const { transactions } = useOps();
  const [type, setType] = useState<TxType | "ALL">("ALL");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return transactions.filter(t => {
      if (type !== "ALL" && t.type !== type) return false;
      if (!needle) return true;
      return (
        t.sku.toLowerCase().includes(needle) ||
        (t.batchId ?? "").toLowerCase().includes(needle) ||
        productName(t.sku).toLowerCase().includes(needle)
      );
    });
  }, [transactions, type, q]);

  return (
    <div className="space-y-2">
      <SectionLabel>Transaction log — every stock movement, newest first</SectionLabel>
      <div className="card-surface overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-4">
          {TX_TYPES.map(v => (
            <button
              key={v}
              onClick={() => setType(v)}
              className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
                type === v ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {v === "ALL" ? "All types" : titleCase(v)}
            </button>
          ))}
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search product or batch…"
            className="ml-auto w-full rounded-full border border-border bg-background px-4 py-1.5 text-xs outline-none focus:border-primary sm:w-56"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-sm">
            <thead className="text-left text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr className="border-b border-border">
                <Th>Transaction</Th><Th>Product</Th><Th>Batch</Th><Th>Type</Th>
                <Th>Qty Δ</Th><Th>User</Th><Th>Timestamp</Th><Th>Channel</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dashed divide-border">
              {rows.map((t, i) => (
                <AnimatedRow key={`${type}-${t.id}`} delay={i * 40}>
                  <Td className="font-mono text-xs">{t.id}</Td>
                  <Td className="font-medium">{productName(t.sku)}</Td>
                  <Td className="font-mono text-xs">{t.batchId ?? "—"}</Td>
                  <Td><TxTypeBadge type={t.type} /></Td>
                  <Td className={`font-mono ${t.quantityDelta < 0 ? "text-danger" : "text-success"}`}>
                    {t.quantityDelta > 0 ? `+${t.quantityDelta}` : t.quantityDelta}
                  </Td>
                  <Td className="text-muted-foreground">#{t.userId}</Td>
                  <Td className="text-xs text-muted-foreground">{t.timestamp.replace("T", " ").slice(0, 16)}</Td>
                  <Td className="text-xs text-muted-foreground">{titleCase(t.channel)}</Td>
                </AnimatedRow>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-sm text-muted-foreground">No transactions match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="border-t border-border px-5 py-3 text-[10px] uppercase tracking-widest text-muted-foreground">
          Adjustments raised from stock counts and damage reports appear here automatically
        </p>
      </div>
    </div>
  );
}

/* -------------------------------- Batches -------------------------------- */

export function BatchesPage({ canAdjust = false }: { canAdjust?: boolean }) {
  const { batches } = useOps();
  const [adjusting, setAdjusting] = useState<string | null>(null);

  const rows = products.flatMap(p => fifoBatches(p.sku, batches).map((b, idx) => ({ b, idx })));

  return (
    <div className="space-y-2">
      <SectionLabel>
        Batch tracking panel — one row per received lot{canAdjust ? "" : " · read-only"}
      </SectionLabel>
      <div className="card-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="text-left text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr className="border-b border-border">
                <Th>Batch ID</Th><Th>SKU</Th><Th>Qty Remaining</Th><Th>Received</Th>
                <Th>Expiry</Th><Th>Days Left</Th><Th>Pick Order</Th>
                {canAdjust && <Th>{" "}</Th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-dashed divide-border">
              {rows.map(({ b, idx }, i) => {
                const d = daysLeft(b.expirationDate);
                const soon = d !== null && d <= 30;
                return (
                  <Fragment key={b.id}>
                    <AnimatedRow delay={i * 50}>
                      <Td className="font-mono text-xs">{b.id}</Td>
                      <Td className="font-mono text-xs">
                        {b.sku} <span className="text-muted-foreground">· {locCode(b.locationId)}</span>
                      </Td>
                      <Td className="font-mono">{b.quantityRemaining}</Td>
                      <Td className="text-muted-foreground">{b.dateReceived}</Td>
                      <Td className="text-muted-foreground">{b.expirationDate ?? "—"}</Td>
                      <Td className={soon ? "font-semibold text-danger" : "text-muted-foreground"}>
                        {d === null ? "—" : `${d} days`}
                      </Td>
                      <Td>
                        <div className="flex items-center gap-2">
                          {idx === 0 ? (
                            <GlareHover className="rounded-full">
                              <span className="block rounded-full bg-foreground px-2.5 py-1 text-[10px] font-bold text-background">#1 NEXT</span>
                            </GlareHover>
                          ) : (
                            <span className="rounded-full border border-border px-2.5 py-1 text-[10px] text-muted-foreground">#{idx + 1}</span>
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
                          <AdjustmentForm batchId={b.id} onDone={() => setAdjusting(null)} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="border-t border-border px-5 py-3 text-[10px] uppercase tracking-widest text-muted-foreground">
          Days-left countdown drives the expiry markdown flag · pick-order badge #1 = oldest unexpired lot
        </p>
      </div>
    </div>
  );
}

const REASONS: { key: AdjustmentReason; label: string }[] = [
  { key: "DAMAGE", label: "Damage" },
  { key: "LOSS", label: "Loss" },
  { key: "CORRECTION", label: "Correction" },
];

export function AdjustmentForm({ batchId, onDone }: { batchId: string; onDone: () => void }) {
  const [reason, setReason] = useState<AdjustmentReason>("DAMAGE");
  const [qty, setQty] = useState("");
  const [notes, setNotes] = useState("");

  const submit = () => {
    const n = Number(qty);
    if (!n) return;
    reportAdjustment({ batchId, reason, quantity: n, notes });
    onDone();
  };

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        Report adjustment — batch {batchId}
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-[auto_120px_1fr_auto] sm:items-end">
        <div>
          <label className="text-xs text-muted-foreground">Adjustment type</label>
          <div className="mt-1 flex flex-wrap gap-2">
            {REASONS.map(r => (
              <button
                key={r.key}
                onClick={() => setReason(r.key)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  reason === r.key ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Quantity</label>
          <input
            inputMode="numeric"
            value={qty}
            onChange={e => setQty(e.target.value.replace(reason === "CORRECTION" ? /[^\d-]/g : /[^\d]/g, "").slice(0, 7))}
            placeholder={reason === "CORRECTION" ? "+/- qty" : "qty"}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 font-mono text-xs outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Notes</label>
          <input
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="What happened?"
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-primary"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={submit}
            disabled={!Number(qty)}
            className="rounded-md bg-foreground px-3 py-1.5 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Submit
          </button>
          <button onClick={onDone} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted">
            Cancel
          </button>
        </div>
      </div>
      <p className="mt-3 text-[10px] uppercase tracking-widest text-muted-foreground">
        Submitting logs an Adjustment transaction and updates quantity remaining
      </p>
    </div>
  );
}
