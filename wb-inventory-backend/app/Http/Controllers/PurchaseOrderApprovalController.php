<?php

namespace App\Http\Controllers;

use App\Models\PendingPurchaseOrder;
use App\Models\PurchaseOrder;
use App\Models\UserNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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

    public function approve(string $id): RedirectResponse
    {
        return $this->resolve($id, true);
    }

    public function reject(Request $request, string $id): RedirectResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'max:2000']]);

        return $this->resolve($id, false, $data['reason']);
    }

    private function resolve(string $id, bool $approved, ?string $reason = null): RedirectResponse
    {
        DB::transaction(function () use ($id, $approved, $reason): void {
            $po = PendingPurchaseOrder::whereKey($id)->lockForUpdate()->first();
            if (! $po) {
                throw ValidationException::withMessages(['decision' => 'This purchase order is no longer pending. Refresh the approval queue.']);
            }
            if ($approved) {
                PurchaseOrder::create([
                    'id' => $po->id, 'supplier_id' => $po->supplier_id, 'sku' => $po->sku,
                    'quantity' => $po->quantity, 'unit_cost' => round((float) $po->total_cost / $po->quantity, 2), 'status' => 'APPROVED',
                ]);
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
            // TODO: logAudit approval or rejection, including the rejection reason.
        });

        return to_route('admin.po-approvals.index');
    }
}
