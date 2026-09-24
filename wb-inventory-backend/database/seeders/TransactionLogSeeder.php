<?php

namespace Database\Seeders;

use App\Models\TransactionLog;
use App\Models\User;
use Illuminate\Database\Seeder;

class TransactionLogSeeder extends Seeder
{
    public function run(): void
    {
        // Resolve userId → actual DB user IDs by name.
        // TS prototype numbered users 1-4 (Kim, Nick, Lizle, Nhimfa);
        // we look them up from the users table seeded by DemoUserSeeder.
        $userMap = [
            1 => User::where('name', 'Kim Maturan')->value('id'),
            2 => User::where('name', 'Nick Merilles')->value('id'),
            3 => User::where('name', 'Lizle Ocariza')->value('id'),
            4 => User::where('name', 'Nhimfa Pacao')->value('id'),
        ];

        // Exact seed data from inventory-data.ts → transactions array.
        // userId values (1-4) are mapped to real user IDs via $userMap above.
        $rows = [
            [
                'id'             => 'T-9001',
                'batch_id'       => 'B-1090',
                'sku'            => 'THM-201',
                'user_id'        => $userMap[2],  // Nick Merilles
                'type'           => 'SALE',
                'quantity_delta' => -2,
                'channel'        => 'ONLINE',
                'note'           => null,
                'timestamp'      => '2026-07-22 09:14:00',
            ],
            [
                'id'             => 'T-9002',
                'batch_id'       => 'B-1101',
                'sku'            => 'ACU-014',
                'user_id'        => $userMap[3],  // Lizle Ocariza
                'type'           => 'SALE',
                'quantity_delta' => -8,
                'channel'        => 'IN_STORE',
                'note'           => null,
                'timestamp'      => '2026-07-22 10:02:00',
            ],
            [
                'id'             => 'T-9003',
                'batch_id'       => 'B-1055',
                'sku'            => 'APU-100',
                'user_id'        => $userMap[3],  // Lizle Ocariza
                'type'           => 'SALE',
                'quantity_delta' => -5,
                'channel'        => 'IN_STORE',
                'note'           => null,
                'timestamp'      => '2026-07-22 11:45:00',
            ],
            [
                'id'             => 'T-9004',
                'batch_id'       => 'B-1120',
                'sku'            => 'ACU-014',
                'user_id'        => $userMap[4],  // Nhimfa Pacao
                'type'           => 'RECEIPT',
                'quantity_delta' => 200,
                'channel'        => 'WAREHOUSE',
                'note'           => null,
                'timestamp'      => '2026-07-21 08:20:00',
            ],
            [
                'id'             => 'T-9005',
                'batch_id'       => 'B-1090',
                'sku'            => 'THM-201',
                'user_id'        => $userMap[4],  // Nhimfa Pacao
                'type'           => 'ADJUSTMENT',
                'quantity_delta' => -3,
                'channel'        => 'WAREHOUSE',
                'note'           => null,
                'timestamp'      => '2026-07-20 16:10:00',
            ],
        ];

        foreach ($rows as $row) {
            TransactionLog::updateOrCreate(['id' => $row['id']], $row);
        }
    }
}

