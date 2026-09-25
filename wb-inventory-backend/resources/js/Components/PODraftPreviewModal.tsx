import { Dialog, DialogPanel } from '@headlessui/react';
import { useForm } from '@inertiajs/react';
import { useState } from 'react';
export const money = (value: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(value);
export interface PODraftPreviewData {
  sku: string;
  productName: string;
  supplierName: string;
  supplierContact: string;
  supplierAddress?: string | null;
  supplierTin?: string | null;
  quantity: number;
  unitCost: number;
  onHand?: number;
  rop?: number;
  formulaLabel?: string;
  requestedBy: string;
  poNumber?: string;
  requestedAt?: string;
  totalCost?: number;
}


export function PODraftPreviewModal({ data, onBack, mode = 'draft' }: { data: PODraftPreviewData; onBack: () => void; mode?: 'draft' | 'approval' }) {
  const { data: form, setData, post, processing: submitting, errors } = useForm({ quantity: data.quantity, reason: '' });
  const [showRejectField, setShowRejectField] = useState(false);
  const draftNumber = data.poNumber ?? `DRAFT-${data.sku}`;
  const today = (data.requestedAt ? new Date(`${data.requestedAt}T00:00:00`) : new Date()).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
  const total = data.totalCost ?? data.quantity * data.unitCost;
  const status = mode === 'approval' ? 'Pending Approval' : 'Draft';
  const confirm = () => post(mode === 'approval' ? route('admin.po-approvals.approve', data.poNumber) : route('reorder.draft', data.sku), { preserveScroll: true, onSuccess: onBack });
  const reject = () => {
    if (!showRejectField) { setShowRejectField(true); return; }
    if (!form.reason.trim() || submitting) return;
    post(route('admin.po-approvals.reject', data.poNumber), { preserveScroll: true, onSuccess: onBack });
  };
  return (
    <Dialog open onClose={() => { if (!submitting) onBack(); }} aria-label="Purchase order draft preview" className="fixed inset-0 z-50 overflow-y-auto bg-foreground/50 px-4 py-8">
      <div className="flex min-h-full items-center justify-center">
      <DialogPanel className="mx-auto w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="border-b-2 border-border px-6 py-4">
          {/* Back button + Letterhead */}
          <div className="flex items-start gap-4">
            {/* BACK BUTTON */}
            <button
              type="button"
              onClick={() => !submitting && onBack()}
              disabled={submitting}
              aria-label="Go back"
              className="mt-0.5 shrink-0 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              ← Back
            </button>

            {/* Purchase Order title */}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Purchase Order
                  </p>

                  <h2 className="mt-0.5 font-display text-xl font-semibold">
                    WalangBrownout Appliances
                  </h2>
                </div>

                <span
                  className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${
                    "border-dashed border-border text-muted-foreground"
                  }`}
                >
                  {status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {/* Supplier + Order info */}
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Supplier Information
              </p>

              <p className="mt-1.5 text-sm font-semibold">
                {data.supplierName}
              </p>

              <p className="text-xs text-muted-foreground">
                {data.supplierContact}
              </p>

              {data.supplierAddress && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {data.supplierAddress}
                </p>
              )}

              {data.supplierTin && (
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                  TIN: {data.supplierTin}
                </p>
              )}
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Order Information
              </p>

              <dl className="mt-1.5 space-y-0.5 text-xs">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">PO Number</dt>
                  <dd className="font-mono">{draftNumber}</dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Date</dt>
                  <dd>{today}</dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd className="font-semibold">
                    {status}
                  </dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Requested by</dt>
                  <dd>{data.requestedBy}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Item details */}
          <div className="mt-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Item Details
            </p>

            <div className="mt-2 overflow-hidden rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead className="border-b border-border text-left text-[10px] uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-semibold">SKU</th>
                    <th className="px-3 py-2 font-semibold">Product</th>
                    <th className="px-3 py-2 text-right font-semibold">
                      Qty
                    </th>
                    <th className="px-3 py-2 text-right font-semibold">
                      Unit Price
                    </th>
                    <th className="px-3 py-2 text-right font-semibold">
                      Total
                    </th>
                  </tr>
                </thead>

                <tbody>
                  <tr>
                    <td className="px-3 py-2 font-mono">{data.sku}</td>

                    <td className="px-3 py-2 font-medium">
                      {data.productName}
                    </td>

                    <td className="px-3 py-2 text-right font-mono">
                      {data.quantity}
                    </td>

                    <td className="px-3 py-2 text-right font-mono">
                      {money(data.unitCost)}
                    </td>

                    <td className="px-3 py-2 text-right font-mono font-semibold">
                      {money(total)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Reorder info */}
          <div className="mt-4 rounded-lg border border-dashed border-border p-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Reorder Information
            </p>

            {data.onHand === undefined && data.rop === undefined ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Not available for this order.
              </p>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <p className="text-[10px] text-muted-foreground">
                    On Hand
                  </p>

                  <p className="font-mono text-sm font-semibold">
                    {data.onHand}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] text-muted-foreground">ROP</p>

                  <p className="font-mono text-sm font-semibold">
                    {data.rop}
                  </p>
                </div>

                <div className="col-span-2 sm:col-span-2">
                  <p className="text-[10px] text-muted-foreground">
                    Formula
                  </p>

                  <p className="font-mono text-xs text-muted-foreground">
                    {data.formulaLabel}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="mt-4 border-t border-dashed border-border pt-3">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Subtotal</span>

              <span className="font-mono">{money(total)}</span>
            </div>

            <div className="mt-1.5 flex justify-between text-sm font-semibold">
              <span>Estimated Total</span>

              <span className="font-mono">{money(total)}</span>
            </div>
          </div>
        </div>


        {Object.entries(errors).map(([field, message]) => <p role="alert" key={field} className="px-6 py-2 text-sm text-danger">{message}</p>)}
        {mode === 'approval' && showRejectField && <label className="block border-t border-border px-6 py-4 text-xs"><span className="font-semibold text-danger">Reason for rejection (required)</span><textarea autoFocus maxLength={2000} rows={2} disabled={submitting} value={form.reason} onChange={e => setData('reason', e.target.value)} placeholder="e.g. Unit price higher than last agreed rate" className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></label>}
        <div className="flex gap-2 border-t border-border px-6 py-3">
          {mode === 'approval' ? <button disabled={submitting || (showRejectField && !form.reason.trim())} onClick={reject} className="flex-1 rounded-lg border border-danger/40 px-4 py-2.5 text-sm text-danger disabled:opacity-50">{showRejectField ? 'Confirm Rejection' : 'Reject'}</button> : <button disabled={submitting} onClick={onBack} className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm">Cancel</button>}
          <button disabled={submitting || showRejectField} onClick={confirm} className="flex-1 rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background disabled:opacity-50">{submitting ? 'Processing...' : mode === 'approval' ? 'Approve' : 'Confirm Draft'}</button>
        </div>
      </DialogPanel>
      </div>
    </Dialog>
  );
}
