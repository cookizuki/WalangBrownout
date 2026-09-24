<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transaction_logs', function (Blueprint $table) {
            // Human-readable transaction ID (e.g. "T-9001") as the primary key
            $table->string('id')->primary();
            $table->string('batch_id')->nullable();
            $table->foreign('batch_id')->references('id')->on('inventory_batches')->nullOnDelete();
            $table->string('sku');
            $table->foreign('sku')->references('sku')->on('products');
            $table->foreignId('user_id')->constrained('users');
            $table->enum('type', ['RECEIPT', 'SALE', 'RETURN', 'TRANSFER', 'ADJUSTMENT', 'WRITE_OFF']);
            $table->integer('quantity_delta');  // can be negative for outflows
            $table->enum('channel', ['IN_STORE', 'ONLINE', 'WAREHOUSE']);
            $table->string('note')->nullable();
            // Explicit historical timestamp (separate from created_at — mirrors TS TxLog.timestamp)
            $table->datetime('timestamp');
            $table->timestamps();  // created_at / updated_at as per Laravel convention
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transaction_logs');
    }
};

