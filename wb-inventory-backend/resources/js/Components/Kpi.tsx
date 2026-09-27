import { CountUp } from '@/Components/CountUp';
import type { LucideIcon } from 'lucide-react';
export function Kpi({ value, label, suffix, icon: Icon }: { value: number; label: string; suffix?: string; icon: LucideIcon }) {
  return (
    <div className="card-surface group relative overflow-hidden p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      {/* Subtle top accent line */}
      <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-transparent via-foreground/20 to-transparent" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-display text-3xl font-bold tracking-tight">
            <CountUp to={value} suffix={suffix} />
          </div>
          <div className="mt-1.5 text-xs font-medium text-muted-foreground">{label}</div>
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-muted/60 text-muted-foreground transition-colors group-hover:bg-foreground group-hover:text-background">
          <Icon className="h-4 w-4" strokeWidth={2} />
        </span>
      </div>
    </div>
  );
}


