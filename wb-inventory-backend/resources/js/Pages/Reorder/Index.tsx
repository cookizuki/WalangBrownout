import { Head } from '@inertiajs/react';
import { AnimatedRow, Th, Td, SectionLabel } from '@/Components/ui-bits';
import { DraftPOAction } from '@/Components/DraftPOAction';
import { money, type PODraftPreviewData } from '@/Components/PODraftPreviewModal';
import { SeasonalConfigPanel, type SeasonalProduct } from '@/Components/SeasonalConfigPanel';
type ReorderRow = PODraftPreviewData & { onHand: number; rop: number; gap: number; alreadyPending: boolean };
export default function Reorder({ rows, seasonalProducts }: { rows: ReorderRow[]; seasonalProducts: SeasonalProduct[] }) {
  return <main className="mx-auto max-w-7xl space-y-5 p-4 sm:p-8">
    <Head title="Reorder Review" />
    <div className="space-y-2"><SectionLabel>Reorder queue — ROP breaches ready for purchasing</SectionLabel>
      <div className="card-surface overflow-hidden">
        <h1 className="border-b border-border px-5 py-3.5 text-lg font-bold">Suggested Reorders</h1>
        <div className="overflow-x-auto"><table className="w-full min-w-200 text-sm">
          <thead className="text-left text-[10px] uppercase tracking-widest text-muted-foreground"><tr className="border-b border-border"><Th>SKU</Th><Th>Product</Th><Th>On Hand / ROP</Th><Th>Formula</Th><Th>Suggested Qty</Th><Th>Est. Cost</Th><Th> </Th></tr></thead>
          <tbody className="divide-y divide-dashed divide-border">{rows.map((row, i) => <AnimatedRow key={row.sku} delay={i * 50}>
            <Td className="font-mono text-xs">{row.sku}</Td><Td className="font-medium">{row.productName}</Td><Td className="font-mono text-xs">{row.onHand} / {row.rop}</Td><Td className="text-xs text-muted-foreground">{row.formulaLabel}</Td><Td className="font-mono">{row.quantity}</Td><Td className="font-mono text-xs">{money(row.quantity * row.unitCost)}</Td><Td><DraftPOAction {...row} /></Td>
          </AnimatedRow>)}{rows.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Nothing below reorder point.</td></tr>}</tbody>
        </table></div>
        <p className="border-t border-border px-5 py-3 text-[10px] uppercase tracking-widest text-muted-foreground">Standard ROP = ADU × Lead Time + Safety Stock · Seasonal ROP multiplies ADU by the seasonal factor</p>
      </div>
    </div>
    <div className="space-y-2"><SectionLabel>Seasonal reorder settings — Inventory Manager responsibility</SectionLabel><SeasonalConfigPanel products={seasonalProducts} /></div>
  </main>;
}
