<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\AuditLog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class AuthenticatedSessionController extends Controller
{
    /**
     * Display the login view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => session('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        $request->session()->regenerate();
        $this->recordAudit($request, 'Signed in');

        return redirect()->intended(route('dashboard', absolute: false));
    }

    private function recordAudit(Request $request, string $action): void
    {
        try {
            AuditLog::create([
                'id' => 'AU-'.Str::ulid(),
                'user_id' => $request->user()->id,
                'user_name' => $request->user()->name,
                'action' => $action,
                'target' => $request->user()->email,
                'timestamp' => now(),
            ]);
        } catch (Throwable $exception) {
            report($exception);
        }
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $this->recordAudit($request, 'Signed out');
        Auth::guard('web')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return redirect('/');
    }
}
