<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class EmailVerificationNotificationController extends Controller
{
    /**
     * Send a new email verification notification.
     */
    public function store(Request $request): RedirectResponse
    {
        if ($request->user()->hasVerifiedEmail()) {
            return redirect()->intended(route('dashboard', absolute: false));
        }

        $request->user()->sendEmailVerificationNotification();
        AuditLog::create([
            'id' => 'AU-'.Str::ulid(),
            'user_id' => $request->user()->id,
            'user_name' => $request->user()->name,
            'action' => 'Sent email verification',
            'target' => $request->user()->email,
            'timestamp' => now(),
        ]);

        return back()->with('status', 'verification-link-sent');
    }
}
