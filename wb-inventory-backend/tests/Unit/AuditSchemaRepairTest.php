<?php

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

uses(TestCase::class, DatabaseMigrations::class);

afterEach(function () {
    if (Schema::hasTable('audit_logs')) {
        DB::table('audit_logs')->delete();
    }
});

test('repair preserves old audit entries and supports new string IDs and system actors', function () {
    $user = User::factory()->create();
    Schema::drop('audit_logs');
    Schema::create('audit_logs', function (Blueprint $table) {
        $table->id();
        $table->foreignId('user_id')->constrained();
        $table->string('action');
        $table->text('target');
        $table->timestamp('created_at')->useCurrent();
    });
    $target = str_repeat('r', 2000);
    DB::table('audit_logs')->insert([
        'user_id' => $user->id, 'action' => 'Signed in', 'target' => $target, 'created_at' => '2026-10-01 12:00:00',
    ]);

    $migration = require database_path('migrations/2026_10_14_192944_repair_missing_audit_log_columns.php');
    $migration->up();
    $migration->up();

    $entry = AuditLog::findOrFail('1');
    expect($entry->user_name)->toBe($user->name)
        ->and($entry->timestamp->format('Y-m-d H:i:s'))->toBe('2026-10-01 12:00:00')
        ->and($entry->target)->toBe($target);
    AuditLog::create([
        'id' => 'AU-system', 'user_id' => null, 'user_name' => 'System',
        'action' => 'Backfilled receiving line', 'target' => $target, 'timestamp' => now(),
    ]);
    $this->assertDatabaseHas('audit_logs', ['id' => 'AU-system', 'user_id' => null]);
});
