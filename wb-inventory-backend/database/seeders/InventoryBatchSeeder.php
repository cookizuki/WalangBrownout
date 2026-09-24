<?php

namespace Database\Seeders;

use App\Models\InventoryBatch;
use Illuminate\Database\Seeder;

class InventoryBatchSeeder extends Seeder
{
    public function run(): void
    {
        // Exact seed data from inventory-data.ts → batches array.
        // locationId maps to the IDs seeded by WarehouseLocationSeeder.
        $rows = [
            [
                'id'                  => 'B-1101',
                'sku'                 => 'ACU-014',
                'location_id'         => 1,
                'quantity_received'   => 400,
                'quantity_remaining'  => 340,
                'date_received'       => '2026-06-10',
                'expiration_date'     => null,
            ],
            [
                'id'                  => 'B-1120',
                'sku'                 => 'ACU-014',
                'location_id'         => 1,
                'quantity_received'   => 200,
                'quantity_remaining'  => 200,
                'date_received'       => '2026-07-01',
                'expiration_date'     => null,
            ],
            [
                'id'                  => 'B-1055',
                'sku'                 => 'APU-100',
                'location_id'         => 2,
                'quantity_received'   => 180,
                'quantity_remaining'  => 145,
                'date_received'       => '2026-03-22',
                'expiration_date'     => '2026-12-22',
            ],
            [
                'id'                  => 'B-1078',
                'sku'                 => 'APU-100',
                'location_id'         => 2,
                'quantity_received'   => 220,
                'quantity_remaining'  => 220,
                'date_received'       => '2026-05-14',
                'expiration_date'     => '2027-02-14',
            ],
            [
                'id'                  => 'B-1090',
                'sku'                 => 'THM-201',
                'location_id'         => 3,
                'quantity_received'   => 80,
                'quantity_remaining'  => 42,
                'date_received'       => '2026-06-05',
                'expiration_date'     => null,
            ],
            [
                'id'                  => 'B-1122',
                'sku'                 => 'FAN-050',
                'location_id'         => 1,
                'quantity_received'   => 120,
                'quantity_remaining'  => 78,
                'date_received'       => '2026-06-28',
                'expiration_date'     => null,
            ],
            [
                'id'                  => 'B-1130',
                'sku'                 => 'SEN-011',
                'location_id'         => 3,
                'quantity_received'   => 60,
                'quantity_remaining'  => 52,
                'date_received'       => '2026-07-08',
                'expiration_date'     => null,
            ],
        ];

        foreach ($rows as $row) {
            InventoryBatch::updateOrCreate(['id' => $row['id']], $row);
        }
    }
}

