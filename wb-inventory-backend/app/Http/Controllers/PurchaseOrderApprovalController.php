<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\PendingPurchaseOrder;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\UserNotification;
use App\Services\PurchaseOrderReceivingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PurchaseOrderApprovalController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/PurchaseOrderApprovals', [
            'pending' => PendingPurchaseOrder::with(['supplier', 'product', 'requester'])->orderByDesc('requested_at')->orderByDesc('id')->get()->map(fn (PendingPurchaseOrder $po): array => [
                'poNumber' => $po->id, 'sku' => $po->sku, 'productName' => $po->product->name,
                'supplierName' => $po->supplier->name, 'supplierContact' => $po->supplier->contact,
                'supplierAddress' => $po->supplier->address, 'supplierTin' => $po->supplier->tin,
                'quantity' => $po->quantity, 'totalCost' => (float) $po->total_cost,
                'unitCost' => (float) $po->total_cost / $po->quantity,
                'requestedBy' => $po->requester->name, 'requestedAt' => $po->requested_at->toDateString(),
            ]),
        ]);
    }

    public function approve(Request $request, string $id): RedirectResponse
    {
        return $this->resolve($request, $id, true);
    }

    public function reject(Request $request, string $id): RedirectResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'max:2000']]);

        return $this->resolve($request, $id, false, $data['reason']);
    }

    private function resolve(Request $request, string $id, bool $approved, ?string $reason = null): RedirectResponse
    {
        DB::transaction(function () use ($request, $id, $approved, $reason): void {
            $sku = PendingPurchaseOrder::whereKey($id)->value('sku');
            if ($sku !== null) {
                Product::whereKey($sku)->lockForUpdate()->firstOrFail();
            }
            $po = PendingPurchaseOrder::whereKey($id)->lockForUpdate()->first();
            if (! $po) {
                throw ValidationException::withMessages(['decision' => 'This purchase order is no longer pending. Refresh the approval queue.']);
            }
            if ($approved) {
                $order = PurchaseOrder::create([
                    'id' => $po->id, 'supplier_id' => $po->supplier_id, 'sku' => $po->sku,
                    'quantity' => $po->quantity, 'unit_cost' => round((float) $po->total_cost / $po->quantity, 2), 'status' => 'APPROVED',
                ]);
                app(PurchaseOrderReceivingService::class)->createMissing($order);
            }
            UserNotification::create([
                'user_id' => $po->requested_by,
                'title' => $approved ? 'Purchase order approved' : 'Purchase order rejected',
                'detail' => $approved
                    ? "{$po->id} \u{2014} {$po->product->name} was approved and can proceed."
                    : "{$po->id} \u{2014} {$po->product->name} was rejected. {$reason}",
                'read' => false,
            ]);
            $po->delete();
            AuditLog::create([
                'id' => 'AU-'.Str::ulid(),
                'user_id' => $request->user()->id,
                'user_name' => $request->user()->name,
                'action' => $approved ? 'Approved purchase order' : 'Rejected purchase order',
                'target' => $approved ? $po->id : "{$po->id} \u{2014} Reason: {$reason}",
                'timestamp' => now(),
            ]);
        });

        return to_route('admin.po-approvals.index');
    }
}
