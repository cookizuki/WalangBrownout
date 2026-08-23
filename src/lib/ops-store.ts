// Shared mutable operations store: batches, cycle counts and transaction log.
// One source of truth — every role reads the same data, filtered/permissioned
// differently in the UI.

import { useSyncExternalStore } from "react";
import {
  batches as seedBatches,
  cycleCounts as seedCounts,
  transactions as seedTx,
  type CycleCount,
  type InventoryBatch,
  type TxLog,
} from "./inventory-data";

export type AdjustmentReason = "DAMAGE" | "LOSS" | "CORRECTION";

interface OpsState {
  batches: InventoryBatch[];
  counts: CycleCount[];
  transactions: TxLog[];
}

let state: OpsState = {
  batches: seedBatches.map(b => ({ ...b })),
  counts: seedCounts.map(c => ({ ...c })),
  transactions: seedTx.map(t => ({ ...t })),
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

  state = { batches, counts, transactions };
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

/** FIFO ordering over the live store, oldest received lot first. */
export function fifoBatches(sku: string, all: InventoryBatch[]): InventoryBatch[] {
  return all
    .filter(b => b.sku === sku && b.quantityRemaining > 0)
    .sort((a, b) => a.dateReceived.localeCompare(b.dateReceived));
}
