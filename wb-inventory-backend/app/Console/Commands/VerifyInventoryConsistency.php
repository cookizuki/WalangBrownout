<?php

namespace App\Console\Commands;

use App\Models\InventoryBatch;
use Illuminate\Console\Command;

class VerifyInventoryConsistency extends Command
{
    protected $signature = 'inventory:verify-consistency {--json : Output machine-readable results}';

    protected $description = 'Read-only check of quantity_received plus all transaction deltas against remaining stock';

    public function handle(): int
    {
        $batches = InventoryBatch::withSum('transactionLogs as delta_sum', 'quantity_delta')
            ->withSum(['transactionLogs as receipt_delta' => fn ($query) => $query->where('type', 'RECEIPT')], 'quantity_delta')
            ->orderBy('id')->get();
        $mismatches = [];
        foreach ($batches as $batch) {
            $received = (int) $batch->quantity_received;
            $delta = (int) $batch->delta_sum;
            $remaining = (int) $batch->quantity_remaining;
            $expected = $received + $delta;
            if ($expected !== $remaining) {
                $mismatches[] = [
                    'batch_id' => $batch->id, 'quantity_received' => $received, 'sum_deltas' => $delta,
                    'expected_remaining' => $expected, 'actual_remaining' => $remaining,
                    'difference' => $remaining - $expected, 'receipt_deltas' => (int) $batch->receipt_delta,
                ];
            }
        }
        if ($this->option('json')) {
            $this->line(json_encode(['checked' => $batches->count(), 'mismatches' => $mismatches], JSON_THROW_ON_ERROR));
        } else {
            $this->info('Formula: quantity_received + sum(ALL quantity_delta) = quantity_remaining');
            $this->table(['Batch', 'Received', 'Sum deltas', 'Expected', 'Actual', 'Actual - expected', 'Receipt deltas'], $mismatches);
            $this->line("Checked {$batches->count()} batch(es); ".count($mismatches).' discrepancy/discrepancies. No data changed.');
            $this->comment('Receipt deltas are included exactly as requested. When the initial receipt is also logged, this formula counts it twice; historical seed logs may also be incomplete.');
        }

        return $mismatches === [] ? self::SUCCESS : self::FAILURE;
    }
}
