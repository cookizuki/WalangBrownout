<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory_batches', function (Blueprint $table) {
            // Human-readable batch code (e.g. "B-1101") as the primary key,
            // matching the TS InventoryBatch.id and referenced by transaction_logs.
            $table->string('id')->primary();
            $table->string('sku');
            $table->foreign('sku')->references('sku')->on('products');
            $table->foreignId('location_id')->constrained('warehouse_locations');
            $table->integer('quantity_received');
            $table->integer('quantity_remaining');
            $table->date('date_received');
            $table->date('expiration_date')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_batches');
    }
};

