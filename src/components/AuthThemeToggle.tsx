import { useTheme } from "@/hooks/use-theme";

/** Compact icon-only theme toggle, fixed to the top-left corner. Used only on Login/Sign Up. */
export function AuthThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="fixed left-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-full border border-border bg-surface text-sm shadow-sm transition-colors hover:bg-muted sm:left-6 sm:top-6"
    >
      <span aria-hidden>{isDark ? "🌙" : "☀️"}</span>
    </button>
  );
}