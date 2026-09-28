<?php

namespace App\Services;

use App\Models\InventoryBatch;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\ReceivingLine;
use App\Models\WarehouseLocation;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PurchaseOrderReceivingService
{
    public function createMissing(PurchaseOrder $order): ?ReceivingLine
    {
        return DB::transaction(function () use ($order): ?ReceivingLine {
            Product::whereKey($order->sku)->lockForUpdate()->firstOrFail();
            $order = PurchaseOrder::lockForUpdate()->findOrFail($order->id);
            if (ReceivingLine::where('po_number', $order->id)->exists()) {
                return null;
            }
            $locationId = InventoryBatch::where('sku', $order->sku)
                ->orderByDesc('date_received')->orderByDesc('id')->value('location_id')
                ?? WarehouseLocation::orderBy('id')->value('id');
            if ($locationId === null) {
                throw ValidationException::withMessages(['decision' => 'Create a warehouse location before creating the receiving line.']);
            }

            return ReceivingLine::create([
                'id' => 'RC-'.Str::ulid(), 'po_number' => $order->id,
                'sku' => $order->sku, 'supplier_id' => $order->supplier_id,
                'quantity_ordered' => $order->quantity, 'quantity_received' => 0,
                'location_id' => $locationId, 'status' => 'IN_TRANSIT',
                'expected_date' => today()->addDays(max(0, $order->product->lead_time_days ?? 0)),
                'received_date' => null,
            ]);
        });
    }
}
