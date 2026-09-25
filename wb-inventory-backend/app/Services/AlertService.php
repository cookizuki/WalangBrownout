<?php

namespace App\Services;

use App\Models\InventoryBatch;
use App\Models\Product;
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
        // TODO: PO_OVERDUE once receiving_lines exists (Part 6)
        // TODO: VARIANCE once cycle_counts exists (Part 7)

        return $alerts;
    }
}
