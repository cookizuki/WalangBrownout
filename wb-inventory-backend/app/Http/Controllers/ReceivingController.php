<?php

namespace App\Http\Controllers;

use App\Models\InventoryBatch;
use App\Models\ReceivingLine;
use App\Models\TransactionLog;
use App\Models\WarehouseLocation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ReceivingController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('Receiving/Index', [
            'receivingLines' => ReceivingLine::with(['product', 'supplier', 'location'])->orderByDesc('id')->get()->map(fn (ReceivingLine $line): array => [
                'id' => $line->id, 'poNumber' => $line->po_number, 'sku' => $line->sku,
                'productName' => $line->product->name, 'supplierName' => $line->supplier->name,
                'quantityOrdered' => $line->quantity_ordered, 'quantityReceived' => $line->quantity_received,
                'expectedDate' => $line->expected_date->toDateString(), 'receivedDate' => $line->received_date?->toDateString(),
                'locationCode' => $line->location->code, 'status' => $line->status,
            ]),
            'locations' => WarehouseLocation::withCount('batches')->withSum('batches', 'quantity_remaining')->orderBy('id')->get()->map(fn (WarehouseLocation $location): array => [
                'id' => $location->id, 'code' => $location->code, 'description' => $location->description,
                'lotCount' => $location->batches_count, 'quantity' => (int) $location->batches_sum_quantity_remaining,
            ]),
            'receivedBatch' => $request->session()->get('receivedBatch'),
        ]);
    }

    public function receive(Request $request, ReceivingLine $line): RedirectResponse
    {
        $data = $request->validate(['quantity' => ['required', 'integer', 'min:1', 'max:2147483647'], 'expiration_date' => ['required', 'date_format:Y-m-d']]);
        $batch = DB::transaction(function () use ($line, $request, $data): InventoryBatch {
            $line = ReceivingLine::lockForUpdate()->findOrFail($line->id);
            $remaining = $line->quantity_ordered - $line->quantity_received;
            if ($line->status === 'PUT_AWAY' || $data['quantity'] > $remaining) {
                throw ValidationException::withMessages(['quantity' => "Quantity received cannot exceed the remaining quantity of {$remaining} units."]);
            }
            $today = now('UTC')->toDateString();
            $batch = InventoryBatch::create([
                'id' => 'B-'.Str::ulid(), 'sku' => $line->sku, 'location_id' => $line->location_id,
                'quantity_received' => $data['quantity'], 'quantity_remaining' => $data['quantity'],
                'date_received' => $today, 'expiration_date' => $data['expiration_date'],
            ]);
            $received = $line->quantity_received + $data['quantity'];
            $complete = $received === $line->quantity_ordered;
            $line->update(['quantity_received' => $received, 'status' => $complete ? 'PUT_AWAY' : 'ARRIVED', 'received_date' => $complete ? $today : $line->received_date]);
            TransactionLog::create([
                'id' => 'T-'.Str::ulid(), 'batch_id' => $batch->id, 'sku' => $line->sku,
                'user_id' => $request->user()->id, 'type' => 'RECEIPT', 'quantity_delta' => $data['quantity'],
                'channel' => 'WAREHOUSE', 'timestamp' => now(),
            ]);

            return $batch;
        });

        return to_route('receiving.index')->with('receivedBatch', [
            'batchId' => $batch->id, 'sku' => $batch->sku, 'productName' => $batch->product->name,
            'quantity' => $batch->quantity_received, 'dateReceived' => $batch->date_received->toDateString(),
            'expirationDate' => $batch->expiration_date->toDateString(),
        ]);
    }
}
