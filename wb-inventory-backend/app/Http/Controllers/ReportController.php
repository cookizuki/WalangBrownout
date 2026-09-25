<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\ReceivingLine;
use App\Models\Supplier;
use App\Models\TransactionLog;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    private ?Collection $catalog = null;

    private ?Collection $logs = null;

    private ?Collection $receipts = null;

    private ?Collection $orders = null;

    private function products(): Collection
    {
        return $this->catalog ??= Product::withSum('batches', 'quantity_remaining')->orderBy('sku')->get()->keyBy('sku');
    }

    private function transactions(): Collection
    {
        return $this->logs ??= TransactionLog::orderBy('id')->get();
    }

    private function receiving(): Collection
    {
        return $this->receipts ??= ReceivingLine::with('supplier')->orderBy('id')->get();
    }

    public function index(): Response
    {
        $history = [];
        $costs = [];
        foreach ($this->products() as $product) {
            $history[$product->sku] = $this->purchaseHistory($product->sku);
            $costs[$product->sku] = $this->costSummary($product->sku);
        }

        return Inertia::render('Reports/Index', [
            'shrinkageByMonth' => $this->shrinkage(), 'velocityBySku' => $this->velocity(), 'valuation' => $this->valuation(),
            'turnover' => $this->turnover(), 'deadStock' => $this->deadStock(), 'supplierPerf' => $this->supplierPerformance(),
            'products' => $this->products()->map(fn (Product $p): array => ['sku' => $p->sku, 'name' => $p->name])->values(),
            'purchaseHistories' => (object) $history, 'costSummaries' => (object) $costs,
        ]);
    }

    public function shrinkage(): array
    {
        $buckets = [];
        foreach ($this->transactions() as $tx) {
            if (! (($tx->type === 'ADJUSTMENT' && $tx->quantity_delta < 0) || $tx->type === 'WRITE_OFF')) {
                continue;
            }
            $label = $tx->timestamp->format('M Y');
            $units = abs($tx->quantity_delta);
            $buckets[$label] ??= ['label' => $label, 'units' => 0, 'cost' => 0];
            $buckets[$label]['units'] += $units;
            $buckets[$label]['cost'] += $units * (float) ($this->products()->get($tx->sku)?->unit_cost ?? 0);
        }
        ksort($buckets, SORT_STRING);

        return array_values($buckets);
    }

    public function velocity(): array
    {
        return $this->transactions()->where('type', 'SALE')->groupBy('sku')->map(function (Collection $sales, string $sku): array {
            $product = $this->products()->get($sku);

            return ['sku' => $sku, 'units' => $sales->sum(fn ($t): int => abs($t->quantity_delta)), 'name' => $product?->name ?? $sku, 'abc' => $product?->abc ?? 'C'];
        })->sortByDesc('units')->values()->all();
    }

    public function valuation(): array
    {
        $classes = [];
        foreach (['A', 'B', 'C'] as $abc) {
            $classes[$abc] = ['abc' => $abc, 'units' => 0, 'value' => 0];
        }
        foreach ($this->products() as $p) {
            $units = (int) $p->batches_sum_quantity_remaining;
            if ($units <= 0) {
                continue;
            }
            $classes[$p->abc]['units'] += $units;
            $classes[$p->abc]['value'] += $units * (float) $p->unit_cost;
        }

        return ['totalValue' => array_sum(array_column($classes, 'value')), 'byClass' => array_values($classes)];
    }

    public function turnover(): array
    {
        $cutoff = CarbonImmutable::now('UTC')->subDays(90);

        return $this->products()->map(function (Product $p) use ($cutoff): array {
            $stock = (int) $p->batches_sum_quantity_remaining;
            $units = $this->transactions()->filter(fn ($t): bool => $t->sku === $p->sku && $t->type === 'SALE' && $t->timestamp->greaterThanOrEqualTo($cutoff))->sum(fn ($t): int => abs($t->quantity_delta));
            $rate = $stock > 0 ? ($units / $stock) * (365 / 90) : null;

            return ['sku' => $p->sku, 'name' => $p->name, 'abc' => $p->abc, 'unitsSoldPeriod' => $units, 'avgOnHand' => $stock,
                'turnoverRate' => $rate !== null ? round($rate, 1) : null, 'daysOfInventory' => $rate !== null && $rate > 0 ? (int) round(365 / $rate) : null];
        })->where('avgOnHand', '>', 0)->sortByDesc('turnoverRate')->values()->all();
    }

    public function deadStock(): array
    {
        $now = CarbonImmutable::now('UTC');

        return $this->products()->map(function (Product $p) use ($now): array {
            $last = $this->transactions()->where('sku', $p->sku)->where('type', 'SALE')->sortByDesc('timestamp')->first();
            $days = $last ? (int) floor(($now->getTimestamp() - $last->timestamp->getTimestamp()) / 86400) : null;
            $effective = $days ?? INF;
            $stock = (int) $p->batches_sum_quantity_remaining;

            return ['sku' => $p->sku, 'name' => $p->name, 'abc' => $p->abc, 'onHand' => $stock, 'daysSinceLastSale' => $days,
                'lastSaleDate' => $last?->timestamp->toDateString(), 'bucket' => $effective >= 180 ? '180+' : ($effective >= 90 ? '90+' : ($effective >= 60 ? '60+' : '30+')), 'tiedUpValue' => $stock * (float) $p->unit_cost];
        })->filter(fn (array $row): bool => $row['onHand'] > 0 && ($row['daysSinceLastSale'] === null || $row['daysSinceLastSale'] >= 30))->sortByDesc(fn (array $row): float => $row['daysSinceLastSale'] ?? INF)->values()->all();
    }

    public function supplierPerformance(): array
    {
        $today = CarbonImmutable::today('UTC');

        return Supplier::orderBy('id')->get()->map(function (Supplier $supplier) use ($today): array {
            $lines = $this->receiving()->where('supplier_id', $supplier->id);
            $completed = $lines->filter(fn ($r): bool => $r->status === 'PUT_AWAY' && $r->received_date !== null);
            $onTime = 0;
            $late = 0;
            $lateDays = 0;
            foreach ($completed as $line) {
                $days = (int) round($line->expected_date->diffInDays($line->received_date));
                if ($days > 0) {
                    $late++;
                    $lateDays += $days;
                } else {
                    $onTime++;
                }
            }

            return ['supplierId' => $supplier->id, 'supplierName' => $supplier->name, 'totalDeliveries' => $completed->count(), 'onTimeCount' => $onTime, 'lateCount' => $late,
                'onTimeRate' => $completed->count() ? (int) round($onTime / $completed->count() * 100) : 0, 'avgDaysLate' => $late ? round($lateDays / $late, 1) : 0,
                'currentlyOverdue' => $lines->filter(fn ($r): bool => $r->status !== 'PUT_AWAY' && $r->quantity_received < $r->quantity_ordered && $r->expected_date->lessThan($today))->count()];
        })->filter(fn (array $row): bool => $row['totalDeliveries'] > 0 || $row['currentlyOverdue'] > 0)->sortBy('onTimeRate')->values()->all();
    }

    public function purchaseHistory(string $sku): array
    {
        $this->orders ??= PurchaseOrder::all()->keyBy('id');

        return $this->receiving()->where('sku', $sku)->where('quantity_received', '>', 0)->map(function ($line) use ($sku): array {
            $po = $this->orders->get($line->po_number);
            $cost = (float) ($po?->unit_cost ?? $this->products()->get($sku)?->unit_cost ?? 0);

            return ['date' => ($line->received_date ?? $line->expected_date)->toDateString(), 'poNumber' => $line->po_number, 'supplierName' => $line->supplier?->name ?? 'Unknown supplier',
                'quantityReceived' => $line->quantity_received, 'unitCost' => $cost, 'totalCost' => $cost * $line->quantity_received, 'costSource' => $po ? 'po' : 'estimated'];
        })->sortByDesc('date')->values()->all();
    }

    public function costSummary(string $sku): array
    {
        $history = $this->purchaseHistory($sku);
        $last = $history[0] ?? null;
        $units = array_sum(array_column($history, 'quantityReceived'));
        $average = $units > 0 ? array_sum(array_column($history, 'totalCost')) / $units : null;
        $diff = $average !== null ? $last['unitCost'] - $average : null;

        return ['currentCost' => (float) ($this->products()->get($sku)?->unit_cost ?? 0), 'lastPurchaseCost' => $last['unitCost'] ?? null, 'lastPurchaseDate' => $last['date'] ?? null,
            'averageCost' => $average, 'trend' => $diff === null ? null : (abs($diff) < 0.5 ? 'same' : ($diff > 0 ? 'up' : 'down'))];
    }
}
