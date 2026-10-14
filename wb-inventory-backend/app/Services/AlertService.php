<?php

namespace App\Services;

use App\Models\AlertAcknowledgement;
use App\Models\CycleCount;
use App\Models\InventoryBatch;
use App\Models\Product;
use App\Models\ReceivingLine;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class AlertService
{
    public function openCount(): int
    {
        $stock = DB::table('inventory_batches')->select('sku')->selectRaw('SUM(quantity_remaining) AS quantity')->groupBy('sku');
        $mysql = DB::connection()->getDriverName() === 'mysql';
        $alertId = fn (string $column, string $suffix): string => $mysql
            ? "CONCAT('A-', {$column}, '{$suffix}')"
            : "'A-' || {$column} || '{$suffix}'";
        $products = DB::table('products')->leftJoinSub($stock, 'stock', 'stock.sku', '=', 'products.sku')
            ->whereRaw('COALESCE(stock.quantity, 0) <= CASE WHEN seasonal_flag = 1 THEN ROUND(avg_daily_usage * COALESCE(seasonal_factor, 1) * lead_time_days + safety_stock) ELSE avg_daily_usage * lead_time_days + safety_stock END')
            ->selectRaw($alertId('products.sku', '-ROP').' AS alert_id');
        $expiry = DB::table('inventory_batches')->whereNotNull('expiration_date')
            ->where('expiration_date', '<=', CarbonImmutable::now()->addDays(30)->startOfDay())
            ->selectRaw($alertId('id', '-EXP').' AS alert_id');
        $overdue = DB::table('receiving_lines')->where('status', '!=', 'PUT_AWAY')
            ->whereColumn('quantity_received', '<', 'quantity_ordered')
            ->where('expected_date', '<', CarbonImmutable::today()->toDateString())
            ->selectRaw($alertId('id', '-OVERDUE').' AS alert_id');
        $variance = DB::table('cycle_counts')->whereNotNull('counted_qty')->whereColumn('counted_qty', '!=', 'system_qty')
            ->selectRaw($alertId('id', '-VAR').' AS alert_id');

        return DB::query()->fromSub($products->unionAll($expiry)->unionAll($overdue)->unionAll($variance), 'live_alerts')
            ->whereNotExists(fn ($query) => $query->selectRaw('1')->from('alert_acknowledgements')
                ->whereColumn('alert_acknowledgements.alert_id', 'live_alerts.alert_id'))
            ->count();
    }

    public function open(): Collection
    {
        $acknowledged = AlertAcknowledgement::pluck('alert_id')->flip();

        return $this->compute()->reject(fn (array $alert): bool => $acknowledged->has($alert['id']))->values();
    }

    public function compute(): Collection
    {
        $alerts = collect();
        $now = CarbonImmutable::now();
        $products = Product::query()->withSum('batches', 'quantity_remaining')->orderBy('sku')->get()->keyBy('sku');
        foreach ($products as $product) {
            $stock = (int) $product->batches_sum_quantity_remaining;
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
            $days = (int) ceil((CarbonImmutable::parse($batch->expiration_date->toDateString())->getTimestamp() - $now->getTimestamp()) / 86400);
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
        foreach (CycleCount::whereNotNull('counted_qty')->whereColumn('counted_qty', '!=', 'system_qty')->orderBy('id')->get() as $count) {
            $difference = $count->counted_qty - $count->system_qty;
            $amount = abs($difference);
            $direction = $difference < 0 ? 'under' : 'over';
            $alerts->push([
                'id' => "A-{$count->id}-VAR", 'sku' => $count->sku, 'productName' => $products[$count->sku]->name,
                'type' => 'VARIANCE', 'message' => "Cycle count variance \u{2014} {$amount} units {$direction} system quantity ({$count->system_qty} \u{2192} {$count->counted_qty})",
                'status' => 'OPEN', 'createdAt' => $now->toISOString(),
            ]);
        }

        return $alerts;
    }
}
