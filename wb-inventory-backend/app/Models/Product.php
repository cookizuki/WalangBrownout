<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    /**
     * SKU is the natural primary key — not an auto-increment integer.
     * Mirrors how the TS model treats every reference (batch.sku, txLog.sku, etc.).
     */
    protected $primaryKey = 'sku';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'sku',
        'name',
        'category_id',
        'supplier_id',
        'unit_cost',
        'reorder_point',
        'reorder_quantity',
        'lead_time_days',
        'seasonal_flag',
        'is_fifo_critical',
        'abc',
        'avg_daily_usage',
        'seasonal_factor',
        'safety_stock',
    ];

    protected $casts = [
        'unit_cost'       => 'decimal:2',
        'avg_daily_usage' => 'decimal:2',
        'seasonal_factor' => 'decimal:2',
        'seasonal_flag'   => 'boolean',
        'is_fifo_critical'=> 'boolean',
    ];

    // -----------------------------------------------------------------------
    // Relationships
    // -----------------------------------------------------------------------

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function batches(): HasMany
    {
        return $this->hasMany(InventoryBatch::class, 'sku', 'sku');
    }

    public function transactionLogs(): HasMany
    {
        return $this->hasMany(TransactionLog::class, 'sku', 'sku');
    }

    // -----------------------------------------------------------------------
    // Derived helpers — ported from inventory-data.ts
    // -----------------------------------------------------------------------

    /**
     * Sum of quantity_remaining across all batches for this product.
     * Mirrors onHand(sku) in inventory-data.ts.
     */
    public function onHand(): int
    {
        return (int) $this->batches()->sum('quantity_remaining');
    }

    /**
     * Non-seasonal Reorder Point = (Avg Daily Usage × Lead Time Days) + Safety Stock.
     * Mirrors ropStandard(p) in inventory-data.ts.
     */
    public function ropStandard(): float
    {
        return (float) $this->avg_daily_usage * $this->lead_time_days + $this->safety_stock;
    }

    /**
     * Seasonal Reorder Point = round(Avg Daily Usage × Seasonal Factor × Lead Time Days + Safety Stock).
     * Mirrors ropSeasonal(p) in inventory-data.ts (seasonalFactor defaults to 1 when absent).
     */
    public function ropSeasonal(): int
    {
        $factor = $this->seasonal_factor ?? 1.0;
        return (int) round((float) $this->avg_daily_usage * $factor * $this->lead_time_days + $this->safety_stock);
    }
}

