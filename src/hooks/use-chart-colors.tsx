import { useEffect, useState } from "react";

const VARS = [
  "--danger", "--foreground", "--muted-foreground", "--border",
  "--abc-a", "--abc-b", "--abc-c",
] as const;
type VarName = (typeof VARS)[number];
type ChartColors = Record<VarName, string>;

function readAll(): ChartColors {
  const styles = getComputedStyle(document.documentElement);
  const out = {} as ChartColors;
  for (const v of VARS) {
    // CSS variables already store the full "oklch(L C H)" string — use as-is.
    out[v] = styles.getPropertyValue(v).trim();
  }
  return out;
}

const FALLBACK: ChartColors = Object.fromEntries(VARS.map(v => [v, "oklch(0.5 0 0)"])) as ChartColors;

/** Resolves theme CSS variables into real color strings for Recharts, and
 * re-reads them whenever the light/dark toggle fires (see hooks/use-theme.ts). */
export function useChartColors(): ChartColors {
  const [colors, setColors] = useState<ChartColors>(FALLBACK);

  useEffect(() => {
    setColors(readAll());
    const onChange = () => setColors(readAll());
    window.addEventListener("wb-theme", onChange);
    return () => window.removeEventListener("wb-theme", onChange);
  }, []);

  return colors;
}