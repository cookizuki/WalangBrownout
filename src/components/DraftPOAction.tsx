import { useState } from "react";
import { draftPO } from "@/lib/ops-store";
import { toast } from "sonner";

/**
 * Row-level action on Reorder Review. Turns a suggested reorder into a real
 * pending PO that appears in the Admin approval queue immediately.
 */
export function DraftPOAction({
  sku, quantity, requestedBy,
}: { sku: string; quantity: number; requestedBy: string }) {
  const [drafted, setDrafted] = useState(false);

  if (drafted) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11px] font-semibold text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        Sent to Admin
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        draftPO({ sku, quantity, requestedBy });
        setDrafted(true);
        toast.success("Purchase order drafted", { description: `Sent to Admin for approval — ${sku}, ${quantity} units` });
      }}
      className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-muted"
    >
      Draft PO
    </button>
  );
}