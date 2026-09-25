import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { useForm } from '@inertiajs/react';
export type ReceivingLine = { id: string; poNumber: string; sku: string; productName: string; supplierName: string; quantityOrdered: number; quantityReceived: number; expectedDate: string; receivedDate: string | null; locationCode: string; status: 'IN_TRANSIT' | 'ARRIVED' | 'PUT_AWAY' };
export type ReceivedBatch = { batchId: string; sku: string; productName: string; quantity: number; dateReceived: string; expirationDate: string };
export function ReceivingEntryModal({ line, onClose, onSave }: { line: ReceivingLine; onClose: () => void; onSave: (batch: ReceivedBatch) => void }) {
  const remaining = line.quantityOrdered - line.quantityReceived;
  const form = useForm({ quantity: String(remaining), expiration_date: '' });
  const close = () => { if (!form.processing) onClose(); };
  return <Dialog open onClose={close} className="relative z-50">
    <div className="fixed inset-0 bg-foreground/40" aria-hidden="true" />
    <div className="fixed inset-0 flex items-center justify-center overflow-y-auto p-4"><DialogPanel className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
      <form onSubmit={e => { e.preventDefault(); form.post(route('receiving.receive', line.id), { preserveScroll: true, onSuccess: page => { const batch = page.props.receivedBatch as ReceivedBatch | null; if (batch) onSave(batch); onClose(); } }); }}>
        <div className="flex items-start justify-between gap-4"><div><DialogTitle className="font-display text-lg font-semibold">Receive delivery</DialogTitle><p className="mt-1 text-sm text-muted-foreground">{line.id} / {line.productName}</p></div><button type="button" onClick={close} disabled={form.processing} aria-label="Close" className="h-8 w-8 rounded-md border border-border">X</button></div>
        <label className="mt-5 block"><span className="text-xs font-semibold uppercase text-muted-foreground">Quantity received</span><input autoFocus type="number" min="1" max={remaining} step="1" required value={form.data.quantity} onChange={e => form.setData('quantity', e.target.value)} className="mt-1.5 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm" /><span className="mt-1 block text-xs text-muted-foreground">Ordered: {line.quantityOrdered} / Remaining: {remaining}</span></label>
        <label className="mt-4 block"><span className="text-xs font-semibold uppercase text-muted-foreground">Expiration date *</span><input type="date" required value={form.data.expiration_date} onChange={e => form.setData('expiration_date', e.target.value)} className="mt-1.5 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm" /></label>
        {Object.entries(form.errors).map(([key, error]) => <p role="alert" key={key} className="mt-3 text-xs font-medium text-danger">{error}</p>)}
        <div className="mt-5 flex gap-2"><button type="submit" disabled={form.processing} className="flex-1 rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background disabled:opacity-50">{form.processing ? 'Receiving...' : 'Confirm receipt'}</button><button type="button" onClick={close} disabled={form.processing} className="rounded-lg border border-border px-4 py-2.5 text-sm">Cancel</button></div>
        <p className="mt-4 text-xs text-muted-foreground">Confirming creates a new Inventory Batch stamped with today's date and this line's warehouse location.</p>
      </form>
    </DialogPanel></div>
  </Dialog>;
}
