<?php

namespace Database\Seeders;

use App\Models\PickTask;
use Illuminate\Database\Seeder;

class PickTaskSeeder extends Seeder
{
    public function run(): void
    {
        $rows = [
            ['id' => 'PK-4401', 'sku' => 'ACU-014', 'batch_id' => 'B-1101', 'location_id' => 1, 'quantity' => 6, 'order_ref' => 'SO-20881', 'priority' => 'HIGH', 'status' => 'PENDING', 'assigned_to' => 'Warehouse Staff'],
            ['id' => 'PK-4402', 'sku' => 'APU-100', 'batch_id' => 'B-1055', 'location_id' => 2, 'quantity' => 12, 'order_ref' => 'SO-20884', 'priority' => 'HIGH', 'status' => 'IN_PROGRESS', 'assigned_to' => 'Warehouse Staff'],
            ['id' => 'PK-4403', 'sku' => 'THM-201', 'batch_id' => 'B-1090', 'location_id' => 3, 'quantity' => 3, 'order_ref' => 'SO-20887', 'priority' => 'NORMAL', 'status' => 'PENDING', 'assigned_to' => 'Warehouse Staff'],
            ['id' => 'PK-4404', 'sku' => 'FAN-050', 'batch_id' => 'B-1122', 'location_id' => 1, 'quantity' => 8, 'order_ref' => 'SO-20890', 'priority' => 'LOW', 'status' => 'PENDING', 'assigned_to' => 'Warehouse Staff'],
            ['id' => 'PK-4405', 'sku' => 'SEN-011', 'batch_id' => 'B-1130', 'location_id' => 3, 'quantity' => 4, 'order_ref' => 'SO-20891', 'priority' => 'NORMAL', 'status' => 'DONE', 'assigned_to' => 'Warehouse Staff'],
        ];
        foreach ($rows as $row) {
            PickTask::firstOrCreate(['id' => $row['id']], $row);
        }
    }
}
