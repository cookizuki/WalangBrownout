import { Head } from '@inertiajs/react';
import { AuditLogPanel, type AuditEntry } from '@/Components/AuditLogPanel';
export default function AuditLog({ auditLogs }: { auditLogs: AuditEntry[] }) { return <><Head title="Audit Log" /><AuditLogPanel entries={auditLogs} /></>; }
