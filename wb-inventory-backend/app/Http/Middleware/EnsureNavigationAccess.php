<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureNavigationAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($user = $request->user()) {
            if ($request->isMethod('GET')) {
                foreach (config('navigation.pages') as $key => $page) {
                    if ('/'.$request->path() === $page['url']) {
                        abort_unless(in_array($key, config('navigation.roles.'.$user->role->value, []), true), 403);
                    }
                }
            }
        }

        return $next($request);
    }
}
