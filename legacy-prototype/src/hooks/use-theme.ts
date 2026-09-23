import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";
const THEME_KEY = "wb.theme";
const EVT = "wb-theme";

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function readTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return systemPrefersDark() ? "dark" : "light";
}

function apply(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => { ready: Promise<void> };
};

function applyWithWipe(t: Theme) {
  const doc = document as ViewTransitionDocument;

  if (!doc.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    apply(t);
    return;
  }

  const root = document.documentElement;

  const transition = doc.startViewTransition(() => {
    apply(t);
  });

  transition.ready
    .then(() => {
      root.animate(
        {
          clipPath: [
            "circle(0% at 0% 0%)",
            "circle(150% at 0% 0%)",
          ],
        },
        {
          duration: 450,
          easing: "ease-in-out",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    })
    .catch(() => {
      // Transition was interrupted (e.g. rapid double-toggle) — theme is
      // already applied above, so there's nothing left to recover.
    });
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    const t = readTheme();
    setThemeState(t);
    apply(t);
  }, []);

  useEffect(() => {
    const onChange = () => setThemeState(readTheme());
    window.addEventListener(EVT, onChange);
    return () => window.removeEventListener(EVT, onChange);
  }, []);

    const setTheme = useCallback((t: Theme, animate = false) => {
    window.localStorage.setItem(THEME_KEY, t);
    if (animate) {
      applyWithWipe(t);
    } else {
      apply(t);
    }
    setThemeState(t);
    window.dispatchEvent(new Event(EVT));
  }, []);

  const toggle = useCallback((animate = true) => {
    setTheme(theme === "dark" ? "light" : "dark", animate);
  }, [theme, setTheme]);

  return { theme, toggle, setTheme };
}