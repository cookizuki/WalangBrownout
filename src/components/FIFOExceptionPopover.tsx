import { useState } from "react";
import { reportFifoIssue } from "@/lib/ops-store";
import { toast } from "sonner";

export function FIFOExceptionPopover({ taskId }: { taskId: string }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);

  if (done) {
    return <span className="text-[10px] font-semibold text-muted-foreground">Batch unlocked</span>;
  }

  const flag = (reason: "DAMAGED" | "MISSING") => {
    reportFifoIssue(taskId, reason);
    setOpen(false);
    setDone(true);
    toast.warning("Batch flagged and unlocked", { description: `${taskId} reassigned to the next available FIFO lot` });
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="rounded-md border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        Report issue
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1.5 w-44 overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
            <button
              onClick={() => flag("DAMAGED")}
              className="block w-full px-3.5 py-2.5 text-left text-xs font-medium hover:bg-muted"
            >
              Flag as damaged
            </button>
            <button
              onClick={() => flag("MISSING")}
              className="block w-full border-t border-border px-3.5 py-2.5 text-left text-xs font-medium hover:bg-muted"
            >
              Flag as missing
            </button>
          </div>
        </>
      )}
    </div>
  );
}