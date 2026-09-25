<?php

use App\Models\InventoryBatch;
use App\Models\ReceivingLine;
use App\Models\TransactionLog;
use App\Models\User;
use App\Services\AlertService;
use Carbon\CarbonImmutable;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\ReceivingLineSeeder;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
    $this->travelTo(CarbonImmutable::parse('2026-09-25 12:00:00', 'UTC'));
});
test('receiving seeds preserve all ten lines and historical dates without requiring matching orders', function () {
    $this->seed(DatabaseSeeder::class);
    $this->seed(ReceivingLineSeeder::class);
    $this->assertDatabaseCount('receiving_lines', 10);
    foreach (['RC-7690' => '2026-06-10', 'RC-7695' => '2026-07-05', 'RC-7685' => '2026-05-19', 'RC-7688' => '2026-06-24', 'RC-7692' => '2026-06-08', 'RC-7696' => '2026-07-09'] as $id => $date) {
        $this->assertDatabaseHas('receiving_lines', ['id' => $id, 'status' => 'PUT_AWAY']);
        expect(ReceivingLine::findOrFail($id)->received_date->toDateString())->toBe($date);
    }
    $this->actingAs(User::where('email', 'nhimfa@walangbrownout.ph')->firstOrFail())->get('/receiving')->assertInertia(fn (Assert $page) => $page->component('Receiving/Index')->has('receivingLines', 10)->has('locations', 3)->where('receivingLines.0.id', 'RC-7704')->where('locations.0.quantity', 618)->where('locations.0.lotCount', 3));
});
test('warehouse login can receive partial then remaining approved delivery into separate batches and logs', function () {
    $this->seed(DatabaseSeeder::class);
    $this->post('/login', ['email' => 'nhimfa@walangbrownout.ph', 'password' => 'walangbrownout'])->assertSessionHasNoErrors();
    $count = InventoryBatch::count();
    $logs = TransactionLog::count();
    $this->post('/receiving/RC-7704/receive', ['quantity' => 17, 'expiration_date' => '2027-02-01', 'sku' => 'ACU-014', 'location_id' => 1, 'user_id' => 1])->assertRedirect('/receiving')->assertSessionHas('receivedBatch.quantity', 17);
    $batch = session('receivedBatch');
    expect($batch['dateReceived'])->toBe('2026-09-25');
    expect($batch['expirationDate'])->toBe('2027-02-01');
    $this->assertDatabaseHas('inventory_batches', ['id' => $batch['batchId'], 'sku' => 'THM-201', 'location_id' => 3, 'quantity_received' => 17, 'quantity_remaining' => 17]);
    $this->assertDatabaseHas('transaction_logs', ['batch_id' => $batch['batchId'], 'type' => 'RECEIPT', 'quantity_delta' => 17, 'channel' => 'WAREHOUSE', 'user_id' => User::where('email', 'nhimfa@walangbrownout.ph')->value('id')]);
    $this->assertDatabaseHas('receiving_lines', ['id' => 'RC-7704', 'quantity_received' => 17, 'status' => 'ARRIVED', 'received_date' => null]);
    $this->get('/batches?q=THM-201')->assertInertia(fn (Assert $page) => $page->has('batches', 2)->where('batches.1.id', $batch['batchId'])->where('batches.1.dateReceived', '2026-09-25'));
    $this->get('/receiving')->assertInertia(fn (Assert $page) => $page->where('locations.2.quantity', 111)->where('locations.2.lotCount', 3));
    $this->post('/receiving/RC-7704/receive', ['quantity' => 43, 'expiration_date' => '2027-03-01'])->assertRedirect('/receiving');
    $this->assertDatabaseHas('receiving_lines', ['id' => 'RC-7704', 'quantity_received' => 60, 'status' => 'PUT_AWAY']);
    expect(ReceivingLine::findOrFail('RC-7704')->received_date->toDateString())->toBe('2026-09-25');
    $this->assertDatabaseCount('inventory_batches', $count + 2);
    $this->assertDatabaseCount('transaction_logs', $logs + 2);
    $this->post('/receiving/RC-7704/receive', ['quantity' => 1, 'expiration_date' => '2027-03-01'])->assertSessionHasErrors('quantity');
    $this->assertDatabaseCount('inventory_batches', $count + 2);
    expect(app(AlertService::class)->compute()->pluck('id')->all())->not->toContain('A-RC-7704-OVERDUE');
});
test('invalid receipt creates no stock or transactions', function (array $data, array $errors) {
    $this->seed(DatabaseSeeder::class);
    $this->actingAs(User::where('email', 'nhimfa@walangbrownout.ph')->firstOrFail());
    $count = InventoryBatch::count();
    $logs = TransactionLog::count();
    $this->post('/receiving/RC-7704/receive', $data)->assertSessionHasErrors($errors);
    $this->assertDatabaseCount('inventory_batches', $count);
    $this->assertDatabaseCount('transaction_logs', $logs);
    $this->assertDatabaseHas('receiving_lines', ['id' => 'RC-7704', 'quantity_received' => 0, 'status' => 'IN_TRANSIT']);
})->with([
    'required' => [[], ['quantity', 'expiration_date']],
    'zero' => [['quantity' => 0, 'expiration_date' => '2027-01-01'], ['quantity']],
    'fractional' => [['quantity' => 1.5, 'expiration_date' => '2027-01-01'], ['quantity']],
    'over remaining' => [['quantity' => 61, 'expiration_date' => '2027-01-01'], ['quantity']],
    'bad date' => [['quantity' => 1, 'expiration_date' => '2027-02-30'], ['expiration_date']],
]);
test('only warehouse staff can access receiving', function (string $role) {
    $this->seed(DatabaseSeeder::class);
    $this->actingAs(User::factory()->create(['role' => $role]));
    $count = InventoryBatch::count();
    $this->get('/receiving')->assertForbidden();
    $this->post('/receiving/RC-7704/receive', ['quantity' => 1, 'expiration_date' => '2027-01-01'])->assertForbidden();
    $this->assertDatabaseCount('inventory_batches', $count);
})->with(['ADMIN', 'INVENTORY_STAFF']);
test('guests must log in to receiving', function () {
    $this->get('/receiving')->assertRedirect('/login');
    $this->post('/receiving/RC-7704/receive')->assertRedirect('/login');
});
test('receipt rolls back all changes when the transaction log fails', function () {
    $this->seed(DatabaseSeeder::class);
    $this->actingAs(User::where('email', 'nhimfa@walangbrownout.ph')->firstOrFail());
    $count = InventoryBatch::count();
    $logs = TransactionLog::count();
    TransactionLog::creating(function () {
        throw new RuntimeException('Receipt log failed');
    });
    $this->withoutExceptionHandling();
    try {
        $this->post('/receiving/RC-7704/receive', ['quantity' => 60, 'expiration_date' => '2027-01-01']);
        $this->fail('Expected storage failure');
    } catch (RuntimeException $e) {
        expect($e->getMessage())->toBe('Receipt log failed');
    } finally {
        TransactionLog::flushEventListeners();
    }
    $this->assertDatabaseCount('inventory_batches', $count);
    $this->assertDatabaseCount('transaction_logs', $logs);
    $this->assertDatabaseHas('receiving_lines', ['id' => 'RC-7704', 'quantity_received' => 0, 'status' => 'IN_TRANSIT', 'received_date' => null]);
});
test('overdue alerts require a past expected date and an incomplete line not put away', function (string $date, int $received, string $status, ?string $message) {
    $this->seed(DatabaseSeeder::class);
    ReceivingLine::findOrFail('RC-7704')->update(['expected_date' => $date, 'quantity_received' => $received, 'status' => $status]);
    $this->actingAs(User::where('email', 'nhimfa@walangbrownout.ph')->firstOrFail());
    $this->get('/alerts')->assertInertia(fn (Assert $page) => $page->where('alerts', function ($alerts) use ($message) {
        $alert = collect($alerts)->firstWhere('id', 'A-RC-7704-OVERDUE');

        return $message === null ? $alert === null : $alert['type'] === 'PO_OVERDUE' && $alert['message'] === $message;
    }));
})->with([
    ['2026-09-24', 0, 'IN_TRANSIT', "PO-3322 is 1 day overdue \u{2014} 0/60 units received"],
    ['2026-09-23', 17, 'ARRIVED', "PO-3322 is 2 days overdue \u{2014} 17/60 units received"],
    ['2026-09-25', 0, 'IN_TRANSIT', null], ['2026-09-26', 0, 'IN_TRANSIT', null],
    ['2026-09-24', 60, 'ARRIVED', null], ['2026-09-24', 0, 'PUT_AWAY', null],
]);
