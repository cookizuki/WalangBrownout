<?php

namespace App\Console\Commands;

use App\Models\InventoryBatch;
use Illuminate\Console\Command;

class VerifyInventoryConsistency extends Command
{
    protected $signature = 'inventory:verify-consistency {--json : Output machine-readable results}';

    protected $description = 'Read-only check of quantity_received plus non-receipt transaction deltas against remaining stock';

    public function handle(): int
    {
        $batches = InventoryBatch::orderBy('id')->get();
        $mismatches = [];
        foreach ($batches as $batch) {
            $received = (int) $batch->quantity_received;
            // Seed history is partial: preserve its opening balance and inspect only
            // movements at/after the captured cutover. Never fabricate historical logs.
            // RECEIPT is excluded because quantity_received already includes it.
            $logs = $batch->transactionLogs()->where('type', '!=', 'RECEIPT');
            if ($batch->opening_recorded_at !== null) {
                $logs->where('timestamp', '>=', $batch->opening_recorded_at);
            }
            $delta = (int) $logs->sum('quantity_delta');
            $remaining = (int) $batch->quantity_remaining;
            $opening = $batch->opening_quantity ?? $received;
            $expected = $opening + $delta;
            if ($expected !== $remaining) {
                $mismatches[] = [
                    'batch_id' => $batch->id, 'opening_quantity' => $opening, 'quantity_received' => $received, 'sum_deltas' => $delta,
                    'expected_remaining' => $expected, 'actual_remaining' => $remaining,
                    'difference' => $remaining - $expected,
                ];
            }
        }
        if ($this->option('json')) {
            $this->line(json_encode(['checked' => $batches->count(), 'mismatches' => $mismatches], JSON_THROW_ON_ERROR));
        } else {
            $this->info('Formula: opening balance (or quantity_received) + non-RECEIPT deltas = quantity_remaining');
            $this->table(['Batch', 'Opening', 'Received', 'Sum deltas', 'Expected', 'Actual', 'Actual - expected'], $mismatches);
            $this->line("Checked {$batches->count()} batch(es); ".count($mismatches).' discrepancy/discrepancies. No data changed.');
        }

        return $mismatches === [] ? self::SUCCESS : self::FAILURE;
    }
}
