<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\TransactionLog;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class TransactionLogController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'type' => ['nullable', Rule::in(['ALL', 'SALE', 'RECEIPT', 'RETURN', 'ADJUSTMENT', 'TRANSFER', 'WRITE_OFF'])],
            'q' => ['nullable', 'string', 'max:255'],
        ]);
        $type = $filters['type'] ?? 'ALL';
        $query = $filters['q'] ?? '';
        $needle = mb_strtolower($query);
        $matchingSkus = $needle === '' ? [] : Product::get(['sku', 'name'])
            ->filter(fn (Product $product): bool => str_contains(mb_strtolower($product->sku), $needle)
                || str_contains(mb_strtolower($product->name), $needle))->pluck('sku');
        $page = TransactionLog::query()->with(['product', 'batch'])
            ->when($type !== 'ALL', fn ($builder) => $builder->where('type', $type))
            ->when($needle !== '', fn ($builder) => $builder->where(fn ($query) => $query->whereIn('sku', $matchingSkus)
                ->orWhereRaw('INSTR(LOWER(batch_id), ?) > 0', [$needle])))
            ->orderByDesc('timestamp')->orderByDesc('id')->simplePaginate(50)->withQueryString();
        $transactions = $page->getCollection()->map(fn (TransactionLog $transaction): array => [
            'id' => $transaction->id, 'sku' => $transaction->sku,
            'productName' => $transaction->product->name, 'batchId' => $transaction->batch?->id,
            'type' => $transaction->type, 'quantityDelta' => $transaction->quantity_delta,
            'userId' => $transaction->user_id, 'timestamp' => $transaction->timestamp->toISOString(),
            'channel' => $transaction->channel,
        ])->values();

        return Inertia::render('TransactionLog/Index', ['transactions' => $transactions, 'filters' => ['q' => $query, 'type' => $type],
            'pagination' => ['page' => $page->currentPage(), 'previous' => $page->previousPageUrl(), 'next' => $page->nextPageUrl()],
        ]);
    }
}
