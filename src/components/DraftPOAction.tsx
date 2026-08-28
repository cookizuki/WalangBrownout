import { useState } from "react";
import { toast } from "sonner";
import { draftPO } from "@/lib/ops-store";
import { PODraftPreviewModal, type PODraftPreviewData } from "@/components/PODraftPreviewModal";

export function DraftPOAction({
  sku, productName, quantity, requestedBy, unitCost, onHand, rop, formulaLabel, supplierName, supplierContact,
}: {
  sku: string; productName: string; quantity: number; requestedBy: string;
  unitCost: number; onHand: number; rop: number; formulaLabel: string;
  supplierName: string; supplierContact: string;
}) {
  const [open, setOpen] = useState(false);
  const [drafted, setDrafted] = useState(false);

  if (drafted) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11px] font-semibold text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        Sent to Admin
      </span>
    );
  }

  const previewData: PODraftPreviewData = {
    sku, productName, quantity, requestedBy, unitCost, onHand, rop, formulaLabel, supplierName, supplierContact,
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
          onCancel={() => setOpen(false)}
          onConfirm={() => {
            draftPO({ sku, quantity, requestedBy });
            setOpen(false);
            setDrafted(true);
            toast.success("Purchase order drafted successfully.", {
              description: `${sku} · ${quantity} units → sent to Admin for approval`,
            });
          }}
        />
      )}
    </>
  );
}