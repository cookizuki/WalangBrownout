<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('receiving_lines', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('po_number')->index();
            $table->string('sku');
            $table->foreign('sku')->references('sku')->on('products');
            $table->foreignId('supplier_id')->constrained();
            $table->unsignedInteger('quantity_ordered');
            $table->unsignedInteger('quantity_received')->default(0);
            $table->date('expected_date');
            $table->foreignId('location_id')->constrained('warehouse_locations');
            $table->enum('status', ['IN_TRANSIT', 'ARRIVED', 'PUT_AWAY']);
            $table->date('received_date')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('receiving_lines');
    }
};
