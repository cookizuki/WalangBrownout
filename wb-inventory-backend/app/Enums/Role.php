<?php

namespace App\Enums;

enum Role: string
{
    case ADMIN            = 'ADMIN';
    case INVENTORY_STAFF  = 'INVENTORY_STAFF';
    case WAREHOUSE_STAFF  = 'WAREHOUSE_STAFF';

    public function label(): string
    {
        return match ($this) {
            Role::ADMIN           => 'Administrator / Manager',
            Role::INVENTORY_STAFF => 'Inventory Staff',
            Role::WAREHOUSE_STAFF => 'Warehouse Staff',
        };
    }
}

