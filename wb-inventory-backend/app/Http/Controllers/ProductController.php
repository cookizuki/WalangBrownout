<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProductRequest;
use App\Models\Category;
use App\Models\Product;
use App\Models\Supplier;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/ProductCatalog', [
            'products' => Product::query()->latest()->orderBy('sku')->get()->map(fn (Product $product): array => [
                'sku' => $product->sku,
                'name' => $product->name,
                'unitCost' => (float) $product->unit_cost,
                'reorderPoint' => $product->reorder_point,
                'leadTimeDays' => $product->lead_time_days,
                'abc' => $product->abc,
                'seasonalFlag' => $product->seasonal_flag,
                'reorderQuantity' => $product->reorder_quantity,
                'avgDailyUsage' => (float) $product->avg_daily_usage,
                'seasonalFactor' => $product->seasonal_factor === null ? null : (float) $product->seasonal_factor,
                'safetyStock' => $product->safety_stock,
            ]),
        ]);
    }

    public function store(ProductRequest $request): RedirectResponse
    {
        $data = collect($request->validated())->mapWithKeys(fn ($value, $key): array => [Str::snake($key) => $value])->all();
        $supplierId = Supplier::query()->orderBy('id')->value('id');
        if (! Category::query()->whereKey(1)->exists() || $supplierId === null) {
            throw ValidationException::withMessages(['name' => 'The default category and a supplier must exist before adding products.']);
        }

        try {
            Product::create([
                ...$data,
                'category_id' => 1,
                'supplier_id' => $supplierId,
                'reorder_quantity' => $data['reorder_point'] * 2,
                'avg_daily_usage' => max(1, round($data['reorder_point'] / ($data['lead_time_days'] + 10))),
                'seasonal_factor' => $data['seasonal_flag'] ? 2.0 : null,
                'safety_stock' => round($data['reorder_point'] * 0.2),
                'is_fifo_critical' => false,
            ]);
        } catch (UniqueConstraintViolationException $exception) {
            throw ValidationException::withMessages(['sku' => 'The sku has already been taken.']);
        }
        // TODO: logAudit

        return to_route('admin.products.index');
    }

    public function update(ProductRequest $request, Product $product): RedirectResponse
    {
        $data = collect($request->validated())->mapWithKeys(fn ($value, $key): array => [Str::snake($key) => $value])->all();
        $product->update([
            ...$data,
            'seasonal_factor' => $data['seasonal_flag'] ? ($product->seasonal_factor ?? 2.0) : null,
        ]);
        // TODO: logAudit

        return to_route('admin.products.index');
    }
}
