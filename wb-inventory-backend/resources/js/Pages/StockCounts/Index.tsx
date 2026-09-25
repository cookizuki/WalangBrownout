import { Fragment, useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import { AnimatedRow, Panel, SectionLabel, TaskPill, Td, Th, TimeAgo, titleCase } from '@/Components/ui-bits';
type Count = { id: string; sku: string; productName: string; locationId: number; locationCode: string; systemQty: number; countedQty: number | null; dueDate: string; status: 'PENDING' | 'IN_PROGRESS' | 'DONE' };
type Transaction = { id: string; sku: string; batchId: string | null; type: string; quantityDelta: number; timestamp: string };
export default function StockCountsPage({ mode, counts, transactions }: { mode: 'entry' | 'review'; counts: Count[]; transactions: Transaction[] }) {
  const form = useForm({});
  const [notice, setNotice] = useState('');
  const submitCount = (id: string, quantity: number) => {
    form.transform(() => ({ counted_qty: quantity }));
    form.post(route('counts.submit', id), { preserveScroll: true, onSuccess: () => { setDraft(s => ({ ...s, [id]: '' })); setNotice('Count submitted.'); } });
  };
  const requestRecount = (id: string) => {
    form.transform(() => ({}));
    form.post(route('counts.recount', id), { preserveScroll: true, onSuccess: () => { setRequested(r => [...r, id]); setNotice('New pending recount created. The original count is unchanged.'); } });
  };
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [requested, setRequested] = useState<string[]>([]);

  return (
    <div className="mx-auto max-w-7xl space-y-2 p-4 sm:p-8">
      <Head title="Stock Counts" />
      {notice && <p role="status" className="rounded-lg border border-border bg-surface p-3 text-sm">{notice}</p>}
      {Object.entries(form.errors).map(([key, error]) => <p key={key} role="alert" className="text-sm text-danger">{String(error)}</p>)}
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
          <table className="w-full min-w-205 text-sm">
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
                  t => t.sku === c.sku,
                );
                return (
                  <Fragment key={c.id}>
                    <AnimatedRow delay={i * 50}>
                      <Td className="font-mono text-xs">{c.id}</Td>
                      <Td className="font-medium">{c.productName}</Td>
                      <Td className="text-muted-foreground">{c.locationCode}</Td>
                      <Td className="font-mono">{c.systemQty}</Td>
                      <Td>
                        {mode === "entry" && c.countedQty === null ? (
                          <input
                            aria-label={`Counted quantity for ${c.id}`}
                            disabled={form.processing}
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
                            disabled={form.processing || !entered}
                            onClick={() => {
                              submitCount(c.id, Number(entered));

                            }}
                            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Submit count
                          </button>
                        )}
                        {mode === "entry" && c.status === "DONE" && (
                          <button
                            disabled={form.processing}
                            onClick={() => requestRecount(c.id)}
                            className="rounded-md border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            Request recount
                          </button>
                        )}
                        {investigable && (
                          <div className="flex items-center gap-3">
                            <button
                              aria-expanded={open === c.id}
                              onClick={() => setOpen(open === c.id ? null : c.id)}
                              className="text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
                            >
                              {open === c.id ? "Hide log" : "Investigate"}
                            </button>
                            {requested.includes(c.id) ? (
                              <span className="text-xs font-semibold text-success">Recount requested</span>
                            ) : (
                              <button
                                disabled={form.processing}
                              onClick={() => {
                                  requestRecount(c.id);

                                }}
                                className="rounded-md border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                              >
                                Request recount
                              </button>
                            )}
                          </div>
                        )}
                      </Td>
                    </AnimatedRow>
                    {open === c.id && (
                      <tr className="bg-muted/30">
                        <td colSpan={8} className="px-5 py-4">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                            Related transactions — {c.productName}
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
