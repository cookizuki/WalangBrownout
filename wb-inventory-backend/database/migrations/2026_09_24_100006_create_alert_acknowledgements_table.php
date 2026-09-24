<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('alert_acknowledgements', function (Blueprint $table) {
            $table->id();
            // alert_id is a plain string matching the deterministic alert ID scheme
            // (e.g. "A-ACU-014-ROP", "A-B-1055-EXP") — alerts are NOT a persisted table.
            $table->string('alert_id');
            $table->foreignId('user_id')->constrained('users');
            $table->datetime('acknowledged_at');
            $table->timestamps();

            // Prevent duplicate acks for the same alert by the same user
            $table->unique(['alert_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alert_acknowledgements');
    }
};

