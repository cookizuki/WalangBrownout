// Domain model + seed data for the WalangBrownout Inventory OS prototype.
// Mirrors the normalized schema described in the case study:
// roles, users, categories, suppliers, products, warehouse_location,
// inventory_batch, transaction_type, transaction_log, alerts, purchase_order,
// purchase_order_item.

export type ABC = "A" | "B" | "C";
export type AlertType = "LOW_STOCK" | "SEASONAL_REORDER" | "NEAR_EXPIRY" | "VARIANCE";
export type AlertStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
export type TxType = "RECEIPT" | "SALE" | "RETURN" | "TRANSFER" | "ADJUSTMENT" | "WRITE_OFF";
export type Channel = "IN_STORE" | "ONLINE" | "WAREHOUSE";

export interface Supplier {
  id: number;
  name: string;
  contact: string;
  contactRole?: string;
  address?: string;
  landline?: string;
  tin?: string;
}
export interface Category { id: number; name: string; description: string; }
export interface WarehouseLocation { id: number; code: string; description: string; }
export interface Product {
  sku: string;
  name: string;
  categoryId: number;
  supplierId: number;
  unitCost: number;
  reorderPoint: number;
  reorderQuantity: number;
  leadTimeDays: number;
  seasonalFlag: boolean;
  isFifoCritical: boolean;
  abc: ABC;
  avgDailyUsage: number;
  seasonalFactor?: number;
  safetyStock: number;
}
export interface InventoryBatch {
  id: string;
  sku: string;
  locationId: number;
  quantityReceived: number;
  quantityRemaining: number;
  dateReceived: string;
  expirationDate?: string;
}
export interface TxLog {
  id: string;
  batchId: string | null;
  sku: string;
  userId: number;
  type: TxType;
  quantityDelta: number;
  timestamp: string;
  channel: Channel;
}
export interface Alert {
  id: string;
  sku: string;
  batchId?: string;
  type: AlertType;
  message: string;
  status: AlertStatus;
  createdAt: string;
}

export const suppliers: Supplier[] = [
  { id: 1, name: "CoolAir Distributors PH", contact: "Ana Reyes", contactRole: "Sales Manager", address: "123 Industrial Ave, Cabuyao, Laguna", landline: "(049) 123-4567", tin: "123-456-789-000" },
  { id: 2, name: "PureBreathe Filters Co.", contact: "Miguel Santos", contactRole: "Account Executive", address: "45 Filter St, Santa Rosa, Laguna", landline: "(049) 234-5678", tin: "234-567-890-000" },
  { id: 3, name: "SmartHome Imports", contact: "Jenny Cruz", contactRole: "Purchasing Liaison", address: "78 Smart Blvd, Biñan, Laguna", landline: "(049) 345-6789", tin: "345-678-901-000" },
];

export const categories: Category[] = [
  { id: 1, name: "Cooling", description: "Portable AC & fans" },
  { id: 2, name: "Air Quality", description: "Purifiers & filters" },
  { id: 3, name: "Smart Home", description: "Thermostats & sensors" },
];

export const locations: WarehouseLocation[] = [
  { id: 1, code: "A-01", description: "Zone A · Aisle 01 · Cooling" },
  { id: 2, code: "B-03", description: "Zone B · Aisle 03 · Filters" },
  { id: 3, code: "C-02", description: "Zone C · Aisle 02 · Smart Home" },
];

export const products: Product[] = [
  {
    sku: "ACU-014", name: "Portable AC Unit 1.5HP",
    categoryId: 1, supplierId: 1, unitCost: 18500,
    reorderPoint: 520, reorderQuantity: 300, leadTimeDays: 14,
    seasonalFlag: true, isFifoCritical: false, abc: "A",
    avgDailyUsage: 10, seasonalFactor: 3.0, safetyStock: 100,
  },
  {
    sku: "APU-100", name: "Air Purifier Carbon Filter",
    categoryId: 2, supplierId: 2, unitCost: 1250,
    reorderPoint: 80, reorderQuantity: 200, leadTimeDays: 7,
    seasonalFlag: false, isFifoCritical: true, abc: "B",
    avgDailyUsage: 6, safetyStock: 30,
  },
  {
    sku: "THM-201", name: "Smart Thermostat Gen 3",
    categoryId: 3, supplierId: 3, unitCost: 4800,
    reorderPoint: 55, reorderQuantity: 60, leadTimeDays: 10,
    seasonalFlag: false, isFifoCritical: false, abc: "A",
    avgDailyUsage: 4, safetyStock: 15,
  },
  {
    sku: "FAN-050", name: "Tower Fan Silent",
    categoryId: 1, supplierId: 1, unitCost: 3200,
    reorderPoint: 40, reorderQuantity: 80, leadTimeDays: 5,
    seasonalFlag: true, isFifoCritical: false, abc: "B",
    avgDailyUsage: 3, seasonalFactor: 2.2, safetyStock: 25,
  },
  {
    sku: "SEN-011", name: "Room Humidity Sensor",
    categoryId: 3, supplierId: 3, unitCost: 780,
    reorderPoint: 25, reorderQuantity: 50, leadTimeDays: 6,
    seasonalFlag: false, isFifoCritical: false, abc: "C",
    avgDailyUsage: 1, safetyStock: 10,
  },
];

export const batches: InventoryBatch[] = [
  { id: "B-1101", sku: "ACU-014", locationId: 1, quantityReceived: 400, quantityRemaining: 340, dateReceived: "2026-06-10" },
  { id: "B-1120", sku: "ACU-014", locationId: 1, quantityReceived: 200, quantityRemaining: 200, dateReceived: "2026-07-01" },
  { id: "B-1055", sku: "APU-100", locationId: 2, quantityReceived: 180, quantityRemaining: 145, dateReceived: "2026-03-22", expirationDate: "2026-12-22" },
  { id: "B-1078", sku: "APU-100", locationId: 2, quantityReceived: 220, quantityRemaining: 220, dateReceived: "2026-05-14", expirationDate: "2027-02-14" },
  { id: "B-1090", sku: "THM-201", locationId: 3, quantityReceived: 80, quantityRemaining: 42, dateReceived: "2026-06-05" },
  { id: "B-1122", sku: "FAN-050", locationId: 1, quantityReceived: 120, quantityRemaining: 78, dateReceived: "2026-06-28" },
  { id: "B-1130", sku: "SEN-011", locationId: 3, quantityReceived: 60, quantityRemaining: 52, dateReceived: "2026-07-08" },
];

export const transactions: TxLog[] = [
  { id: "T-9001", batchId: "B-1090", sku: "THM-201", userId: 2, type: "SALE", quantityDelta: -2, timestamp: "2026-07-22T09:14:00", channel: "ONLINE" },
  { id: "T-9002", batchId: "B-1101", sku: "ACU-014", userId: 3, type: "SALE", quantityDelta: -8, timestamp: "2026-07-22T10:02:00", channel: "IN_STORE" },
  { id: "T-9003", batchId: "B-1055", sku: "APU-100", userId: 3, type: "SALE", quantityDelta: -5, timestamp: "2026-07-22T11:45:00", channel: "IN_STORE" },
  { id: "T-9004", batchId: "B-1120", sku: "ACU-014", userId: 4, type: "RECEIPT", quantityDelta: 200, timestamp: "2026-07-21T08:20:00", channel: "WAREHOUSE" },
  { id: "T-9005", batchId: "B-1090", sku: "THM-201", userId: 4, type: "ADJUSTMENT", quantityDelta: -3, timestamp: "2026-07-20T16:10:00", channel: "WAREHOUSE" },
];

export const users = [
  { id: 1, name: "Kim Maturan", role: "Administrator" },
  { id: 2, name: "Nick Merilles", role: "Inventory Manager" },
  { id: 3, name: "Lizle Ocariza", role: "Warehouse Staff" },
  { id: 4, name: "Nhimfa Pacao", role: "Purchasing Manager" },
];

// --- Derived helpers -------------------------------------------------------

export function onHand(sku: string, allBatches = batches): number {
  return allBatches.filter(b => b.sku === sku).reduce((s, b) => s + b.quantityRemaining, 0);
}

/** Non-seasonal ROP = (Avg Daily Usage × Lead Time) + Safety Stock */
export function ropStandard(p: Product): number {
  return p.avgDailyUsage * p.leadTimeDays + p.safetyStock;
}

/** Seasonal ROP = (Avg Daily Usage × Seasonal Factor × Lead Time) + Seasonal Safety Stock */
export function ropSeasonal(p: Product): number {
  const factor = p.seasonalFactor ?? 1;
  return Math.round(p.avgDailyUsage * factor * p.leadTimeDays + p.safetyStock);
}

export function daysUntil(dateISO?: string): number | null {
  if (!dateISO) return null;
  const ms = new Date(dateISO).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

/** Auto-generate alerts from current product + batch state. */
export function deriveAlerts(): Alert[] {
  const out: Alert[] = [];
  for (const p of products) {
    const stock = onHand(p.sku);
    const rop = p.seasonalFlag ? ropSeasonal(p) : ropStandard(p);
    if (stock <= rop) {
      out.push({
        id: `A-${p.sku}-ROP`,
        sku: p.sku,
        type: p.seasonalFlag ? "SEASONAL_REORDER" : "LOW_STOCK",
        message: p.seasonalFlag
          ? `Seasonal ROP hit — on hand ${stock} ≤ ${rop} (factor ${p.seasonalFactor}×)`
          : `Below reorder point — on hand ${stock} ≤ ${rop}`,
        status: "OPEN",
        createdAt: new Date().toISOString(),
      });
    }
  }
  for (const b of batches) {
    const d = daysUntil(b.expirationDate);
    if (d !== null && d <= 30) {
      out.push({
        id: `A-${b.id}-EXP`,
        sku: b.sku,
        batchId: b.id,
        type: "NEAR_EXPIRY",
        message: `Batch ${b.id} expires in ${d} days — release first (FIFO)`,
        status: "OPEN",
        createdAt: new Date().toISOString(),
      });
    }
  }
  return out;
}

/** FIFO pick order: oldest dateReceived first. */
export function fifoOrder(sku: string): InventoryBatch[] {
  return batches
    .filter(b => b.sku === sku && b.quantityRemaining > 0)
    .sort((a, b) => a.dateReceived.localeCompare(b.dateReceived));
}

export const money = (n: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(n);

// --- Role-specific work queues --------------------------------------------

export type TaskStatus = "PENDING" | "IN_PROGRESS" | "DONE";
export type Priority = "HIGH" | "NORMAL" | "LOW";

export interface PickTask {
  id: string;
  sku: string;
  batchId: string;
  locationId: number;
  quantity: number;
  orderRef: string;
  priority: Priority;
  status: TaskStatus;
  assignedTo: string;
}

export interface ReceivingLine {
  id: string;
  poNumber: string;
  sku: string;
  supplierId: number;
  quantityOrdered: number;
  quantityReceived: number;
  expectedDate: string;
  locationId: number;
  status: "IN_TRANSIT" | "ARRIVED" | "PUT_AWAY";
}

export interface CycleCount {
  id: string;
  sku: string;
  locationId: number;
  systemQty: number;
  countedQty: number | null;
  dueDate: string;
  status: TaskStatus;
}

export interface PurchaseOrder {
  id: string;
  supplierId: number;
  sku: string;
  quantity: number;
  unitCost: number;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "RECEIVED";
  createdAt: string;
}

export const pickTasks: PickTask[] = [
  { id: "PK-4401", sku: "ACU-014", batchId: "B-1101", locationId: 1, quantity: 6, orderRef: "SO-20881", priority: "HIGH", status: "PENDING", assignedTo: "Warehouse Staff" },
  { id: "PK-4402", sku: "APU-100", batchId: "B-1055", locationId: 2, quantity: 12, orderRef: "SO-20884", priority: "HIGH", status: "IN_PROGRESS", assignedTo: "Warehouse Staff" },
  { id: "PK-4403", sku: "THM-201", batchId: "B-1090", locationId: 3, quantity: 3, orderRef: "SO-20887", priority: "NORMAL", status: "PENDING", assignedTo: "Warehouse Staff" },
  { id: "PK-4404", sku: "FAN-050", batchId: "B-1122", locationId: 1, quantity: 8, orderRef: "SO-20890", priority: "LOW", status: "PENDING", assignedTo: "Warehouse Staff" },
  { id: "PK-4405", sku: "SEN-011", batchId: "B-1130", locationId: 3, quantity: 4, orderRef: "SO-20891", priority: "NORMAL", status: "DONE", assignedTo: "Warehouse Staff" },
];

export const receivingLines: ReceivingLine[] = [
  { id: "RC-7701", poNumber: "PO-3320", sku: "ACU-014", supplierId: 1, quantityOrdered: 300, quantityReceived: 0, expectedDate: "2026-08-19", locationId: 1, status: "IN_TRANSIT" },
  { id: "RC-7702", poNumber: "PO-3321", sku: "APU-100", supplierId: 2, quantityOrdered: 200, quantityReceived: 200, expectedDate: "2026-08-17", locationId: 2, status: "ARRIVED" },
  { id: "RC-7703", poNumber: "PO-3318", sku: "FAN-050", supplierId: 1, quantityOrdered: 80, quantityReceived: 80, expectedDate: "2026-08-14", locationId: 1, status: "PUT_AWAY" },
  { id: "RC-7704", poNumber: "PO-3322", sku: "THM-201", supplierId: 3, quantityOrdered: 60, quantityReceived: 0, expectedDate: "2026-08-22", locationId: 3, status: "IN_TRANSIT" },
];

export const cycleCounts: CycleCount[] = [
  { id: "CC-2201", sku: "ACU-014", locationId: 1, systemQty: 540, countedQty: 538, dueDate: "2026-08-18", status: "DONE" },
  { id: "CC-2202", sku: "APU-100", locationId: 2, systemQty: 365, countedQty: null, dueDate: "2026-08-18", status: "PENDING" },
  { id: "CC-2203", sku: "THM-201", locationId: 3, systemQty: 42, countedQty: null, dueDate: "2026-08-19", status: "IN_PROGRESS" },
  { id: "CC-2204", sku: "FAN-050", locationId: 1, systemQty: 78, countedQty: 74, dueDate: "2026-08-17", status: "DONE" },
  { id: "CC-2205", sku: "SEN-011", locationId: 3, systemQty: 52, countedQty: null, dueDate: "2026-08-20", status: "PENDING" },
];

export const purchaseOrders: PurchaseOrder[] = [
  { id: "PO-3320", supplierId: 1, sku: "ACU-014", quantity: 300, unitCost: 18500, status: "SUBMITTED", createdAt: "2026-08-12T09:00:00" },
  { id: "PO-3321", supplierId: 2, sku: "APU-100", quantity: 200, unitCost: 1250, status: "RECEIVED", createdAt: "2026-08-08T14:30:00" },
  { id: "PO-3322", supplierId: 3, sku: "THM-201", quantity: 60, unitCost: 4800, status: "APPROVED", createdAt: "2026-08-15T11:10:00" },
];

/** Purchase orders awaiting Administrator / Purchasing Manager approval. */
export interface PendingPO {
  id: string;
  supplierId: number;
  supplier: string;
  sku: string;
  itemLabel: string;
  quantity: number;
  totalCost: number;
  requestedBy: string;
  requestedAt: string;
}

export const pendingApprovals: PendingPO[] = [
  { id: "PO-2041", supplierId: 1, supplier: "CoolAir Distributors PH", sku: "ACU-014", itemLabel: "Portable AC Unit", quantity: 800, totalCost: 3840000, requestedBy: "Kim Maturan", requestedAt: "2026-07-18" },
  { id: "PO-2042", supplierId: 3, supplier: "SmartHome Imports", sku: "THM-201", itemLabel: "Smart Thermostat", quantity: 150, totalCost: 300000, requestedBy: "Kim Maturan", requestedAt: "2026-07-19" },
];
