<?php

namespace Database\Seeders;

use App\Models\ReceivingLine;
use Illuminate\Database\Seeder;

class ReceivingLineSeeder extends Seeder
{
    public function run(): void
    {
        $rows = [
            ['id' => 'RC-7701', 'po_number' => 'PO-3320', 'sku' => 'ACU-014', 'supplier_id' => 1, 'quantity_ordered' => 300, 'quantity_received' => 0, 'expected_date' => '2026-08-19', 'location_id' => 1, 'status' => 'IN_TRANSIT'],
            ['id' => 'RC-7702', 'po_number' => 'PO-3321', 'sku' => 'APU-100', 'supplier_id' => 2, 'quantity_ordered' => 200, 'quantity_received' => 200, 'expected_date' => '2026-08-17', 'location_id' => 2, 'status' => 'ARRIVED'],
            ['id' => 'RC-7703', 'po_number' => 'PO-3318', 'sku' => 'FAN-050', 'supplier_id' => 1, 'quantity_ordered' => 80, 'quantity_received' => 80, 'expected_date' => '2026-08-14', 'location_id' => 1, 'status' => 'PUT_AWAY', 'received_date' => '2026-08-15'],
            ['id' => 'RC-7704', 'po_number' => 'PO-3322', 'sku' => 'THM-201', 'supplier_id' => 3, 'quantity_ordered' => 60, 'quantity_received' => 0, 'expected_date' => '2026-08-22', 'location_id' => 3, 'status' => 'IN_TRANSIT'],
            ['id' => 'RC-7690', 'po_number' => 'PO-3305', 'sku' => 'ACU-014', 'supplier_id' => 1, 'quantity_ordered' => 200, 'quantity_received' => 200, 'expected_date' => '2026-06-10', 'location_id' => 1, 'status' => 'PUT_AWAY', 'received_date' => '2026-06-10'],
            ['id' => 'RC-7695', 'po_number' => 'PO-3310', 'sku' => 'ACU-014', 'supplier_id' => 1, 'quantity_ordered' => 150, 'quantity_received' => 150, 'expected_date' => '2026-07-01', 'location_id' => 1, 'status' => 'PUT_AWAY', 'received_date' => '2026-07-05'],
            ['id' => 'RC-7685', 'po_number' => 'PO-3300', 'sku' => 'APU-100', 'supplier_id' => 2, 'quantity_ordered' => 180, 'quantity_received' => 180, 'expected_date' => '2026-05-20', 'location_id' => 2, 'status' => 'PUT_AWAY', 'received_date' => '2026-05-19'],
            ['id' => 'RC-7688', 'po_number' => 'PO-3303', 'sku' => 'APU-100', 'supplier_id' => 2, 'quantity_ordered' => 220, 'quantity_received' => 220, 'expected_date' => '2026-06-25', 'location_id' => 2, 'status' => 'PUT_AWAY', 'received_date' => '2026-06-24'],
            ['id' => 'RC-7692', 'po_number' => 'PO-3308', 'sku' => 'THM-201', 'supplier_id' => 3, 'quantity_ordered' => 80, 'quantity_received' => 80, 'expected_date' => '2026-06-01', 'location_id' => 3, 'status' => 'PUT_AWAY', 'received_date' => '2026-06-08'],
            ['id' => 'RC-7696', 'po_number' => 'PO-3312', 'sku' => 'SEN-011', 'supplier_id' => 3, 'quantity_ordered' => 60, 'quantity_received' => 60, 'expected_date' => '2026-07-10', 'location_id' => 3, 'status' => 'PUT_AWAY', 'received_date' => '2026-07-09'],
        ];
        foreach ($rows as $row) {
            ReceivingLine::firstOrCreate(['id' => $row['id']], $row);
        }
    }
}
