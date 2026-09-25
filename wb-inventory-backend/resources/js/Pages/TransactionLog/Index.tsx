import { useEffect, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { CheckCircle2 } from 'lucide-react';
import { Th, Td, AnimatedRow, EmptyState, SectionLabel, titleCase } from '@/Components/ui-bits';
import { TxTypeBadge, type TxType } from '@/lib/txTypeStyles';
const TX_TYPES: (TxType | 'ALL')[] = ['ALL', 'SALE', 'RECEIPT', 'RETURN', 'ADJUSTMENT', 'TRANSFER', 'WRITE_OFF'];
type Transaction = { id: string; sku: string; productName: string; batchId: string | null; type: TxType; quantityDelta: number; userId: number; timestamp: string; channel: string };
export default function TransactionLog({ transactions, filters }: { transactions: Transaction[]; filters: { q: string; type: TxType | 'ALL' } }) {
  const [q, setQ] = useState(filters.q);
  const [type, setType] = useState(filters.type);
  useEffect(() => {
    if (q.trim() === filters.q && type === filters.type) return;
    const timer = window.setTimeout(() => router.get(route('transactions.index'), { q, type }, { preserveState: true, preserveScroll: true, replace: true }), 250);
    return () => window.clearTimeout(timer);
  }, [q, type, filters.q, filters.type]);
  return (
    <main className="mx-auto max-w-7xl space-y-2 p-4 sm:p-8">
      <Head title="Transaction Log" />
      <SectionLabel>Transaction log — every stock movement, newest first</SectionLabel>
      <div className="card-surface overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-4">
          {TX_TYPES.map(v => (
            <button
              key={v}
              aria-pressed={type === v} onClick={() => setType(v)}
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
            aria-label="Search product or batch" placeholder="Search product or batch…"
            className="ml-auto w-full rounded-full border border-border bg-background px-4 py-1.5 text-xs outline-none focus:border-primary sm:w-56"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-220 text-sm">
            <thead className="text-left text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr className="border-b border-border">
                <Th>Transaction</Th><Th>Product</Th><Th>Batch</Th><Th>Type</Th>
                <Th>Qty Δ</Th><Th>User</Th><Th>Timestamp</Th><Th>Channel</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dashed divide-border">
              {transactions.map((t, i) => (
                <AnimatedRow key={`${type}-${t.id}`} delay={i * 40}>
                  <Td className="font-mono text-xs">{t.id}</Td>
                  <Td className="font-medium">{t.productName}</Td>
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
              {transactions.length === 0 && (
                <tr><td colSpan={8}><EmptyState icon={CheckCircle2} message="No transactions match this filter." /></td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="border-t border-border px-5 py-3 text-[10px] uppercase tracking-widest text-muted-foreground">
          Adjustments raised from stock counts and damage reports appear here automatically
        </p>
      </div>
    </main>
  );
}
