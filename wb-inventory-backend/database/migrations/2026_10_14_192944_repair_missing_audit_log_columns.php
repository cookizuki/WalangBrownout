<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $missingName = ! Schema::hasColumn('audit_logs', 'user_name');
        $missingTimestamp = ! Schema::hasColumn('audit_logs', 'timestamp');

        Schema::table('audit_logs', function (Blueprint $table) use ($missingName, $missingTimestamp) {
            if ($missingName) {
                $table->string('user_name')->nullable();
            }
            if ($missingTimestamp) {
                $table->timestamp('timestamp')->nullable()->index();
            }
        });

        if ($missingName || $missingTimestamp) {
            $hasCreatedAt = Schema::hasColumn('audit_logs', 'created_at');
            DB::table('audit_logs')->orderBy('id')->chunkById(100, function (Collection $entries) use ($missingName, $missingTimestamp, $hasCreatedAt): void {
                foreach ($entries as $entry) {
                    $attributes = [];
                    if ($missingName) {
                        $attributes['user_name'] = DB::table('users')->where('id', $entry->user_id)->value('name') ?? 'Deleted user';
                    }
                    if ($missingTimestamp) {
                        $attributes['timestamp'] = $hasCreatedAt ? ($entry->created_at ?? now()) : now();
                    }
                    DB::table('audit_logs')->where('id', $entry->id)->update($attributes);
                }
            });
        }

        Schema::table('audit_logs', function (Blueprint $table) {
            $table->string('id')->change();
            $table->unsignedBigInteger('user_id')->nullable()->change();
            $table->string('user_name')->nullable(false)->change();
            $table->timestamp('timestamp')->nullable(false)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Preserve repaired columns and historical entries on rollback.
    }
};
