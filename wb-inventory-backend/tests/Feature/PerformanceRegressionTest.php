<?php

use App\Models\AlertAcknowledgement;
use App\Models\InventoryBatch;
use App\Models\Product;
use App\Models\ReceivingLine;
use App\Models\TransactionLog;
use App\Models\User;
use App\Services\AlertService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
    $this->travelTo(CarbonImmutable::parse('2026-09-25 12:00:00', 'UTC'));
    $this->seed();
});

test('aggregate alert count stays identical to live alerts after stock and acknowledgement changes', function () {
    $alerts = app(AlertService::class);
    expect($alerts->openCount())->toBe($alerts->open()->count());
    InventoryBatch::findOrFail('B-1101')->update(['quantity_remaining' => 0, 'expiration_date' => '2026-10-25']);
    Product::findOrFail('ACU-014')->update(['seasonal_factor' => null]);
    ReceivingLine::findOrFail('RC-7701')->update(['quantity_received' => 800, 'status' => 'PUT_AWAY']);
    expect($alerts->openCount())->toBe($alerts->open()->count());
    AlertAcknowledgement::create(['alert_id' => 'A-THM-201-ROP', 'user_id' => User::where('email', 'kim@walangbrownout.ph')->value('id'), 'acknowledged_at' => now()]);
    expect($alerts->openCount())->toBe($alerts->open()->count());
    InventoryBatch::findOrFail('B-1090')->update(['quantity_remaining' => 56]);
    expect($alerts->openCount())->toBe($alerts->open()->count());
});

test('alert queries remain bounded as the catalog grows', function () {
    $template = Product::firstOrFail()->getAttributes();
    for ($number = 0; $number < 30; $number++) {
        Product::create(array_replace($template, ['sku' => 'PERF-'.$number]));
    }
    DB::enableQueryLog();
    try {
        DB::flushQueryLog();
        app(AlertService::class)->compute();
        expect(DB::getQueryLog())->toHaveCount(4);
        DB::flushQueryLog();
        app(AlertService::class)->openCount();
        expect(DB::getQueryLog())->toHaveCount(1);
    } finally {
        DB::disableQueryLog();
        DB::flushQueryLog();
    }
});

test('transaction pagination preserves type search and access to every matching row', function () {
    $userId = User::where('email', 'kim@walangbrownout.ph')->value('id');
    for ($number = 1; $number <= 55; $number++) {
        TransactionLog::create([
            'id' => 'PERF-'.str_pad((string) $number, 3, '0', STR_PAD_LEFT),
            'sku' => 'ACU-014', 'batch_id' => 'B-1101', 'user_id' => $userId,
            'type' => 'SALE', 'quantity_delta' => -1, 'channel' => 'WAREHOUSE', 'timestamp' => '2027-01-01',
        ]);
    }
    $this->actingAs(User::where('email', 'lizle@walangbrownout.ph')->firstOrFail());
    $this->get('/transactions?type=SALE&q=portable')->assertInertia(fn (Assert $page) => $page
        ->has('transactions', 50)->where('transactions.0.id', 'PERF-055')->where('pagination.page', 1)
        ->where('pagination.next', fn (?string $url): bool => $url !== null && str_contains($url, 'q=portable') && str_contains($url, 'type=SALE')));
    $this->get('/transactions?type=SALE&q=portable&page=2')->assertInertia(fn (Assert $page) => $page
        ->has('transactions', 6)->where('transactions.0.id', 'PERF-005')->where('pagination.page', 2)->where('pagination.next', null));
    $this->get('/transactions?q=%25')->assertInertia(fn (Assert $page) => $page->has('transactions', 0));
});

test('batch pagination keeps FIFO positions across pages and depleted batches visible', function () {
    InventoryBatch::findOrFail('B-1101')->update(['quantity_remaining' => 0]);
    for ($number = 0; $number < 55; $number++) {
        InventoryBatch::create([
            'id' => 'PERF-'.str_pad((string) $number, 3, '0', STR_PAD_LEFT),
            'sku' => 'ACU-014', 'location_id' => 1, 'quantity_received' => 1, 'quantity_remaining' => 1,
            'date_received' => '2027-01-01', 'expiration_date' => null,
        ]);
    }
    $this->actingAs(User::where('email', 'kim@walangbrownout.ph')->firstOrFail());
    $this->get('/batches?q=portable')->assertInertia(fn (Assert $page) => $page
        ->has('batches', 50)->where('batches.0.id', 'B-1101')->where('batches.0.pickOrder', null)
        ->where('batches.1.pickOrder', 1)->where('pagination.next', fn (?string $url): bool => $url !== null && str_contains($url, 'q=portable')));
    $this->get('/batches?q=portable&page=2')->assertInertia(fn (Assert $page) => $page
        ->has('batches', 7)->where('batches.0.id', 'PERF-048')->where('batches.0.pickOrder', 50)->where('pagination.next', null));
});
