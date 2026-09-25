<?php

namespace App\Http\Controllers;

use App\Http\Requests\SupplierRequest;
use App\Models\Supplier;
use App\Models\WarehouseLocation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class SupplierController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/SupplierLocations', [
            'suppliers' => Supplier::query()->latest('id')->get()->map(fn (Supplier $supplier): array => [
                'id' => $supplier->id,
                'name' => $supplier->name,
                'contact' => $supplier->contact,
                'contactRole' => $supplier->contact_role ?? '',
                'email' => $supplier->email ?? '',
                'phone' => $supplier->phone ?? '',
                'address' => $supplier->address ?? '',
                'landline' => $supplier->landline ?? '',
                'tin' => $supplier->tin ?? '',
            ]),
            'locations' => WarehouseLocation::query()->latest('id')->get(['id', 'code', 'description']),
        ]);
    }

    public function store(SupplierRequest $request): RedirectResponse
    {
        Supplier::create(collect($request->validated())->mapWithKeys(fn ($value, $key): array => [Str::snake($key) => $value])->all());
        // TODO: logAudit

        return to_route('admin.suppliers-locations.index');
    }

    public function update(SupplierRequest $request, Supplier $supplier): RedirectResponse
    {
        $supplier->update(collect($request->validated())->mapWithKeys(fn ($value, $key): array => [Str::snake($key) => $value])->all());
        // TODO: logAudit

        return to_route('admin.suppliers-locations.index');
    }
}
