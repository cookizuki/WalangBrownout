import type { TxType } from "@/lib/inventory-data";

/**
 * Consistent, muted color treatment per transaction type — used anywhere a
 * type appears: Transaction Log, the Overview live feed, and Reports.
 * Colors are theme-token based (not hardcoded hex) so they stay correct
 * in both light and dark mode.
 */
export const TX_TYPE_STYLES: Record<TxType, { bg: string; text: string; dot: string; label: string }> = {
  SALE:       { bg: "bg-info/10",     text: "text-info",     dot: "bg-info",     label: "Sale" },
  RECEIPT:    { bg: "bg-success/10",  text: "text-success",  dot: "bg-success",  label: "Receipt" },
  RETURN:     { bg: "bg-success/10",  text: "text-success",  dot: "bg-success",  label: "Return" },
  ADJUSTMENT: { bg: "bg-warning/10",  text: "text-warning",  dot: "bg-warning",  label: "Adjustment" },
  TRANSFER:   { bg: "bg-muted",       text: "text-muted-foreground", dot: "bg-muted-foreground", label: "Transfer" },
  WRITE_OFF:  { bg: "bg-danger/10",   text: "text-danger",   dot: "bg-danger",   label: "Write-Off" },
};

export function TxTypeBadge({ type }: { type: TxType }) {
  const s = TX_TYPE_STYLES[type];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${s.bg} ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}