<?php

namespace App\Http\Controllers;

use App\Models\UserNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

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
        UserNotification::where('user_id', $request->user()->id)->findOrFail($id)->update(['read' => true]);

        return response()->noContent();
    }

    public function readAll(Request $request): Response
    {
        UserNotification::where('user_id', $request->user()->id)->where('read', false)->update(['read' => true]);

        return response()->noContent();
    }
}
