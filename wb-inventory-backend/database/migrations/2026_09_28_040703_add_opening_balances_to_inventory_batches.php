<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inventory_batches', function (Blueprint $table): void {
            $table->unsignedInteger('opening_quantity')->nullable();
            $table->timestamp('opening_recorded_at')->nullable();
        });
        DB::transaction(function (): void {
            // Historical seed transactions are incomplete. Capture current stock once;
            // only subsequent non-receipt movements belong to this opening ledger.
            $batches = DB::table('inventory_batches')->whereIn('id', ['B-1101', 'B-1120', 'B-1055', 'B-1078', 'B-1090', 'B-1122', 'B-1130'])->lockForUpdate()->get();
            foreach ($batches as $batch) {
                DB::table('inventory_batches')->where('id', $batch->id)->update([
                    'opening_quantity' => $batch->quantity_remaining, 'opening_recorded_at' => now(),
                ]);
            }
            DB::table('receiving_lines')->where('id', 'RC-7702')->where('status', 'ARRIVED')
                ->whereColumn('quantity_received', 'quantity_ordered')->update(['status' => 'PUT_AWAY', 'received_date' => '2026-08-17']);
        });
    }

    public function down(): void
    {
        Schema::table('inventory_batches', function (Blueprint $table): void {
            $table->dropColumn(['opening_quantity', 'opening_recorded_at']);
        });
    }
};
