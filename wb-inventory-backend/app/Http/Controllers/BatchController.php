<?php

namespace App\Http\Controllers;

use App\Enums\Role;
use App\Http\Requests\BatchAdjustmentRequest;
use App\Models\InventoryBatch;
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
        $pickOrders = [];
        $now = CarbonImmutable::now('UTC')->getTimestamp();

        $batches = InventoryBatch::query()->with(['product', 'location'])
            ->orderBy('sku')->orderBy('date_received')->orderBy('id')->get()
            ->filter(fn (InventoryBatch $batch): bool => $needle === ''
                || str_contains(mb_strtolower($batch->sku), $needle)
                || str_contains(mb_strtolower($batch->product->name), $needle))
            ->map(function (InventoryBatch $batch) use (&$pickOrders, $now): array {
                $pickOrder = null;
                if ($batch->quantity_remaining > 0) {
                    $pickOrder = ($pickOrders[$batch->sku] ?? 0) + 1;
                    $pickOrders[$batch->sku] = $pickOrder;
                }
                $expiry = $batch->expiration_date?->toDateString();

                return [
                    'id' => $batch->id,
                    'sku' => $batch->sku,
                    'locationCode' => $batch->location->code,
                    'quantityRemaining' => $batch->quantity_remaining,
                    'dateReceived' => $batch->date_received->toDateString(),
                    'expirationDate' => $expiry,
                    'daysLeft' => $expiry === null ? null : (int) ceil((CarbonImmutable::parse($expiry, 'UTC')->getTimestamp() - $now) / 86400),
                    'pickOrder' => $pickOrder,
                ];
            })->values();

        return Inertia::render('Batches/Index', [
            'batches' => $batches,
            'filters' => ['q' => $query],
            'canAdjust' => $request->user()->hasRole(Role::ADMIN, Role::WAREHOUSE_STAFF),
        ]);
    }

    public function reportAdjustment(BatchAdjustmentRequest $request, InventoryBatch $batch): RedirectResponse
    {
        $data = $request->validated();
        $quantity = (int) $data['quantity'];
        $delta = $data['reason'] === 'CORRECTION' ? $quantity : -abs($quantity);

        DB::transaction(function () use ($batch, $request, $data, $delta): void {
            $lockedBatch = InventoryBatch::query()->lockForUpdate()->findOrFail($batch->id);
            $remaining = max(0, $lockedBatch->quantity_remaining + $delta);
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
            // TODO: logAudit
        });

        return back();
    }
}
