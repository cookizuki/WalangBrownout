<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            // SKU is the natural primary key (matches TS model — everything references by SKU)
            $table->string('sku')->primary();
            $table->string('name');
            $table->foreignId('category_id')->constrained('categories');
            $table->foreignId('supplier_id')->constrained('suppliers');
            $table->decimal('unit_cost', 10, 2);
            $table->integer('reorder_point');
            $table->integer('reorder_quantity');
            $table->integer('lead_time_days');
            $table->boolean('seasonal_flag')->default(false);
            $table->boolean('is_fifo_critical')->default(false);
            $table->enum('abc', ['A', 'B', 'C']);
            $table->decimal('avg_daily_usage', 8, 2);
            $table->decimal('seasonal_factor', 4, 2)->nullable();
            $table->integer('safety_stock');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};

