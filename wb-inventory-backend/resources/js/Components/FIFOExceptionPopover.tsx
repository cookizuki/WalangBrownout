import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { useForm } from '@inertiajs/react';
export function FIFOExceptionPopover({ taskId, batchId, onMessage }: { taskId: string; batchId: string; onMessage: (message: string) => void }) {
  const form = useForm({ batch_id: batchId, reason: 'DAMAGED' });
  return <Popover className="relative inline-block">{({ close }) => <>
    <PopoverButton disabled={form.processing} className="rounded-md border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground">Report issue</PopoverButton>
    <PopoverPanel anchor="bottom end" className="z-50 mt-1.5 w-52 rounded-lg border border-border bg-surface p-1 shadow-lg">
      {(['DAMAGED', 'MISSING'] as const).map(reason => <button key={reason} disabled={form.processing} className="block w-full px-3 py-2.5 text-left text-xs hover:bg-muted disabled:opacity-50" onClick={() => {
        form.transform(() => ({ batch_id: batchId, reason }));
        form.post(route('picks.fifo-exception', taskId), { preserveScroll: true, onSuccess: page => { onMessage(String(page.props.fifoMessage ?? 'Batch flagged.')); close(); } });
      }}>Flag as {reason.toLowerCase()}</button>)}
      {Object.entries(form.errors).map(([key, error]) => <p role="alert" key={key} className="p-2 text-xs text-danger">{error}</p>)}
    </PopoverPanel>
  </>}</Popover>;
}
