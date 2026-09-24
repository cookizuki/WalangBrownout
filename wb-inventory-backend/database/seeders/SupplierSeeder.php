<?php

namespace Database\Seeders;

use App\Models\Supplier;
use Illuminate\Database\Seeder;

class SupplierSeeder extends Seeder
{
    public function run(): void
    {
        // Exact seed data from inventory-data.ts → suppliers array
        $rows = [
            [
                'id'           => 1,
                'name'         => 'CoolAir Distributors PH',
                'contact'      => 'Ana Reyes',
                'contact_role' => 'Sales Manager',
                'address'      => '123 Industrial Ave, Cabuyao, Laguna',
                'landline'     => '(049) 123-4567',
                'tin'          => '123-456-789-000',
            ],
            [
                'id'           => 2,
                'name'         => 'PureBreathe Filters Co.',
                'contact'      => 'Miguel Santos',
                'contact_role' => 'Account Executive',
                'address'      => '45 Filter St, Santa Rosa, Laguna',
                'landline'     => '(049) 234-5678',
                'tin'          => '234-567-890-000',
            ],
            [
                'id'           => 3,
                'name'         => 'SmartHome Imports',
                'contact'      => 'Jenny Cruz',
                'contact_role' => 'Purchasing Liaison',
                'address'      => '78 Smart Blvd, Biñan, Laguna',
                'landline'     => '(049) 345-6789',
                'tin'          => '345-678-901-000',
            ],
        ];

        foreach ($rows as $row) {
            Supplier::updateOrCreate(['id' => $row['id']], $row);
        }
    }
}

