<?php

namespace Database\Seeders;

use App\Models\CycleCount;
use Illuminate\Database\Seeder;

class CycleCountSeeder extends Seeder
{
    public function run(): void
    {
        $rows = [
            ['id' => 'CC-2201', 'sku' => 'ACU-014', 'location_id' => 1, 'system_qty' => 540, 'counted_qty' => 538, 'due_date' => '2026-08-18', 'status' => 'DONE'],
            ['id' => 'CC-2202', 'sku' => 'APU-100', 'location_id' => 2, 'system_qty' => 365, 'counted_qty' => null, 'due_date' => '2026-08-18', 'status' => 'PENDING'],
            ['id' => 'CC-2203', 'sku' => 'THM-201', 'location_id' => 3, 'system_qty' => 42, 'counted_qty' => null, 'due_date' => '2026-08-19', 'status' => 'IN_PROGRESS'],
            ['id' => 'CC-2204', 'sku' => 'FAN-050', 'location_id' => 1, 'system_qty' => 78, 'counted_qty' => 74, 'due_date' => '2026-08-17', 'status' => 'DONE'],
            ['id' => 'CC-2205', 'sku' => 'SEN-011', 'location_id' => 3, 'system_qty' => 52, 'counted_qty' => null, 'due_date' => '2026-08-20', 'status' => 'PENDING'],
        ];
        foreach ($rows as $row) {
            CycleCount::firstOrCreate(['id' => $row['id']], $row);
        }
    }
}
