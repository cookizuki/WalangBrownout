<?php

use App\Models\InventoryBatch;
use App\Models\TransactionLog;
use App\Models\User;
use Carbon\CarbonImmutable;
use Database\Seeders\DatabaseSeeder;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
});

test('all seeded roles can log in and view seven FIFO ordered batches', function (string $email, bool $canAdjust) {
    $this->seed(DatabaseSeeder::class);
    $this->post('/login', ['email' => $email, 'password' => 'walangbrownout'])->assertSessionHasNoErrors();

    $this->get('/batches')->assertInertia(fn (Assert $page) => $page
        ->component('Batches/Index')->where('canAdjust', $canAdjust)->has('batches', 7)
        ->where('batches.0.id', 'B-1101')->where('batches.0.pickOrder', 1)
        ->where('batches.1.id', 'B-1120')->where('batches.1.pickOrder', 2)
        ->where('batches.2.sku', 'APU-100')->where('batches.2.pickOrder', 1)
        ->where('batches.6.sku', 'THM-201')->has('batches.0.locationCode'));
})->with([
    ['kim@walangbrownout.ph', true],
    ['nhimfa@walangbrownout.ph', true],
    ['lizle@walangbrownout.ph', false],
]);

test('depleted batches remain visible and do not consume pick positions', function () {
    $this->seed(DatabaseSeeder::class);
    $this->actingAs(User::where('email', 'kim@walangbrownout.ph')->firstOrFail());
    InventoryBatch::findOrFail('B-1101')->update(['quantity_remaining' => 0]);

    $this->get('/batches')->assertInertia(fn (Assert $page) => $page->has('batches', 7)
        ->where('batches.0.id', 'B-1101')->where('batches.0.quantityRemaining', 0)->where('batches.0.pickOrder', null)
        ->where('batches.1.id', 'B-1120')->where('batches.1.pickOrder', 1));
});

test('search matches SKU and product name case insensitively', function (string $query, int $count) {
    $this->seed(DatabaseSeeder::class);
    $this->actingAs(User::where('email', 'lizle@walangbrownout.ph')->firstOrFail());

    $this->get('/batches?'.http_build_query(['q' => $query]))->assertInertia(fn (Assert $page) => $page
        ->where('filters.q', trim($query))->has('batches', $count));
})->with([[' acu-014 ', 2], ['portable ac', 2], ['THERMOSTAT', 1], ['not-a-product', 0], ['%', 0], ['', 7]]);

test('expiry countdown uses UTC midnight and rounds upwards', function (?string $expiry, ?int $days) {
    $this->seed(DatabaseSeeder::class);
    $this->actingAs(User::where('email', 'kim@walangbrownout.ph')->firstOrFail());
    $this->travelTo(CarbonImmutable::parse('2026-09-24 12:00:00', 'UTC'));
    InventoryBatch::findOrFail('B-1101')->update(['expiration_date' => $expiry]);

    $this->get('/batches')->assertInertia(fn (Assert $page) => $page->where('batches.0.daysLeft', $days));
})->with([[null, null], ['2026-09-24', 0], ['2026-09-23', -1], ['2026-10-24', 30], ['2026-10-25', 31]]);

test('authorized adjustments persist stock and a transaction attributed to the signed in user', function (string $email) {
    $this->seed(DatabaseSeeder::class);
    $this->post('/login', ['email' => $email, 'password' => 'walangbrownout'])->assertSessionHasNoErrors();
    $count = TransactionLog::count();

    $this->from('/batches?q=ACU')->post('/batches/B-1101/adjustment', [
        'batch_id' => 'B-1101', 'reason' => 'DAMAGE', 'quantity' => 5, 'notes' => ' Broken casing ',
        'user_id' => 999, 'sku' => 'THM-201', 'channel' => 'ONLINE',
    ])->assertSessionHasNoErrors()->assertRedirect('/batches?q=ACU');

    $this->assertDatabaseHas('inventory_batches', ['id' => 'B-1101', 'quantity_remaining' => 335, 'quantity_received' => 400]);
    $this->assertDatabaseCount('transaction_logs', $count + 1);
    $this->assertDatabaseHas('transaction_logs', [
        'batch_id' => 'B-1101', 'sku' => 'ACU-014', 'type' => 'ADJUSTMENT', 'quantity_delta' => -5,
        'user_id' => User::where('email', $email)->value('id'), 'channel' => 'WAREHOUSE', 'note' => 'Broken casing',
    ]);
    $this->get('/batches')->assertInertia(fn (Assert $page) => $page->where('batches.0.quantityRemaining', 335));
})->with(['kim@walangbrownout.ph', 'nhimfa@walangbrownout.ph']);

test('adjustment signs and zero clamping match the prototype', function (string $reason, int $quantity, int $remaining, int $delta) {
    $this->seed(DatabaseSeeder::class);
    $this->actingAs(User::where('email', 'nhimfa@walangbrownout.ph')->firstOrFail());

    $this->post('/batches/B-1101/adjustment', ['batch_id' => 'B-1101', 'reason' => $reason, 'quantity' => $quantity])->assertSessionHasNoErrors();

    $this->assertDatabaseHas('inventory_batches', ['id' => 'B-1101', 'quantity_remaining' => $remaining]);
    $this->assertDatabaseHas('transaction_logs', ['batch_id' => 'B-1101', 'type' => 'ADJUSTMENT', 'quantity_delta' => $delta, 'note' => null]);
})->with([
    ['DAMAGE', -5, 335, -5], ['LOSS', 5, 335, -5], ['LOSS', -5, 335, -5],
    ['CORRECTION', 10, 350, 10], ['CORRECTION', -10, 330, -10],
    ['DAMAGE', 500, 0, -500], ['CORRECTION', -500, 0, -500],
]);

test('inventory staff cannot post adjustments', function () {
    $this->seed(DatabaseSeeder::class);
    $this->post('/login', ['email' => 'lizle@walangbrownout.ph', 'password' => 'walangbrownout'])->assertSessionHasNoErrors();
    $count = TransactionLog::count();

    $this->post('/batches/B-1101/adjustment', ['batch_id' => 'B-1101', 'reason' => 'DAMAGE', 'quantity' => 5])->assertForbidden();

    $this->assertDatabaseHas('inventory_batches', ['id' => 'B-1101', 'quantity_remaining' => 340]);
    $this->assertDatabaseCount('transaction_logs', $count);
});

test('guests must authenticate to view or adjust batches', function () {
    $this->get('/batches')->assertRedirect('/login');
    $this->post('/batches/B-1101/adjustment', [])->assertRedirect('/login');
});

test('invalid adjustments leave stock and logs unchanged', function (array $overrides, string $field) {
    $this->seed(DatabaseSeeder::class);
    $this->actingAs(User::where('email', 'nhimfa@walangbrownout.ph')->firstOrFail());
    $count = TransactionLog::count();

    $this->post('/batches/B-1101/adjustment', array_replace([
        'batch_id' => 'B-1101', 'reason' => 'DAMAGE', 'quantity' => 5,
    ], $overrides))->assertSessionHasErrors($field);

    $this->assertDatabaseHas('inventory_batches', ['id' => 'B-1101', 'quantity_remaining' => 340]);
    $this->assertDatabaseCount('transaction_logs', $count);
})->with([
    'zero' => [['quantity' => 0], 'quantity'],
    'fraction' => [['quantity' => 1.5], 'quantity'],
    'missing quantity' => [['quantity' => null], 'quantity'],
    'invalid reason' => [['reason' => 'SALE'], 'reason'],
    'mismatched batch' => [['batch_id' => 'B-1120'], 'batch_id'],
    'missing batch' => [['batch_id' => null], 'batch_id'],
    'long note' => [['notes' => str_repeat('x', 256)], 'notes'],
    'overflow' => [['reason' => 'CORRECTION', 'quantity' => 2147483647], 'quantity'],
]);

test('unknown batches return 404', function () {
    $this->seed(DatabaseSeeder::class);
    $this->actingAs(User::where('email', 'kim@walangbrownout.ph')->firstOrFail());

    $this->post('/batches/missing/adjustment', ['batch_id' => 'missing', 'reason' => 'DAMAGE', 'quantity' => 1])->assertNotFound();
});

test('a transaction log failure rolls back the stock update', function () {
    $this->seed(DatabaseSeeder::class);
    $this->actingAs(User::where('email', 'kim@walangbrownout.ph')->firstOrFail());
    $count = TransactionLog::count();
    TransactionLog::creating(function (): void {
        throw new RuntimeException('Simulated transaction log failure');
    });

    try {
        $this->post('/batches/B-1101/adjustment', ['batch_id' => 'B-1101', 'reason' => 'DAMAGE', 'quantity' => 1])->assertServerError();
        $this->assertDatabaseHas('inventory_batches', ['id' => 'B-1101', 'quantity_remaining' => 340]);
        $this->assertDatabaseCount('transaction_logs', $count);
    } finally {
        TransactionLog::flushEventListeners();
    }
});
