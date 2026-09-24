<?php

namespace Database\Seeders;

use App\Models\Product;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        // Exact seed data from inventory-data.ts → products array.
        // categoryId/supplierId map directly to the IDs seeded by CategorySeeder/SupplierSeeder.
        $rows = [
            [
                'sku'               => 'ACU-014',
                'name'              => 'Portable AC Unit 1.5HP',
                'category_id'       => 1,
                'supplier_id'       => 1,
                'unit_cost'         => 18500.00,
                'reorder_point'     => 520,
                'reorder_quantity'  => 300,
                'lead_time_days'    => 14,
                'seasonal_flag'     => true,
                'is_fifo_critical'  => false,
                'abc'               => 'A',
                'avg_daily_usage'   => 10.00,
                'seasonal_factor'   => 3.00,
                'safety_stock'      => 100,
            ],
            [
                'sku'               => 'APU-100',
                'name'              => 'Air Purifier Carbon Filter',
                'category_id'       => 2,
                'supplier_id'       => 2,
                'unit_cost'         => 1250.00,
                'reorder_point'     => 80,
                'reorder_quantity'  => 200,
                'lead_time_days'    => 7,
                'seasonal_flag'     => false,
                'is_fifo_critical'  => true,
                'abc'               => 'B',
                'avg_daily_usage'   => 6.00,
                'seasonal_factor'   => null,
                'safety_stock'      => 30,
            ],
            [
                'sku'               => 'THM-201',
                'name'              => 'Smart Thermostat Gen 3',
                'category_id'       => 3,
                'supplier_id'       => 3,
                'unit_cost'         => 4800.00,
                'reorder_point'     => 55,
                'reorder_quantity'  => 60,
                'lead_time_days'    => 10,
                'seasonal_flag'     => false,
                'is_fifo_critical'  => false,
                'abc'               => 'A',
                'avg_daily_usage'   => 4.00,
                'seasonal_factor'   => null,
                'safety_stock'      => 15,
            ],
            [
                'sku'               => 'FAN-050',
                'name'              => 'Tower Fan Silent',
                'category_id'       => 1,
                'supplier_id'       => 1,
                'unit_cost'         => 3200.00,
                'reorder_point'     => 40,
                'reorder_quantity'  => 80,
                'lead_time_days'    => 5,
                'seasonal_flag'     => true,
                'is_fifo_critical'  => false,
                'abc'               => 'B',
                'avg_daily_usage'   => 3.00,
                'seasonal_factor'   => 2.20,
                'safety_stock'      => 25,
            ],
            [
                'sku'               => 'SEN-011',
                'name'              => 'Room Humidity Sensor',
                'category_id'       => 3,
                'supplier_id'       => 3,
                'unit_cost'         => 780.00,
                'reorder_point'     => 25,
                'reorder_quantity'  => 50,
                'lead_time_days'    => 6,
                'seasonal_flag'     => false,
                'is_fifo_critical'  => false,
                'abc'               => 'C',
                'avg_daily_usage'   => 1.00,
                'seasonal_factor'   => null,
                'safety_stock'      => 10,
            ],
        ];

        foreach ($rows as $row) {
            Product::updateOrCreate(['sku' => $row['sku']], $row);
        }
    }
}

