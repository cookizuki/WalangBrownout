<?php

namespace App\Http\Controllers;

use App\Http\Requests\WarehouseLocationRequest;
use App\Models\WarehouseLocation;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\ValidationException;
use Inertia\Response;

class WarehouseLocationController extends Controller
{
    public function index(SupplierController $suppliers): Response
    {
        return $suppliers->index();
    }

    public function store(WarehouseLocationRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $zone = mb_strtoupper($data['zone']);
        $code = $zone.'-'.str_pad($data['aisle'], 2, '0', STR_PAD_LEFT);
        if (WarehouseLocation::query()->where('code', $code)->exists()) {
            throw ValidationException::withMessages(['aisle' => 'This warehouse location already exists.']);
        }

        try {
            WarehouseLocation::create([
                'code' => $code,
                'description' => $data['description'] ?? "Zone {$zone} · Aisle {$data['aisle']}",
            ]);
        } catch (UniqueConstraintViolationException $exception) {
            throw ValidationException::withMessages(['aisle' => 'This warehouse location already exists.']);
        }
        // TODO: logAudit

        return to_route('admin.suppliers-locations.index');
    }

    public function update(WarehouseLocationRequest $request, WarehouseLocation $location): RedirectResponse
    {
        $location->update($request->validated());
        // TODO: logAudit

        return to_route('admin.suppliers-locations.index');
    }
}
