<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     *
     * Order respects foreign key dependencies:
     *   users (DemoUserSeeder)          â€” referenced by transaction_logs.user_id
     *   categories                       â€” referenced by products.category_id
     *   suppliers                        â€” referenced by products.supplier_id
     *   warehouse_locations              â€” referenced by inventory_batches.location_id
     *   products                         â€” referenced by inventory_batches.sku, transaction_logs.sku
     *   inventory_batches                â€” referenced by transaction_logs.batch_id
     *   transaction_logs                 â€” leaf; requires all of the above
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
            ReorderSeeder::class,
        ]);
    }
}
