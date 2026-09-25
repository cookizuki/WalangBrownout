import { useState } from 'react';
import { PODraftPreviewModal, type PODraftPreviewData } from './PODraftPreviewModal';
export function DraftPOAction({ alreadyPending, ...data }: PODraftPreviewData & { alreadyPending: boolean }) {
  const [open, setOpen] = useState(false);
  if (alreadyPending) return <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11px] font-semibold text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-current" />Sent to Admin</span>;
  return <><button onClick={() => setOpen(true)} className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted">Draft PO</button>{open && <PODraftPreviewModal data={data} onBack={() => setOpen(false)} />}</>;
}
