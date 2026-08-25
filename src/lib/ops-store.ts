// Shared mutable operations store: batches, cycle counts, transaction log,
// pending purchase orders, and inbound receiving lines. One source of truth —
// every role reads the same data, filtered/permissioned differently in the UI.

import { useSyncExternalStore } from "react";
import {
  batches as seedBatches,
  cycleCounts as seedCounts,
  transactions as seedTx,
  pendingApprovals as seedPendingPOs,
  receivingLines as seedReceivingLines,
  pickTasks as seedPickTasks,
  products,
  suppliers,
  type CycleCount,
  type InventoryBatch,
  type PendingPO,
  type PickTask,
  type ReceivingLine,
  type TxLog,
} from "./inventory-data";

export type AdjustmentReason = "DAMAGE" | "LOSS" | "CORRECTION";

interface OpsState {
  batches: InventoryBatch[];
  counts: CycleCount[];
  transactions: TxLog[];
  pendingPOs: PendingPO[];
  pickTasks: PickTask[];
  receivingLines: ReceivingLine[];
}

let state: OpsState = {
  batches: seedBatches.map(b => ({ ...b })),
  counts: seedCounts.map(c => ({ ...c })),
  transactions: seedTx.map(t => ({ ...t })),
  pendingPOs: seedPendingPOs.map(p => ({ ...p })),
  pickTasks: seedPickTasks.map(t => ({ ...t })),
  receivingLines: seedReceivingLines.map(r => ({ ...r })),
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
  const p = products.find(pp => pp.sku === input.sku);
  if (!p) return;
  const supplier = suppliers.find(s => s.id === p.supplierId);

  const po: PendingPO = {
    id: nextPOId(),
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
}) {
  const line = state.receivingLines.find(r => r.id === input.lineId);
  if (!line || !input.quantityReceived) return;

  const newBatch: InventoryBatch = {
    id: nextBatchId(),
    sku: line.sku,
    locationId: line.locationId,
    quantityReceived: input.quantityReceived,
    quantityRemaining: input.quantityReceived,
    dateReceived: new Date().toISOString().slice(0, 10),
    expirationDate: input.expirationDate || undefined,
  };

  state = {
    ...state,
    batches: [newBatch, ...state.batches],
    receivingLines: state.receivingLines.map(r =>
      r.id === line.id
        ? { ...r, quantityReceived: input.quantityReceived, status: "PUT_AWAY" as const }
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

/** FIFO ordering over the live store, oldest received lot first. */
export function fifoBatches(sku: string, all: InventoryBatch[]): InventoryBatch[] {
  return all
    .filter(b => b.sku === sku && b.quantityRemaining > 0)
    .sort((a, b) => a.dateReceived.localeCompare(b.dateReceived));
}