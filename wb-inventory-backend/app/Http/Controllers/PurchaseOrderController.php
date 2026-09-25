<?php

namespace App\Http\Controllers;

use App\Models\PendingPurchaseOrder;
use App\Models\Product;
use App\Models\SeasonalWindow;
use App\Services\SeasonalConfigService;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PurchaseOrderController extends Controller
{
    public function index(Request $request, SeasonalConfigService $seasonal): Response
    {
        $pending = PendingPurchaseOrder::pluck('sku')->flip();
        $products = Product::with('supplier')->orderBy('sku')->get();
        $rows = $products->map(function (Product $product) use ($pending, $request): array {
            $stock = $product->onHand();
            $rop = $product->seasonal_flag ? $product->ropSeasonal() : $product->ropStandard();
            $adu = (float) $product->avg_daily_usage;
            $factor = (float) ($product->seasonal_factor ?? 1);
            $formula = $product->seasonal_flag
                ? "{$adu} × {$factor} × {$product->lead_time_days} + {$product->safety_stock} (seasonal)"
                : "{$adu} × {$product->lead_time_days} + {$product->safety_stock} (standard)";

            return [
                'sku' => $product->sku, 'productName' => $product->name, 'quantity' => $product->reorder_quantity,
                'unitCost' => (float) $product->unit_cost, 'onHand' => $stock, 'rop' => $rop, 'gap' => $rop - $stock,
                'formulaLabel' => $formula, 'alreadyPending' => $pending->has($product->sku),
                'supplierName' => $product->supplier->name, 'supplierContact' => $product->supplier->contact,
                'supplierAddress' => $product->supplier->address, 'supplierTin' => $product->supplier->tin,
                'requestedBy' => $request->user()->name,
            ];
        })->filter(fn (array $row): bool => $row['gap'] >= 0)->sortByDesc('gap')->values();
        $windows = SeasonalWindow::all()->keyBy('sku');

        return Inertia::render('Reorder/Index', [
            'rows' => $rows,
            'seasonalProducts' => $products->filter(fn (Product $p): bool => $p->seasonal_flag)->map(fn (Product $p): array => [
                'sku' => $p->sku, 'name' => $p->name, 'multiplier' => (float) ($p->seasonal_factor ?? 1),
                'window' => ['startMonth' => $windows->get($p->sku)?->start_month ?? 4, 'endMonth' => $windows->get($p->sku)?->end_month ?? 6],
                'suggestion' => $seasonal->suggestSeasonalMultiplier($p->sku),
            ])->values(),
        ]);
    }

    public function draftStore(Request $request, Product $product): RedirectResponse
    {
        $data = $request->validate(['quantity' => ['required', 'integer', 'min:1', 'max:1000000']]);
        try {
            DB::transaction(function () use ($product, $request, $data): void {
                $product = Product::whereKey($product->sku)->lockForUpdate()->firstOrFail();
                if (PendingPurchaseOrder::where('sku', $product->sku)->exists()) {
                    throw ValidationException::withMessages(['quantity' => 'A purchase order for this SKU is already pending.']);
                }
                $cents = (int) str_replace('.', '', $product->unit_cost) * (int) $data['quantity'];
                PendingPurchaseOrder::create([
                    'id' => 'PO-'.Str::ulid(), 'supplier_id' => $product->supplier_id, 'sku' => $product->sku,
                    'quantity' => $data['quantity'], 'total_cost' => intdiv($cents, 100).'.'.str_pad((string) ($cents % 100), 2, '0', STR_PAD_LEFT),
                    'requested_by' => $request->user()->id, 'requested_at' => now('UTC')->toDateString(),
                ]);
                // TODO: logAudit
            });
        } catch (UniqueConstraintViolationException $exception) {
            throw ValidationException::withMessages(['quantity' => 'A purchase order for this SKU is already pending.']);
        }

        return to_route('reorder.index');
    }

    public function updateSeasonalConfig(Request $request, Product $product): RedirectResponse
    {
        $data = $request->validate([
            'startMonth' => ['required', 'integer', 'between:1,12'],
            'endMonth' => ['required', 'integer', 'between:1,12'],
            'multiplier' => ['required', 'numeric', 'gt:0', 'max:99.99', 'decimal:0,2'],
        ]);
        DB::transaction(function () use ($product, $data): void {
            $product = Product::whereKey($product->sku)->lockForUpdate()->firstOrFail();
            if (! $product->seasonal_flag) {
                throw ValidationException::withMessages(['multiplier' => 'This product is not seasonal.']);
            }
            $product->update(['seasonal_factor' => $data['multiplier']]);
            SeasonalWindow::updateOrCreate(['sku' => $product->sku], ['start_month' => $data['startMonth'], 'end_month' => $data['endMonth']]);
            // TODO: logAudit
        });

        return to_route('reorder.index');
    }
}
