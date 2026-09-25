<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Supplier extends Model
{
    protected $fillable = [
        'name',
        'contact',
        'contact_role',
        'email',
        'phone',
        'address',
        'landline',
        'tin',
    ];

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }
}
