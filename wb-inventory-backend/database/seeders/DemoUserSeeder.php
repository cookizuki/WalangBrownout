<?php

namespace Database\Seeders;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DemoUserSeeder extends Seeder
{
    /**
     * Seed the four demo accounts from the WalangBrownout prototype.
     */
    public function run(): void
    {
        $accounts = [
            [
                'name'     => 'Kim Maturan',
                'email'    => 'kim@walangbrownout.ph',
                'role'     => Role::ADMIN,
                'status'   => 'Active',
            ],
            [
                'name'     => 'Nick Merilles',
                'email'    => 'nick@walangbrownout.ph',
                'role'     => Role::ADMIN,
                'status'   => 'Active',
            ],
            [
                'name'     => 'Lizle Ocariza',
                'email'    => 'lizle@walangbrownout.ph',
                'role'     => Role::INVENTORY_STAFF,
                'status'   => 'Active',
            ],
            [
                'name'     => 'Nhimfa Pacao',
                'email'    => 'nhimfa@walangbrownout.ph',
                'role'     => Role::WAREHOUSE_STAFF,
                'status'   => 'Active',
            ],
        ];

        foreach ($accounts as $data) {
            User::firstOrCreate(
                ['email' => $data['email']],
                array_merge($data, ['password' => Hash::make('walangbrownout')]),
            );
        }
    }
}

