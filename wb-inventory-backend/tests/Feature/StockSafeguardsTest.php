<?php

use App\Models\CycleCount;
use App\Models\InventoryBatch;
use App\Models\TransactionLog;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;

beforeEach(function () {
    $this->withoutVite();
    $this->seed(DatabaseSeeder::class);
});

test('excessive reductions leave stock and logs untouched', function (string $url, array $data, string $field) {
    $this->actingAs(User::where('email', 'nhimfa@walangbrownout.ph')->firstOrFail());
    $before = InventoryBatch::orderBy('id')->get()->toJson();
    CycleCount::findOrFail('CC-2203')->update(['system_qty' => 100]);
    $this->post($url, $data)->assertSessionHasErrors($field);
    expect(InventoryBatch::orderBy('id')->get()->toJson())->toBe($before);
    $this->assertDatabaseCount('transaction_logs', 5);
    $this->assertDatabaseCount('audit_logs', 0);
})->with([
    ['/batches/B-1101/adjustment', ['batch_id' => 'B-1101', 'reason' => 'DAMAGE', 'quantity' => 500], 'quantity'],
    ['/batches/B-1101/adjustment', ['batch_id' => 'B-1101', 'reason' => 'LOSS', 'quantity' => 500], 'quantity'],
    ['/batches/B-1101/adjustment', ['batch_id' => 'B-1101', 'reason' => 'CORRECTION', 'quantity' => -500], 'quantity'],
    ['/movements', ['batch_id' => 'B-1101', 'type' => 'WRITE_OFF', 'quantity' => 500], 'quantity'],
    ['/counts/CC-2203/submit', ['counted_qty' => 0], 'counted_qty'],
]);

test('ACU count uses both A-01 batches FIFO and additions use newest', function (int $counted, int $old, int $new, array $deltas) {
    CycleCount::findOrFail('CC-2201')->update(['counted_qty' => null, 'status' => 'PENDING']);
    $this->actingAs(User::where('email', 'nhimfa@walangbrownout.ph')->firstOrFail());
    $this->post('/counts/CC-2201/submit', ['counted_qty' => $counted])->assertSessionHasNoErrors();
    expect(InventoryBatch::findOrFail('B-1101')->quantity_remaining)->toBe($old);
    expect(InventoryBatch::findOrFail('B-1120')->quantity_remaining)->toBe($new);
    expect(TransactionLog::where('sku', 'ACU-014')->where('type', 'ADJUSTMENT')->orderBy('batch_id')->pluck('quantity_delta')->all())->toBe($deltas);
})->with([[100, 0, 100, [-340, -100]], [550, 340, 210, [10]]]);

test('inactive existing sessions are revoked on reads and writes', function (string $method, string $url) {
    $user = User::where('email', 'nhimfa@walangbrownout.ph')->firstOrFail();
    $this->actingAs($user);
    User::whereKey($user->id)->update(['status' => 'Inactive']);
    $this->{$method}($url)->assertForbidden();
    $this->assertGuest();
    $this->assertDatabaseCount('transaction_logs', 5);
})->with([['get', '/my-day'], ['post', '/picks/PK-4401/complete']]);

test('last active admin cannot be deactivated or demoted', function (string $role, string $status) {
    $admin = User::where('email', 'kim@walangbrownout.ph')->firstOrFail();
    User::where('role', 'ADMIN')->where('id', '!=', $admin->id)->update(['status' => 'Inactive']);
    $this->actingAs($admin)->put('/admin/users/'.$admin->id, ['name' => $admin->name, 'email' => $admin->email, 'role' => $role, 'status' => $status])
        ->assertSessionHasErrors(['role' => 'At least one active administrator is required.']);
    $this->assertDatabaseHas('users', ['id' => $admin->id, 'role' => 'ADMIN', 'status' => 'Active']);
})->with([['ADMIN', 'Inactive'], ['WAREHOUSE_STAFF', 'Active']]);
