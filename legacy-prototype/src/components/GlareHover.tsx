import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** React Bits style GlareHover — subtle sheen sweeps across the child on hover. */
export function GlareHover({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("group/glare relative inline-block overflow-hidden", className)}>
      {children}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-full w-1/2 -skew-x-12 bg-background/30 transition-all duration-500 ease-out group-hover/glare:left-full"
      />
    </span>
  );
}
