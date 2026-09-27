<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Users', ['users' => User::orderBy('id')->get(['id', 'name', 'email', 'role', 'status']), 'auditLogs' => AuditLog::orderByDesc('timestamp')->orderByDesc('id')->limit(100)->get()]);
    }

    private function validateUser(Request $request, ?User $user = null): array
    {
        return $request->validate(['name' => ['required', 'string', 'max:255'], 'email' => ['required', 'email', 'max:255', Rule::unique('users')->ignore($user?->id)],
            'role' => ['required', 'in:ADMIN,INVENTORY_STAFF,WAREHOUSE_STAFF'], 'status' => ['required', 'in:Active,Inactive'],
            'password' => [$user ? 'nullable' : 'required', 'string', 'min:8', 'max:255']]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validateUser($request);
        DB::transaction(function () use ($data, $request): void {
            $user = User::create($data);
            $this->audit($request, 'Created user', $user);
        });

        return to_route('admin.users.index');
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $data = $this->validateUser($request, $user);
        DB::transaction(function () use ($request, $user, $data): void {
            $admins = User::where('role', 'ADMIN')->where('status', 'Active')->lockForUpdate()->get();
            if ($user->id === $request->user()->id && ($data['role'] !== 'ADMIN' || $data['status'] !== 'Active')) {
                throw ValidationException::withMessages(['role' => 'You cannot remove your own administrator access.']);
            }
            if ($admins->count() <= 1 && $admins->contains('id', $user->id) && ($data['role'] !== 'ADMIN' || $data['status'] !== 'Active')) {
                throw ValidationException::withMessages(['role' => 'At least one active administrator is required.']);
            }
            if (empty($data['password'])) {
                unset($data['password']);
            }
            $user->update($data);
            $this->audit($request, $data['status'] === 'Inactive' ? 'Deactivated user' : 'Updated user', $user);
        });

        return to_route('admin.users.index');
    }

    private function audit(Request $request, string $action, User $user): void
    {
        AuditLog::create(['id' => 'AU-'.Str::ulid(), 'user_id' => $request->user()->id, 'user_name' => $request->user()->name, 'action' => $action, 'target' => $user->email, 'timestamp' => now()]);
    }
}
