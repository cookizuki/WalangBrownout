<?php

use App\Models\PendingPurchaseOrder;
use App\Models\User;
use App\Models\UserNotification;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\PurchaseOrderSeeder;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
});

test('admin sees the pending seed and the three historical orders are seeded exactly once', function () {
    $this->seed(DatabaseSeeder::class);
    $this->seed(PurchaseOrderSeeder::class);
    $this->actingAs(User::where('email', 'kim@walangbrownout.ph')->firstOrFail());

    $this->get('/admin/po-approvals')->assertInertia(fn (Assert $page) => $page->component('Admin/PurchaseOrderApprovals')
        ->has('pending', 1)->where('pending.0.poNumber', 'PO-2041')->where('pending.0.requestedBy', 'Kim Maturan')
        ->where('pending.0.unitCost', 4800)->where('pending.0.totalCost', 3840000));
    $this->assertDatabaseCount('purchase_orders', 3);
    $this->assertDatabaseHas('purchase_orders', ['id' => 'PO-3320', 'status' => 'SUBMITTED', 'quantity' => 300, 'unit_cost' => 18500]);
    $this->assertDatabaseHas('purchase_orders', ['id' => 'PO-3321', 'status' => 'RECEIVED', 'quantity' => 200, 'unit_cost' => 1250]);
    $this->assertDatabaseHas('purchase_orders', ['id' => 'PO-3322', 'status' => 'APPROVED', 'quantity' => 60, 'unit_cost' => 4800]);
    $this->assertDatabaseCount('notifications', 0);
});

test('admin approval moves the pending quote and notifies its actual requester once', function () {
    $this->seed(DatabaseSeeder::class);
    $this->post('/login', ['email' => 'nick@walangbrownout.ph', 'password' => 'walangbrownout'])->assertSessionHasNoErrors();

    $this->post('/admin/po-approvals/PO-2041/approve', ['user_id' => 999, 'unit_cost' => 1])->assertRedirect('/admin/po-approvals');

    $this->assertDatabaseMissing('pending_purchase_orders', ['id' => 'PO-2041']);
    $this->assertDatabaseHas('purchase_orders', ['id' => 'PO-2041', 'sku' => 'ACU-014', 'supplier_id' => 1, 'quantity' => 800, 'unit_cost' => 4800, 'status' => 'APPROVED']);
    $this->get('/admin/po-approvals')->assertInertia(fn (Assert $page) => $page->has('pending', 0));
    $this->post('/admin/po-approvals/PO-2041/approve')->assertSessionHasErrors('decision');
    $this->post('/admin/po-approvals/PO-2041/reject', ['reason' => 'Too late'])->assertSessionHasErrors('decision');
    $this->assertDatabaseCount('notifications', 1);
    $this->assertDatabaseCount('purchase_orders', 4);
    $this->post('/logout');
    $this->post('/login', ['email' => 'kim@walangbrownout.ph', 'password' => 'walangbrownout'])->assertSessionHasNoErrors();
    $this->getJson('/notifications')->assertJsonCount(1, 'notifications')
        ->assertJsonPath('notifications.0.title', 'Purchase order approved')
        ->assertJsonPath('notifications.0.detail', 'PO-2041 — Portable AC Unit 1.5HP was approved and can proceed.')
        ->assertJsonPath('notifications.0.read', false);
});

test('rejection removes the draft and sends the trimmed reason to the requester', function () {
    $this->seed(DatabaseSeeder::class);
    $lizle = User::where('email', 'lizle@walangbrownout.ph')->firstOrFail();
    $this->actingAs($lizle)->post('/reorder/THM-201/draft', ['quantity' => 60])->assertSessionHasNoErrors();
    $po = PendingPurchaseOrder::where('sku', 'THM-201')->firstOrFail();
    $this->actingAs(User::where('email', 'kim@walangbrownout.ph')->firstOrFail());

    $this->post('/admin/po-approvals/'.$po->id.'/reject', ['reason' => '  Price is too high.  '])->assertRedirect('/admin/po-approvals');

    $this->assertDatabaseMissing('pending_purchase_orders', ['id' => $po->id]);
    $this->assertDatabaseMissing('purchase_orders', ['id' => $po->id]);
    $this->actingAs($lizle)->getJson('/notifications')->assertJsonCount(1, 'notifications')
        ->assertJsonPath('notifications.0.title', 'Purchase order rejected')
        ->assertJsonPath('notifications.0.detail', "{$po->id} — Smart Thermostat Gen 3 was rejected. Price is too high.");
    $this->post('/reorder/THM-201/draft', ['quantity' => 60])->assertSessionHasNoErrors();
});

test('rejection requires a nonempty reason', function ($reason) {
    $this->seed(DatabaseSeeder::class);
    $this->actingAs(User::where('email', 'kim@walangbrownout.ph')->firstOrFail());

    $this->post('/admin/po-approvals/PO-2041/reject', ['reason' => $reason])->assertSessionHasErrors('reason');

    $this->assertDatabaseHas('pending_purchase_orders', ['id' => 'PO-2041']);
    $this->assertDatabaseCount('notifications', 0);
    $this->assertDatabaseCount('purchase_orders', 3);
})->with([null, '', '   ', str_repeat('x', 2001)]);

test('staff cannot view or resolve the admin approval queue', function (string $email) {
    $this->seed(DatabaseSeeder::class);
    $this->actingAs(User::where('email', $email)->firstOrFail());

    $this->get('/admin/po-approvals')->assertForbidden();
    $this->post('/admin/po-approvals/PO-2041/approve')->assertForbidden();
    $this->post('/admin/po-approvals/PO-2041/reject', ['reason' => 'Denied'])->assertForbidden();

    $this->assertDatabaseHas('pending_purchase_orders', ['id' => 'PO-2041']);
    $this->assertDatabaseCount('notifications', 0);
})->with(['lizle@walangbrownout.ph', 'nhimfa@walangbrownout.ph']);

test('notification endpoints isolate every user and mark reads idempotently', function (string $email) {
    $this->seed(DatabaseSeeder::class);
    $user = User::where('email', $email)->firstOrFail();
    $other = User::where('id', '!=', $user->id)->firstOrFail();
    $mine = UserNotification::create(['user_id' => $user->id, 'title' => 'Mine', 'detail' => 'Own detail']);
    $second = UserNotification::create(['user_id' => $user->id, 'title' => 'Newer', 'detail' => 'Newest']);
    $foreign = UserNotification::create(['user_id' => $other->id, 'title' => 'Private', 'detail' => 'Other detail']);
    $this->actingAs($user);

    $this->getJson('/notifications')->assertJsonCount(2, 'notifications')->assertJsonPath('notifications.0.id', $second->id)->assertJsonMissing(['title' => 'Private']);
    $this->postJson('/notifications/'.$foreign->id.'/read')->assertNotFound();
    $this->postJson('/notifications/'.$mine->id.'/read')->assertNoContent();
    $this->postJson('/notifications/'.$mine->id.'/read')->assertNoContent();
    $this->assertDatabaseHas('notifications', ['id' => $mine->id, 'read' => true]);
    $this->assertDatabaseHas('notifications', ['id' => $second->id, 'read' => false]);
    $this->postJson('/notifications/read-all')->assertNoContent();
    $this->postJson('/notifications/read-all')->assertNoContent();
    $this->assertDatabaseHas('notifications', ['id' => $second->id, 'read' => true]);
    $this->assertDatabaseHas('notifications', ['id' => $foreign->id, 'read' => false]);
    $this->getJson('/notifications')->assertJsonPath('notifications.0.read', true)->assertJsonPath('notifications.1.read', true);
})->with(['kim@walangbrownout.ph', 'lizle@walangbrownout.ph', 'nhimfa@walangbrownout.ph']);

test('guests cannot use approvals or notifications', function () {
    $this->get('/admin/po-approvals')->assertRedirect('/login');
    $this->post('/admin/po-approvals/PO-2041/approve')->assertRedirect('/login');
    $this->post('/admin/po-approvals/PO-2041/reject')->assertRedirect('/login');
    $this->getJson('/notifications')->assertUnauthorized();
    $this->postJson('/notifications/1/read')->assertUnauthorized();
    $this->postJson('/notifications/read-all')->assertUnauthorized();
});

test('notification storage failure rolls back the entire decision', function (string $action) {
    $this->seed(DatabaseSeeder::class);
    $this->actingAs(User::where('email', 'kim@walangbrownout.ph')->firstOrFail());
    UserNotification::creating(function (): void {
        throw new RuntimeException('Simulated notification failure');
    });

    try {
        $this->post('/admin/po-approvals/PO-2041/'.$action, ['reason' => 'Not needed'])->assertServerError();
        $this->assertDatabaseHas('pending_purchase_orders', ['id' => 'PO-2041']);
        $this->assertDatabaseMissing('purchase_orders', ['id' => 'PO-2041']);
        $this->assertDatabaseCount('notifications', 0);
    } finally {
        UserNotification::flushEventListeners();
    }
})->with(['approve', 'reject']);
