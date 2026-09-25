export type ABC = 'A' | 'B' | 'C';
export type History = { date: string; poNumber: string; supplierName: string; quantityReceived: number; unitCost: number; totalCost: number; costSource: 'po' | 'estimated' };
export type Cost = { currentCost: number; lastPurchaseCost: number | null; lastPurchaseDate: string | null; averageCost: number | null; trend: 'up' | 'down' | 'same' | null };
export type PurchaseProps = { products: { sku: string; name: string }[]; purchaseHistories: Record<string, History[]>; costSummaries: Record<string, Cost> };
export type ReportProps = PurchaseProps & {
  shrinkageByMonth: { label: string; units: number; cost: number }[];
  velocityBySku: { sku: string; name: string; abc: ABC; units: number }[];
  valuation: { totalValue: number; byClass: { abc: ABC; units: number; value: number }[] };
  turnover: { sku: string; name: string; abc: ABC; unitsSoldPeriod: number; avgOnHand: number; turnoverRate: number | null; daysOfInventory: number | null }[];
  deadStock: { sku: string; name: string; abc: ABC; onHand: number; daysSinceLastSale: number | null; lastSaleDate: string | null; bucket: '30+' | '60+' | '90+' | '180+'; tiedUpValue: number }[];
  supplierPerf: { supplierId: number; supplierName: string; totalDeliveries: number; onTimeCount: number; lateCount: number; onTimeRate: number; avgDaysLate: number; currentlyOverdue: number }[];
};
