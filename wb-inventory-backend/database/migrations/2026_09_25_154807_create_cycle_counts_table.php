<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cycle_counts', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('sku');
            $table->foreign('sku')->references('sku')->on('products');
            $table->foreignId('location_id')->constrained('warehouse_locations');
            $table->unsignedInteger('system_qty');
            $table->unsignedInteger('counted_qty')->nullable();
            $table->date('due_date');
            $table->enum('status', ['PENDING', 'IN_PROGRESS', 'DONE']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cycle_counts');
    }
};
