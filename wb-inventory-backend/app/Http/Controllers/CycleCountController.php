<?php

namespace App\Http\Controllers;

use App\Enums\Role;
use App\Models\CycleCount;
use App\Models\InventoryBatch;
use App\Models\Product;
use App\Models\TransactionLog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class CycleCountController extends Controller
{
    public function index(Request $request): Response
    {
        $review = $request->user()->hasRole(Role::INVENTORY_STAFF);
        $counts = CycleCount::with(['product', 'location'])->orderByDesc('due_date')->orderBy('id')->get();

        return Inertia::render('StockCounts/Index', [
            'mode' => $review ? 'review' : 'entry',
            'counts' => $counts->map(fn (CycleCount $count): array => [
                'id' => $count->id, 'sku' => $count->sku, 'productName' => $count->product->name,
                'locationId' => $count->location_id, 'locationCode' => $count->location->code,
                'systemQty' => $count->system_qty, 'countedQty' => $count->counted_qty,
                'dueDate' => $count->due_date->toDateString(), 'status' => $count->status,
            ]),
            'transactions' => $review ? TransactionLog::whereIn('sku', $counts->pluck('sku')->unique())->orderByDesc('timestamp')->orderByDesc('id')->get()->map(fn (TransactionLog $tx): array => [
                'id' => $tx->id, 'sku' => $tx->sku, 'batchId' => $tx->batch_id, 'type' => $tx->type,
                'quantityDelta' => $tx->quantity_delta, 'timestamp' => $tx->timestamp->toISOString(),
            ]) : [],
        ]);
    }

    public function submit(Request $request, CycleCount $count): RedirectResponse
    {
        $data = $request->validate(['counted_qty' => ['required', 'integer', 'min:0', 'max:2147483647']]);
        DB::transaction(function () use ($count, $data, $request): void {
            Product::whereKey($count->sku)->lockForUpdate()->firstOrFail();
            $count = CycleCount::lockForUpdate()->findOrFail($count->id);
            if ($count->counted_qty !== null || $count->status === 'DONE') {
                throw ValidationException::withMessages(['counted_qty' => 'This count is already submitted. Request a recount to enter a correction.']);
            }
            $quantity = (int) $data['counted_qty'];
            $variance = $quantity - $count->system_qty;
            if ($variance !== 0) {
                $batch = InventoryBatch::where('sku', $count->sku)->where('location_id', $count->location_id)->orderBy('id')->lockForUpdate()->first();
                if ($batch) {
                    $remaining = max(0, $batch->quantity_remaining + $variance);
                    if ($remaining > 2147483647) {
                        throw ValidationException::withMessages(['counted_qty' => 'The resulting quantity exceeds the stock limit.']);
                    }
                    $batch->update(['quantity_remaining' => $remaining]);
                    TransactionLog::create(['id' => 'T-'.Str::ulid(), 'batch_id' => $batch->id, 'sku' => $count->sku,
                        'user_id' => $request->user()->id, 'type' => 'ADJUSTMENT', 'quantity_delta' => $variance,
                        'channel' => 'WAREHOUSE', 'timestamp' => now()]);
                }
            }
            $count->update(['counted_qty' => $quantity, 'status' => 'DONE']);
        }, 3);

        return to_route('counts.index');
    }

    public function recount(Request $request, CycleCount $count): RedirectResponse
    {
        DB::transaction(function () use ($request, $count): void {
            $count = CycleCount::lockForUpdate()->findOrFail($count->id);
            $review = $request->user()->hasRole(Role::INVENTORY_STAFF);
            $eligible = $review ? $count->counted_qty !== null && $count->counted_qty !== $count->system_qty : $count->status === 'DONE';
            if (! $eligible) {
                throw ValidationException::withMessages(['recount' => $review ? 'Only counts with a variance can be recounted in review mode.' : 'Only completed counts can be recounted.']);
            }
            $sequence = 1;
            do {
                $id = $count->id.'-R'.$sequence++;
            } while (CycleCount::whereKey($id)->exists());
            if (strlen($id) > 255) {
                throw ValidationException::withMessages(['recount' => 'The recount reference has reached its maximum length.']);
            }
            CycleCount::create(['id' => $id, 'sku' => $count->sku, 'location_id' => $count->location_id,
                'system_qty' => $count->system_qty, 'counted_qty' => null, 'due_date' => now('UTC')->toDateString(), 'status' => 'PENDING']);
        }, 3);

        return to_route('counts.index');
    }
}
