import { useEffect, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

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

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{children}</p>;
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
