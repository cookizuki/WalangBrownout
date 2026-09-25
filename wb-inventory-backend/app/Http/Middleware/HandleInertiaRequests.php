<?php

namespace App\Http\Middleware;

use App\Enums\Role;
use App\Models\InventoryBatch;
use App\Models\WarehouseLocation;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'fifoMessage' => fn () => $request->session()->get('fifoMessage'),
            'movementOptions' => fn () => $request->user()?->hasRole(Role::ADMIN, Role::WAREHOUSE_STAFF) ? [
                'batches' => InventoryBatch::with('product')->orderBy('id')->get()->map(fn ($batch): array => ['id' => $batch->id, 'productName' => $batch->product->name, 'quantityRemaining' => $batch->quantity_remaining]),
                'locations' => WarehouseLocation::orderBy('id')->get(['id', 'code']),
            ] : null,
            'auth' => [
                'user' => $request->user(),
            ],
        ];
    }
}
