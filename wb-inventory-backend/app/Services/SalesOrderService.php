<?php

namespace App\Services;

use App\Models\PickTask;
use Illuminate\Support\Collection;

class SalesOrderService
{
    public function derive(): Collection
    {
        $rank = ['HIGH' => 0, 'NORMAL' => 1, 'LOW' => 2];

        return PickTask::with(['product', 'location'])->orderBy('order_ref')->orderBy('id')->get()->groupBy('order_ref')->map(function (Collection $tasks, string $orderRef) use ($rank): array {
            $allDone = $tasks->every(fn (PickTask $task): bool => $task->status === 'DONE');
            $anyStarted = $tasks->contains(fn (PickTask $task): bool => $task->status !== 'PENDING');

            return ['orderRef' => $orderRef, 'totalQty' => $tasks->sum('quantity'),
                'status' => $allDone ? 'DONE' : ($anyStarted ? 'IN_PROGRESS' : 'PENDING'),
                'priority' => $tasks->sortBy(fn (PickTask $task): int => $rank[$task->priority])->first()->priority,
                'lines' => $tasks->map(fn (PickTask $task): array => $task->toQueueArray())->values()];
        })->values();
    }
}
