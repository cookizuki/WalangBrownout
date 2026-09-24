<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     *
     * Order respects foreign key dependencies:
     *   users (DemoUserSeeder)          — referenced by transaction_logs.user_id
     *   categories                       — referenced by products.category_id
     *   suppliers                        — referenced by products.supplier_id
     *   warehouse_locations              — referenced by inventory_batches.location_id
     *   products                         — referenced by inventory_batches.sku, transaction_logs.sku
     *   inventory_batches                — referenced by transaction_logs.batch_id
     *   transaction_logs                 — leaf; requires all of the above
     */
    public function run(): void
    {
        $this->call([
            DemoUserSeeder::class,
            CategorySeeder::class,
            SupplierSeeder::class,
            WarehouseLocationSeeder::class,
            ProductSeeder::class,
            InventoryBatchSeeder::class,
            TransactionLogSeeder::class,
        ]);
    }
}
