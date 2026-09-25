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
        Schema::create('pending_purchase_orders', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('supplier_id')->constrained('suppliers');
            $table->string('sku')->unique();
            $table->foreign('sku')->references('sku')->on('products');
            $table->integer('quantity');
            $table->decimal('total_cost', 18, 2);
            $table->foreignId('requested_by')->constrained('users');
            $table->date('requested_at');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pending_purchase_orders');
    }
};
