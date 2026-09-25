<?php

use App\Http\Controllers\ReportController;
use App\Models\InventoryBatch;
use App\Models\PurchaseOrder;
use App\Models\ReceivingLine;
use App\Models\TransactionLog;
use App\Models\User;
use Carbon\CarbonImmutable;
use Database\Seeders\DatabaseSeeder;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
    $this->travelTo(CarbonImmutable::parse('2026-09-26 12:00:00', 'UTC'));
});
test('admin reports match independently calculated seed totals and estimated history', function () {
    $this->seed(DatabaseSeeder::class);
    $this->actingAs(User::where('email', 'kim@walangbrownout.ph')->firstOrFail());
    $this->get('/reports')->assertInertia(fn (Assert $page) => $page->component('Reports/Index')
        ->where('valuation.totalValue', 10938010)->where('valuation.byClass.0.units', 582)->where('valuation.byClass.0.value', 10191600)->where('valuation.byClass.1.value', 705850)->where('valuation.byClass.2.value', 40560)
        ->where('shrinkageByMonth', [['label' => 'Jul 2026', 'units' => 3, 'cost' => 14400]])
        ->where('velocityBySku.0.sku', 'ACU-014')->where('velocityBySku.0.units', 8)->where('velocityBySku.0.abc', 'A')->where('velocityBySku.1.units', 5)->where('velocityBySku.2.units', 2)
        ->where('turnover.0.sku', 'THM-201')->where('turnover.0.turnoverRate', 0.2)->where('turnover.0.daysOfInventory', 1890)
        ->where('supplierPerf.0.supplierId', 1)->where('supplierPerf.0.onTimeRate', 33)->where('supplierPerf.0.avgDaysLate', 2.5)->where('supplierPerf.0.currentlyOverdue', 1)
        ->where('supplierPerf.1.supplierId', 3)->where('supplierPerf.1.onTimeRate', 50)->where('supplierPerf.1.avgDaysLate', 7)->where('supplierPerf.2.onTimeRate', 100)
        ->where('deadStock.0.daysSinceLastSale', null)->where('deadStock.0.bucket', '180+')->has('deadStock', 5)
        ->where('purchaseHistories.ACU-014.0.poNumber', 'PO-3310')->where('purchaseHistories.ACU-014.0.costSource', 'estimated')->where('purchaseHistories.ACU-014.0.unitCost', 18500)
        ->where('purchaseHistories.APU-100.0.poNumber', 'PO-3321')->where('purchaseHistories.APU-100.0.costSource', 'po')->where('purchaseHistories.APU-100.0.date', '2026-08-17')
        ->where('costSummaries.ACU-014.averageCost', 18500)->where('costSummaries.ACU-014.trend', 'same'));
    $this->assertDatabaseCount('transaction_logs', 5);
    $this->assertDatabaseCount('receiving_lines', 10);
});
test('only admins can view reports', function () {
    $this->get('/reports')->assertRedirect('/login');
    foreach (['WAREHOUSE_STAFF', 'INVENTORY_STAFF'] as $role) {
        $this->actingAs(User::factory()->create(['role' => $role]))->get('/reports')->assertForbidden();
    }
});
test('empty reports render zero class totals empty datasets and no undefined cost summaries', function () {
    $this->actingAs(User::factory()->create(['role' => 'ADMIN']))->get('/reports')->assertInertia(fn (Assert $page) => $page->where('valuation.totalValue', 0)->has('valuation.byClass', 3)->has('turnover', 0)->has('deadStock', 0)->has('supplierPerf', 0)->has('velocityBySku', 0)->has('shrinkageByMonth', 0)->has('products', 0));
});
test('shrinkage includes negative adjustments and all write offs and sorts display labels', function () {
    $this->seed(DatabaseSeeder::class);
    $template = TransactionLog::findOrFail('T-9005')->getAttributes();
    unset($template['created_at'], $template['updated_at']);
    foreach ([['TX1', 'ADJUSTMENT', 4, '2026-04-01'], ['TX2', 'WRITE_OFF', 2, '2026-02-01'], ['TX3', 'ADJUSTMENT', -1, '2026-04-01'], ['TX4', 'RETURN', -9, '2026-04-01'], ['TX5', 'WRITE_OFF', -2, '2026-02-02']] as [$id,$type,$delta,$date]) {
        TransactionLog::create(array_replace($template, ['id' => $id, 'type' => $type, 'quantity_delta' => $delta, 'timestamp' => $date]));
    }
    expect((new ReportController)->shrinkage())->toBe([
        ['label' => 'Apr 2026', 'units' => 1, 'cost' => 4800.0], ['label' => 'Feb 2026', 'units' => 4, 'cost' => 19200.0], ['label' => 'Jul 2026', 'units' => 3, 'cost' => 14400.0],
    ]);
});
test('turnover includes the exact cutoff and uses the unrounded rate for days', function () {
    $this->seed(DatabaseSeeder::class);
    TransactionLog::where('type', 'SALE')->delete();
    $user = User::first();
    foreach ([['BOUNDARY', '2026-06-28 12:00:00', -1], ['BEFORE', '2026-06-28 11:59:59', -100], ['POSITIVE', '2026-09-26 12:00:00', 1]] as [$id,$date,$qty]) {
        TransactionLog::create(['id' => $id, 'batch_id' => 'B-1090', 'sku' => 'THM-201', 'user_id' => $user->id, 'type' => 'SALE', 'quantity_delta' => $qty, 'timestamp' => $date, 'channel' => 'WAREHOUSE']);
    }
    $rows = collect((new ReportController)->turnover())->keyBy('sku');
    expect($rows['THM-201'])->toMatchArray(['unitsSoldPeriod' => 2, 'turnoverRate' => 0.2, 'daysOfInventory' => 1890]);
    expect($rows['ACU-014'])->toMatchArray(['turnoverRate' => 0.0, 'daysOfInventory' => null]);
    InventoryBatch::where('sku', 'THM-201')->update(['quantity_remaining' => 0]);
    expect(collect((new ReportController)->turnover())->pluck('sku')->all())->not->toContain('THM-201');
});
test('dead stock floors elapsed days and uses all bucket boundaries', function (int $days, ?string $bucket) {
    $this->seed(DatabaseSeeder::class);
    TransactionLog::where('sku', 'THM-201')->where('type', 'SALE')->update(['timestamp' => now()->subDays($days)->subHours(23)]);
    $row = collect((new ReportController)->deadStock())->firstWhere('sku', 'THM-201');
    if ($bucket === null) {
        expect($row)->toBeNull();
    } else {
        expect($row)->toMatchArray(['daysSinceLastSale' => $days, 'bucket' => $bucket, 'tiedUpValue' => 201600.0]);
    }
})->with([[29, null], [30, '30+'], [59, '30+'], [60, '60+'], [89, '60+'], [90, '90+'], [179, '90+'], [180, '180+']]);
test('supplier rates exclude missing completion dates and count only strictly overdue incomplete lines', function () {
    $this->seed(DatabaseSeeder::class);
    ReceivingLine::where('supplier_id', 1)->update(['received_date' => null, 'status' => 'PUT_AWAY']);
    ReceivingLine::findOrFail('RC-7701')->update(['status' => 'IN_TRANSIT', 'expected_date' => '2026-09-26']);
    expect(collect((new ReportController)->supplierPerformance())->pluck('supplierId')->all())->not->toContain(1);
    ReceivingLine::findOrFail('RC-7701')->update(['expected_date' => '2026-09-25']);
    expect(collect((new ReportController)->supplierPerformance())->firstWhere('supplierId', 1))->toMatchArray(['totalDeliveries' => 0, 'onTimeRate' => 0, 'avgDaysLate' => 0, 'currentlyOverdue' => 1]);
    ReceivingLine::findOrFail('RC-7701')->update(['quantity_received' => 300]);
    expect(collect((new ReportController)->supplierPerformance())->pluck('supplierId')->all())->not->toContain(1);
});
test('purchase history includes partial receipts uses PO costs and weights average by quantity', function () {
    $this->seed(DatabaseSeeder::class);
    ReceivingLine::findOrFail('RC-7701')->update(['quantity_received' => 50, 'status' => 'ARRIVED', 'received_date' => null]);
    PurchaseOrder::findOrFail('PO-3320')->update(['unit_cost' => 20000]);
    $report = new ReportController;
    $history = $report->purchaseHistory('ACU-014');
    expect($history[0])->toMatchArray(['date' => '2026-08-19', 'quantityReceived' => 50, 'unitCost' => 20000.0, 'totalCost' => 1000000.0, 'costSource' => 'po']);
    expect($history[1]['costSource'])->toBe('estimated');
    expect($report->costSummary('ACU-014'))->toMatchArray(['averageCost' => 18687.5, 'lastPurchaseCost' => 20000.0, 'trend' => 'up']);
    ReceivingLine::where('sku', 'SEN-011')->update(['quantity_received' => 0]);
    expect((new ReportController)->costSummary('SEN-011'))->toBe(['currentCost' => 780.0, 'lastPurchaseCost' => null, 'lastPurchaseDate' => null, 'averageCost' => null, 'trend' => null]);
});
test('cost trend uses a strict half peso threshold', function (float $cost, string $trend) {
    $this->seed(DatabaseSeeder::class);
    ReceivingLine::where('sku', 'ACU-014')->update(['quantity_received' => 0]);
    ReceivingLine::findOrFail('RC-7701')->update(['quantity_received' => 1]);
    ReceivingLine::findOrFail('RC-7695')->update(['quantity_received' => 1]);
    PurchaseOrder::findOrFail('PO-3320')->update(['unit_cost' => $cost]);
    expect((new ReportController)->costSummary('ACU-014')['trend'])->toBe($trend);
})->with([[18500.98, 'same'], [18501.0, 'up'], [18499.0, 'down']]);
