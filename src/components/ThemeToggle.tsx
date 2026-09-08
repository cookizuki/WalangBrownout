import { useTheme } from "@/hooks/use-theme";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={() => toggle()}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex w-full items-center justify-between rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <span>{isDark ? "Dark mode" : "Light mode"}</span>
      {isDark
        ? <Moon className="h-3.5 w-3.5 text-foreground" aria-hidden />
        : <Sun className="h-3.5 w-3.5 text-foreground" aria-hidden />
      }
    </button>
  );
}
