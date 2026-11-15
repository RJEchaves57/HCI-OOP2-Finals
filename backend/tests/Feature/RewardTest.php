<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RewardTest extends TestCase
{
    use RefreshDatabase;

    public function test_rewards_require_authentication(): void
    {
        $this->getJson('/api/rewards')->assertUnauthorized();
    }

    public function test_a_member_sees_their_explorer_tier_progress(): void
    {
        $user = User::factory()->create(['points' => 100]);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/rewards')
            ->assertOk()
            ->assertJsonPath('data.points', 100)
            ->assertJsonPath('data.tier', 'explorer')
            ->assertJsonPath('data.tier_label', 'EXPLORER')
            ->assertJsonPath('data.next_tier', 'vanguard')
            ->assertJsonPath('data.next_tier_points', 600)
            ->assertJsonPath('data.points_to_next_tier', 500)
            ->assertJsonPath('data.progress_percent', 17);
    }

    public function test_a_top_tier_member_has_a_complete_progress_bar(): void
    {
        $user = User::factory()->create(['points' => 3200]);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/rewards')
            ->assertOk()
            ->assertJsonPath('data.tier', 'legend')
            ->assertJsonPath('data.next_tier', null)
            ->assertJsonPath('data.points_to_next_tier', 0)
            ->assertJsonPath('data.progress_percent', 100);
    }
}
