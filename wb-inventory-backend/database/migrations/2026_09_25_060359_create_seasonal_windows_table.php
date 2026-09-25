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
        Schema::create('seasonal_windows', function (Blueprint $table) {
            $table->string('sku')->primary();
            $table->foreign('sku')->references('sku')->on('products');
            $table->unsignedTinyInteger('start_month');
            $table->unsignedTinyInteger('end_month');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('seasonal_windows');
    }
};
