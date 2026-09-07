import { useOps } from "@/lib/ops-store";
import { History } from "lucide-react";
import { EmptyState } from "@/components/ui-bits";

export function AuditLogPanel() {
  const { auditLog } = useOps();

  return (
    <div className="card-surface overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-border px-5 py-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
          <History className="h-4 w-4" strokeWidth={2} />
        </span>
        <div>
          <h2 className="text-lg font-semibold">System Audit Trail</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Tracks configuration changes made through the Admin panel — separate from the physical stock Transaction Log
          </p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-150 text-sm">
          <thead className="text-left text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr className="border-b border-border">
              <th className="px-5 py-3 font-semibold">User</th>
              <th className="px-5 py-3 font-semibold">Action</th>
              <th className="px-5 py-3 font-semibold">Target</th>
              <th className="px-5 py-3 font-semibold">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dashed divide-border">
            {auditLog.map((a, i) => (
              <tr key={a.id} className={`transition-colors hover:bg-muted/40 ${i % 2 === 1 ? "bg-muted/20" : ""}`}>
                <td className="px-5 py-3 font-medium">{a.userName}</td>
                <td className="px-5 py-3 text-muted-foreground">{a.action}</td>
                <td className="px-5 py-3 font-mono text-xs">{a.target}</td>
                <td className="px-5 py-3 text-xs text-muted-foreground">
                  {a.timestamp.replace("T", " ").slice(0, 16)}
                </td>
              </tr>
            ))}
            {auditLog.length === 0 && (
              <tr><td colSpan={4}><EmptyState icon={History} message="No configuration changes recorded yet." /></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}