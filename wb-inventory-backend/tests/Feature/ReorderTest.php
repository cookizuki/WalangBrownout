<?php

use App\Models\Product;
use App\Models\SeasonalWindow;
use App\Models\TransactionLog;
use App\Models\User;
use App\Services\SeasonalConfigService;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\ReorderSeeder;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
});

test('inventory staff can log in and review seeded reorder suggestions', function () {
    $this->seed(DatabaseSeeder::class);
    $this->post('/login', ['email' => 'lizle@walangbrownout.ph', 'password' => 'walangbrownout'])->assertSessionHasNoErrors();

    $this->get('/reorder')->assertInertia(fn (Assert $page) => $page->component('Reorder/Index')
        ->has('rows', 1)->where('rows.0.sku', 'THM-201')->where('rows.0.onHand', 42)
        ->where('rows.0.rop', 55)->where('rows.0.quantity', 60)->where('rows.0.unitCost', 4800)
        ->has('seasonalProducts', 2));
    $this->assertDatabaseHas('pending_purchase_orders', ['id' => 'PO-2041', 'sku' => 'ACU-014', 'quantity' => 800, 'total_cost' => 3840000, 'requested_by' => User::where('email', 'kim@walangbrownout.ph')->value('id')]);
    $this->seed(ReorderSeeder::class);
    $this->assertDatabaseCount('pending_purchase_orders', 1);
    $this->assertDatabaseCount('seasonal_windows', 2);
});

test('draft uses trusted price supplier and requester and prevents repeated drafts', function () {
    $this->seed(DatabaseSeeder::class);
    $user = User::where('email', 'lizle@walangbrownout.ph')->firstOrFail();
    $this->actingAs($user);
    Product::findOrFail('THM-201')->update(['unit_cost' => '4800.25']);

    $this->post('/reorder/THM-201/draft', ['quantity' => 60, 'total_cost' => 1, 'supplier_id' => 1, 'requested_by' => 1])->assertSessionHasNoErrors()->assertRedirect('/reorder');

    $this->assertDatabaseHas('pending_purchase_orders', ['sku' => 'THM-201', 'quantity' => 60, 'total_cost' => '288015.00', 'supplier_id' => 3, 'requested_by' => $user->id]);
    $this->get('/reorder')->assertInertia(fn (Assert $page) => $page->where('rows.0.alreadyPending', true));
    $this->post('/reorder/THM-201/draft', ['quantity' => 60])->assertSessionHasErrors('quantity');
    $this->assertDatabaseCount('pending_purchase_orders', 2);
});

test('seasonal changes persist together and reorder rows sort by descending gap', function () {
    $this->seed(DatabaseSeeder::class);
    $this->actingAs(User::where('email', 'lizle@walangbrownout.ph')->firstOrFail());

    $this->put('/seasonal-config/ACU-014', ['startMonth' => 11, 'endMonth' => 2, 'multiplier' => 4])->assertSessionHasNoErrors()->assertRedirect('/reorder');

    $this->assertDatabaseHas('seasonal_windows', ['sku' => 'ACU-014', 'start_month' => 11, 'end_month' => 2]);
    $this->assertDatabaseHas('products', ['sku' => 'ACU-014', 'seasonal_factor' => 4]);
    $this->get('/reorder')->assertInertia(fn (Assert $page) => $page->has('rows', 2)
        ->where('rows.0.sku', 'ACU-014')->where('rows.0.rop', 660)->where('rows.0.gap', 120)
        ->where('rows.0.alreadyPending', true)->where('rows.1.sku', 'THM-201'));
    $this->post('/reorder/ACU-014/draft', ['quantity' => 10])->assertSessionHasErrors('quantity');
});

test('other roles cannot access reorder or its mutations', function (string $email) {
    $this->seed(DatabaseSeeder::class);
    $this->actingAs(User::where('email', $email)->firstOrFail());

    $this->get('/reorder')->assertForbidden();
    $this->post('/reorder/THM-201/draft', ['quantity' => 10])->assertForbidden();
    $this->put('/seasonal-config/ACU-014', ['startMonth' => 1, 'endMonth' => 2, 'multiplier' => 9])->assertForbidden();

    $this->assertDatabaseCount('pending_purchase_orders', 1);
    $this->assertDatabaseHas('products', ['sku' => 'ACU-014', 'seasonal_factor' => 3]);
})->with(['kim@walangbrownout.ph', 'nhimfa@walangbrownout.ph']);

test('guests must sign in and missing products return 404', function () {
    $this->get('/reorder')->assertRedirect('/login');
    $this->post('/reorder/THM-201/draft')->assertRedirect('/login');
    $this->put('/seasonal-config/ACU-014')->assertRedirect('/login');
    $this->seed(DatabaseSeeder::class);
    $this->actingAs(User::where('email', 'lizle@walangbrownout.ph')->firstOrFail());
    $this->post('/reorder/missing/draft', ['quantity' => 1])->assertNotFound();
    $this->put('/seasonal-config/missing', [])->assertNotFound();
});

test('invalid draft quantities cannot create orders', function ($quantity) {
    $this->seed(DatabaseSeeder::class);
    $this->actingAs(User::where('email', 'lizle@walangbrownout.ph')->firstOrFail());

    $this->post('/reorder/THM-201/draft', ['quantity' => $quantity])->assertSessionHasErrors('quantity');

    $this->assertDatabaseCount('pending_purchase_orders', 1);
})->with([0, -1, 1.5, null, 1000001]);

test('invalid seasonal settings leave both records unchanged', function (array $overrides, string $field) {
    $this->seed(DatabaseSeeder::class);
    $this->actingAs(User::where('email', 'lizle@walangbrownout.ph')->firstOrFail());

    $this->put('/seasonal-config/ACU-014', array_replace(['startMonth' => 4, 'endMonth' => 6, 'multiplier' => 4], $overrides))->assertSessionHasErrors($field);

    $this->assertDatabaseHas('products', ['sku' => 'ACU-014', 'seasonal_factor' => 3]);
    $this->assertDatabaseHas('seasonal_windows', ['sku' => 'ACU-014', 'start_month' => 4, 'end_month' => 6]);
})->with([[['startMonth' => 0], 'startMonth'], [['endMonth' => 13], 'endMonth'], [['multiplier' => 0], 'multiplier'], [['multiplier' => 100], 'multiplier']]);

test('suggestion uses absolute units per distinct sales day and supports wrapping windows', function (int $start, int $end, array $dates) {
    $this->seed(DatabaseSeeder::class);
    SeasonalWindow::whereKey('FAN-050')->update(['start_month' => $start, 'end_month' => $end]);
    foreach ($dates as $index => $date) {
        TransactionLog::create(['id' => 'T-HISTORY-'.$index, 'sku' => 'FAN-050', 'batch_id' => 'B-1122', 'user_id' => User::first()->id,
            'type' => 'SALE', 'quantity_delta' => [-10, 10, -5, -15][$index], 'channel' => 'ONLINE', 'timestamp' => $date]);
    }

    $suggestion = app(SeasonalConfigService::class)->suggestSeasonalMultiplier('FAN-050');

    expect($suggestion)->toBe(['suggested' => 2.0, 'sampleSize' => 4]);
})->with([
    [4, 6, ['2025-04-01', '2025-04-01', '2025-03-01', '2025-07-01']],
    [11, 2, ['2025-12-01', '2025-12-01', '2025-03-01', '2025-07-01']],
]);

test('suggestions require three sales and both sides of the window', function () {
    $this->seed(DatabaseSeeder::class);
    $service = app(SeasonalConfigService::class);
    expect($service->suggestSeasonalMultiplier('ACU-014'))->toBe(['suggested' => null, 'sampleSize' => 1]);
    expect($service->suggestSeasonalMultiplier('THM-201'))->toBe(['suggested' => null, 'sampleSize' => 0]);
    foreach ([1, 2] as $index) {
        TransactionLog::create(['id' => 'T-EXTRA-'.$index, 'sku' => 'ACU-014', 'user_id' => User::first()->id, 'type' => 'SALE', 'quantity_delta' => -5, 'channel' => 'ONLINE', 'timestamp' => '2025-07-01']);
    }
    expect($service->suggestSeasonalMultiplier('ACU-014'))->toBe(['suggested' => null, 'sampleSize' => 3]);
});

test('suggestion rounds to one decimal and handles zero averages', function (int $inside, int $outside, ?float $expected) {
    $this->seed(DatabaseSeeder::class);
    foreach ([['2025-04-01', $inside], ['2025-04-01', 0], ['2025-07-01', $outside]] as $index => [$date, $units]) {
        TransactionLog::create(['id' => 'T-RATIO-'.$index, 'sku' => 'FAN-050', 'user_id' => User::first()->id, 'type' => 'SALE', 'quantity_delta' => -$units, 'channel' => 'ONLINE', 'timestamp' => $date]);
    }

    expect(app(SeasonalConfigService::class)->suggestSeasonalMultiplier('FAN-050'))->toBe(['suggested' => $expected, 'sampleSize' => 3]);
})->with([[13, 10, 1.3], [0, 10, 0.0], [10, 0, null]]);

test('seasonal window storage failure rolls back the multiplier', function () {
    $this->seed(DatabaseSeeder::class);
    $this->actingAs(User::where('email', 'lizle@walangbrownout.ph')->firstOrFail());
    SeasonalWindow::saving(function (): void {
        throw new RuntimeException('Simulated window failure');
    });

    try {
        $this->put('/seasonal-config/ACU-014', ['startMonth' => 11, 'endMonth' => 2, 'multiplier' => 4])->assertServerError();
        $this->assertDatabaseHas('products', ['sku' => 'ACU-014', 'seasonal_factor' => 3]);
        $this->assertDatabaseHas('seasonal_windows', ['sku' => 'ACU-014', 'start_month' => 4, 'end_month' => 6]);
    } finally {
        SeasonalWindow::flushEventListeners();
    }
});

test('nonseasonal products reject seasonal configuration', function () {
    $this->seed(DatabaseSeeder::class);
    $this->actingAs(User::where('email', 'lizle@walangbrownout.ph')->firstOrFail());

    $this->put('/seasonal-config/THM-201', ['startMonth' => 4, 'endMonth' => 6, 'multiplier' => 2])->assertSessionHasErrors('multiplier');

    $this->assertDatabaseMissing('seasonal_windows', ['sku' => 'THM-201']);
    $this->assertDatabaseHas('products', ['sku' => 'THM-201', 'seasonal_factor' => null]);
});
