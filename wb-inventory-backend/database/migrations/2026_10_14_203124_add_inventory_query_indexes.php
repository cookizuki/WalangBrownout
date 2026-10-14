<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private function indexes(): array
    {
        return [
            'inventory_batches' => [
                'batches_fifo_index' => ['sku', 'date_received', 'id'],
                'batches_count_fifo_index' => ['sku', 'location_id', 'date_received', 'id'],
                'batches_expiration_index' => ['expiration_date'],
                'batches_location_index' => ['location_id'],
            ],
            'transaction_logs' => [
                'transactions_time_index' => ['timestamp', 'id'],
                'transactions_type_time_index' => ['type', 'timestamp', 'id'],
                'transactions_sku_type_time_index' => ['sku', 'type', 'timestamp'],
                'transactions_batch_index' => ['batch_id'],
                'transactions_user_index' => ['user_id'],
            ],
            'receiving_lines' => [
                'receiving_due_status_index' => ['expected_date', 'status'],
                'receiving_sku_index' => ['sku'],
                'receiving_supplier_index' => ['supplier_id'],
                'receiving_location_index' => ['location_id'],
            ],
            'cycle_counts' => [
                'counts_due_index' => ['due_date', 'id'],
                'counts_sku_index' => ['sku'],
                'counts_location_index' => ['location_id'],
            ],
            'pick_tasks' => [
                'picks_sku_index' => ['sku'],
                'picks_batch_index' => ['batch_id'],
                'picks_location_index' => ['location_id'],
            ],
            'audit_logs' => [
                'audit_time_index' => ['timestamp', 'id'],
                'audit_user_index' => ['user_id'],
            ],
            'notifications' => [
                'notifications_user_time_index' => ['user_id', 'created_at', 'id'],
            ],
        ];
    }

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        foreach ($this->indexes() as $table => $indexes) {
            foreach ($indexes as $name => $columns) {
                $covered = collect(Schema::getIndexes($table))->contains(fn (array $index): bool => array_slice($index['columns'], 0, count($columns)) === $columns);
                if (! $covered) {
                    Schema::table($table, function (Blueprint $blueprint) use ($columns, $name): void {
                        $blueprint->index($columns, $name);
                    });
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        foreach (array_reverse($this->indexes()) as $table => $indexes) {
            foreach (array_reverse($indexes) as $name => $columns) {
                if (Schema::hasIndex($table, $name)) {
                    $this->preserveForeignKeyIndexes($table, $name);
                    Schema::table($table, function (Blueprint $blueprint) use ($name): void {
                        $blueprint->dropIndex($name);
                    });
                }
            }
        }
    }

    private function preserveForeignKeyIndexes(string $table, string $dropping): void
    {
        if (Schema::getConnection()->getDriverName() !== 'mysql') {
            return;
        }

        foreach (Schema::getForeignKeys($table) as $foreignKey) {
            $columns = $foreignKey['columns'];
            $covered = collect(Schema::getIndexes($table))->contains(fn (array $index): bool => $index['name'] !== $dropping
                && array_slice($index['columns'], 0, count($columns)) === $columns);
            if (! $covered) {
                Schema::table($table, function (Blueprint $blueprint) use ($table, $columns): void {
                    $blueprint->index($columns, $table.'_'.implode('_', $columns).'_rollback_index');
                });
            }
        }
    }
};
