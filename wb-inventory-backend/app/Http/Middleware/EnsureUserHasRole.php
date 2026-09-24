<?php

namespace App\Http\Middleware;

use App\Enums\Role;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Abort with 403 unless the authenticated user's role is one of the allowed
 * roles passed as route middleware parameters.
 *
 * Usage:
 *   ->middleware('role:ADMIN')
 *   ->middleware('role:ADMIN,INVENTORY_STAFF')
 */
class EnsureUserHasRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            abort(403, 'Unauthenticated.');
        }

        $allowed = array_map(
            fn (string $r) => Role::from($r),
            $roles,
        );

        if (! $user->hasRole(...$allowed)) {
            abort(403, 'You do not have permission to access this page.');
        }

        return $next($request);
    }
}

