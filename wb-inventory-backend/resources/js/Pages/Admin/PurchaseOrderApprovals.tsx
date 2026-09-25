import { useState } from 'react';
import { Head } from '@inertiajs/react';
import { PODraftPreviewModal, money, type PODraftPreviewData } from '@/Components/PODraftPreviewModal';
type PendingPO = PODraftPreviewData & { poNumber: string; totalCost: number; requestedAt: string };
export default function PurchaseOrderApprovals({ pending }: { pending: PendingPO[] }) {
  const [reviewing, setReviewing] = useState<string | null>(null);
  const selected = pending.find(po => po.poNumber === reviewing);
  return <div className="mx-auto max-w-7xl space-y-2 p-4 sm:p-8">
    <Head title="Purchase Order Approvals" />
    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">purchase order approval queue (Purchasing Manager responsibility)</p>
    <div className="card-surface">
      <div className="flex items-center justify-between border-b border-border px-5 py-4"><h1 className="text-lg font-semibold">Pending Purchase Orders</h1><span className="rounded-full border border-border px-3 py-1 text-[11px] font-semibold text-muted-foreground">{pending.length} PENDING</span></div>
      <ul className="space-y-3 px-5 py-4">{pending.map(po => <li key={po.poNumber} className="rounded-lg border border-dashed border-border p-4">
        <div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-baseline gap-3"><span className="text-sm font-semibold">{po.poNumber}</span><span className="text-sm text-muted-foreground">{po.supplierName}</span></div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-muted-foreground"><span>{po.productName} × {po.quantity}</span><span className="font-semibold text-foreground">{money(po.totalCost)}</span><span>Requested by {po.requestedBy} · {po.requestedAt}</span></div>
        </div><button onClick={() => setReviewing(po.poNumber)} className="rounded-md bg-foreground px-4 py-1.5 text-xs font-semibold text-background">Review</button></div>
      </li>)}</ul>
      <div className="px-5 pb-5"><div className="flex min-h-24 items-center justify-center rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">{pending.length === 0 ? 'No purchase orders waiting — the queue is clear.' : "No other approvals pending — you're all caught up"}</div></div>
    </div>
    {selected && <PODraftPreviewModal data={selected} mode="approval" onBack={() => setReviewing(null)} />}
  </div>;
}
