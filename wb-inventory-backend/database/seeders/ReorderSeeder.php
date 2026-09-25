<?php

namespace Database\Seeders;

use App\Models\PendingPurchaseOrder;
use App\Models\SeasonalWindow;
use App\Models\User;
use Illuminate\Database\Seeder;

class ReorderSeeder extends Seeder
{
    public function run(): void
    {
        PendingPurchaseOrder::firstOrCreate(['sku' => 'ACU-014'], [
            'id' => 'PO-2041', 'supplier_id' => 1, 'quantity' => 800, 'total_cost' => '3840000.00',
            'requested_by' => User::where('email', 'kim@walangbrownout.ph')->firstOrFail()->id,
            'requested_at' => '2026-07-18',
        ]);
        foreach (['ACU-014', 'FAN-050'] as $sku) {
            SeasonalWindow::firstOrCreate(['sku' => $sku], ['start_month' => 4, 'end_month' => 6]);
        }
    }
}
