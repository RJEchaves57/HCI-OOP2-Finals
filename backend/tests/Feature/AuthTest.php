<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_member_can_register(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Juan Dela Cruz',
            'email' => 'juan@rog.test',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.email', 'juan@rog.test')
            ->assertJsonPath('data.role', User::ROLE_USER)
            ->assertJsonPath('data.points', 100)
            ->assertJsonPath('data.rewards.tier', 'explorer')
            ->assertJsonStructure([
                'message',
                'data' => ['id', 'name', 'email', 'role', 'points', 'rewards'],
                'token',
                'token_type',
            ]);

        $this->assertNotEmpty($response->json('token'));
        $this->assertDatabaseHas('users', [
            'email' => 'juan@rog.test',
            'role' => User::ROLE_USER,
            'points' => 100,
        ]);
    }

    public function test_registration_requires_a_unique_email(): void
    {
        User::factory()->create(['email' => 'taken@rog.test']);

        $this->postJson('/api/register', [
            'name' => 'Duplicate Member',
            'email' => 'taken@rog.test',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('email');
    }

    public function test_registration_enforces_password_rules(): void
    {
        $this->postJson('/api/register', [
            'name' => 'Weak Password',
            'email' => 'weak@rog.test',
            'password' => 'short',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['password']);
    }

    public function test_a_member_can_login(): void
    {
        User::factory()->create([
            'email' => 'member@rog.test',
            'password' => 'Password123!',
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'member@rog.test',
            'password' => 'Password123!',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.email', 'member@rog.test')
            ->assertJsonPath('message', 'Signed in successfully.');

        $this->assertNotEmpty($response->json('token'));
    }

    public function test_login_rejects_invalid_credentials(): void
    {
        User::factory()->create([
            'email' => 'member@rog.test',
            'password' => 'Password123!',
        ]);

        $this->postJson('/api/login', [
            'email' => 'member@rog.test',
            'password' => 'wrong-password',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('email');
    }

    public function test_an_authenticated_member_can_view_their_profile(): void
    {
        $user = User::factory()->create(['email' => 'member@rog.test']);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('data.email', 'member@rog.test')
            ->assertJsonPath('data.role', User::ROLE_USER);
    }

    public function test_a_guest_cannot_view_a_profile(): void
    {
        $this->getJson('/api/me')->assertUnauthorized();
    }

    public function test_a_member_can_logout_and_revoke_their_token(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test-token')->plainTextToken;

        $this->withToken($token)
            ->postJson('/api/logout')
            ->assertOk()
            ->assertJsonPath('message', 'Signed out successfully.');

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }
}
