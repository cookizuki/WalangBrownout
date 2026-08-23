import { useEffect, useRef } from "react";

interface DotFieldProps {
  className?: string;
  dotRadius?: number;
  spacing?: number;
  cursorRadius?: number;
  bulgeStrength?: number;
  sparkle?: boolean;
  waveAmplitude?: number;
}

/**
 * Monochrome interactive dot grid. Dots bulge away from the cursor,
 * glow softly near it, and drift in a slow idle wave otherwise.
 * Color is read live from --foreground, so it auto-matches light/dark mode.
 */
export function DotField({
  className = "",
  dotRadius = 1.4,
  spacing = 32,
  cursorRadius = 130,
  bulgeStrength = 10,
  sparkle = true,
  waveAmplitude = 0.6,
}: DotFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: -9999, y: -9999, active: false });
  // "L C H" only — the raw params inside oklch(...), re-parsed only on theme change.
  const colorParams = useRef("0 0 0");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let frame = 0;
    let raf = 0;

    type Dot = { baseX: number; baseY: number; sparkleSeed: number };
    let dots: Dot[] = [];

    const buildGrid = () => {
      dots = [];
      const cols = Math.ceil(width / spacing) + 1;
      const rows = Math.ceil(height / spacing) + 1;
      for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
          dots.push({ baseX: x * spacing, baseY: y * spacing, sparkleSeed: Math.random() });
        }
      }
    };

    const readColor = () => {
      const raw = getComputedStyle(document.documentElement)
        .getPropertyValue("--foreground")
        .trim();
      // raw is already "oklch(0.18 0.03 250)" — pull out just the numbers.
      const match = raw.match(/oklch\(([^)]+)\)/);
      colorParams.current = match ? match[1] : "0 0 0";
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildGrid();
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = `oklch(${colorParams.current})`; // set ONCE per frame, not per dot

      const { x: mx, y: my, active } = mouse.current;

      for (const d of dots) {
        const wave = reduceMotion
          ? 0
          : Math.sin(frame / 70 + d.baseX * 0.05 + d.baseY * 0.05) * waveAmplitude;

        let px = d.baseX;
        let py = d.baseY + wave;
        let alpha = 0.32;
        let r = dotRadius;

        if (active) {
          const dx = px - mx;
          const dy = py - my;
          const distSq = dx * dx + dy * dy;
          if (distSq < cursorRadius * cursorRadius) {
            const dist = Math.sqrt(distSq);
            const pct = 1 - dist / cursorRadius;
            const angle = Math.atan2(dy, dx);
            px += Math.cos(angle) * pct * bulgeStrength;
            py += Math.sin(angle) * pct * bulgeStrength;
            alpha = 0.32 + pct * 0.55;
            r = dotRadius + pct * 1.6;
          }
        }

        if (sparkle && d.sparkleSeed > 0.985) {
          const twinkle = (Math.sin(frame / 20 + d.sparkleSeed * 100) + 1) / 2;
          r += twinkle * 1.4;
          alpha = Math.min(1, alpha + twinkle * 0.4);
        }

        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;

      if (active) {
        const glow = ctx.createRadialGradient(mx, my, 0, mx, my, cursorRadius);
        glow.addColorStop(0, `oklch(${colorParams.current} / 0.06)`);
        glow.addColorStop(1, `oklch(${colorParams.current} / 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(mx, my, cursorRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      frame++;
      raf = requestAnimationFrame(draw);
    };

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.current = { x: e.clientX - rect.left, y: e.clientY - rect.top, active: true };
    };
    const onLeave = () => { mouse.current.active = false; };

    readColor();
    resize();
    raf = requestAnimationFrame(draw);

    // Re-read color only when the theme actually changes (class="dark" toggles),
    // not on every single frame.
    const observer = new MutationObserver(readColor);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    window.addEventListener("resize", resize);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", onLeave);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [dotRadius, spacing, cursorRadius, bulgeStrength, sparkle, waveAmplitude]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-auto absolute inset-0 h-full w-full ${className}`}
    />
  );
}