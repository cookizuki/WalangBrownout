<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        // Exact seed data from inventory-data.ts → categories array
        $rows = [
            ['id' => 1, 'name' => 'Cooling',     'description' => 'Portable AC & fans'],
            ['id' => 2, 'name' => 'Air Quality',  'description' => 'Purifiers & filters'],
            ['id' => 3, 'name' => 'Smart Home',   'description' => 'Thermostats & sensors'],
        ];

        foreach ($rows as $row) {
            Category::updateOrCreate(['id' => $row['id']], $row);
        }
    }
}

