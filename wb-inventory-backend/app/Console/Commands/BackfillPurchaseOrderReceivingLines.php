<?php

namespace App\Console\Commands;

use App\Models\AuditLog;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Services\PurchaseOrderReceivingService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class BackfillPurchaseOrderReceivingLines extends Command
{
    protected $signature = 'po:backfill-receiving-lines';

    protected $description = 'Manually create missing inbound lines for already-approved purchase orders';

    public function handle(PurchaseOrderReceivingService $receiving): int
    {
        $missing = PurchaseOrder::whereNotExists(fn ($query) => $query->selectRaw('1')->from('receiving_lines')
            ->whereColumn('receiving_lines.po_number', 'purchase_orders.id'))->orderBy('id')->get();
        $created = 0;
        $failed = 0;
        foreach ($missing as $order) {
            if ($order->status !== 'APPROVED') {
                $this->warn("Skipped {$order->id}: status {$order->status}; only approved orders can become inbound deliveries.");

                continue;
            }
            try {
                $line = DB::transaction(function () use ($receiving, $order) {
                    Product::whereKey($order->sku)->lockForUpdate()->firstOrFail();
                    $locked = PurchaseOrder::lockForUpdate()->findOrFail($order->id);
                    if ($locked->status !== 'APPROVED') {
                        return null;
                    }
                    $line = $receiving->createMissing($locked);
                    if ($line) {
                        AuditLog::create([
                            'id' => 'AU-'.Str::ulid(), 'user_id' => null, 'user_name' => 'System',
                            'action' => 'Backfilled receiving line', 'target' => "{$order->id} -> {$line->id}", 'timestamp' => now(),
                        ]);
                    }

                    return $line;
                });
                if ($line) {
                    $created++;
                    $this->line("Created {$line->id} for {$order->id} ({$line->quantity_ordered} units).");
                }
            } catch (ValidationException $exception) {
                $failed++;
                $this->error("{$order->id}: {$exception->getMessage()}");
            }
        }
        $this->info("Backfilled {$created} receiving line(s). Failed: {$failed}.");

        return $failed > 0 ? self::FAILURE : self::SUCCESS;
    }
}
