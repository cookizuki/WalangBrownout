<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('purchase_orders', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('supplier_id')->constrained('suppliers');
            $table->string('sku');
            $table->foreign('sku')->references('sku')->on('products');
            $table->integer('quantity');
            $table->decimal('unit_cost', 10, 2);
            $table->enum('status', ['SUBMITTED', 'APPROVED', 'REJECTED', 'RECEIVED']);
            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchase_orders');
    }
};
