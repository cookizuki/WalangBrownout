import { useEffect, useState } from "react";

interface BlurTextProps {
  text: string;
  className?: string;
  delay?: number;
  /** Stagger between each word's animation, in ms. */
  staggerMs?: number;
}

/**
 * Splits text into words and animates each from blurred/offset/transparent
 * into focus, staggered left to right. Plays once on mount, no loop.
 */
export function BlurText({ text, className = "", delay = 0, staggerMs = 60 }: BlurTextProps) {
  const [shown, setShown] = useState(false);
  const words = text.split(" ");

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setShown(true);
      return;
    }
    const t = window.setTimeout(() => setShown(true), delay);
    return () => window.clearTimeout(t);
  }, [delay]);

  return (
    <span className={className}>
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          className="inline-block transition-all duration-500 ease-out motion-reduce:transition-none"
          style={{
            filter: shown ? "blur(0px)" : "blur(8px)",
            opacity: shown ? 1 : 0,
            transform: shown ? "translateY(0)" : "translateY(6px)",
            transitionDelay: `${i * staggerMs}ms`,
          }}
        >
          {word}
          {i < words.length - 1 ? "\u00A0" : ""}
        </span>
      ))}
    </span>
  );
}