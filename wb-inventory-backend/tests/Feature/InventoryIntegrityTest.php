<?php

use App\Models\AuditLog;
use App\Models\InventoryBatch;
use App\Models\PurchaseOrder;
use App\Models\ReceivingLine;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    $this->withoutVite();
    $this->seed(DatabaseSeeder::class);
});

test('manual backfill creates only missing approved lines and is safe to rerun', function () {
    $order = PurchaseOrder::findOrFail('PO-3322')->replicate();
    $order->id = 'PO-OLD';
    $order->save();
    $rejected = $order->replicate();
    $rejected->id = 'PO-REJECTED';
    $rejected->status = 'REJECTED';
    $rejected->save();
    $this->artisan('po:backfill-receiving-lines')->expectsOutput('Backfilled 1 receiving line(s). Failed: 0.')->assertSuccessful();
    $line = ReceivingLine::where('po_number', 'PO-OLD')->sole();
    expect($line->status)->toBe('IN_TRANSIT')->and($line->quantity_received)->toBe(0)
        ->and($line->quantity_ordered)->toBe(60)->and($line->location_id)->toBe(3)
        ->and($line->expected_date->toDateString())->toBe(today()->addDays($order->product->lead_time_days)->toDateString());
    $this->assertDatabaseMissing('receiving_lines', ['po_number' => 'PO-REJECTED']);
    $this->artisan('po:backfill-receiving-lines')->expectsOutput('Backfilled 0 receiving line(s). Failed: 0.')->assertSuccessful();
    expect(ReceivingLine::where('po_number', 'PO-OLD')->count())->toBe(1);
    $this->assertDatabaseCount('audit_logs', 1);
});

test('seeded opening balances reconcile without fabricated historical transactions', function () {
    expect(Artisan::call('inventory:verify-consistency', ['--json' => true]))->toBe(0);
    expect(json_decode(Artisan::output(), true)['mismatches'])->toBe([]);
    $this->assertDatabaseCount('transaction_logs', 5);
});

test('diagnostic identifies drift after opening without changing stock', function () {
    InventoryBatch::findOrFail('B-1090')->update(['quantity_remaining' => 41]);
    expect(Artisan::call('inventory:verify-consistency', ['--json' => true]))->toBe(1);
    $report = json_decode(Artisan::output(), true);
    expect($report['mismatches'])->toHaveCount(1);
    expect($report['mismatches'][0])->toMatchArray(['batch_id' => 'B-1090', 'opening_quantity' => 42, 'sum_deltas' => 0, 'expected_remaining' => 42, 'actual_remaining' => 41]);
    $this->assertDatabaseCount('transaction_logs', 5);
});

test('receipts are not double counted and subsequent movements reconcile', function () {
    $this->actingAs(User::where('email', 'nhimfa@walangbrownout.ph')->firstOrFail());
    $this->post('/receiving/RC-7704/receive', ['quantity' => 10, 'expiration_date' => '2028-01-01'])->assertSessionHasNoErrors();
    $batch = InventoryBatch::where('id', 'not like', 'B-11%')->whereNull('opening_quantity')->sole();
    $this->post('/movements', ['batch_id' => $batch->id, 'type' => 'WRITE_OFF', 'quantity' => 3])->assertSessionHasNoErrors();
    $this->post('/movements', ['batch_id' => 'B-1090', 'type' => 'RETURN', 'quantity' => 2])->assertSessionHasNoErrors();
    expect(Artisan::call('inventory:verify-consistency', ['--json' => true]))->toBe(0);
});

test('partial receipt leaves a PO approved and final receipt marks it received', function () {
    $this->actingAs(User::where('email', 'nhimfa@walangbrownout.ph')->firstOrFail());
    $this->post('/receiving/RC-7704/receive', ['quantity' => 20, 'expiration_date' => '2028-01-01'])->assertSessionHasNoErrors();
    expect(PurchaseOrder::findOrFail('PO-3322')->status)->toBe('APPROVED');
    $this->post('/receiving/RC-7704/receive', ['quantity' => 40, 'expiration_date' => '2028-01-01'])->assertSessionHasNoErrors();
    expect(PurchaseOrder::findOrFail('PO-3322')->status)->toBe('RECEIVED');
    $this->assertDatabaseHas('audit_logs', ['action' => 'Received purchase order', 'target' => 'PO-3322']);
});

test('a PO remains open until every linked delivery is complete', function () {
    $first = ReceivingLine::findOrFail('RC-7704');
    $first->update(['quantity_ordered' => 30]);
    $second = $first->replicate();
    $second->id = 'RC-SPLIT';
    $second->save();
    $this->actingAs(User::where('email', 'nhimfa@walangbrownout.ph')->firstOrFail());
    $this->post('/receiving/RC-7704/receive', ['quantity' => 30, 'expiration_date' => '2028-01-01'])->assertSessionHasNoErrors();
    expect(PurchaseOrder::findOrFail('PO-3322')->status)->toBe('APPROVED');
    $this->post('/receiving/RC-SPLIT/receive', ['quantity' => 30, 'expiration_date' => '2028-01-01'])->assertSessionHasNoErrors();
    expect(PurchaseOrder::findOrFail('PO-3322')->status)->toBe('RECEIVED');
});

test('stock mutations roll back all writes when audit insertion fails', function (string $url, array $input) {
    $snapshot = fn () => collect(['inventory_batches', 'transaction_logs', 'pick_tasks', 'cycle_counts', 'receiving_lines', 'purchase_orders', 'audit_logs'])
        ->mapWithKeys(fn ($table) => [$table => DB::table($table)->orderBy('id')->get()->toJson()])->all();
    $before = $snapshot();
    $this->actingAs(User::where('email', 'nhimfa@walangbrownout.ph')->firstOrFail());
    AuditLog::creating(fn () => throw new RuntimeException('Simulated audit failure'));
    try {
        $this->post($url, $input)->assertServerError();
        expect($snapshot())->toBe($before);
    } finally {
        AuditLog::flushEventListeners();
    }
})->with([
    'adjustment' => ['/batches/B-1101/adjustment', ['batch_id' => 'B-1101', 'reason' => 'DAMAGE', 'quantity' => 1]],
    'pick' => ['/picks/PK-4401/complete', []],
    'FIFO exception' => ['/picks/PK-4401/fifo-exception', ['batch_id' => 'B-1101', 'reason' => 'DAMAGED']],
    'movement' => ['/movements', ['batch_id' => 'B-1090', 'type' => 'RETURN', 'quantity' => 1]],
    'cycle count' => ['/counts/CC-2203/submit', ['counted_qty' => 40]],
    'receiving and PO completion' => ['/receiving/RC-7704/receive', ['quantity' => 60, 'expiration_date' => '2028-01-01']],
]);
