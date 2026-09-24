<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WarehouseLocation extends Model
{
    protected $fillable = ['code', 'description'];

    public function batches(): HasMany
    {
        return $this->hasMany(InventoryBatch::class, 'location_id');
    }
}

