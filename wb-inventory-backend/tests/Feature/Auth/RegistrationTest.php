<?php

use App\Enums\Role;

test('registration screen can be rendered', function () {
    $response = $this->get('/register');

    $response->assertStatus(200);
});

test('new users can register', function () {
    $response = $this->post('/register', [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
        'role' => Role::WAREHOUSE_STAFF->value,
    ]);

    $response->assertSessionHasNoErrors();
    $this->assertAuthenticated();
    $this->assertDatabaseHas('users', [
        'email' => 'test@example.com',
        'role' => Role::WAREHOUSE_STAFF->value,
    ]);
    $response->assertRedirect(route('dashboard', absolute: false));
});
