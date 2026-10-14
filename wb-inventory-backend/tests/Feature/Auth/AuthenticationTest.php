<?php

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Contracts\Debug\ExceptionHandler;

test('login screen can be rendered', function () {
    $response = $this->get('/login');

    $response->assertStatus(200);
});

test('users can authenticate using the login screen', function () {
    $user = User::factory()->create();

    $response = $this->post('/login', [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('dashboard', absolute: false));
    $this->assertDatabaseHas('audit_logs', [
        'user_id' => $user->id,
        'user_name' => $user->name,
        'action' => 'Signed in',
        'target' => $user->email,
    ]);
});

test('audit storage failures are reported without preventing authentication', function () {
    $user = User::factory()->create();
    $exception = new RuntimeException('Audit storage unavailable');
    $this->mock(ExceptionHandler::class)
        ->shouldReceive('report')->once()->with($exception);
    AuditLog::creating(function () use ($exception) {
        throw $exception;
    });

    try {
        $this->post('/login', ['email' => $user->email, 'password' => 'password'])
            ->assertRedirect(route('dashboard', absolute: false));
        $this->assertAuthenticatedAs($user);
    } finally {
        AuditLog::flushEventListeners();
    }
});

test('every seeded account can sign in with an attributed audit entry', function (string $account) {
    $this->seed();
    $user = User::where('email', $account.'@walangbrownout.ph')->firstOrFail();
    $this->post('/login', ['email' => $user->email, 'password' => 'walangbrownout'])
        ->assertSessionHasNoErrors()->assertRedirect(route('dashboard', absolute: false));
    $this->assertAuthenticatedAs($user);
    $this->assertDatabaseHas('audit_logs', [
        'user_id' => $user->id, 'user_name' => $user->name, 'action' => 'Signed in', 'target' => $user->email,
    ]);
})->with(['kim', 'nick', 'lizle', 'nhimfa']);

test('users can not authenticate with invalid password', function () {
    $user = User::factory()->create();

    $this->post('/login', [
        'email' => $user->email,
        'password' => 'wrong-password',
    ]);

    $this->assertGuest();
});

test('users can logout', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post('/logout');

    $this->assertGuest();
    $response->assertRedirect('/');
});
