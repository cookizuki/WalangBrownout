import { useState, type ReactNode } from 'react';
import { Head } from '@inertiajs/react';
import { SectionLabel, Th, Td, titleCase } from '@/Components/ui-bits';
import { ScanInput } from '@/Components/ScanInput';
import { printBatchLabel } from '@/Components/BatchLabel';
import { ReceivingEntryModal, type ReceivingLine, type ReceivedBatch } from '@/Components/ReceivingEntryModal';
type Location = { id: number; code: string; description: string; lotCount: number; quantity: number };
function Panel({ title, footer, children }: { title: string; footer: string; children: ReactNode }) { return <div className="card-surface overflow-hidden"><h1 className="border-b border-border px-5 py-3.5 text-lg font-bold">{title}</h1>{children}<p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">{footer}</p></div>; }
export default function ReceivingPage({ receivingLines, locations }: { receivingLines: ReceivingLine[]; locations: Location[] }) {
  const [notice, setNotice] = useState<{ title: string; description: string; batch?: ReceivedBatch } | null>(null);
  const toast = { success: (title: string, options: { description: string }) => setNotice({ title, ...options }), error: (title: string, options: { description: string }) => setNotice({ title, ...options }) };
  const [receivingLine, setReceivingLine] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState<string | null>(null);

  const handleScan = (code: string) => {
    const match = receivingLines.find(
      r => r.sku.toLowerCase() === code.toLowerCase() || r.poNumber.toLowerCase() === code.toLowerCase(),
    );
    if (match) {
      setHighlighted(match.id);
      toast.success("Match found", { description: `${match.id} · ${match.poNumber}` });
      window.setTimeout(() => setHighlighted(null), 2200);
    } else {
      toast.error("No matching line", { description: `"${code}" doesn't match any SKU or PO number in this queue` });
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-8">
      <Head title="Receiving & Putaway" />
      {notice && <div role="status" className="fixed bottom-5 right-5 z-40 max-w-sm rounded-xl border border-border bg-surface p-4 shadow-xl"><div className="flex justify-between gap-4"><strong>{notice.title}</strong><button aria-label="Dismiss notification" onClick={() => setNotice(null)}>X</button></div><p className="mt-1 text-sm">{notice.description}</p>{notice.batch && <button className="mt-3 rounded-md border border-border px-3 py-1.5 text-sm" onClick={() => printBatchLabel(notice.batch!)}>Print label</button>}</div>}
      <div className="space-y-2">
        <SectionLabel>Inbound panel — one row per PO line</SectionLabel>
        {!receivingLine && <ScanInput onScan={handleScan} placeholder="Scan or type a SKU / PO number, then press Enter" />}
        <Panel title="Receiving & Putaway" footer="Receiving creates a new inventory batch stamped with date received and its warehouse location">
          <div className="overflow-x-auto">
            <table className="w-full min-w-220 text-sm">
              <thead className="text-left text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr className="border-b border-border">
                  <Th>Line</Th><Th>PO</Th><Th>Product</Th><Th>Supplier</Th>
                  <Th>Ordered / Received</Th><Th>ETA</Th><Th>Putaway</Th><Th>Status</Th><Th>{" "}</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dashed divide-border">
                {receivingLines.map(r => {

                  const canReceive = r.status !== "PUT_AWAY" && r.quantityReceived < r.quantityOrdered;
                  return (
                    <tr key={r.id} className={`transition-colors duration-500 hover:bg-muted/40 ${highlighted === r.id ? "bg-success/10" : ""}`}>
                      <Td className="font-mono text-xs">{r.id}</Td>
                      <Td className="font-mono text-xs">{r.poNumber}</Td>
                      <Td className="font-medium">{r.productName}</Td>
                      <Td className="text-muted-foreground">{r.supplierName}</Td>
                      <Td className="font-mono text-xs">{r.quantityOrdered} / {r.quantityReceived}</Td>
                      <Td className="text-muted-foreground">{r.expectedDate}</Td>
                      <Td className="font-mono text-xs">{r.locationCode}</Td>
                      <Td>
                        <span className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                          r.status === "IN_TRANSIT" ? "border-warning/50 text-warning"
                          : r.status === "ARRIVED" ? "border-info/50 text-info"
                          : "border-success/40 text-success"
                        }`}>
                          {titleCase(r.status)}
                        </span>
                      </Td>
                      <Td>
                        {canReceive && (
                          <button
                            onClick={() => setReceivingLine(r.id)}
                            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                          >
                            Receive
                          </button>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <div className="space-y-2">
        <SectionLabel>Storage map — where the lots live</SectionLabel>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {locations.map(l => {

            return (
              <div key={l.id} className="card-surface p-5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-semibold">{l.code}</span>
                  <span className="chip border border-border text-muted-foreground">{l.lotCount} lots</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{l.description}</p>
                <div className="mt-3 font-display text-2xl font-semibold">{l.quantity}</div>
                <div className="text-xs text-muted-foreground">units on hand</div>
              </div>
            );
          })}
        </div>
      </div>

      {receivingLine && (() => {
        const line = receivingLines.find(r => r.id === receivingLine);
        if (!line) return null;

        return (
          <ReceivingEntryModal
            line={line}
            onSave={batch => setNotice({ title: 'Delivery received', description: `New batch created for ${batch.productName} - ${batch.quantity} units`, batch })}
            onClose={() => setReceivingLine(null)}
          />
        );
      })()}
    </div>
  );
}