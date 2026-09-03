// Shared mutable operations store: batches, cycle counts, transaction log,
// pending purchase orders, receiving lines, pick tasks, and products.
// One source of truth — every role reads the same data, filtered/permissioned
// differently in the UI.

import { useSyncExternalStore, useMemo } from "react";
import {
  batches as seedBatches,
  cycleCounts as seedCounts,
  transactions as seedTx,
  pendingApprovals as seedPendingPOs,
  receivingLines as seedReceivingLines,
  pickTasks as seedPickTasks,
  products as seedProducts,
  suppliers as seedSuppliers,
  locations as seedLocations,
  type Supplier,
  type WarehouseLocation,
  type ABC,
  type CycleCount,
  type InventoryBatch,
  type PendingPO,
  type PickTask,
  type Product,
  type ReceivingLine,
  type TxLog,
  type Priority,
  type TaskStatus,
  onHand,
  ropStandard,
  ropSeasonal,
  daysUntil,
  type Alert,
} from "./inventory-data";


export interface AuditEntry {
  id: string;
  userId: number;
  userName: string;
  action: string;
  target: string;
  timestamp: string;
}

export type AdjustmentReason = "DAMAGE" | "LOSS" | "CORRECTION";

interface OpsState {
  batches: InventoryBatch[];
  counts: CycleCount[];
  transactions: TxLog[];
  pendingPOs: PendingPO[];
  receivingLines: ReceivingLine[];
  pickTasks: PickTask[];
  products: Product[];
  auditLog: AuditEntry[];
  seasonalWindows: Record<string, { startMonth: number; endMonth: number }>;
  suppliers: Supplier[];
  locations: WarehouseLocation[];
  ackedAlerts: Record<string, { userId: number; userName: string; at: string }>;
}

let state: OpsState = {
  batches: seedBatches.map(b => ({ ...b })),
  counts: seedCounts.map(c => ({ ...c })),
  transactions: seedTx.map(t => ({ ...t })),
  pendingPOs: seedPendingPOs.map(p => ({ ...p })),
  receivingLines: seedReceivingLines.map(r => ({ ...r })),
  pickTasks: seedPickTasks.map(t => ({ ...t })),
  products: seedProducts.map(p => ({ ...p })),
  auditLog: [],
  seasonalWindows: Object.fromEntries(
    seedProducts.filter(p => p.seasonalFlag).map(p => [p.sku, { startMonth: 4, endMonth: 6 }]),
  ),
  suppliers: seedSuppliers.map(s => ({ ...s })),
  locations: seedLocations.map(l => ({ ...l })),
  ackedAlerts: {},
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const getSnapshot = () => state;

export function useOps(): OpsState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

let seq = 1;
const nextTxId = () => `T-95${String(seq++).padStart(2, "0")}`;

let poSeq = 43;
const nextPOId = () => `PO-20${poSeq++}`;

let batchSeq = 1200;
const nextBatchId = () => `B-${batchSeq++}`;

let auditSeq = 1;
export function logAudit(userId: number, userName: string, action: string, target: string) {
  state = {
    ...state,
    auditLog: [
      { id: `AL-${String(auditSeq++).padStart(4, "0")}`, userId, userName, action, target, timestamp: new Date().toISOString() },
      ...state.auditLog,
    ],
  };
}
/**
 * Records an alert acknowledgment in shared store state — visible to every
 * role/session reading from this store, not just the tab that clicked it.
 * Mirrors the Alert entity's AcknowledgedBy / AcknowledgedAt fields.
 */
export function acknowledgeAlert(alertId: string, actor: { userId: number; userName: string }) {
  if (state.ackedAlerts[alertId]) return; // already acknowledged — no-op
  state = {
    ...state,
    ackedAlerts: {
      ...state.ackedAlerts,
      [alertId]: { userId: actor.userId, userName: actor.userName, at: new Date().toISOString() },
    },
  };
  logAudit(actor.userId, actor.userName, "Acknowledged alert", alertId);
  emit();
}

/** Warehouse staff submits a physical count; variance logs an ADJUSTMENT tx. */
export function submitCount(countId: string, countedQty: number, userId = 4) {
  const count = state.counts.find(c => c.id === countId);
  if (!count) return;
  const variance = countedQty - count.systemQty;
  const batch = state.batches.find(b => b.sku === count.sku && b.locationId === count.locationId);

  const counts = state.counts.map(c =>
    c.id === countId ? { ...c, countedQty, status: "DONE" as const } : c,
  );

  let batches = state.batches;
  let transactions = state.transactions;

  if (variance !== 0 && batch) {
    batches = state.batches.map(b =>
      b.id === batch.id
        ? { ...b, quantityRemaining: Math.max(0, b.quantityRemaining + variance) }
        : b,
    );
    transactions = [
      {
        id: nextTxId(),
        batchId: batch.id,
        sku: count.sku,
        userId,
        type: "ADJUSTMENT",
        quantityDelta: variance,
        timestamp: new Date().toISOString(),
        channel: "WAREHOUSE",
      },
      ...state.transactions,
    ];
  }

  state = { ...state, batches, counts, transactions };
  emit();
}

let recountSeq = 1;
/**
 * Warehouse Staff requests a recount after a wrong entry. The original
 * submitted count stays in the record permanently (audit trail); a fresh
 * PENDING count is created for the same SKU/location so it can be
 * re-entered correctly.
 */
export function requestRecount(originalCountId: string) {
  const original = state.counts.find(c => c.id === originalCountId);
  if (!original) return;

  const newCount: CycleCount = {
    id: `${original.id}-R${recountSeq++}`,
    sku: original.sku,
    locationId: original.locationId,
    systemQty: original.systemQty,
    countedQty: null,
    dueDate: new Date().toISOString().slice(0, 10),
    status: "PENDING",
  };

  state = { ...state, counts: [newCount, ...state.counts] };
  emit();
}

/** Warehouse staff reports damage / loss / correction against a batch. */
export function reportAdjustment(input: {
  batchId: string;
  reason: AdjustmentReason;
  quantity: number;
  notes?: string;
  userId?: number;
}) {
  const batch = state.batches.find(b => b.id === input.batchId);
  if (!batch || !input.quantity) return;
  const delta = input.reason === "CORRECTION" ? input.quantity : -Math.abs(input.quantity);

  state = {
    ...state,
    batches: state.batches.map(b =>
      b.id === batch.id
        ? { ...b, quantityRemaining: Math.max(0, b.quantityRemaining + delta) }
        : b,
    ),
    transactions: [
      {
        id: nextTxId(),
        batchId: batch.id,
        sku: batch.sku,
        userId: input.userId ?? 4,
        type: "ADJUSTMENT",
        quantityDelta: delta,
        timestamp: new Date().toISOString(),
        channel: "WAREHOUSE",
        note: input.notes?.trim() || undefined,
      } as TxLog & { note?: string },
      ...state.transactions,
    ],
  };
  emit();
}

/**
 * Inventory Staff drafts a PO from a Reorder Review suggestion — it lands
 * directly in the Admin approval queue, live.
 */
export function draftPO(input: { sku: string; quantity: number; requestedBy: string }) {
  const p = state.products.find(pp => pp.sku === input.sku);
  if (!p) return;
  const supplier = state.suppliers.find(s => s.id === p.supplierId);

  const po: PendingPO = {
    id: nextPOId(),
    supplierId: p.supplierId,
    supplier: supplier?.name ?? "Unknown supplier",
    sku: p.sku,
    itemLabel: p.name,
    quantity: input.quantity,
    totalCost: input.quantity * p.unitCost,
    requestedBy: input.requestedBy,
    requestedAt: new Date().toISOString().slice(0, 10),
  };

  state = { ...state, pendingPOs: [po, ...state.pendingPOs] };
  emit();
}

/** Admin approves or rejects a pending PO — removes it from the queue. */
export function resolvePendingPO(id: string) {
  state = { ...state, pendingPOs: state.pendingPOs.filter(po => po.id !== id) };
  emit();
}

/**
 * Warehouse Staff receives an inbound PO line: creates a real Inventory Batch
 * stamped with today's date and the line's warehouse location, logs a RECEIPT
 * transaction, and marks the line PUT_AWAY.
 */
export function receiveDelivery(input: {
  lineId: string;
  quantityReceived: number;
  expirationDate?: string;
  userId?: number;
}): InventoryBatch | null {
  const line = state.receivingLines.find(r => r.id === input.lineId);
  if (!line || !input.quantityReceived || input.quantityReceived <= 0) return null;
  const remaining = line.quantityOrdered - line.quantityReceived;
  if (input.quantityReceived > remaining) return null;
  
  const newBatch: InventoryBatch = {
    id: nextBatchId(),
    sku: line.sku,
    locationId: line.locationId,
    quantityReceived: input.quantityReceived,
    quantityRemaining: input.quantityReceived,
    dateReceived: new Date().toISOString().slice(0, 10),
    expirationDate: input.expirationDate || undefined,
  };

  const newQuantityReceived = line.quantityReceived + input.quantityReceived;
  const isComplete = newQuantityReceived >= line.quantityOrdered;

  state = {
    ...state,
    batches: [newBatch, ...state.batches],
    receivingLines: state.receivingLines.map(r =>
      r.id === line.id
        ? { ...r, quantityReceived: newQuantityReceived, status: isComplete ? ("PUT_AWAY" as const) : ("ARRIVED" as const) }
        : r,
    ),
    transactions: [
      {
        id: nextTxId(),
        batchId: newBatch.id,
        sku: line.sku,
        userId: input.userId ?? 4,
        type: "RECEIPT",
        quantityDelta: input.quantityReceived,
        timestamp: new Date().toISOString(),
        channel: "WAREHOUSE",
      },
      ...state.transactions,
    ],
  };
  emit();
  return newBatch;
}

/** Ad-hoc movement: Return (+qty), Write-Off (-qty), or Transfer (location change, qty unchanged). */
export function logMovement(input: {
  batchId: string;
  type: "RETURN" | "TRANSFER" | "WRITE_OFF";
  quantity: number;
  toLocationId?: number;
  userId?: number;
}) {
  const batch = state.batches.find(b => b.id === input.batchId);
  if (!batch || !input.quantity) return;

  let delta = 0;
  let batches = state.batches;

  if (input.type === "RETURN") {
    delta = Math.abs(input.quantity);
    batches = state.batches.map(b =>
      b.id === batch.id ? { ...b, quantityRemaining: b.quantityRemaining + delta } : b,
    );
  } else if (input.type === "WRITE_OFF") {
    delta = -Math.abs(input.quantity);
    batches = state.batches.map(b =>
      b.id === batch.id ? { ...b, quantityRemaining: Math.max(0, b.quantityRemaining + delta) } : b,
    );
  } else if (input.type === "TRANSFER" && input.toLocationId) {
    delta = 0;
    batches = state.batches.map(b =>
      b.id === batch.id ? { ...b, locationId: input.toLocationId! } : b,
    );
  }

  state = {
    ...state,
    batches,
    transactions: [
      {
        id: nextTxId(),
        batchId: batch.id,
        sku: batch.sku,
        userId: input.userId ?? 4,
        type: input.type,
        quantityDelta: delta,
        timestamp: new Date().toISOString(),
        channel: "WAREHOUSE",
      },
      ...state.transactions,
    ],
  };
  emit();
}

/**
 * Warehouse staff flags the currently-assigned (#1 NEXT) batch as damaged or
 * missing. Writes off its remaining quantity and reassigns the pick task to
 * the next available unexpired batch for that SKU, unlocking it automatically.
 */
export function reportFifoIssue(taskId: string, reason: "DAMAGED" | "MISSING", userId = 4) {
  const task = state.pickTasks.find(t => t.id === taskId);
  if (!task) return;
  const batch = state.batches.find(b => b.id === task.batchId);
  if (!batch) return;

  const writeOffQty = batch.quantityRemaining;

  const batches = state.batches.map(b =>
    b.id === batch.id ? { ...b, quantityRemaining: 0 } : b,
  );

  const nextBatch = fifoBatches(task.sku, batches)[0] ?? null;

  state = {
    ...state,
    batches,
    pickTasks: state.pickTasks.map(t =>
      t.id === taskId
        ? { ...t, batchId: nextBatch?.id ?? t.batchId, locationId: nextBatch?.locationId ?? t.locationId }
        : t,
    ),
    transactions: [
      {
        id: nextTxId(),
        batchId: batch.id,
        sku: batch.sku,
        userId,
        type: "WRITE_OFF",
        quantityDelta: -writeOffQty,
        timestamp: new Date().toISOString(),
        channel: "WAREHOUSE",
        note: `${reason} — flagged via FIFO exception on ${taskId}`,
      } as TxLog & { note?: string },
      ...state.transactions,
    ],
  };
  emit();
}

/** Administrator adds a new SKU to the catalog. */
export function addProduct(input: {
  sku: string; name: string; unitCost: number; reorderPoint: number;
  leadTimeDays: number; abc: ABC; seasonalFlag: boolean;
}, actor: { userId: number; userName: string }) {
  if (state.products.some(p => p.sku === input.sku)) return;

  const newProduct: Product = {
    sku: input.sku,
    name: input.name,
    categoryId: 1,
    supplierId: state.suppliers[0]?.id ?? 1,
    unitCost: input.unitCost,
    reorderPoint: input.reorderPoint,
    reorderQuantity: input.reorderPoint * 2,
    leadTimeDays: input.leadTimeDays,
    seasonalFlag: input.seasonalFlag,
    isFifoCritical: false,
    abc: input.abc,
    avgDailyUsage: Math.max(1, Math.round(input.reorderPoint / (input.leadTimeDays + 10))),
    seasonalFactor: input.seasonalFlag ? 2.0 : undefined,
    safetyStock: Math.round(input.reorderPoint * 0.2),
  };

    state = { ...state, products: [newProduct, ...state.products] };
  logAudit(actor.userId, actor.userName, "Added product", `SKU: ${input.sku}`);
  emit();
}

/** Administrator edits an existing SKU's catalog details. */
export function updateProduct(sku: string, input: {
  name: string; unitCost: number; reorderPoint: number;
  leadTimeDays: number; abc: ABC; seasonalFlag: boolean;
}, actor: { userId: number; userName: string }) {
  if (!state.products.some(p => p.sku === sku)) return;

  state = {
    ...state,
    products: state.products.map(p =>
      p.sku === sku
        ? {
            ...p,
            name: input.name,
            unitCost: input.unitCost,
            reorderPoint: input.reorderPoint,
            leadTimeDays: input.leadTimeDays,
            abc: input.abc,
            seasonalFlag: input.seasonalFlag,
            seasonalFactor: input.seasonalFlag ? (p.seasonalFactor ?? 2.0) : undefined,
          }
        : p,
    ),
  };
  logAudit(actor.userId, actor.userName, "Updated product", `SKU: ${sku}`);
  emit();
}

let supplierSeq = 100;
/** Administrator adds a new supplier to the directory. */
export function addSupplier(input: {
  name: string; contact: string; contactRole?: string; email: string; phone: string; address?: string; landline?: string; tin?: string;
}) {
  const newSupplier: Supplier = {
    id: supplierSeq++,
    name: input.name,
    contact: input.contact,
    contactRole: input.contactRole || undefined,
    address: input.address || undefined,
    landline: input.landline || undefined,
    tin: input.tin || undefined,
  };
    state = { ...state, suppliers: [newSupplier, ...state.suppliers] };
  emit();
}

/** Administrator edits an existing supplier's directory details. */
export function updateSupplier(id: number, input: {
  name: string; contact: string; contactRole?: string; address?: string; landline?: string; tin?: string;
}) {
  state = {
    ...state,
    suppliers: state.suppliers.map(s =>
      s.id === id
        ? {
            ...s,
            name: input.name,
            contact: input.contact,
            contactRole: input.contactRole || undefined,
            address: input.address || undefined,
            landline: input.landline || undefined,
            tin: input.tin || undefined,
          }
        : s,
    ),
  };
  emit();
}

let locationSeq = 100;
/** Administrator adds a new warehouse storage location. */
export function addLocation(input: { zone: string; aisle: string; description: string }) {
  const code = `${input.zone}-${input.aisle.padStart(2, "0")}`;
  if (state.locations.some(l => l.code === code)) return;

  const newLocation: WarehouseLocation = {
    id: locationSeq++,
    code,
    description: input.description || `Zone ${input.zone} · Aisle ${input.aisle}`,
  };
    state = { ...state, locations: [newLocation, ...state.locations] };
  emit();
}

/** Administrator edits a location's description — zone/aisle code stays fixed since batches reference the location by ID, not code. */
export function updateLocationDescription(id: number, description: string) {
  state = {
    ...state,
    locations: state.locations.map(l => (l.id === id ? { ...l, description } : l)),
  };
  emit();
}
/**
 * Inventory Staff sets the seasonal window (start/end month, 1-12) and the
 * demand multiplier for a seasonal SKU. The multiplier feeds directly into
 * ropSeasonal(): ROP = ADU × multiplier × LeadTime + SafetyStock.
 */
export function updateSeasonalConfig(
  sku: string,
  input: { startMonth: number; endMonth: number; multiplier: number },
  actor: { userId: number; userName: string },
) {
  state = {
    ...state,
    products: state.products.map(p =>
      p.sku === sku ? { ...p, seasonalFactor: input.multiplier } : p,
    ),
    seasonalWindows: {
      ...state.seasonalWindows,
      [sku]: { startMonth: input.startMonth, endMonth: input.endMonth },
    },
  };
  logAudit(actor.userId, actor.userName, "Updated seasonal multiplier", `SKU: ${sku} → ${input.multiplier}×`);
  emit();
}

/** FIFO ordering over the live store, oldest received lot first. */
export function fifoBatches(sku: string, all: InventoryBatch[]): InventoryBatch[] {
  return all
    .filter(b => b.sku === sku && b.quantityRemaining > 0)
    .sort((a, b) => a.dateReceived.localeCompare(b.dateReceived));
}
export interface SalesOrderLine {
  sku: string;
  batchId: string;
  locationId: number;
  quantity: number;
  status: TaskStatus;
  priority: Priority;
}

export interface SalesOrder {
  orderRef: string;
  lines: SalesOrderLine[];
  totalQty: number;
  status: TaskStatus;
  priority: Priority;
}

const PRIORITY_RANK: Record<Priority, number> = { HIGH: 0, NORMAL: 1, LOW: 2 };

/**
 * Derives a Sales Order view from the live Pick Tasks queue. Pick tasks
 * already carry an `orderRef` (e.g. "SO-20881") — a sales order is just
 * the group of tasks that share one. No separate SO entity/CRUD is
 * introduced; full sales-order management (customers, invoicing, etc.)
 * is out of scope for this system.
 */
export function deriveSalesOrders(pickTasks: PickTask[]): SalesOrder[] {
  const byOrder = new Map<string, PickTask[]>();
  for (const t of pickTasks) {
    const group = byOrder.get(t.orderRef);
    if (group) group.push(t);
    else byOrder.set(t.orderRef, [t]);
  }

  return Array.from(byOrder.entries())
    .map(([orderRef, tasks]) => {
      const totalQty = tasks.reduce((s, t) => s + t.quantity, 0);
      const allDone = tasks.every(t => t.status === "DONE");
      const anyStarted = tasks.some(t => t.status !== "PENDING");
      const status: TaskStatus = allDone ? "DONE" : anyStarted ? "IN_PROGRESS" : "PENDING";
      const priority = tasks.reduce(
        (best, t) => (PRIORITY_RANK[t.priority] < PRIORITY_RANK[best] ? t.priority : best),
        tasks[0].priority,
      );
      return {
        orderRef,
        totalQty,
        status,
        priority,
        lines: tasks.map(t => ({
          sku: t.sku,
          batchId: t.batchId,
          locationId: t.locationId,
          quantity: t.quantity,
          status: t.status,
          priority: t.priority,
        })),
      };
    })
    .sort((a, b) => a.orderRef.localeCompare(b.orderRef));
}

/** Live sales orders — recomputes whenever pick tasks change. */
export function useSalesOrders(): SalesOrder[] {
  const { pickTasks } = useOps();
  return useMemo(() => deriveSalesOrders(pickTasks), [pickTasks]);
}
/**
 * Computes all alerts from the CURRENT live store state — recalculated
 * fresh every call, so it's safe to drive from useMemo with real
 * dependencies (see useAlerts below) instead of computing once at mount.
 * Deterministic IDs (keyed off the source entity's own ID) mean recomputing
 * on every state change never produces duplicates.
 */
export function computeAlerts(s: Pick<OpsState, "products" | "batches" | "receivingLines" | "counts">): Alert[] {
  const out: Alert[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // LOW_STOCK / SEASONAL_REORDER
  for (const p of s.products) {
    const stock = onHand(p.sku, s.batches);
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

  // NEAR_EXPIRY
  for (const b of s.batches) {
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

  // PO_OVERDUE — expectedDate strictly before today, not fully received, not PUT_AWAY
  for (const r of s.receivingLines) {
    if (r.status === "PUT_AWAY") continue;
    if (r.quantityReceived >= r.quantityOrdered) continue;
    const expected = new Date(r.expectedDate);
    expected.setHours(0, 0, 0, 0);
    if (expected.getTime() >= today.getTime()) continue; // today or future = not overdue
    const daysLate = Math.round((today.getTime() - expected.getTime()) / 86400000);
    out.push({
      id: `A-${r.id}-OVERDUE`,
      sku: r.sku,
      type: "PO_OVERDUE",
      message: `${r.poNumber} is ${daysLate} day${daysLate === 1 ? "" : "s"} overdue — ${r.quantityReceived}/${r.quantityOrdered} units received`,
      status: "OPEN",
      createdAt: new Date().toISOString(),
    });
  }

  // VARIANCE — completed counts only, skip exact matches
  for (const c of s.counts) {
    if (c.countedQty === null) continue;
    if (c.countedQty === c.systemQty) continue;
    const diff = c.countedQty - c.systemQty;
    const direction = diff < 0 ? "under" : "over";
    out.push({
      id: `A-${c.id}-VAR`,
      sku: c.sku,
      type: "VARIANCE",
      message: `Cycle count variance — ${Math.abs(diff)} units ${direction} system quantity (${c.systemQty} → ${c.countedQty})`,
      status: "OPEN",
      createdAt: new Date().toISOString(),
    });
  }

  return out;
}

/**
 * Live alert list — recomputes whenever the relevant slices of the store
 * change (React re-renders whenever useOps()'s snapshot reference changes,
 * so this useMemo's deps are real, not an empty array pretending to be
 * "run once at mount").
 */
export function useAlerts(): Alert[] {
  const { products, batches, receivingLines, counts, ackedAlerts } = useOps();
  return useMemo(
    () => computeAlerts({ products, batches, receivingLines, counts }).filter(a => !ackedAlerts[a.id]),
    [products, batches, receivingLines, counts, ackedAlerts],
  );
}
/**
 * Suggests a seasonal multiplier for a SKU by comparing average daily sales
 * inside its configured seasonal window against sales outside it — the same
 * "based on last year's demand spike" idea from the case study, computed
 * from real Transaction Log history instead of typed in from memory.
 */
export function suggestSeasonalMultiplier(sku: string): { suggested: number | null; sampleSize: number } {
  const window = state.seasonalWindows[sku];
  if (!window) return { suggested: null, sampleSize: 0 };

  const sales = state.transactions.filter(t => t.sku === sku && t.type === "SALE");
  if (sales.length < 3) return { suggested: null, sampleSize: sales.length };

  let inWindowUnits = 0, inWindowDays = new Set<string>();
  let outWindowUnits = 0, outWindowDays = new Set<string>();

  for (const t of sales) {
    const d = new Date(t.timestamp);
    const month = d.getMonth() + 1;
    const dayKey = t.timestamp.slice(0, 10);
    const inWindow = window.startMonth <= window.endMonth
      ? month >= window.startMonth && month <= window.endMonth
      : month >= window.startMonth || month <= window.endMonth; // handles wrap-around windows, e.g. Nov–Feb

    if (inWindow) {
      inWindowUnits += Math.abs(t.quantityDelta);
      inWindowDays.add(dayKey);
    } else {
      outWindowUnits += Math.abs(t.quantityDelta);
      outWindowDays.add(dayKey);
    }
  }

  if (inWindowDays.size === 0 || outWindowDays.size === 0) {
    return { suggested: null, sampleSize: sales.length };
  }

  const inAvg = inWindowUnits / inWindowDays.size;
  const outAvg = outWindowUnits / outWindowDays.size;
  if (outAvg === 0) return { suggested: null, sampleSize: sales.length };

  const ratio = inAvg / outAvg;
  return { suggested: Math.round(ratio * 10) / 10, sampleSize: sales.length };
}