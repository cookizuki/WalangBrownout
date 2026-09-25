<?php

use App\Http\Controllers\AlertController;
use App\Http\Controllers\BatchController;
use App\Http\Controllers\CycleCountController;
use App\Http\Controllers\DemoAccountController;
use App\Http\Controllers\MovementController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PickTaskController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\PurchaseOrderApprovalController;
use App\Http\Controllers\PurchaseOrderController;
use App\Http\Controllers\ReceivingController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\TransactionLogController;
use App\Http\Controllers\WarehouseLocationController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

// Public endpoint: returns the 4 seeded demo accounts for the login modal.
// Never returns passwords â€” name, email, role only.
Route::get('/demo-accounts', [DemoAccountController::class, 'index'])->name('demo-accounts.index');

Route::middleware(['auth', 'role:ADMIN'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/products', [ProductController::class, 'index'])->name('products.index');
    Route::post('/products', [ProductController::class, 'store'])->name('products.store');
    Route::put('/products/{product:sku}', [ProductController::class, 'update'])->name('products.update');
    Route::get('/suppliers-locations', [SupplierController::class, 'index'])->name('suppliers-locations.index');
    Route::post('/suppliers', [SupplierController::class, 'store'])->name('suppliers.store');
    Route::put('/suppliers/{supplier}', [SupplierController::class, 'update'])->name('suppliers.update');
    Route::post('/locations', [WarehouseLocationController::class, 'store'])->name('locations.store');
    Route::put('/locations/{location}', [WarehouseLocationController::class, 'update'])->name('locations.update');
});

Route::middleware('auth')->group(function () {
    Route::get('/batches', [BatchController::class, 'index'])->name('batches.index');
    Route::post('/batches/{batch}/adjustment', [BatchController::class, 'reportAdjustment'])
        ->middleware('role:ADMIN,WAREHOUSE_STAFF')->name('batches.adjustment');
});

require __DIR__.'/auth.php';

Route::middleware('auth')->group(function () {
    Route::get('/transactions', [TransactionLogController::class, 'index'])->middleware('role:INVENTORY_STAFF')->name('transactions.index');
    Route::get('/alerts', [AlertController::class, 'index'])->name('alerts.index');
    Route::post('/alerts/{alertId}/acknowledge', [AlertController::class, 'acknowledge'])->name('alerts.acknowledge');
});

Route::middleware(['auth', 'role:INVENTORY_STAFF'])->group(function () {
    Route::get('/reorder', [PurchaseOrderController::class, 'index'])->name('reorder.index');
    Route::post('/reorder/{product:sku}/draft', [PurchaseOrderController::class, 'draftStore'])->name('reorder.draft');
    Route::put('/seasonal-config/{product:sku}', [PurchaseOrderController::class, 'updateSeasonalConfig'])->name('seasonal-config.update');
});

Route::middleware(['auth', 'role:ADMIN'])->group(function () {
    Route::get('/admin/po-approvals', [PurchaseOrderApprovalController::class, 'index'])->name('admin.po-approvals.index');
    Route::post('/admin/po-approvals/{id}/approve', [PurchaseOrderApprovalController::class, 'approve'])->name('admin.po-approvals.approve');
    Route::post('/admin/po-approvals/{id}/reject', [PurchaseOrderApprovalController::class, 'reject'])->name('admin.po-approvals.reject');
});
Route::middleware('auth')->group(function () {
    Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::post('/notifications/read-all', [NotificationController::class, 'readAll'])->name('notifications.read-all');
    Route::post('/notifications/{id}/read', [NotificationController::class, 'read'])->name('notifications.read');
});

Route::middleware(['auth', 'role:WAREHOUSE_STAFF'])->group(function () {
    Route::get('/receiving', [ReceivingController::class, 'index'])->name('receiving.index');
    Route::post('/receiving/{line}/receive', [ReceivingController::class, 'receive'])->name('receiving.receive');
});

Route::middleware(['auth', 'role:WAREHOUSE_STAFF'])->group(function () {
    Route::get('/picks', [PickTaskController::class, 'index'])->name('picks.index');
    Route::post('/picks/{task}/complete', [PickTaskController::class, 'complete'])->name('picks.complete');
    Route::post('/picks/{task}/fifo-exception', [PickTaskController::class, 'fifoException'])->name('picks.fifo-exception');
});
Route::post('/movements', [MovementController::class, 'store'])->middleware(['auth', 'role:WAREHOUSE_STAFF,ADMIN'])->name('movements.store');
Route::get('/sales-orders', [PickTaskController::class, 'salesOrders'])->middleware(['auth', 'role:ADMIN,INVENTORY_STAFF'])->name('sales-orders.index');

Route::middleware(['auth', 'role:WAREHOUSE_STAFF,INVENTORY_STAFF'])->group(function () {
    Route::get('/counts', [CycleCountController::class, 'index'])->name('counts.index');
    Route::post('/counts/{count}/submit', [CycleCountController::class, 'submit'])->middleware('role:WAREHOUSE_STAFF')->name('counts.submit');
    Route::post('/counts/{count}/recount', [CycleCountController::class, 'recount'])->name('counts.recount');
});
