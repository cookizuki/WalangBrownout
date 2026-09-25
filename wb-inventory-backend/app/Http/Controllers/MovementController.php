<?php

namespace App\Http\Controllers;

use App\Models\InventoryBatch;
use App\Models\Product;
use App\Models\TransactionLog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class MovementController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'batch_id' => ['required', 'string', 'exists:inventory_batches,id'], 'type' => ['required', 'in:RETURN,TRANSFER,WRITE_OFF'],
            'quantity' => ['required', 'integer', 'min:1', 'max:2147483647'],
            'to_location_id' => ['exclude_unless:type,TRANSFER', 'required', 'integer', 'exists:warehouse_locations,id'],
        ]);
        DB::transaction(function () use ($request, $data): void {
            $batch = InventoryBatch::findOrFail($data['batch_id']);
            Product::whereKey($batch->sku)->lockForUpdate()->firstOrFail();
            $batch = InventoryBatch::lockForUpdate()->findOrFail($batch->id);
            $quantity = (int) $data['quantity'];
            if ($data['type'] !== 'RETURN' && $quantity > $batch->quantity_remaining) {
                throw ValidationException::withMessages(['quantity' => 'Quantity cannot exceed the available stock.']);
            }
            $delta = match ($data['type']) {
                'RETURN' => $quantity, 'WRITE_OFF' => -$quantity, default => 0
            };
            if ($batch->quantity_remaining + $delta > 2147483647) {
                throw ValidationException::withMessages(['quantity' => 'The resulting quantity exceeds the stock limit.']);
            }
            $batch->update($data['type'] === 'TRANSFER' ? ['location_id' => $data['to_location_id']] : ['quantity_remaining' => $batch->quantity_remaining + $delta]);
            TransactionLog::create(['id' => 'T-'.Str::ulid(), 'batch_id' => $batch->id, 'sku' => $batch->sku, 'user_id' => $request->user()->id,
                'type' => $data['type'], 'quantity_delta' => $delta, 'channel' => 'WAREHOUSE', 'timestamp' => now()]);
        }, 3);

        return back();
    }
}
