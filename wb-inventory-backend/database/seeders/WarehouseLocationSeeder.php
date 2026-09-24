<?php

namespace Database\Seeders;

use App\Models\WarehouseLocation;
use Illuminate\Database\Seeder;

class WarehouseLocationSeeder extends Seeder
{
    public function run(): void
    {
        // Exact seed data from inventory-data.ts → locations array
        $rows = [
            ['id' => 1, 'code' => 'A-01', 'description' => 'Zone A · Aisle 01 · Cooling'],
            ['id' => 2, 'code' => 'B-03', 'description' => 'Zone B · Aisle 03 · Filters'],
            ['id' => 3, 'code' => 'C-02', 'description' => 'Zone C · Aisle 02 · Smart Home'],
        ];

        foreach ($rows as $row) {
            WarehouseLocation::updateOrCreate(['id' => $row['id']], $row);
        }
    }
}

