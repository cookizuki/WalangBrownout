<?php

namespace App\Http\Controllers;

use App\Models\AlertAcknowledgement;
use App\Models\Product;
use App\Services\AlertService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class AlertController extends Controller
{
    public function index(AlertService $alerts): Response
    {
        $acknowledged = AlertAcknowledgement::query()->pluck('alert_id')->flip();

        return Inertia::render('Alerts/Index', [
            'alerts' => $alerts->compute()->reject(fn (array $alert): bool => $acknowledged->has($alert['id']))->values(),
        ]);
    }

    public function acknowledge(Request $request, string $alertId, AlertService $alerts): RedirectResponse
    {
        if (AlertAcknowledgement::query()->where('alert_id', $alertId)->exists()) {
            return to_route('alerts.index');
        }
        $alert = $alerts->compute()->firstWhere('id', $alertId);
        abort_if($alert === null, 404);

        DB::transaction(function () use ($alert, $alertId, $request): void {
            // Serialize acknowledgements across users on the alert's shared product row.
            Product::query()->whereKey($alert['sku'])->lockForUpdate()->firstOrFail();
            AlertAcknowledgement::firstOrCreate(['alert_id' => $alertId], [
                'user_id' => $request->user()->id, 'acknowledged_at' => now(),
            ]);
            // TODO: logAudit
        });

        return to_route('alerts.index');
    }
}
