<?php

namespace Database\Seeders;

use App\Models\PurchaseOrder;
use Illuminate\Database\Seeder;

class PurchaseOrderSeeder extends Seeder
{
    public function run(): void
    {
        foreach ([
            ['id' => 'PO-3320', 'supplier_id' => 1, 'sku' => 'ACU-014', 'quantity' => 300, 'unit_cost' => 18500, 'status' => 'SUBMITTED', 'created_at' => '2026-08-12 09:00:00'],
            ['id' => 'PO-3321', 'supplier_id' => 2, 'sku' => 'APU-100', 'quantity' => 200, 'unit_cost' => 1250, 'status' => 'RECEIVED', 'created_at' => '2026-08-08 14:30:00'],
            ['id' => 'PO-3322', 'supplier_id' => 3, 'sku' => 'THM-201', 'quantity' => 60, 'unit_cost' => 4800, 'status' => 'APPROVED', 'created_at' => '2026-08-15 11:10:00'],
        ] as $row) {
            PurchaseOrder::firstOrCreate(['id' => $row['id']], $row);
        }
    }
}
