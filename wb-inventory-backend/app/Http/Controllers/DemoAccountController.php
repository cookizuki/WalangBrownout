<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;

/**
 * Returns the seeded demo accounts (name, email, role label only — never passwords).
 * Used by the login page's "Request Demo Access" modal.
 */
class DemoAccountController extends Controller
{
    /** The emails that belong to the seeded demo set. */
    private const DEMO_EMAILS = [
        'kim@walangbrownout.ph',
        'nick@walangbrownout.ph',
        'lizle@walangbrownout.ph',
        'nhimfa@walangbrownout.ph',
    ];

    public function index(): JsonResponse
    {
        $accounts = User::whereIn('email', self::DEMO_EMAILS)
            ->orderBy('id')
            ->get(['id', 'name', 'email', 'role'])
            ->map(fn (User $u) => [
                'id'        => $u->id,
                'name'      => $u->name,
                'email'     => $u->email,
                'role'      => $u->role->value,
                'roleLabel' => $u->role->label(),
            ]);

        return response()->json($accounts);
    }
}

