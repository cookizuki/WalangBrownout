<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\ReceivingLine;
use App\Models\Supplier;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    private ?Collection $catalog = null;

    private ?Collection $sales = null;

    private ?Collection $recentSales = null;

    private ?Collection $receipts = null;

    private ?Collection $orders = null;

    private function products(): Collection
    {
        return $this->catalog ??= Product::withSum('batches', 'quantity_remaining')->orderBy('sku')->get()->keyBy('sku');
    }

    private function sales(): Collection
    {
        return $this->sales ??= DB::table('transaction_logs')->where('type', 'SALE')->select('sku')
            ->selectRaw('SUM(ABS(quantity_delta)) AS units, MAX(timestamp) AS last_sale, MIN(id) AS first_id')
            ->groupBy('sku')->orderBy('first_id')->get()->keyBy('sku');
    }

    private function recentSales(): Collection
    {
        $cutoff = CarbonImmutable::now()->subDays(90);
        if ($cutoff->microsecond > 0) {
            $cutoff = $cutoff->addSecond()->startOfSecond();
        }

        return $this->recentSales ??= DB::table('transaction_logs')->where('type', 'SALE')
            ->where('timestamp', '>=', $cutoff)->select('sku')
            ->selectRaw('SUM(ABS(quantity_delta)) AS units')->groupBy('sku')->get()->keyBy('sku');
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
        $month = DB::connection()->getDriverName() === 'mysql'
            ? "DATE_FORMAT(timestamp, '%Y-%m-01')" : "strftime('%Y-%m-01', timestamp)";
        $losses = DB::table('transaction_logs')->where(fn ($query) => $query->where('type', 'WRITE_OFF')
            ->orWhere(fn ($query) => $query->where('type', 'ADJUSTMENT')->where('quantity_delta', '<', 0)))
            ->select('sku')->selectRaw("{$month} AS month, SUM(ABS(quantity_delta)) AS units")
            ->groupBy('sku')->groupByRaw($month)->get();
        foreach ($losses as $tx) {
            $label = CarbonImmutable::parse($tx->month)->format('M Y');
            $units = (int) $tx->units;
            $buckets[$label] ??= ['label' => $label, 'units' => 0, 'cost' => 0];
            $buckets[$label]['units'] += $units;
            $buckets[$label]['cost'] += $units * (float) ($this->products()->get($tx->sku)?->unit_cost ?? 0);
        }
        ksort($buckets, SORT_STRING);

        return array_values($buckets);
    }

    public function velocity(): array
    {
        return $this->sales()->map(function (object $sales, string $sku): array {
            $product = $this->products()->get($sku);

            return ['sku' => $sku, 'units' => (int) $sales->units, 'name' => $product?->name ?? $sku, 'abc' => $product?->abc ?? 'C'];
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
        return $this->products()->map(function (Product $p): array {
            $stock = (int) $p->batches_sum_quantity_remaining;
            $units = (int) ($this->recentSales()->get($p->sku)?->units ?? 0);
            $rate = $stock > 0 ? ($units / $stock) * (365 / 90) : null;

            return ['sku' => $p->sku, 'name' => $p->name, 'abc' => $p->abc, 'unitsSoldPeriod' => $units, 'avgOnHand' => $stock,
                'turnoverRate' => $rate !== null ? round($rate, 1) : null, 'daysOfInventory' => $rate !== null && $rate > 0 ? (int) round(365 / $rate) : null];
        })->where('avgOnHand', '>', 0)->sortByDesc('turnoverRate')->values()->all();
    }

    public function deadStock(): array
    {
        $now = CarbonImmutable::now();

        return $this->products()->map(function (Product $p) use ($now): array {
            $last = $this->sales()->get($p->sku)?->last_sale;
            $lastDate = $last === null ? null : CarbonImmutable::parse($last);
            $days = $lastDate ? (int) floor(($now->getTimestamp() - $lastDate->getTimestamp()) / 86400) : null;
            $effective = $days ?? INF;
            $stock = (int) $p->batches_sum_quantity_remaining;

            return ['sku' => $p->sku, 'name' => $p->name, 'abc' => $p->abc, 'onHand' => $stock, 'daysSinceLastSale' => $days,
                'lastSaleDate' => $lastDate?->toDateString(), 'bucket' => $effective >= 180 ? '180+' : ($effective >= 90 ? '90+' : ($effective >= 60 ? '60+' : '30+')), 'tiedUpValue' => $stock * (float) $p->unit_cost];
        })->filter(fn (array $row): bool => $row['onHand'] > 0 && ($row['daysSinceLastSale'] === null || $row['daysSinceLastSale'] >= 30))->sortByDesc(fn (array $row): float => $row['daysSinceLastSale'] ?? INF)->values()->all();
    }

    public function supplierPerformance(): array
    {
        $today = CarbonImmutable::today();

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
