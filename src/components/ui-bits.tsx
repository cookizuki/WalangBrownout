// Shared presentational primitives used across every dashboard page.
import { useEffect, useState, type ReactNode } from "react";

export function Th({ children }: { children: ReactNode }) {
  return <th className="px-5 py-3 font-semibold">{children}</th>;
}

export function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`px-5 py-3 ${className}`}>{children}</td>;
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{children}</p>;
}

export function Panel({
  title, right, children, footer,
}: { title: string; right?: ReactNode; children: ReactNode; footer?: string }) {
  return (
    <div className="card-surface overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {right}
      </div>
      {children}
      {footer && <p className="border-t border-border px-5 py-3 text-[10px] uppercase tracking-widest text-muted-foreground">{footer}</p>}
    </div>
  );
}

export function TaskPill({ status }: { status: "PENDING" | "IN_PROGRESS" | "DONE" }) {
  const map = {
    PENDING: "border-warning/50 text-warning",
    IN_PROGRESS: "border-info/50 text-info",
    DONE: "border-success/40 text-success",
  } as const;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold ${map[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {titleCase(status)}
    </span>
  );
}

export function StatusPill({ status }: { status: "OK" | "WATCH" | "REORDER" }) {
  const map = {
    OK: "border-success/40 text-success",
    WATCH: "border-warning/50 text-warning",
    REORDER: "border-danger/50 text-danger",
  } as const;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold ${map[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

export function AnimatedRow({
  children, delay = 0, className = "", onClick,
}: { children: ReactNode; delay?: number; className?: string; onClick?: () => void }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setShown(true), delay);
    return () => window.clearTimeout(t);
  }, [delay]);
  return (
    <tr
      onClick={onClick}
      className={`transition-all duration-300 ease-out hover:bg-muted/50 motion-reduce:transition-none ${
        shown ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
      } ${className}`}
    >
      {children}
    </tr>
  );
}

export function daysLeft(dateISO?: string): number | null {
  if (!dateISO) return null;
  return Math.ceil((new Date(dateISO).getTime() - Date.now()) / 86400000);
}

export function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.round(hrs / 24)} d ago`;
}

export function TimeAgo({ iso }: { iso: string }) {
  const [label, setLabel] = useState("");
  useEffect(() => setLabel(timeAgo(iso)), [iso]);
  return <>{label || "—"}</>;
}

export function titleCase(s: string) {
  return s.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}
