<?php

use App\Enums\Role;
use App\Models\Product;
use App\Models\Supplier;
use App\Models\User;
use App\Models\WarehouseLocation;
use Database\Seeders\CategorySeeder;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\DemoUserSeeder;
use Database\Seeders\ProductSeeder;
use Database\Seeders\SupplierSeeder;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
});

function catalogProductInput(array $overrides = []): array
{
    return array_replace([
        'sku' => 'TEST-101', 'name' => 'Test cooling unit', 'unitCost' => 1500.25,
        'reorderPoint' => 55, 'leadTimeDays' => 10, 'abc' => 'B', 'seasonalFlag' => true,
    ], $overrides);
}

dataset('catalog endpoints', [
    ['GET', '/admin/products'], ['POST', '/admin/products'], ['PUT', '/admin/products/THM-201'],
    ['GET', '/admin/suppliers-locations'], ['POST', '/admin/suppliers'], ['PUT', '/admin/suppliers/1'],
    ['POST', '/admin/locations'], ['PUT', '/admin/locations/1'],
]);

test('guests must log in for every catalog endpoint', function (string $method, string $url) {
    $this->call($method, $url)->assertRedirect('/login');
})->with('catalog endpoints');

test('staff receive 403 for every catalog endpoint without changing inventory', function (string $method, string $url, Role $role) {
    $this->seed(DatabaseSeeder::class);
    $this->actingAs(User::factory()->create(['role' => $role]));
    $products = Product::all()->toArray();
    $suppliers = Supplier::all()->toArray();
    $locations = WarehouseLocation::all()->toArray();

    $this->call($method, $url, catalogProductInput())->assertForbidden();

    expect(Product::all()->toArray())->toBe($products);
    expect(Supplier::all()->toArray())->toBe($suppliers);
    expect(WarehouseLocation::all()->toArray())->toBe($locations);
})->with('catalog endpoints')->with([Role::INVENTORY_STAFF, Role::WAREHOUSE_STAFF]);

test('seeded admin can log in and persist a product with computed defaults after refresh', function () {
    $this->seed(DatabaseSeeder::class);
    $this->post('/login', ['email' => 'kim@walangbrownout.ph', 'password' => 'walangbrownout'])->assertSessionHasNoErrors();
    $this->assertAuthenticatedAs(User::where('email', 'kim@walangbrownout.ph')->firstOrFail());
    $this->get('/admin/products')->assertInertia(fn (Assert $page) => $page->component('Admin/ProductCatalog')->has('products', 5));

    $this->post('/admin/products', catalogProductInput())->assertSessionHasNoErrors()->assertRedirect('/admin/products');

    $this->assertDatabaseHas('products', [
        'sku' => 'TEST-101', 'name' => 'Test cooling unit', 'unit_cost' => 1500.25,
        'category_id' => 1, 'supplier_id' => 1, 'reorder_quantity' => 110,
        'avg_daily_usage' => 3, 'seasonal_factor' => 2, 'safety_stock' => 11, 'is_fifo_critical' => false,
    ]);
    $this->get('/admin/products')->assertInertia(fn (Assert $page) => $page
        ->component('Admin/ProductCatalog')->has('products', 6)
        ->where('products', fn ($products) => collect($products)->contains(fn ($p) => $p['sku'] === 'TEST-101' && $p['reorderQuantity'] === 110 && $p['avgDailyUsage'] == 3)));
});

test('seeded inventory staff login cannot visit the product catalog', function () {
    $this->seed(DemoUserSeeder::class);
    $this->post('/login', ['email' => 'lizle@walangbrownout.ph', 'password' => 'walangbrownout'])->assertSessionHasNoErrors();

    $this->get('/admin/products')->assertForbidden();
});

test('nonseasonal product creation uses a minimum daily usage of one', function () {
    $this->seed([CategorySeeder::class, SupplierSeeder::class]);
    $this->actingAs(User::factory()->create(['role' => Role::ADMIN]));

    $this->post('/admin/products', catalogProductInput(['seasonalFlag' => false, 'reorderPoint' => 1]))->assertSessionHasNoErrors();

    $this->assertDatabaseHas('products', ['sku' => 'TEST-101', 'avg_daily_usage' => 1, 'seasonal_factor' => null, 'reorder_quantity' => 2, 'safety_stock' => 0]);
});

test('product editing preserves SKU references and creation defaults', function () {
    $this->seed(DatabaseSeeder::class);
    $this->actingAs(User::factory()->create(['role' => Role::ADMIN]));

    $this->put('/admin/products/THM-201', catalogProductInput([
        'sku' => 'CHANGED', 'unitCost' => 4999.50, 'reorderPoint' => 90,
        'supplier_id' => 1, 'reorder_quantity' => 999, 'avg_daily_usage' => 999,
    ]))->assertSessionHasNoErrors()->assertRedirect('/admin/products');

    $this->assertDatabaseHas('products', [
        'sku' => 'THM-201', 'unit_cost' => 4999.50, 'reorder_point' => 90, 'supplier_id' => 3,
        'reorder_quantity' => 60, 'avg_daily_usage' => 4, 'safety_stock' => 15, 'seasonal_factor' => 2,
    ]);
    $this->assertDatabaseMissing('products', ['sku' => 'CHANGED']);
    $this->assertDatabaseHas('inventory_batches', ['sku' => 'THM-201']);
});

test('seasonal editing retains existing multipliers or clears them when disabled', function (bool $seasonal, ?float $factor) {
    $this->seed([CategorySeeder::class, SupplierSeeder::class, ProductSeeder::class]);
    $this->actingAs(User::factory()->create(['role' => Role::ADMIN]));

    $this->put('/admin/products/ACU-014', catalogProductInput(['seasonalFlag' => $seasonal]))->assertSessionHasNoErrors();

    $this->assertDatabaseHas('products', ['sku' => 'ACU-014', 'seasonal_factor' => $factor]);
})->with(['enabled' => [true, 3.0], 'disabled' => [false, null]]);

test('duplicate SKU returns a visible validation error without overwriting the product', function () {
    $this->seed([CategorySeeder::class, SupplierSeeder::class, ProductSeeder::class]);
    $this->actingAs(User::factory()->create(['role' => Role::ADMIN]));

    $this->from('/admin/products')->post('/admin/products', catalogProductInput(['sku' => ' THM-201 ']))
        ->assertRedirect('/admin/products')->assertSessionHasErrors(['sku' => 'The sku has already been taken.']);

    $this->assertDatabaseCount('products', 5);
    $this->assertDatabaseHas('products', ['sku' => 'THM-201', 'unit_cost' => 4800]);
});

test('invalid product values are rejected on create and update', function (array $invalid, string $field, string $method, string $url) {
    $this->seed([CategorySeeder::class, SupplierSeeder::class, ProductSeeder::class]);
    $this->actingAs(User::factory()->create(['role' => Role::ADMIN]));
    $before = Product::all()->toArray();

    $this->call($method, $url, catalogProductInput($invalid))->assertSessionHasErrors($field);

    expect(Product::all()->toArray())->toBe($before);
})->with([
    'blank name' => [['name' => ' '], 'name'],
    'zero cost' => [['unitCost' => 0], 'unitCost'],
    'negative reorder point' => [['reorderPoint' => -1], 'reorderPoint'],
    'fractional lead time' => [['leadTimeDays' => 1.5], 'leadTimeDays'],
    'invalid class' => [['abc' => 'D'], 'abc'],
    'invalid seasonal flag' => [['seasonalFlag' => 'yes'], 'seasonalFlag'],
])->with([['POST', '/admin/products'], ['PUT', '/admin/products/THM-201']]);

test('admin can create and edit supplier details and see them on a fresh page', function () {
    $this->actingAs(User::factory()->create(['role' => Role::ADMIN]));
    $input = ['name' => 'New supplier', 'contact' => 'Ana Reyes', 'contactRole' => 'Sales', 'email' => 'ana@example.com', 'phone' => '09170000000', 'address' => 'Laguna', 'landline' => '0491234567', 'tin' => '123-456-789-000'];

    $this->post('/admin/suppliers', $input)->assertSessionHasNoErrors()->assertRedirect('/admin/suppliers-locations');

    $supplier = Supplier::where('name', 'New supplier')->firstOrFail();
    $this->assertDatabaseHas('suppliers', ['id' => $supplier->id, 'contact_role' => 'Sales', 'email' => 'ana@example.com', 'phone' => '09170000000']);
    $this->put('/admin/suppliers/'.$supplier->id, array_replace($input, ['contact' => 'Updated contact', 'email' => '', 'phone' => '09990000000']))->assertSessionHasNoErrors();
    $this->assertDatabaseHas('suppliers', ['id' => $supplier->id, 'contact' => 'Updated contact', 'email' => null, 'phone' => '09990000000']);
    $this->get('/admin/suppliers-locations')->assertInertia(fn (Assert $page) => $page->component('Admin/SupplierLocations')
        ->where('suppliers.0.contact', 'Updated contact')->where('suppliers.0.phone', '09990000000')->has('locations', 0));
});

test('supplier optional fields may be omitted', function () {
    $this->actingAs(User::factory()->create(['role' => Role::ADMIN]));

    $this->post('/admin/suppliers', ['name' => 'Minimal', 'contact' => 'Ana'])->assertSessionHasNoErrors();

    $this->assertDatabaseHas('suppliers', ['name' => 'Minimal', 'contact' => 'Ana', 'email' => null]);
});

test('supplier required fields and optional email are validated', function (array $input, array $errors) {
    $this->actingAs(User::factory()->create(['role' => Role::ADMIN]));

    $this->post('/admin/suppliers', $input)->assertSessionHasErrors($errors);

    $this->assertDatabaseCount('suppliers', 0);
})->with([
    'required fields' => [[], ['name', 'contact']],
    'invalid email' => [['name' => 'Supplier', 'contact' => 'Ana', 'email' => 'invalid'], ['email']],
]);

test('locations normalize and pad their code and supply a default description', function () {
    $this->actingAs(User::factory()->create(['role' => Role::ADMIN]));

    $this->post('/admin/locations', ['zone' => ' z ', 'aisle' => ' 3 ', 'description' => ' '])->assertSessionHasNoErrors()->assertRedirect('/admin/suppliers-locations');

    $this->assertDatabaseHas('warehouse_locations', ['code' => 'Z-03', 'description' => 'Zone Z · Aisle 3']);
    $this->get('/admin/suppliers-locations')->assertInertia(fn (Assert $page) => $page->component('Admin/SupplierLocations')->where('locations.0.code', 'Z-03'));
});

test('duplicate normalized location codes return validation errors', function () {
    $this->actingAs(User::factory()->create(['role' => Role::ADMIN]));
    WarehouseLocation::create(['code' => 'Z-03', 'description' => 'Existing']);

    $this->post('/admin/locations', ['zone' => 'z', 'aisle' => '3'])->assertSessionHasErrors(['aisle' => 'This warehouse location already exists.']);

    $this->assertDatabaseCount('warehouse_locations', 1);
    $this->assertDatabaseHas('warehouse_locations', ['code' => 'Z-03', 'description' => 'Existing']);
});

test('location edits only change the description', function () {
    $this->actingAs(User::factory()->create(['role' => Role::ADMIN]));
    $location = WarehouseLocation::create(['code' => 'Z-03', 'description' => 'Existing']);

    $this->put('/admin/locations/'.$location->id, ['description' => 'Updated storage', 'code' => 'A-99', 'zone' => 'A', 'aisle' => '99'])->assertSessionHasNoErrors();

    $this->assertDatabaseHas('warehouse_locations', ['id' => $location->id, 'code' => 'Z-03', 'description' => 'Updated storage']);
});

test('location requires zone and aisle and rejects blank description edits', function () {
    $this->actingAs(User::factory()->create(['role' => Role::ADMIN]));
    $location = WarehouseLocation::create(['code' => 'Z-03', 'description' => 'Existing']);

    $this->post('/admin/locations', [])->assertSessionHasErrors(['zone', 'aisle']);
    $this->put('/admin/locations/'.$location->id, ['description' => ' '])->assertSessionHasErrors('description');

    $this->assertDatabaseCount('warehouse_locations', 1);
    $this->assertDatabaseHas('warehouse_locations', ['id' => $location->id, 'description' => 'Existing']);
});

test('editing a missing record returns 404', function (string $url) {
    $this->actingAs(User::factory()->create(['role' => Role::ADMIN]));

    $this->put($url, [])->assertNotFound();
})->with(['/admin/products/missing', '/admin/suppliers/999', '/admin/locations/999']);
