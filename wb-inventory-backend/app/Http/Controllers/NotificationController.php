<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\UserNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(['notifications' => UserNotification::where('user_id', $request->user()->id)
            ->orderByDesc('created_at')->orderByDesc('id')->get()->map(fn (UserNotification $notification): array => [
                'id' => $notification->id, 'title' => $notification->title, 'detail' => $notification->detail,
                'read' => $notification->read, 'timestamp' => $notification->created_at->toISOString(),
            ])]);
    }

    public function read(Request $request, string $id): Response
    {
        DB::transaction(function () use ($request, $id): void {
            $notification = UserNotification::where('user_id', $request->user()->id)->lockForUpdate()->findOrFail($id);
            if ($notification->read) {
                return;
            }
            $notification->update(['read' => true]);
            AuditLog::create([
                'id' => 'AU-'.Str::ulid(), 'user_id' => $request->user()->id, 'user_name' => $request->user()->name,
                'action' => 'Read notification', 'target' => $notification->id, 'timestamp' => now(),
            ]);
        });

        return response()->noContent();
    }

    public function readAll(Request $request): Response
    {
        DB::transaction(function () use ($request): void {
            $count = UserNotification::where('user_id', $request->user()->id)->where('read', false)->update(['read' => true]);
            if ($count > 0) {
                AuditLog::create([
                    'id' => 'AU-'.Str::ulid(), 'user_id' => $request->user()->id, 'user_name' => $request->user()->name,
                    'action' => 'Read all notifications', 'target' => "{$count} notifications", 'timestamp' => now(),
                ]);
            }
        });

        return response()->noContent();
    }
}
