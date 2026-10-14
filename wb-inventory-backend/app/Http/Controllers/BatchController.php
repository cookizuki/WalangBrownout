<?php

namespace App\Http\Controllers;

use App\Enums\Role;
use App\Http\Requests\BatchAdjustmentRequest;
use App\Models\AuditLog;
use App\Models\InventoryBatch;
use App\Models\Product;
use App\Models\TransactionLog;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class BatchController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->validate(['q' => ['nullable', 'string', 'max:255']]);
        $query = $filters['q'] ?? '';
        $needle = mb_strtolower($query);
        $now = CarbonImmutable::now()->getTimestamp();

        $matchingSkus = $needle === '' ? [] : Product::get(['sku', 'name'])
            ->filter(fn (Product $product): bool => str_contains(mb_strtolower($product->sku), $needle)
                || str_contains(mb_strtolower($product->name), $needle))->pluck('sku');
        $page = InventoryBatch::query()->with('location')->select('inventory_batches.*')
            ->selectRaw('CASE WHEN quantity_remaining > 0 THEN SUM(CASE WHEN quantity_remaining > 0 THEN 1 ELSE 0 END) OVER (PARTITION BY sku ORDER BY date_received, id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) ELSE NULL END AS pick_order')
            ->when($needle !== '', fn ($builder) => $builder->whereIn('sku', $matchingSkus))
            ->orderBy('sku')->orderBy('date_received')->orderBy('id')->simplePaginate(50)->withQueryString();
        $batches = $page->getCollection()->map(function (InventoryBatch $batch) use ($now): array {
            $expiry = $batch->expiration_date?->toDateString();

            return [
                'id' => $batch->id,
                'sku' => $batch->sku,
                'locationCode' => $batch->location->code,
                'quantityRemaining' => $batch->quantity_remaining,
                'dateReceived' => $batch->date_received->toDateString(),
                'expirationDate' => $expiry,
                'daysLeft' => $expiry === null ? null : (int) ceil((CarbonImmutable::parse($expiry)->getTimestamp() - $now) / 86400),
                'pickOrder' => $batch->pick_order === null ? null : (int) $batch->pick_order,
            ];
        })->values();

        return Inertia::render('Batches/Index', [
            'batches' => $batches,
            'filters' => ['q' => $query],
            'canAdjust' => $request->user()->hasRole(Role::ADMIN, Role::WAREHOUSE_STAFF),
            'pagination' => ['page' => $page->currentPage(), 'previous' => $page->previousPageUrl(), 'next' => $page->nextPageUrl()],
        ]);
    }

    public function reportAdjustment(BatchAdjustmentRequest $request, InventoryBatch $batch): RedirectResponse
    {
        $data = $request->validated();
        $quantity = (int) $data['quantity'];
        $delta = $data['reason'] === 'CORRECTION' ? $quantity : -abs($quantity);

        DB::transaction(function () use ($batch, $request, $data, $delta): void {
            Product::whereKey($batch->sku)->lockForUpdate()->firstOrFail();
            $lockedBatch = InventoryBatch::query()->lockForUpdate()->findOrFail($batch->id);
            $remaining = $lockedBatch->quantity_remaining + $delta;
            if ($remaining < 0) {
                throw ValidationException::withMessages(['quantity' => 'The reduction exceeds the remaining stock.']);
            }
            if ($remaining > 2147483647) {
                throw ValidationException::withMessages(['quantity' => 'The resulting quantity exceeds the stock limit.']);
            }
            $lockedBatch->update(['quantity_remaining' => $remaining]);
            TransactionLog::create([
                'id' => 'T-'.Str::ulid(),
                'batch_id' => $lockedBatch->id,
                'sku' => $lockedBatch->sku,
                'user_id' => $request->user()->id,
                'type' => 'ADJUSTMENT',
                'quantity_delta' => $delta,
                'channel' => 'WAREHOUSE',
                'note' => $data['notes'] ?? null,
                'timestamp' => now(),
            ]);
            AuditLog::create([
                'id' => 'AU-'.Str::ulid(),
                'user_id' => $request->user()->id,
                'user_name' => $request->user()->name,
                'action' => 'Reported adjustment',
                'target' => "Batch: {$lockedBatch->id}",
                'timestamp' => now(),
            ]);
        });

        return back();
    }
}
