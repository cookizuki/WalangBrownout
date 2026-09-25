<?php

use App\Models\InventoryBatch;
use App\Models\Product;
use App\Models\TransactionLog;
use App\Models\User;
use App\Services\AlertService;
use Carbon\CarbonImmutable;
use Database\Seeders\DatabaseSeeder;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
    $this->travelTo(CarbonImmutable::parse('2026-09-25 12:00:00', 'UTC'));
});

test('inventory staff can log in and see all seeded transactions newest first', function () {
    $this->seed(DatabaseSeeder::class);
    $this->post('/login', ['email' => 'lizle@walangbrownout.ph', 'password' => 'walangbrownout'])->assertSessionHasNoErrors();

    $this->get('/transactions')->assertInertia(fn (Assert $page) => $page->component('TransactionLog/Index')
        ->has('transactions', 5)->where('transactions.0.id', 'T-9003')->where('transactions.4.id', 'T-9005')
        ->where('transactions.0.productName', 'Air Purifier Carbon Filter')->where('transactions.0.batchId', 'B-1055'));
});

test('transaction filters combine type and case insensitive substring search', function (string $type, string $q, int $count) {
    $this->seed(DatabaseSeeder::class);
    $this->actingAs(User::where('email', 'lizle@walangbrownout.ph')->firstOrFail());

    $this->get('/transactions?'.http_build_query(['type' => $type, 'q' => $q]))->assertInertia(fn (Assert $page) => $page
        ->has('transactions', $count)->where('filters.type', $type)->where('filters.q', trim($q)));
})->with([
    ['SALE', '', 3], ['RECEIPT', '', 1], ['ADJUSTMENT', '', 1], ['TRANSFER', '', 0],
    ['RETURN', '', 0], ['WRITE_OFF', '', 0], ['ALL', ' acu-014 ', 2],
    ['ALL', 'THERMOSTAT', 2], ['ALL', 'b-1055', 1], ['SALE', 'portable', 1], ['ALL', '%', 0],
]);

test('admins and warehouse staff cannot view transactions', function (string $email) {
    $this->seed(DatabaseSeeder::class);
    $this->actingAs(User::where('email', $email)->firstOrFail());

    $this->get('/transactions')->assertForbidden();
})->with(['kim@walangbrownout.ph', 'nhimfa@walangbrownout.ph']);

test('transactions tolerate a nullable batch and reject invalid type filters', function () {
    $this->seed(DatabaseSeeder::class);
    $this->actingAs(User::where('email', 'lizle@walangbrownout.ph')->firstOrFail());
    TransactionLog::findOrFail('T-9003')->update(['batch_id' => null]);

    $this->get('/transactions')->assertInertia(fn (Assert $page) => $page->where('transactions.0.batchId', null));
    $this->get('/transactions?type=INVALID')->assertSessionHasErrors('type');
});

test('seeded live alerts match independently calculated ROP thresholds', function () {
    $this->seed(DatabaseSeeder::class);

    $alerts = app(AlertService::class)->compute()->keyBy('id');

    expect($alerts->keys()->all())->toBe(['A-THM-201-ROP']);
    expect($alerts['A-THM-201-ROP']['message'])->toBe('Below reorder point — on hand 42 ≤ 55');
    expect(Product::findOrFail('ACU-014')->onHand())->toBe(540);
    expect(Product::findOrFail('ACU-014')->ropSeasonal())->toBe(520);
});

test('live stock changes produce seasonal and standard alerts at equality', function () {
    $this->seed(DatabaseSeeder::class);
    InventoryBatch::findOrFail('B-1101')->update(['quantity_remaining' => 320]);
    InventoryBatch::findOrFail('B-1090')->update(['quantity_remaining' => 55]);

    $alerts = app(AlertService::class)->compute()->keyBy('id');

    expect($alerts['A-ACU-014-ROP']['message'])->toBe('Seasonal ROP hit — on hand 520 ≤ 520 (factor 3×)');
    expect($alerts['A-ACU-014-ROP']['type'])->toBe('SEASONAL_REORDER');
    expect($alerts['A-THM-201-ROP']['message'])->toBe('Below reorder point — on hand 55 ≤ 55');
    InventoryBatch::findOrFail('B-1090')->update(['quantity_remaining' => 56]);
    expect(app(AlertService::class)->compute()->pluck('id')->all())->not->toContain('A-THM-201-ROP');
});

test('expiry rules include depleted and expired batches and use live message format', function (?string $expiry, ?int $days) {
    $this->seed(DatabaseSeeder::class);
    InventoryBatch::findOrFail('B-1101')->update(['expiration_date' => $expiry, 'quantity_remaining' => 0]);

    $alert = app(AlertService::class)->compute()->firstWhere('id', 'A-B-1101-EXP');

    if ($days === null) {
        expect($alert)->toBeNull();
    } else {
        expect($alert['message'])->toBe("Batch B-1101 expires in {$days} days — release first (FIFO)");
        expect($alert['batchId'])->toBe('B-1101');
        expect($alert['type'])->toBe('NEAR_EXPIRY');
    }
})->with([[null, null], ['2026-10-26', null], ['2026-10-25', 30], ['2026-09-25', 0], ['2026-09-24', -1]]);

test('all roles can view and acknowledge alerts persistently', function (string $email) {
    $this->seed(DatabaseSeeder::class);
    $user = User::where('email', $email)->firstOrFail();
    $this->actingAs($user);
    $this->get('/alerts')->assertInertia(fn (Assert $page) => $page->component('Alerts/Index')->has('alerts', 1));

    $this->post('/alerts/A-THM-201-ROP/acknowledge')->assertRedirect('/alerts');

    $this->assertDatabaseHas('alert_acknowledgements', ['alert_id' => 'A-THM-201-ROP', 'user_id' => $user->id]);
    $this->get('/alerts')->assertInertia(fn (Assert $page) => $page->has('alerts', 0));
})->with(['kim@walangbrownout.ph', 'lizle@walangbrownout.ph', 'nhimfa@walangbrownout.ph']);

test('acknowledgements are idempotent across users and remain hidden globally', function () {
    $this->seed(DatabaseSeeder::class);
    $kim = User::where('email', 'kim@walangbrownout.ph')->firstOrFail();
    $this->actingAs($kim)->post('/alerts/A-THM-201-ROP/acknowledge')->assertRedirect('/alerts');
    $this->post('/alerts/A-THM-201-ROP/acknowledge')->assertRedirect('/alerts');
    $this->actingAs(User::where('email', 'lizle@walangbrownout.ph')->firstOrFail());

    $this->post('/alerts/A-THM-201-ROP/acknowledge')->assertRedirect('/alerts');

    $this->assertDatabaseCount('alert_acknowledgements', 1);
    $this->assertDatabaseHas('alert_acknowledgements', ['alert_id' => 'A-THM-201-ROP', 'user_id' => $kim->id]);
    $this->get('/alerts')->assertInertia(fn (Assert $page) => $page->has('alerts', 0));
    expect(app(AlertService::class)->compute()->pluck('id')->all())->toContain('A-THM-201-ROP');
});

test('unknown alerts cannot be acknowledged', function () {
    $this->seed(DatabaseSeeder::class);
    $this->actingAs(User::where('email', 'kim@walangbrownout.ph')->firstOrFail());

    $this->post('/alerts/A-INVALID-ROP/acknowledge')->assertNotFound();

    $this->assertDatabaseCount('alert_acknowledgements', 0);
});

test('guests cannot view transactions or alerts or acknowledge', function () {
    $this->get('/transactions')->assertRedirect('/login');
    $this->get('/alerts')->assertRedirect('/login');
    $this->post('/alerts/A-THM-201-ROP/acknowledge')->assertRedirect('/login');
});
