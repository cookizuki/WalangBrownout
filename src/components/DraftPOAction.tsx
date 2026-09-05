import { useState } from "react";
import { toast } from "sonner";
import { draftPO, useOps } from "@/lib/ops-store";
import { PODraftPreviewModal, type PODraftPreviewData } from "@/components/PODraftPreviewModal";

export function DraftPOAction({
  sku, productName, quantity, requestedBy, unitCost, onHand, rop, formulaLabel, supplierName, supplierContact, supplierAddress, supplierTin,
}: {
  sku: string; productName: string; quantity: number; requestedBy: string;
  unitCost: number; onHand: number; rop: number; formulaLabel: string;
  supplierName: string; supplierContact: string; supplierAddress?: string; supplierTin?: string;
}) {
  const { pendingPOs } = useOps();
  const [open, setOpen] = useState(false);

  const alreadyPending = pendingPOs.some(po => po.sku === sku);

  if (alreadyPending) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11px] font-semibold text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        Sent to Admin
      </span>
    );
  }

  const previewData: PODraftPreviewData = {
    sku, productName, quantity, requestedBy, unitCost, onHand, rop, formulaLabel, supplierName, supplierContact, supplierAddress, supplierTin,
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-muted"
      >
        Draft PO
      </button>

      {open && (
        <PODraftPreviewModal
          data={previewData}
          onBack={() => setOpen(false)}
          onConfirm={() => {
            const created = draftPO({ sku, quantity, requestedBy });
            setOpen(false);
            if (created) {
              toast.success("Purchase order drafted successfully.", {
                description: `${sku} · ${quantity} units → sent to Admin for approval`,
              });
            } else {
              toast.warning("A purchase order for this SKU is already pending.", {
                description: `${sku} is already in the Admin approval queue`,
              });
            }
          }}
        />
      )}
    </>
  );
}