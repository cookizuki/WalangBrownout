<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pick_tasks', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('sku');
            $table->foreign('sku')->references('sku')->on('products');
            $table->string('batch_id');
            $table->foreign('batch_id')->references('id')->on('inventory_batches');
            $table->foreignId('location_id')->constrained('warehouse_locations');
            $table->unsignedInteger('quantity');
            $table->string('order_ref')->index();
            $table->enum('priority', ['HIGH', 'NORMAL', 'LOW']);
            $table->enum('status', ['PENDING', 'IN_PROGRESS', 'DONE']);
            $table->string('assigned_to');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pick_tasks');
    }
};
