// Shared presentational primitives used across every dashboard page.
import { useEffect, useState, type ReactNode } from "react";
import { Clock3, Loader2, CheckCircle2, CircleCheck, CircleAlert, CircleX, type LucideIcon } from "lucide-react";

export function Th({ children }: { children: ReactNode }) {
  return (
    <th className="sticky top-0 z-10 bg-card px-5 py-3 font-semibold backdrop-blur-sm">
      {children}
    </th>
  );
}

export function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`px-5 py-3.5 tabular-nums ${className}`}>{children}</td>;
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{children}</p>;
}

export function Panel({
  title, right, children, footer, icon: Icon,
}: { title: string; right?: ReactNode; children: ReactNode; footer?: string; icon?: LucideIcon }) {
  return (
    <div className="card-surface overflow-hidden transition-shadow hover:shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
              <Icon className="h-4 w-4" strokeWidth={2} />
            </span>
          )}
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
        </div>
        {right}
      </div>
      {children}
      {footer && <p className="border-t border-border px-5 py-3 text-[10px] uppercase tracking-widest text-muted-foreground">{footer}</p>}
    </div>
  );
}

export function TaskPill({ status }: { status: "PENDING" | "IN_PROGRESS" | "DONE" }) {
  const map = {
    PENDING: { cls: "border-warning/50 text-warning", icon: Clock3 },
    IN_PROGRESS: { cls: "border-info/50 text-info", icon: Loader2 },
    DONE: { cls: "border-success/40 text-success", icon: CheckCircle2 },
  } as const;
  const { cls, icon: Icon } = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold ${cls}`}>
      <Icon className={`h-3 w-3 ${status === "IN_PROGRESS" ? "animate-spin" : ""}`} strokeWidth={2.5} />
      {titleCase(status)}
    </span>
  );
}

export function StatusPill({ status }: { status: "OK" | "WATCH" | "REORDER" }) {
  const map = {
    OK: { cls: "border-success/40 text-success", icon: CircleCheck },
    WATCH: { cls: "border-warning/50 text-warning", icon: CircleAlert },
    REORDER: { cls: "border-danger/50 text-danger", icon: CircleX },
  } as const;
  const { cls, icon: Icon } = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold ${cls}`}>
      <Icon className="h-3 w-3" strokeWidth={2.5} />
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

export function EmptyState({
  icon: Icon, message, className = "",
}: { icon: LucideIcon; message: string; className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2.5 px-4 py-10 text-center ${className}`}>
      <span className="grid h-11 w-11 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
