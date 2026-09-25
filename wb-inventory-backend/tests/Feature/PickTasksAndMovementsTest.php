<?php

use App\Models\InventoryBatch;
use App\Models\PickTask;
use App\Models\TransactionLog;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\PickTaskSeeder;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
});
test('warehouse sees the five seeded picks sorted by priority', function () {
    $this->seed(DatabaseSeeder::class);
    $this->seed(PickTaskSeeder::class);
    $this->assertDatabaseCount('pick_tasks', 5);
    $this->actingAs(User::where('email', 'nhimfa@walangbrownout.ph')->firstOrFail())->get('/picks')->assertInertia(fn (Assert $page) => $page->component('PickTasks/Index')->has('tasks', 5)->where('tasks.0.id', 'PK-4401')->where('tasks.1.id', 'PK-4402')->where('tasks.4.id', 'PK-4404')->where('tasks.0.assignedTo', 'Warehouse Staff')->has('movementOptions.batches', 7));
});
test('warehouse pick completes exactly once and records the assigned quantity as a sale', function () {
    $this->seed(DatabaseSeeder::class);
    $this->post('/login', ['email' => 'nhimfa@walangbrownout.ph', 'password' => 'walangbrownout'])->assertSessionHasNoErrors();
    $this->post('/picks/PK-4401/complete', ['quantity' => 300, 'batch_id' => 'B-1090', 'user_id' => 1])->assertRedirect('/picks');
    $this->post('/picks/PK-4401/complete')->assertRedirect('/picks');
    $this->assertDatabaseHas('pick_tasks', ['id' => 'PK-4401', 'status' => 'DONE']);
    $this->assertDatabaseHas('inventory_batches', ['id' => 'B-1101', 'quantity_remaining' => 334]);
    $this->assertDatabaseCount('transaction_logs', 6);
    $this->assertDatabaseHas('transaction_logs', ['batch_id' => 'B-1101', 'type' => 'SALE', 'quantity_delta' => -6, 'user_id' => User::where('email', 'nhimfa@walangbrownout.ph')->value('id'), 'channel' => 'WAREHOUSE']);
    $this->actingAs(User::where('email', 'lizle@walangbrownout.ph')->firstOrFail())->get('/sales-orders')->assertInertia(fn (Assert $page) => $page->where('orders.0.status', 'DONE'));
    $this->get('/transactions?type=SALE')->assertInertia(fn (Assert $page) => $page->has('transactions', 4)->where('transactions.0.quantityDelta', -6));
});
test('FIFO exception writes off the full batch and picks the oldest available same SKU batch', function (string $reason) {
    $this->seed(DatabaseSeeder::class);
    $this->actingAs(User::where('email', 'nhimfa@walangbrownout.ph')->firstOrFail());
    InventoryBatch::create(['id' => 'B-older-replacement', 'sku' => 'ACU-014', 'location_id' => 3, 'quantity_received' => 20, 'quantity_remaining' => 20, 'date_received' => '2026-01-01']);
    InventoryBatch::create(['id' => 'B-depleted', 'sku' => 'ACU-014', 'location_id' => 2, 'quantity_received' => 30, 'quantity_remaining' => 0, 'date_received' => '2025-01-01']);
    $this->post('/picks/PK-4401/fifo-exception', ['reason' => $reason, 'batch_id' => 'B-1101'])->assertRedirect('/picks')->assertSessionHas('fifoMessage', 'PK-4401 reassigned to B-older-replacement.');
    $this->assertDatabaseHas('inventory_batches', ['id' => 'B-1101', 'quantity_remaining' => 0]);
    $this->assertDatabaseHas('pick_tasks', ['id' => 'PK-4401', 'batch_id' => 'B-older-replacement', 'location_id' => 3, 'status' => 'PENDING']);
    $this->assertDatabaseHas('transaction_logs', ['batch_id' => 'B-1101', 'type' => 'WRITE_OFF', 'quantity_delta' => -340, 'note' => $reason." \u{2014} flagged via FIFO exception on PK-4401"]);
    $this->post('/picks/PK-4401/fifo-exception', ['reason' => $reason, 'batch_id' => 'B-1101'])->assertSessionHasErrors('task');
    $this->assertDatabaseHas('inventory_batches', ['id' => 'B-older-replacement', 'quantity_remaining' => 20]);
    $this->assertDatabaseCount('transaction_logs', 6);
})->with(['DAMAGED', 'MISSING']);
test('no replacement leaves the task blocked and retry does not duplicate a write off', function () {
    $this->seed(DatabaseSeeder::class);
    $this->actingAs(User::where('email', 'nhimfa@walangbrownout.ph')->firstOrFail());
    $this->post('/picks/PK-4403/fifo-exception', ['reason' => 'MISSING', 'batch_id' => 'B-1090'])->assertRedirect('/picks')->assertSessionHas('fifoMessage', 'Batch flagged. No replacement FIFO batch is available; picking remains blocked.');
    $this->post('/picks/PK-4403/fifo-exception', ['reason' => 'MISSING', 'batch_id' => 'B-1090'])->assertRedirect('/picks');
    $this->post('/picks/PK-4403/complete')->assertSessionHasErrors('task');
    $this->assertDatabaseHas('pick_tasks', ['id' => 'PK-4403', 'batch_id' => 'B-1090', 'status' => 'PENDING']);
    $this->assertDatabaseHas('inventory_batches', ['id' => 'B-1090', 'quantity_remaining' => 0]);
    $this->assertDatabaseCount('transaction_logs', 6);
});
test('completed tasks and invalid reasons cannot write off stock', function () {
    $this->seed(DatabaseSeeder::class);
    $this->actingAs(User::where('email', 'nhimfa@walangbrownout.ph')->firstOrFail());
    $this->post('/picks/PK-4405/fifo-exception', ['reason' => 'DAMAGED', 'batch_id' => 'B-1130'])->assertSessionHasErrors('task');
    $this->post('/picks/PK-4401/fifo-exception', ['reason' => 'OTHER', 'batch_id' => 'B-1101'])->assertSessionHasErrors('reason');
    $this->post('/picks/PK-4401/fifo-exception', ['reason' => 'MISSING'])->assertSessionHasErrors('batch_id');
    $this->assertDatabaseCount('transaction_logs', 5);
    $this->assertDatabaseHas('inventory_batches', ['id' => 'B-1130', 'quantity_remaining' => 52]);
    $this->assertDatabaseHas('inventory_batches', ['id' => 'B-1101', 'quantity_remaining' => 340]);
});
test('authorized movements update stock or whole batch location with correct deltas', function (string $role, string $type, int $stock, int $delta, int $location) {
    $this->seed(DatabaseSeeder::class);
    $user = User::factory()->create(['role' => $role]);
    $this->actingAs($user);
    $this->from('/batches')->post('/movements', ['batch_id' => 'B-1101', 'type' => $type, 'quantity' => 7, 'to_location_id' => 2, 'user_id' => 999])->assertRedirect('/batches');
    $this->assertDatabaseHas('inventory_batches', ['id' => 'B-1101', 'quantity_remaining' => $stock, 'location_id' => $location]);
    $this->assertDatabaseHas('transaction_logs', ['batch_id' => 'B-1101', 'type' => $type, 'quantity_delta' => $delta, 'user_id' => $user->id, 'channel' => 'WAREHOUSE']);
})->with([
    ['WAREHOUSE_STAFF', 'RETURN', 347, 7, 1], ['WAREHOUSE_STAFF', 'WRITE_OFF', 333, -7, 1], ['WAREHOUSE_STAFF', 'TRANSFER', 340, 0, 2],
    ['ADMIN', 'RETURN', 347, 7, 1], ['ADMIN', 'WRITE_OFF', 333, -7, 1], ['ADMIN', 'TRANSFER', 340, 0, 2],
]);
test('invalid movements have no effects', function (array $overrides, string $error) {
    $this->seed(DatabaseSeeder::class);
    $this->actingAs(User::where('email', 'nhimfa@walangbrownout.ph')->firstOrFail());
    $this->post('/movements', array_replace(['batch_id' => 'B-1101', 'type' => 'RETURN', 'quantity' => 1], $overrides))->assertSessionHasErrors($error);
    $this->assertDatabaseHas('inventory_batches', ['id' => 'B-1101', 'quantity_remaining' => 340, 'location_id' => 1]);
    $this->assertDatabaseCount('transaction_logs', 5);
})->with([
    [['quantity' => 0], 'quantity'], [['quantity' => -2], 'quantity'], [['quantity' => 1.5], 'quantity'],
    [['type' => 'WRITE_OFF', 'quantity' => 341], 'quantity'], [['quantity' => 2147483647], 'quantity'],
    [['type' => 'TRANSFER'], 'to_location_id'], [['type' => 'TRANSFER', 'to_location_id' => 999], 'to_location_id'],
    [['batch_id' => 'not-a-batch'], 'batch_id'], [['type' => 'SALE'], 'type'],
]);
test('sales orders derive quantities highest priority and mixed statuses without writes', function (string $email) {
    $this->seed(DatabaseSeeder::class);
    PickTask::findOrFail('PK-4404')->update(['order_ref' => 'SO-20881', 'status' => 'DONE']);
    PickTask::findOrFail('PK-4403')->update(['order_ref' => 'SO-20881']);
    $this->actingAs(User::where('email', $email)->firstOrFail())->get('/sales-orders')->assertInertia(fn (Assert $page) => $page->component('SalesOrders/Index')->has('orders', 3)->where('orders.0.orderRef', 'SO-20881')->where('orders.0.totalQty', 17)->where('orders.0.priority', 'HIGH')->where('orders.0.status', 'IN_PROGRESS')->has('orders.0.lines', 3)->where('orders.1.status', 'IN_PROGRESS')->where('orders.2.status', 'DONE'));
    $this->assertDatabaseCount('transaction_logs', 5);
})->with(['kim@walangbrownout.ph', 'lizle@walangbrownout.ph']);
test('pick routes reject non warehouse roles', function (string $role) {
    $this->seed(DatabaseSeeder::class);
    $this->actingAs(User::factory()->create(['role' => $role]));
    $this->get('/picks')->assertForbidden();
    $this->post('/picks/PK-4401/complete')->assertForbidden();
    $this->post('/picks/PK-4401/fifo-exception', ['reason' => 'DAMAGED', 'batch_id' => 'B-1101'])->assertForbidden();
    $this->assertDatabaseCount('transaction_logs', 5);
})->with(['ADMIN', 'INVENTORY_STAFF']);
test('warehouse cannot see sales orders and inventory staff cannot use movements', function () {
    $this->seed(DatabaseSeeder::class);
    $this->actingAs(User::factory()->create(['role' => 'WAREHOUSE_STAFF']))->get('/sales-orders')->assertForbidden();
    $this->actingAs(User::factory()->create(['role' => 'INVENTORY_STAFF']))->post('/movements', ['batch_id' => 'B-1101', 'type' => 'RETURN', 'quantity' => 4])->assertForbidden();
    $this->get('/sales-orders')->assertInertia(fn (Assert $page) => $page->where('movementOptions', null));
    $this->assertDatabaseCount('transaction_logs', 5);
});
test('guests must authenticate for picks sales orders and movements', function () {
    $this->get('/picks')->assertRedirect('/login');
    $this->get('/sales-orders')->assertRedirect('/login');
    $this->post('/picks/PK-4401/complete')->assertRedirect('/login');
    $this->post('/picks/PK-4401/fifo-exception')->assertRedirect('/login');
    $this->post('/movements')->assertRedirect('/login');
});
test('pick and movement mutations roll back when logging fails', function (string $url, array $data) {
    $this->seed(DatabaseSeeder::class);
    $this->actingAs(User::where('email', 'nhimfa@walangbrownout.ph')->firstOrFail());
    TransactionLog::creating(function () {
        throw new RuntimeException('Log unavailable');
    });
    $this->withoutExceptionHandling();
    try {
        $this->post($url, $data);
        $this->fail('Expected failure');
    } catch (RuntimeException $e) {
        expect($e->getMessage())->toBe('Log unavailable');
    } finally {
        TransactionLog::flushEventListeners();
    }
    $this->assertDatabaseHas('inventory_batches', ['id' => 'B-1101', 'quantity_remaining' => 340, 'location_id' => 1]);
    $this->assertDatabaseHas('pick_tasks', ['id' => 'PK-4401', 'status' => 'PENDING', 'batch_id' => 'B-1101']);
    $this->assertDatabaseCount('transaction_logs', 5);
})->with([
    ['/picks/PK-4401/complete', []], ['/picks/PK-4401/fifo-exception', ['reason' => 'DAMAGED', 'batch_id' => 'B-1101']],
    ['/movements', ['batch_id' => 'B-1101', 'type' => 'RETURN', 'quantity' => 4]],
]);
