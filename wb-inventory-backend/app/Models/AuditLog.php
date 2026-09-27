<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false;

    protected $fillable = ['id', 'user_id', 'user_name', 'action', 'target', 'timestamp'];

    protected function casts(): array
    {
        return ['timestamp' => 'datetime'];
    }
}
