import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** React Bits style AnimatedList — children enter with a staggered slide + fade. */
export function AnimatedList({
  children,
  className,
  itemClassName,
  stagger = 60,
  duration = 300,
}: {
  children: ReactNode[];
  className?: string;
  itemClassName?: string;
  stagger?: number;
  duration?: number;
}) {
  return (
    <ul className={className}>
      {children.map((child, i) => (
        <AnimatedItem key={i} delay={i * stagger} duration={duration} className={itemClassName}>
          {child}
        </AnimatedItem>
      ))}
    </ul>
  );
}

export function AnimatedItem({
  children,
  delay = 0,
  duration = 300,
  className,
}: {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setShown(true), delay);
    return () => window.clearTimeout(t);
  }, [delay]);

  return (
    <li
      className={cn(
        "transition-all ease-out motion-reduce:transition-none",
        shown ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0",
        className,
      )}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {children}
    </li>
  );
}
