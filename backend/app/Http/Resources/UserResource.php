<?php

namespace App\Http\Resources;

use App\Models\User;
use App\Support\RewardTiers;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin User
 */
class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role,
            'points' => $this->points,
            'rewards' => RewardTiers::summary($this->points),
            'member_since' => $this->created_at?->toIso8601String(),
        ];
    }
}
