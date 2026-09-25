import { useForm } from '@inertiajs/react';
export type SeasonalProduct = { sku: string; name: string; multiplier: number; window: { startMonth: number; endMonth: number }; suggestion: { suggested: number | null; sampleSize: number } };
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];


export function SeasonalConfigPanel({ products }: { products: SeasonalProduct[] }) {
  return <div className="card-surface overflow-hidden">
    <div className="border-b border-border px-5 py-3"><h2 className="text-sm font-semibold">Seasonal Configuration</h2><p className="mt-0.5 text-xs text-muted-foreground">Sets the seasonal window and demand multiplier feeding the seasonal ROP formula</p></div>
    <div className="divide-y divide-dashed divide-border">{products.map(p => <SeasonalRow key={p.sku} {...p} />)}{products.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted-foreground">No seasonal SKUs configured.</p>}</div>
    <p className="border-t border-border px-5 py-3 text-[10px] uppercase tracking-widest text-muted-foreground">ROP (seasonal) = Avg Daily Usage × Multiplier × Lead Time + Safety Stock</p>
  </div>;
}
function SeasonalRow({ sku, name, multiplier, window, suggestion }: SeasonalProduct) {
  const { data, setData, put, processing, errors, recentlySuccessful } = useForm({ startMonth: window.startMonth, endMonth: window.endMonth, multiplier: String(multiplier) });
  return (
    <form onSubmit={e => { e.preventDefault(); put(route('seasonal-config.update', sku), { preserveScroll: true }); }} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto_auto_auto_auto] sm:items-end">
      <div>
        <p className="text-sm font-semibold">{name}</p>
        <p className="font-mono text-xs text-muted-foreground">{sku}</p>
      </div>

      <label className="text-xs">
        <span className="block text-muted-foreground">Window start</span>
        <select value={data.startMonth} onChange={e => setData('startMonth', Number(e.target.value))} className="mt-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary">
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
      </label>

      <label className="text-xs">
        <span className="block text-muted-foreground">Window end</span>
        <select value={data.endMonth} onChange={e => setData('endMonth', Number(e.target.value))} className="mt-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary">
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
      </label>

      <label className="text-xs">
        <span className="block text-muted-foreground">Multiplier</span>
        <input
          inputMode="decimal"
          value={data.multiplier}
          onChange={e => setData('multiplier', e.target.value.replace(/[^\d.]/g, ""))}
          className="mt-1 w-20 rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary"
        />
        {suggestion.suggested !== null ? (
          <button
            type="button"
            onClick={() => setData('multiplier', String(suggestion.suggested))}
            className="mt-1 block text-[10px] font-medium text-info underline decoration-dotted underline-offset-2 hover:text-foreground"
          >
            Suggested: {suggestion.suggested}× (from history)
          </button>
        ) : (
          <span className="mt-1 block text-[10px] text-muted-foreground">
            {suggestion.sampleSize < 3 ? "Not enough sales history yet" : "Insufficient in/out-window data"}
          </span>
        )}
      </label>

      <button
        type="submit" disabled={processing}
        className="rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
      >
        {recentlySuccessful ? "Saved ✓" : "Save"}
      </button>
      {Object.entries(errors).map(([field, message]) => <p role="alert" key={field} className="text-xs text-danger sm:col-span-5">{message}</p>)}
    </form>
  );
}