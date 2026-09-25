<?php

use App\Models\CycleCount;
use App\Models\TransactionLog;
use App\Models\User;
use App\Services\AlertService;
use Carbon\CarbonImmutable;
use Database\Seeders\CycleCountSeeder;
use Database\Seeders\DatabaseSeeder;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
    $this->travelTo(CarbonImmutable::parse('2026-09-25 12:00:00', 'UTC'));
});
test('all five counts seed once without replaying historical stock adjustments', function () {
    $this->seed(DatabaseSeeder::class);
    $this->seed(CycleCountSeeder::class);
    $this->assertDatabaseCount('cycle_counts', 5);
    $this->assertDatabaseCount('transaction_logs', 5);
    $this->assertDatabaseHas('cycle_counts', ['id' => 'CC-2201', 'system_qty' => 540, 'counted_qty' => 538, 'status' => 'DONE']);
    $this->assertDatabaseHas('cycle_counts', ['id' => 'CC-2202', 'system_qty' => 365, 'counted_qty' => null, 'status' => 'PENDING']);
    $this->assertDatabaseHas('cycle_counts', ['id' => 'CC-2203', 'system_qty' => 42, 'counted_qty' => null, 'status' => 'IN_PROGRESS']);
    $this->assertDatabaseHas('cycle_counts', ['id' => 'CC-2204', 'system_qty' => 78, 'counted_qty' => 74, 'status' => 'DONE']);
    $this->assertDatabaseHas('cycle_counts', ['id' => 'CC-2205', 'system_qty' => 52, 'counted_qty' => null, 'status' => 'PENDING']);
    $this->assertDatabaseHas('inventory_batches', ['id' => 'B-1101', 'quantity_remaining' => 340]);
});
test('server chooses entry or review mode and exposes investigation transactions only in review', function (string $email, string $mode, int $transactionCount) {
    $this->seed(DatabaseSeeder::class);
    $this->actingAs(User::where('email', $email)->firstOrFail());
    $this->get('/counts?mode=entry')->assertInertia(fn (Assert $page) => $page->component('StockCounts/Index')->where('mode', $mode)->has('counts', 5)->has('transactions', $transactionCount));
})->with([['nhimfa@walangbrownout.ph', 'entry', 0], ['lizle@walangbrownout.ph', 'review', 5]]);
test('submitted variance changes only the first matching batch and creates one adjustment', function (int $counted, int $remaining, int $delta) {
    $this->seed(DatabaseSeeder::class);
    $this->post('/login', ['email' => 'nhimfa@walangbrownout.ph', 'password' => 'walangbrownout'])->assertSessionHasNoErrors();
    $this->post('/counts/CC-2202/submit', ['counted_qty' => $counted, 'sku' => 'ACU-014', 'location_id' => 1, 'user_id' => 1])->assertRedirect('/counts');
    $this->assertDatabaseHas('cycle_counts', ['id' => 'CC-2202', 'counted_qty' => $counted, 'status' => 'DONE']);
    $this->assertDatabaseHas('inventory_batches', ['id' => 'B-1055', 'quantity_remaining' => $remaining]);
    $this->assertDatabaseHas('inventory_batches', ['id' => 'B-1078', 'quantity_remaining' => 220]);
    $this->assertDatabaseHas('transaction_logs', ['batch_id' => 'B-1055', 'sku' => 'APU-100', 'type' => 'ADJUSTMENT', 'quantity_delta' => $delta, 'user_id' => User::where('email', 'nhimfa@walangbrownout.ph')->value('id'), 'channel' => 'WAREHOUSE']);
    $this->post('/counts/CC-2202/submit', ['counted_qty' => $counted])->assertSessionHasErrors('counted_qty');
    $this->assertDatabaseCount('transaction_logs', 6);
})->with([[360, 140, -5], [370, 150, 5], [0, 0, -365]]);
test('exact counts finish without stock changes or adjustment logs', function () {
    $this->seed(DatabaseSeeder::class);
    $this->actingAs(User::where('email', 'nhimfa@walangbrownout.ph')->firstOrFail());
    $this->post('/counts/CC-2203/submit', ['counted_qty' => 42])->assertRedirect('/counts');
    $this->assertDatabaseHas('cycle_counts', ['id' => 'CC-2203', 'counted_qty' => 42, 'status' => 'DONE']);
    $this->assertDatabaseHas('inventory_batches', ['id' => 'B-1090', 'quantity_remaining' => 42]);
    $this->assertDatabaseCount('transaction_logs', 5);
    expect(app(AlertService::class)->compute()->pluck('id')->all())->not->toContain('A-CC-2203-VAR');
});
test('a count without a batch at its location is recorded without changing another location', function () {
    $this->seed(DatabaseSeeder::class);
    CycleCount::findOrFail('CC-2203')->update(['location_id' => 1]);
    $this->actingAs(User::where('email', 'nhimfa@walangbrownout.ph')->firstOrFail())->post('/counts/CC-2203/submit', ['counted_qty' => 40])->assertRedirect('/counts');
    $this->assertDatabaseHas('cycle_counts', ['id' => 'CC-2203', 'counted_qty' => 40, 'status' => 'DONE']);
    $this->assertDatabaseHas('inventory_batches', ['id' => 'B-1090', 'quantity_remaining' => 42]);
    $this->assertDatabaseCount('transaction_logs', 5);
});
test('both roles create uniquely numbered recounts while preserving the original completed record', function (string $email) {
    $this->seed(DatabaseSeeder::class);
    $original = CycleCount::findOrFail('CC-2201')->getAttributes();
    $this->actingAs(User::where('email', $email)->firstOrFail());
    $this->post('/counts/CC-2201/recount')->assertRedirect('/counts');
    $this->post('/counts/CC-2201/recount')->assertRedirect('/counts');
    expect(CycleCount::findOrFail('CC-2201')->getAttributes())->toBe($original);
    foreach (['CC-2201-R1', 'CC-2201-R2'] as $id) {
        $this->assertDatabaseHas('cycle_counts', ['id' => $id, 'sku' => 'ACU-014', 'location_id' => 1, 'system_qty' => 540, 'counted_qty' => null, 'status' => 'PENDING']);
        expect(CycleCount::findOrFail($id)->due_date->toDateString())->toBe('2026-09-25');
    }
    $this->assertDatabaseCount('cycle_counts', 7);
    $this->assertDatabaseCount('transaction_logs', 5);
    $this->get('/counts')->assertInertia(fn (Assert $page) => $page->where('counts.0.id', 'CC-2201-R1')->where('counts.0.status', 'PENDING'));
})->with(['nhimfa@walangbrownout.ph', 'lizle@walangbrownout.ph']);
test('warehouse may recount an exact completed count but inventory review requires a variance', function () {
    $this->seed(DatabaseSeeder::class);
    CycleCount::findOrFail('CC-2201')->update(['counted_qty' => 540]);
    $this->actingAs(User::where('email', 'lizle@walangbrownout.ph')->firstOrFail())->post('/counts/CC-2201/recount')->assertSessionHasErrors('recount');
    $this->assertDatabaseCount('cycle_counts', 5);
    $this->actingAs(User::where('email', 'nhimfa@walangbrownout.ph')->firstOrFail())->post('/counts/CC-2201/recount')->assertRedirect('/counts');
    $this->assertDatabaseHas('cycle_counts', ['id' => 'CC-2201-R1', 'status' => 'PENDING']);
});
test('neither role can request recounts of uncounted tasks', function (string $email) {
    $this->seed(DatabaseSeeder::class);
    $this->actingAs(User::where('email', $email)->firstOrFail())->post('/counts/CC-2202/recount')->assertSessionHasErrors('recount');
    $this->assertDatabaseCount('cycle_counts', 5);
})->with(['nhimfa@walangbrownout.ph', 'lizle@walangbrownout.ph']);
test('review includes the new adjustment and variance alert has the exact prototype message', function (int $quantity, string $message) {
    $this->seed(DatabaseSeeder::class);
    $this->actingAs(User::where('email', 'nhimfa@walangbrownout.ph')->firstOrFail())->post('/counts/CC-2203/submit', ['counted_qty' => $quantity])->assertRedirect('/counts');
    $this->get('/alerts')->assertInertia(fn (Assert $page) => $page->where('alerts', fn ($alerts) => collect($alerts)->firstWhere('id', 'A-CC-2203-VAR')['message'] === $message));
    $this->actingAs(User::where('email', 'lizle@walangbrownout.ph')->firstOrFail())->get('/counts')->assertInertia(fn (Assert $page) => $page->where('mode', 'review')->has('transactions', 6)->where('transactions.0.sku', 'THM-201')->where('transactions.0.type', 'ADJUSTMENT')->where('transactions.0.quantityDelta', $quantity - 42));
})->with([[40, "Cycle count variance \u{2014} 2 units under system quantity (42 \u{2192} 40)"], [45, "Cycle count variance \u{2014} 3 units over system quantity (42 \u{2192} 45)"]]);
test('invalid count quantities cannot mutate counts or inventory', function (mixed $quantity) {
    $this->seed(DatabaseSeeder::class);
    $this->actingAs(User::where('email', 'nhimfa@walangbrownout.ph')->firstOrFail())->post('/counts/CC-2203/submit', ['counted_qty' => $quantity])->assertSessionHasErrors('counted_qty');
    $this->assertDatabaseHas('cycle_counts', ['id' => 'CC-2203', 'counted_qty' => null, 'status' => 'IN_PROGRESS']);
    $this->assertDatabaseHas('inventory_batches', ['id' => 'B-1090', 'quantity_remaining' => 42]);
    $this->assertDatabaseCount('transaction_logs', 5);
})->with([null, -1, 1.5, 'bad', 2147483648]);
test('role restrictions protect counts and original submissions', function () {
    $this->seed(DatabaseSeeder::class);
    $this->actingAs(User::factory()->create(['role' => 'ADMIN']));
    $this->get('/counts')->assertForbidden();
    $this->post('/counts/CC-2203/submit', ['counted_qty' => 40])->assertForbidden();
    $this->post('/counts/CC-2201/recount')->assertForbidden();
    $this->actingAs(User::where('email', 'lizle@walangbrownout.ph')->firstOrFail())->post('/counts/CC-2203/submit', ['counted_qty' => 40])->assertForbidden();
    $this->assertDatabaseCount('transaction_logs', 5);
    $this->assertDatabaseCount('cycle_counts', 5);
});
test('guests must log in and unknown count references return not found', function () {
    $this->get('/counts')->assertRedirect('/login');
    $this->post('/counts/missing/submit')->assertRedirect('/login');
    $this->post('/counts/missing/recount')->assertRedirect('/login');
    $this->actingAs(User::factory()->create(['role' => 'WAREHOUSE_STAFF']))->post('/counts/missing/submit', ['counted_qty' => 1])->assertNotFound();
    $this->post('/counts/missing/recount')->assertNotFound();
});
test('count and inventory adjustment roll back together if transaction logging fails', function () {
    $this->seed(DatabaseSeeder::class);
    $this->actingAs(User::where('email', 'nhimfa@walangbrownout.ph')->firstOrFail());
    TransactionLog::creating(function () {
        throw new RuntimeException('Log failed');
    });
    $this->withoutExceptionHandling();
    try {
        $this->post('/counts/CC-2203/submit', ['counted_qty' => 40]);
        $this->fail('Expected storage error');
    } catch (RuntimeException $e) {
        expect($e->getMessage())->toBe('Log failed');
    } finally {
        TransactionLog::flushEventListeners();
    }
    $this->assertDatabaseHas('cycle_counts', ['id' => 'CC-2203', 'counted_qty' => null, 'status' => 'IN_PROGRESS']);
    $this->assertDatabaseHas('inventory_batches', ['id' => 'B-1090', 'quantity_remaining' => 42]);
    $this->assertDatabaseCount('transaction_logs', 5);
});
