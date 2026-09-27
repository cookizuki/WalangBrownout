import { useState } from 'react';
import { Th, Td, TimeAgo } from '@/Components/ui-bits';
export type AuditEntry = { id: string; user_name: string; action: string; target: string; timestamp: string };
export function AuditLogPanel({ entries }: { entries: AuditEntry[] }) {
 const [query, setQuery] = useState(''); const rows = entries.filter(row => `${row.user_name} ${row.action} ${row.target}`.toLowerCase().includes(query.toLowerCase()));
 return <section className="card-surface overflow-hidden"><div className="flex flex-wrap justify-between gap-3 border-b border-border p-5"><h2 className="text-lg font-semibold">Audit Trail</h2><input aria-label="Search audit trail" placeholder="Search audit trail..." value={query} onChange={e => setQuery(e.target.value)} className="rounded-md border border-border bg-background px-3 py-2 text-sm" /></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><Th>User</Th><Th>Action</Th><Th>Target</Th><Th>When</Th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><Td>{row.user_name}</Td><Td>{row.action}</Td><Td>{row.target}</Td><Td><TimeAgo iso={row.timestamp} /></Td></tr>)}{!rows.length && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No audit entries match.</td></tr>}</tbody></table></div></section>;
}
