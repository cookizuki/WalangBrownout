<?php

namespace App\Http\Controllers;

use App\Enums\Role;
use App\Models\CycleCount;
use App\Models\InventoryBatch;
use App\Models\PickTask;
use App\Models\Product;
use App\Models\ReceivingLine;
use App\Models\TransactionLog;
use App\Models\WarehouseLocation;
use App\Services\AlertService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function landing(Request $request): RedirectResponse
    {
        if (! $request->user()) {
            return to_route('login');
        }
        $key = config('navigation.roles.'.$request->user()->role->value)[0];

        return redirect(config('navigation.pages.'.$key.'.url'));
    }

    private function products(): array
    {
        return Product::withSum('batches', 'quantity_remaining')->orderBy('sku')->get()->map(fn (Product $p): array => [
            'sku' => $p->sku, 'name' => $p->name, 'abc' => $p->abc, 'isFifoCritical' => $p->is_fifo_critical,
            'onHand' => (int) $p->batches_sum_quantity_remaining, 'rop' => $p->seasonal_flag ? $p->ropSeasonal() : $p->ropStandard(),
        ])->all();
    }

    private function batches(): array
    {
        return InventoryBatch::orderBy('id')->get()->map(fn ($b): array => ['id' => $b->id, 'expirationDate' => $b->expiration_date?->toDateString()])->all();
    }

    public function overview(AlertService $alerts): Response
    {
        return Inertia::render('Overview/Index', ['products' => $this->products(), 'batches' => $this->batches(), 'alerts' => $alerts->open(),
            'transactions' => TransactionLog::orderByDesc('timestamp')->orderByDesc('id')->get()->map(fn ($tx): array => ['id' => $tx->id, 'sku' => $tx->sku, 'type' => $tx->type, 'quantityDelta' => $tx->quantity_delta, 'channel' => $tx->channel, 'timestamp' => $tx->timestamp->toISOString()]),
        ]);
    }

    public function inventory(Request $request): Response
    {
        return Inertia::render('Inventory/Index', ['products' => $this->products(), 'canExport' => $request->user()->hasRole(Role::INVENTORY_STAFF)]);
    }

    public function myDay(Request $request, AlertService $alerts): Response
    {
        return Inertia::render('MyDay/Index', ['role' => $request->user()->role->value, 'name' => $request->user()->name, 'alerts' => $alerts->open(),
            'products' => $this->products(), 'batches' => $this->batches(), 'locations' => WarehouseLocation::orderBy('id')->get(['id', 'code']),
            'pickTasks' => PickTask::orderBy('id')->get()->map(fn ($t): array => ['id' => $t->id, 'sku' => $t->sku, 'batchId' => $t->batch_id, 'locationId' => $t->location_id, 'quantity' => $t->quantity, 'orderRef' => $t->order_ref, 'priority' => $t->priority, 'status' => $t->status]),
            'cycleCounts' => CycleCount::orderBy('id')->get()->map(fn ($c): array => ['id' => $c->id, 'sku' => $c->sku, 'locationId' => $c->location_id, 'systemQty' => $c->system_qty, 'countedQty' => $c->counted_qty, 'dueDate' => $c->due_date->toDateString(), 'status' => $c->status]),
            'receivingLines' => ReceivingLine::orderBy('id')->get()->map(fn ($r): array => ['id' => $r->id, 'sku' => $r->sku, 'poNumber' => $r->po_number, 'quantityOrdered' => $r->quantity_ordered, 'expectedDate' => $r->expected_date->toDateString(), 'status' => $r->status]),
        ]);
    }
}
