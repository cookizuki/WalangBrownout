<?php

namespace App\Http\Controllers;

use App\Models\InventoryBatch;
use App\Models\PickTask;
use App\Models\Product;
use App\Models\TransactionLog;
use App\Services\SalesOrderService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PickTaskController extends Controller
{
    public function index(): Response
    {
        $rank = ['HIGH' => 0, 'NORMAL' => 1, 'LOW' => 2];

        return Inertia::render('PickTasks/Index', ['tasks' => PickTask::with(['product', 'location'])->orderBy('id')->get()->sortBy(fn (PickTask $task): int => $rank[$task->priority])->map(fn (PickTask $task): array => $task->toQueueArray())->values()]);
    }

    public function salesOrders(SalesOrderService $service): Response
    {
        return Inertia::render('SalesOrders/Index', ['orders' => $service->derive()]);
    }

    public function complete(Request $request, PickTask $task): RedirectResponse
    {
        DB::transaction(function () use ($request, $task): void {
            Product::whereKey($task->sku)->lockForUpdate()->firstOrFail();
            $task = PickTask::lockForUpdate()->findOrFail($task->id);
            if ($task->status === 'DONE') {
                return;
            }
            $batch = InventoryBatch::lockForUpdate()->findOrFail($task->batch_id);
            if ($batch->quantity_remaining < $task->quantity) {
                throw ValidationException::withMessages(['task' => 'The assigned batch has insufficient stock. Resolve the FIFO exception before picking.']);
            }
            $batch->update(['quantity_remaining' => $batch->quantity_remaining - $task->quantity]);
            $task->update(['status' => 'DONE']);
            TransactionLog::create(['id' => 'T-'.Str::ulid(), 'batch_id' => $batch->id, 'sku' => $task->sku, 'user_id' => $request->user()->id,
                'type' => 'SALE', 'quantity_delta' => -$task->quantity, 'channel' => 'WAREHOUSE', 'timestamp' => now()]);
        }, 3);

        return to_route('picks.index');
    }

    public function fifoException(Request $request, PickTask $task): RedirectResponse
    {
        $data = $request->validate(['reason' => ['required', 'in:DAMAGED,MISSING'], 'batch_id' => ['required', 'string']]);
        $message = DB::transaction(function () use ($request, $task, $data): string {
            Product::whereKey($task->sku)->lockForUpdate()->firstOrFail();
            $task = PickTask::lockForUpdate()->findOrFail($task->id);
            if ($task->status === 'DONE' || $task->batch_id !== $data['batch_id']) {
                throw ValidationException::withMessages(['task' => 'This task has changed. Refresh the queue before reporting an issue.']);
            }
            $batch = InventoryBatch::lockForUpdate()->findOrFail($task->batch_id);
            $quantity = $batch->quantity_remaining;
            if ($quantity > 0) {
                $batch->update(['quantity_remaining' => 0]);
                TransactionLog::create(['id' => 'T-'.Str::ulid(), 'batch_id' => $batch->id, 'sku' => $task->sku, 'user_id' => $request->user()->id,
                    'type' => 'WRITE_OFF', 'quantity_delta' => -$quantity, 'channel' => 'WAREHOUSE', 'timestamp' => now(),
                    'note' => $data['reason']." \u{2014} flagged via FIFO exception on {$task->id}"]);
            }
            $next = InventoryBatch::where('sku', $task->sku)->where('quantity_remaining', '>', 0)->orderBy('date_received')->orderBy('id')->lockForUpdate()->first();
            if ($next) {
                $task->update(['batch_id' => $next->id, 'location_id' => $next->location_id]);

                return "{$task->id} reassigned to {$next->id}.";
            }

            return 'Batch flagged. No replacement FIFO batch is available; picking remains blocked.';
        }, 3);

        return to_route('picks.index')->with('fifoMessage', $message);
    }
}
