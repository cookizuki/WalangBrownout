import { useOps } from "@/lib/ops-store";

export function AuditLogPanel() {
  const { auditLog } = useOps();

  return (
    <div className="card-surface overflow-hidden">
      <div className="border-b border-border px-5 py-3">
        <h2 className="text-sm font-semibold">System Audit Trail</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Tracks configuration changes made through the Admin panel — separate from the physical stock Transaction Log
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead className="text-left text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr className="border-b border-border">
              <th className="px-5 py-3 font-semibold">User</th>
              <th className="px-5 py-3 font-semibold">Action</th>
              <th className="px-5 py-3 font-semibold">Target</th>
              <th className="px-5 py-3 font-semibold">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dashed divide-border">
            {auditLog.map(a => (
              <tr key={a.id} className="hover:bg-muted/40">
                <td className="px-5 py-3 font-medium">{a.userName}</td>
                <td className="px-5 py-3 text-muted-foreground">{a.action}</td>
                <td className="px-5 py-3 font-mono text-xs">{a.target}</td>
                <td className="px-5 py-3 text-xs text-muted-foreground">
                  {a.timestamp.replace("T", " ").slice(0, 16)}
                </td>
              </tr>
            ))}
            {auditLog.length === 0 && (
              <tr><td colSpan={4} className="px-5 py-10 text-center text-muted-foreground">No configuration changes recorded yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}