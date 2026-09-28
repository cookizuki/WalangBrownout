<?php

use App\Models\InventoryBatch;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
});
test('all four seeded accounts land on their first permitted page and every navigation route is enforced', function (string $email, string $role, array $keys, string $landing) {
    $this->seed(DatabaseSeeder::class);
    $this->actingAs(User::where('email', $email)->firstOrFail());
    $this->get('/')->assertRedirect($landing);
    $this->get('/dashboard')->assertRedirect($landing);
    $this->get($landing)->assertInertia(fn (Assert $page) => $page->where('shell.navigation', fn ($nav) => collect($nav)->pluck('key')->all() === $keys));
    foreach (config('navigation.pages') as $key => $meta) {
        $response = $this->get($meta['url']);
        if (in_array($key, $keys, true)) {
            $response->assertOk();
        } else {
            $response->assertForbidden();
        }
    }
})->with([
    ['kim@walangbrownout.ph', 'ADMIN', ['overview', 'inventory', 'batches', 'alerts', 'salesorders', 'reports', 'poapprovals', 'products', 'suppliers', 'permissions', 'admin'], '/overview'],
    ['nick@walangbrownout.ph', 'ADMIN', ['overview', 'inventory', 'batches', 'alerts', 'salesorders', 'reports', 'poapprovals', 'products', 'suppliers', 'permissions', 'admin'], '/overview'],
    ['lizle@walangbrownout.ph', 'INVENTORY_STAFF', ['myday', 'inventory', 'counts', 'txlog', 'reorder', 'salesorders', 'batches', 'alerts'], '/my-day'],
    ['nhimfa@walangbrownout.ph', 'WAREHOUSE_STAFF', ['myday', 'counts', 'picks', 'receiving', 'batches', 'alerts'], '/my-day'],
]);
test('inventory and overview reflect live quantities alerts and export permissions', function () {
    $this->seed(DatabaseSeeder::class);
    InventoryBatch::findOrFail('B-1090')->update(['quantity_remaining' => 99]);
    $this->actingAs(User::where('email', 'kim@walangbrownout.ph')->firstOrFail());
    $this->get('/inventory')->assertInertia(fn (Assert $page) => $page->where('canExport', false)->where('products', fn ($products) => collect($products)->firstWhere('sku', 'THM-201')['onHand'] === 99));
    $this->get('/overview')->assertInertia(fn (Assert $page) => $page->has('transactions', 5)->has('products', 5)->has('batches', 7));
    $this->post('/alerts/A-CC-2201-VAR/acknowledge', ['return_to' => 'overview'])->assertRedirect('/overview');
    $this->get('/overview')->assertInertia(fn (Assert $page) => $page->where('alerts', fn ($alerts) => ! collect($alerts)->contains('id', 'A-CC-2201-VAR')));
    $this->actingAs(User::where('email', 'lizle@walangbrownout.ph')->firstOrFail())->get('/inventory')->assertInertia(fn (Assert $page) => $page->where('canExport', true));
});
test('my day supplies live role queues', function () {
    $this->seed(DatabaseSeeder::class);
    $this->actingAs(User::where('email', 'nhimfa@walangbrownout.ph')->firstOrFail())->get('/my-day')->assertInertia(fn (Assert $page) => $page->where('role', 'WAREHOUSE_STAFF')->has('pickTasks', 5)->has('receivingLines', 10));
    $this->actingAs(User::where('email', 'lizle@walangbrownout.ph')->firstOrFail())->get('/my-day')->assertInertia(fn (Assert $page) => $page->where('role', 'INVENTORY_STAFF')->has('cycleCounts', 5));
});
test('admin users are editable audited and inactive users cannot log in or retain access', function () {
    $this->seed(DatabaseSeeder::class);
    $admin = User::where('email', 'kim@walangbrownout.ph')->firstOrFail();
    $this->actingAs($admin);
    $this->post('/admin/users', ['name' => 'Test User', 'email' => 'new@example.test', 'role' => 'WAREHOUSE_STAFF', 'status' => 'Active', 'password' => 'secret-password'])->assertRedirect('/admin/users');
    $user = User::where('email', 'new@example.test')->firstOrFail();
    $this->put('/admin/users/'.$user->id, ['name' => $user->name, 'email' => $user->email, 'role' => 'INVENTORY_STAFF', 'status' => 'Inactive'])->assertRedirect('/admin/users');
    $this->assertDatabaseHas('audit_logs', ['action' => 'Deactivated user', 'target' => $user->email]);
    $this->put('/admin/users/'.$admin->id, ['name' => $admin->name, 'email' => $admin->email, 'role' => 'WAREHOUSE_STAFF', 'status' => 'Active'])->assertSessionHasErrors('role');
    $this->actingAs($user->fresh())->get('/my-day')->assertForbidden();
    $this->post('/logout');
    $this->post('/login', ['email' => $user->email, 'password' => 'secret-password'])->assertSessionHasErrors('email');
    $this->assertGuest();
});
test('non admins cannot manage users or view audit trail', function (string $role) {
    $this->seed(DatabaseSeeder::class);
    $this->actingAs(User::factory()->create(['role' => $role]));
    $this->get('/admin/audit')->assertForbidden();
    $this->post('/admin/users', [])->assertForbidden();
    $this->put('/admin/users/'.User::where('email', 'kim@walangbrownout.ph')->value('id'), [])->assertForbidden();
})->with(['INVENTORY_STAFF', 'WAREHOUSE_STAFF']);
