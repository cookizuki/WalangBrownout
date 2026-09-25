<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SeasonalWindow extends Model
{
    protected $primaryKey = 'sku';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['sku', 'start_month', 'end_month'];

    protected $casts = ['start_month' => 'integer', 'end_month' => 'integer'];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'sku', 'sku');
    }
}
