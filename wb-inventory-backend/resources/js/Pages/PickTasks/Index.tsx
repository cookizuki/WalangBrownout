import { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { Panel, SectionLabel, Th, Td, TaskPill } from '@/Components/ui-bits';
import { ScanInput } from '@/Components/ScanInput';
import { FIFOExceptionPopover } from '@/Components/FIFOExceptionPopover';
export type PickTask = { id: string; sku: string; productName: string; batchId: string; locationId: number; locationCode: string; quantity: number; orderRef: string; priority: 'HIGH' | 'NORMAL' | 'LOW'; status: 'PENDING' | 'IN_PROGRESS' | 'DONE'; assignedTo: string };
export default function PickTasksPage({ tasks: pickTasks }: { tasks: PickTask[] }) {
  const [notice, setNotice] = useState('');
  const form = useForm({});
  const completePickTask = (id: string) => form.post(route('picks.complete', id), { preserveScroll: true, onSuccess: () => setNotice('Pick completed.') });
  const toast = { success: (title: string, data: { description: string }) => setNotice(`${title}: ${data.description}`), error: (title: string, data: { description: string }) => setNotice(`${title}: ${data.description}`) };
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const order = { HIGH: 0, NORMAL: 1, LOW: 2 } as const;
  const rows = [...pickTasks].sort((a, b) => order[a.priority] - order[b.priority]);

  const handleScan = (code: string) => {
    const match = rows.find(
      t => t.sku.toLowerCase() === code.toLowerCase() || t.batchId.toLowerCase() === code.toLowerCase(),
    );
    if (match) {
      setHighlighted(match.id);
      toast.success("Match found", { description: `${match.id} · ${match.productName}` });
      window.setTimeout(() => setHighlighted(null), 2200);
    } else {
      toast.error("No matching task", { description: `"${code}" doesn't match any SKU or Batch ID in this queue` });
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-2 p-4 sm:p-8">
      <Head title="Pick Tasks" />
      {notice && <p role="status" className="rounded-lg border border-border bg-surface p-3 text-sm">{notice}</p>}
      {Object.entries(form.errors).map(([key, error]) => <p role="alert" key={key} className="text-sm text-danger">{String(error)}</p>)}
      <SectionLabel>Pick queue — batch is pre-assigned by FIFO, oldest lot first</SectionLabel>
      <ScanInput onScan={handleScan} />
      <Panel
        title="Pick Tasks"
        right={
          <span className="rounded-full border border-border px-3 py-1 text-[11px] font-semibold text-muted-foreground">
            {rows.filter(t => t.status !== "DONE").length} OPEN
          </span>
        }
        footer="Pick from the assigned FIFO batch. Report damaged or missing stock before using another lot."
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-225 text-sm">
            <thead className="text-left text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr className="border-b border-border">
                <Th>Task</Th><Th>Product</Th><Th>Pick From</Th><Th>Qty</Th>
                <Th>Order</Th><Th>Priority</Th><Th>Status</Th><Th>{" "}</Th><Th>{" "}</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dashed divide-border">
              {rows.map(t => {

                const status = t.status;
                return (
                  <tr key={t.id} className={`transition-colors duration-500 hover:bg-muted/40 ${highlighted === t.id ? "bg-success/10" : ""}`}>
                    <Td className="font-mono text-xs">{t.id}</Td>
                    <Td className="font-medium">{t.productName}</Td>
                    <Td className="font-mono text-xs">
                      {t.batchId} <span className="text-muted-foreground">· {t.locationCode}</span>
                    </Td>
                    <Td className="font-mono">{t.quantity}</Td>
                    <Td className="font-mono text-xs text-muted-foreground">{t.orderRef}</Td>
                    <Td>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                        t.priority === "HIGH" ? "border-danger/50 text-danger"
                        : t.priority === "NORMAL" ? "border-border text-muted-foreground"
                        : "border-dashed border-border text-muted-foreground"
                      }`}>
                        {t.priority === "HIGH" ? <ArrowUp className="h-3 w-3" strokeWidth={2.5} /> : t.priority === "NORMAL" ? <Minus className="h-3 w-3" strokeWidth={2.5} /> : <ArrowDown className="h-3 w-3" strokeWidth={2.5} />}
                        {t.priority}
                      </span>
                    </Td>
                    <Td><TaskPill status={status} /></Td>
                    <Td>
                      {status !== "DONE" && (
                        <button
                          disabled={form.processing}
                          onClick={() => completePickTask(t.id)}
                          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                        >
                          Mark picked
                        </button>
                      )}
                    </Td>
                    <Td>
                      {status !== "DONE" && <FIFOExceptionPopover key={t.batchId} taskId={t.id} batchId={t.batchId} onMessage={setNotice} />}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
