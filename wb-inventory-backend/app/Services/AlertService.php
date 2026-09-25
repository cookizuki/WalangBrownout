<?php

namespace App\Services;

use App\Models\InventoryBatch;
use App\Models\Product;
use App\Models\ReceivingLine;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

class AlertService
{
    public function compute(): Collection
    {
        $alerts = collect();
        $now = CarbonImmutable::now('UTC');
        $products = Product::query()->orderBy('sku')->get()->keyBy('sku');
        foreach ($products as $product) {
            $stock = $product->onHand();
            $rop = $product->seasonal_flag ? $product->ropSeasonal() : $product->ropStandard();
            if ($stock <= $rop) {
                $factor = $product->seasonal_factor === null ? 'undefined' : (string) (float) $product->seasonal_factor;
                $alerts->push([
                    'id' => "A-{$product->sku}-ROP", 'sku' => $product->sku, 'productName' => $product->name,
                    'type' => $product->seasonal_flag ? 'SEASONAL_REORDER' : 'LOW_STOCK',
                    'message' => $product->seasonal_flag
                        ? "Seasonal ROP hit — on hand {$stock} ≤ {$rop} (factor {$factor}×)"
                        : "Below reorder point — on hand {$stock} ≤ {$rop}",
                    'status' => 'OPEN', 'createdAt' => $now->toISOString(),
                ]);
            }
        }
        foreach (InventoryBatch::query()->whereNotNull('expiration_date')->orderBy('id')->get() as $batch) {
            $days = (int) ceil((CarbonImmutable::parse($batch->expiration_date->toDateString(), 'UTC')->getTimestamp() - $now->getTimestamp()) / 86400);
            if ($days <= 30) {
                $alerts->push([
                    'id' => "A-{$batch->id}-EXP", 'sku' => $batch->sku, 'productName' => $products[$batch->sku]->name,
                    'batchId' => $batch->id, 'type' => 'NEAR_EXPIRY',
                    'message' => "Batch {$batch->id} expires in {$days} days — release first (FIFO)",
                    'status' => 'OPEN', 'createdAt' => $now->toISOString(),
                ]);
            }
        }
        $today = $now->startOfDay();
        foreach (ReceivingLine::query()->where('status', '!=', 'PUT_AWAY')->whereColumn('quantity_received', '<', 'quantity_ordered')->whereDate('expected_date', '<', $today->toDateString())->orderBy('id')->get() as $line) {
            $daysLate = (int) $line->expected_date->diffInDays($today);
            $days = $daysLate === 1 ? 'day' : 'days';
            $alerts->push([
                'id' => "A-{$line->id}-OVERDUE", 'sku' => $line->sku, 'productName' => $products[$line->sku]->name,
                'type' => 'PO_OVERDUE', 'message' => "{$line->po_number} is {$daysLate} {$days} overdue \u{2014} {$line->quantity_received}/{$line->quantity_ordered} units received",
                'status' => 'OPEN', 'createdAt' => $now->toISOString(),
            ]);
        }
        // TODO: VARIANCE once cycle_counts exists (Part 7)

        return $alerts;
    }
}
