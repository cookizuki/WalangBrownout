<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PickTask extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false;

    protected $fillable = ['id', 'sku', 'batch_id', 'location_id', 'quantity', 'order_ref', 'priority', 'status', 'assigned_to'];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'sku', 'sku');
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(InventoryBatch::class, 'batch_id');
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(WarehouseLocation::class, 'location_id');
    }

    public function toQueueArray(): array
    {
        return ['id' => $this->id, 'sku' => $this->sku, 'productName' => $this->product->name,
            'batchId' => $this->batch_id, 'locationId' => $this->location_id, 'locationCode' => $this->location->code,
            'quantity' => $this->quantity, 'orderRef' => $this->order_ref, 'priority' => $this->priority,
            'status' => $this->status, 'assignedTo' => $this->assigned_to];
    }
}
