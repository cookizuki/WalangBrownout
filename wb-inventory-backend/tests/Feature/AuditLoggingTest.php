<?php

use App\Models\AuditLog;
use App\Models\PendingPurchaseOrder;
use App\Models\User;
use App\Models\UserNotification;
use Database\Seeders\DatabaseSeeder;

beforeEach(function () {
    $this->withoutVite();
    $this->seed(DatabaseSeeder::class);
});

test('successful mutations audit the authenticated actor and target', function (string $email, string $method, string $url, array $input, string $action, string $target) {
    $actor = User::where('email', $email.'@walangbrownout.ph')->firstOrFail();
    $this->actingAs($actor)->json($method, $url, [...$input, 'user_id' => 999, 'user_name' => 'Spoofed'])->assertRedirect()->assertSessionHasNoErrors();
    $entry = AuditLog::sole();
    expect($entry->id)->toStartWith('AU-')
        ->and($entry->user_id)->toBe($actor->id)
        ->and($entry->user_name)->toBe($actor->name)
        ->and($entry->action)->toBe($action)
        ->and($entry->target)->toBe($target)
        ->and($entry->timestamp->isToday())->toBeTrue();
})->with([
    'add product' => ['kim', 'POST', '/admin/products', ['sku' => 'AUD-1', 'name' => 'Audited product', 'unitCost' => 100, 'reorderPoint' => 10, 'leadTimeDays' => 5, 'abc' => 'B', 'seasonalFlag' => false], 'Added product', 'SKU: AUD-1'],
    'edit product' => ['kim', 'PUT', '/admin/products/ACU-014', ['name' => 'Updated AC', 'unitCost' => 100, 'reorderPoint' => 10, 'leadTimeDays' => 5, 'abc' => 'B', 'seasonalFlag' => true], 'Updated product', 'SKU: ACU-014'],
    'add supplier' => ['kim', 'POST', '/admin/suppliers', ['name' => 'Audit supplier', 'contact' => 'Supplier contact'], 'Added supplier', 'Audit supplier'],
    'edit supplier' => ['kim', 'PUT', '/admin/suppliers/1', ['name' => 'Renamed supplier', 'contact' => 'Supplier contact'], 'Updated supplier', 'Renamed supplier'],
    'add location' => ['kim', 'POST', '/admin/locations', ['zone' => 'Z', 'aisle' => '9'], 'Added location', 'Z-09'],
    'edit location' => ['kim', 'PUT', '/admin/locations/1', ['description' => 'Updated zone'], 'Updated location', 'A-01'],
    'adjust batch' => ['nhimfa', 'POST', '/batches/B-1101/adjustment', ['batch_id' => 'B-1101', 'reason' => 'DAMAGE', 'quantity' => 1], 'Reported adjustment', 'Batch: B-1101'],
    'seasonal settings' => ['lizle', 'PUT', '/seasonal-config/ACU-014', ['startMonth' => 4, 'endMonth' => 6, 'multiplier' => '2.50'], 'Updated seasonal multiplier', "SKU: ACU-014 \u{2192} 2.5\u{00D7}"],
    'complete pick' => ['nhimfa', 'POST', '/picks/PK-4401/complete', [], 'Completed pick task', "PK-4401 \u{2014} Batch: B-1101, Quantity: 6"],
    'FIFO exception' => ['nhimfa', 'POST', '/picks/PK-4401/fifo-exception', ['batch_id' => 'B-1101', 'reason' => 'DAMAGED'], 'Reported FIFO exception', "PK-4401 \u{2014} Batch: B-1101, Reason: DAMAGED, Written off: 340, Replacement: B-1120"],
    'return' => ['nhimfa', 'POST', '/movements', ['batch_id' => 'B-1090', 'type' => 'RETURN', 'quantity' => 1], 'Logged return', "Batch: B-1090 \u{2014} Quantity: 1"],
    'write off' => ['nhimfa', 'POST', '/movements', ['batch_id' => 'B-1090', 'type' => 'WRITE_OFF', 'quantity' => 1], 'Wrote off stock', "Batch: B-1090 \u{2014} Quantity: 1"],
    'transfer' => ['nhimfa', 'POST', '/movements', ['batch_id' => 'B-1090', 'type' => 'TRANSFER', 'quantity' => 1, 'to_location_id' => 1], 'Transferred batch', "Batch: B-1090 \u{2014} Location: 3 \u{2192} 1"],
    'submit count' => ['nhimfa', 'POST', '/counts/CC-2203/submit', ['counted_qty' => 40], 'Submitted cycle count', "CC-2203 \u{2014} Counted: 40, Variance: -2"],
    'request recount' => ['nhimfa', 'POST', '/counts/CC-2201/recount', [], 'Requested recount', "CC-2201 \u{2192} CC-2201-R1"],
]);

test('receipts audit the receiving line and new batch', function () {
    $user = User::where('email', 'nhimfa@walangbrownout.ph')->firstOrFail();
    $this->actingAs($user)->post('/receiving/RC-7701/receive', ['quantity' => 1, 'expiration_date' => '2028-12-31'])->assertSessionHasNoErrors();
    $entry = AuditLog::sole();
    expect($entry->action)->toBe('Received delivery')->and($entry->user_id)->toBe($user->id)
        ->and($entry->target)->toStartWith("RC-7701 \u{2014} Batch: B-")->toEndWith('Quantity: 1');
});

test('acknowledging the same alert across users audits only the first actor', function () {
    $actor = User::where('email', 'kim@walangbrownout.ph')->firstOrFail();
    $this->actingAs($actor)->post('/alerts/A-THM-201-ROP/acknowledge')->assertRedirect();
    $this->actingAs(User::where('email', 'lizle@walangbrownout.ph')->firstOrFail())
        ->post('/alerts/A-THM-201-ROP/acknowledge')->assertRedirect();
    $entry = AuditLog::sole();
    expect($entry->action)->toBe('Acknowledged alert')->and($entry->target)->toBe('A-THM-201-ROP')
        ->and($entry->user_id)->toBe($actor->id);
});

test('draft and approval audit each actor once and duplicates add no audit', function () {
    $requester = User::where('email', 'lizle@walangbrownout.ph')->firstOrFail();
    $admin = User::where('email', 'nick@walangbrownout.ph')->firstOrFail();
    $this->actingAs($requester)->post('/reorder/THM-201/draft', ['quantity' => 60])->assertSessionHasNoErrors();
    $po = PendingPurchaseOrder::where('sku', 'THM-201')->firstOrFail();
    $this->post('/reorder/THM-201/draft', ['quantity' => 60])->assertSessionHasErrors('quantity');
    $this->assertDatabaseHas('audit_logs', ['action' => 'Drafted purchase order', 'target' => $po->id, 'user_id' => $requester->id]);
    $this->actingAs($admin)->post('/admin/po-approvals/'.$po->id.'/approve')->assertSessionHasNoErrors();
    $this->post('/admin/po-approvals/'.$po->id.'/approve')->assertSessionHasErrors('decision');
    $this->assertDatabaseHas('audit_logs', ['action' => 'Approved purchase order', 'target' => $po->id, 'user_id' => $admin->id]);
    $this->assertDatabaseCount('audit_logs', 2);
});

test('rejection audit retains the entire maximum length reason', function () {
    $admin = User::where('email', 'nick@walangbrownout.ph')->firstOrFail();
    $reason = str_repeat('r', 2000);
    $this->actingAs($admin)->post('/admin/po-approvals/PO-2041/reject', ['reason' => $reason])->assertSessionHasNoErrors();
    $entry = AuditLog::sole();
    expect($entry->action)->toBe('Rejected purchase order')
        ->and($entry->target)->toBe("PO-2041 \u{2014} Reason: {$reason}")
        ->and($entry->user_id)->toBe($admin->id);
});

test('invalid and unauthorized mutations do not produce audit entries', function () {
    $this->actingAs(User::where('email', 'kim@walangbrownout.ph')->firstOrFail());
    $this->post('/admin/products', [])->assertSessionHasErrors();
    $this->post('/admin/po-approvals/PO-2041/reject', ['reason' => ''])->assertSessionHasErrors('reason');
    $this->post('/alerts/not-an-alert/acknowledge')->assertNotFound();
    $this->actingAs(User::where('email', 'nhimfa@walangbrownout.ph')->firstOrFail());
    $this->post('/admin/po-approvals/PO-2041/approve')->assertForbidden();
    $this->assertDatabaseCount('audit_logs', 0);
});

test('sign in and sign out are attributed without storing credentials', function () {
    $this->post('/login', ['email' => 'kim@walangbrownout.ph', 'password' => 'wrong'])->assertSessionHasErrors();
    $this->assertDatabaseCount('audit_logs', 0);
    $this->post('/login', ['email' => 'kim@walangbrownout.ph', 'password' => 'walangbrownout'])->assertSessionHasNoErrors();
    $this->post('/logout')->assertRedirect();
    expect(AuditLog::pluck('action')->all())->toBe(['Signed in', 'Signed out']);
    foreach (AuditLog::all() as $entry) {
        expect($entry->user_name)->toBe('Kim Maturan')->and($entry->target)->toBe('kim@walangbrownout.ph');
    }
});

test('notification read auditing ignores already read notifications', function () {
    $user = User::where('email', 'kim@walangbrownout.ph')->firstOrFail();
    $notification = UserNotification::create(['user_id' => $user->id, 'title' => 'Update', 'detail' => 'Test']);
    $this->actingAs($user)->post('/notifications/'.$notification->id.'/read')->assertNoContent();
    $this->post('/notifications/'.$notification->id.'/read')->assertNoContent();
    $this->post('/notifications/read-all')->assertNoContent();
    expect(AuditLog::sole()->action)->toBe('Read notification');
    UserNotification::create(['user_id' => $user->id, 'title' => 'Update', 'detail' => 'Another']);
    $this->post('/notifications/read-all')->assertNoContent();
    $this->assertDatabaseHas('audit_logs', ['action' => 'Read all notifications', 'target' => '1 notifications', 'user_id' => $user->id]);
    $this->assertDatabaseCount('audit_logs', 2);
});
