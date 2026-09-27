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
        ->and($line->expected_date->toDateString())->toBe(today('UTC')->addDays($order->product->lead_time_days)->toDateString());
    $this->assertDatabaseMissing('receiving_lines', ['po_number' => 'PO-REJECTED']);
    $this->artisan('po:backfill-receiving-lines')->expectsOutput('Backfilled 0 receiving line(s). Failed: 0.')->assertSuccessful();
    expect(ReceivingLine::where('po_number', 'PO-OLD')->count())->toBe(1);
    $this->assertDatabaseCount('audit_logs', 1);
});

test('consistency diagnostic reports exact numbers without changing stock or logs', function () {
    $before = DB::table('inventory_batches')->orderBy('id')->get()->toJson();
    expect(Artisan::call('inventory:verify-consistency', ['--json' => true]))->toBe(1);
    $report = json_decode(Artisan::output(), true, flags: JSON_THROW_ON_ERROR);
    expect($report['checked'])->toBe(7);
    $batch = collect($report['mismatches'])->firstWhere('batch_id', 'B-1090');
    expect($batch)->toMatchArray(['quantity_received' => 80, 'sum_deltas' => -5, 'expected_remaining' => 75, 'actual_remaining' => 42, 'difference' => -33]);
    $receipt = collect($report['mismatches'])->firstWhere('batch_id', 'B-1120');
    expect($receipt)->toMatchArray(['quantity_received' => 200, 'sum_deltas' => 200, 'expected_remaining' => 400, 'actual_remaining' => 200, 'receipt_deltas' => 200]);
    expect(DB::table('inventory_batches')->orderBy('id')->get()->toJson())->toBe($before);
    $this->assertDatabaseCount('transaction_logs', 5);
    $this->assertDatabaseCount('audit_logs', 0);
});

test('diagnostic succeeds for a reconciled ledger', function () {
    foreach (InventoryBatch::withSum('transactionLogs', 'quantity_delta')->get() as $batch) {
        $batch->update(['quantity_remaining' => $batch->quantity_received + (int) $batch->transaction_logs_sum_quantity_delta]);
    }
    expect(Artisan::call('inventory:verify-consistency', ['--json' => true]))->toBe(0);
    expect(json_decode(Artisan::output(), true)['mismatches'])->toBe([]);
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
