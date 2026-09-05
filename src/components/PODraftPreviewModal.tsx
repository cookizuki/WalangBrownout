import { useEffect, useState } from "react";

import { money } from "@/lib/inventory-data";

export interface PODraftPreviewData {
  sku: string;
  productName: string;
  supplierName: string;
  supplierContact: string;
  supplierAddress?: string;
  supplierTin?: string;
  quantity: number;
  unitCost: number;
  onHand?: number;
  rop?: number;
  formulaLabel?: string;
  requestedBy: string;
  poNumber?: string;
}

export function PODraftPreviewModal({
  data,
  onBack,
  onConfirm,
  onReject,
  mode = "draft",
}: {
  data: PODraftPreviewData;
  onBack: () => void;
  onConfirm: () => void;
  onReject?: (reason: string) => void;
  mode?: "draft" | "approval";
}) {
  const [shown, setShown] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectField, setShowRejectField] = useState(false);

  const draftNumber =
    data.poNumber ??
    `DRAFT-${data.sku}-${new Date().getTime().toString().slice(-4)}`;

  const today = new Date().toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const total = data.quantity * data.unitCost;

  // Opening animation
  useEffect(() => {
    const t = window.setTimeout(() => setShown(true), 10);

    return () => window.clearTimeout(t);
  }, []);

  // ESC = Back, NOT Reject
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) {
        onBack();
      }
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [submitting, onBack]);

  // Clicking outside = Back, NOT Reject
  const handleBackdropClick = () => {
    if (!submitting) {
      onBack();
    }
  };

  const handleConfirm = () => {
    if (submitting) return;
    setSubmitting(true);
    window.setTimeout(() => {
      onConfirm();
    }, 450);
  };

  // First click reveals the required reason field; second click (with a
  // non-empty reason) actually submits the rejection.
  const handleRejectClick = () => {
    if (submitting) return;
    if (!showRejectField) {
      setShowRejectField(true);
      return;
    }
    if (!rejectReason.trim()) return;

    setSubmitting(true);
    window.setTimeout(() => {
      onReject?.(rejectReason.trim());
    }, 450);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 px-4 py-8 transition-opacity duration-200 ${
        shown ? "opacity-100" : "opacity-0"
      }`}
      onClick={handleBackdropClick}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`max-h-full w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl transition-all duration-200 ${
          shown
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-3 scale-95 opacity-0"
        }`}
      >
        {/* Header */}
        <div className="border-b-2 border-border px-6 py-5">
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
                    mode === "approval"
                      ? "border-warning/50 text-warning"
                      : "border-dashed border-border text-muted-foreground"
                  }`}
                >
                  {mode === "approval" ? "Pending Approval" : "Draft"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
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
                    {mode === "approval" ? "Pending Approval" : "Draft"}
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
          <div className="mt-5">
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
                    <td className="px-3 py-2.5 font-mono">{data.sku}</td>

                    <td className="px-3 py-2.5 font-medium">
                      {data.productName}
                    </td>

                    <td className="px-3 py-2.5 text-right font-mono">
                      {data.quantity}
                    </td>

                    <td className="px-3 py-2.5 text-right font-mono">
                      {money(data.unitCost)}
                    </td>

                    <td className="px-3 py-2.5 text-right font-mono font-semibold">
                      {money(total)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Reorder info */}
          <div className="mt-5 rounded-lg border border-dashed border-border p-3.5">
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
          <div className="mt-5 border-t border-dashed border-border pt-4">
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

        {/* Reject reason (approval mode only, revealed on first Reject click) */}
        {mode === "approval" && showRejectField && (
          <div className="border-t border-border px-6 py-4">
            <label className="block text-xs">
              <span className="font-semibold text-danger">
                Reason for rejection (required)
              </span>

              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Unit price higher than last agreed rate"
                rows={2}
                autoFocus
                disabled={submitting}
                className="mt-1.5 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-danger disabled:opacity-60"
              />
            </label>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 border-t border-border px-6 py-4">
          {mode === "approval" ? (
            <>
              {/* REJECT */}
              <button
                type="button"
                onClick={handleRejectClick}
                disabled={submitting || (showRejectField && !rejectReason.trim())}
                className="flex-1 rounded-lg border border-danger/40 px-4 py-2.5 text-sm font-medium text-danger transition-colors hover:bg-danger/10 focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting
                  ? "Processing…"
                  : showRejectField
                    ? "Confirm Rejection"
                    : "Reject"}
              </button>

              {/* APPROVE */}
              <button
                type="button"
                onClick={handleConfirm}
                disabled={submitting || showRejectField}
                className="flex-1 rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? "Processing…" : "Approve"}
              </button>
            </>
          ) : (
            <>
              {/* DRAFT MODE */}
              <button
                type="button"
                onClick={() => !submitting && onBack()}
                disabled={submitting}
                className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                disabled={submitting}
                className="flex-1 rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? "Processing…" : "Confirm Draft"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}