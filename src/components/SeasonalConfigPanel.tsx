import { useState } from "react";
import { useOps, updateSeasonalConfig } from "@/lib/ops-store";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function SeasonalConfigPanel() {
  const { products, seasonalWindows } = useOps();
  const seasonal = products.filter(p => p.seasonalFlag);
  const [saved, setSaved] = useState<string | null>(null);

  return (
    <div className="card-surface overflow-hidden">
      <div className="border-b border-border px-5 py-3">
        <h2 className="text-sm font-semibold">Seasonal Configuration</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Sets the seasonal window and demand multiplier feeding the seasonal ROP formula
        </p>
      </div>
      <div className="divide-y divide-dashed divide-border">
        {seasonal.map(p => (
          <SeasonalRow
            key={p.sku}
            sku={p.sku}
            name={p.name}
            multiplier={p.seasonalFactor ?? 1}
            window={seasonalWindows[p.sku] ?? { startMonth: 4, endMonth: 6 }}
            onSaved={() => { setSaved(p.sku); window.setTimeout(() => setSaved(s => (s === p.sku ? null : s)), 1500); }}
            justSaved={saved === p.sku}
          />
        ))}
        {seasonal.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">No seasonal SKUs configured.</p>
        )}
      </div>
      <p className="border-t border-border px-5 py-3 text-[10px] uppercase tracking-widest text-muted-foreground">
        ROP (seasonal) = Avg Daily Usage × Multiplier × Lead Time + Safety Stock
      </p>
    </div>
  );
}

function SeasonalRow({
  sku, name, multiplier, window, onSaved, justSaved,
}: {
  sku: string; name: string; multiplier: number;
  window: { startMonth: number; endMonth: number };
  onSaved: () => void; justSaved: boolean;
}) {
  const [start, setStart] = useState(window.startMonth);
  const [end, setEnd] = useState(window.endMonth);
  const [mult, setMult] = useState(String(multiplier));

  const save = () => {
    const m = Number(mult);
    if (!m || m <= 0) return;
    updateSeasonalConfig(sku, { startMonth: start, endMonth: end, multiplier: m });
    onSaved();
  };

  return (
    <div className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto_auto_auto_auto] sm:items-end">
      <div>
        <p className="text-sm font-semibold">{name}</p>
        <p className="font-mono text-xs text-muted-foreground">{sku}</p>
      </div>

      <label className="text-xs">
        <span className="block text-muted-foreground">Window start</span>
        <select value={start} onChange={e => setStart(Number(e.target.value))} className="mt-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary">
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
      </label>

      <label className="text-xs">
        <span className="block text-muted-foreground">Window end</span>
        <select value={end} onChange={e => setEnd(Number(e.target.value))} className="mt-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary">
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
      </label>

      <label className="text-xs">
        <span className="block text-muted-foreground">Multiplier</span>
        <input
          inputMode="decimal"
          value={mult}
          onChange={e => setMult(e.target.value.replace(/[^\d.]/g, ""))}
          className="mt-1 w-20 rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary"
        />
      </label>

      <button
        onClick={save}
        className="rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
      >
        {justSaved ? "Saved ✓" : "Save"}
      </button>
    </div>
  );
}