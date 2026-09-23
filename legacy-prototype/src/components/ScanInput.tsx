import { useEffect, useRef, useState } from "react";

/**
 * Simulates real barcode-scanner behavior: scanners act like a fast keyboard,
 * typing the code's digits then sending Enter. This input auto-focuses on
 * mount and on any click elsewhere on the page, so a physical scanner (or
 * fast typing + Enter, for demo purposes) works without clicking into the
 * field first.
 */
export function ScanInput({
  onScan, placeholder = "Scan or type a SKU / Batch ID, then press Enter",
}: { onScan: (code: string) => void; placeholder?: string }) {
  const [value, setValue] = useState("");
  const [flash, setFlash] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const refocus = (e: MouseEvent) => {
      // Don't steal focus from other real inputs, buttons, or selects on the page.
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select, button, a")) return;
      inputRef.current?.focus();
    };
    window.addEventListener("click", refocus);
    return () => window.removeEventListener("click", refocus);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = value.trim();
    if (!code) return;
    onScan(code);
    setValue("");
    setFlash(true);
    window.setTimeout(() => setFlash(false), 400);
  };

  return (
    <form onSubmit={submit} className="relative">
      <div className={`flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 transition-colors ${flash ? "border-success bg-success/5" : "border-border bg-background"}`}>
        <span aria-hidden className="shrink-0 text-muted-foreground">▮▮▯▮</span>
        <input
          ref={inputRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Ready to scan
        </span>
      </div>
    </form>
  );
}