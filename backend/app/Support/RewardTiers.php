<?php

namespace App\Support;

/**
 * Loyalty program rules for the ROG Elite Rewards dashboard.
 *
 * The front-end renders "EXPLORER TIER (100 / 600)", which maps to the
 * first tier threshold (0) and the next tier threshold (600).
 */
class RewardTiers
{
    /**
     * @var array<int, array{name: string, label: string, minimum: int}>
     */
    public const TIERS = [
        ['name' => 'explorer', 'label' => 'EXPLORER', 'minimum' => 0],
        ['name' => 'vanguard', 'label' => 'VANGUARD', 'minimum' => 600],
        ['name' => 'elite', 'label' => 'ELITE', 'minimum' => 1500],
        ['name' => 'legend', 'label' => 'LEGEND', 'minimum' => 3000],
    ];

    /**
     * Build the rewards summary for a member's current point balance.
     *
     * @return array<string, mixed>
     */
    public static function summary(int $points): array
    {
        $points = max(0, $points);

        $current = self::TIERS[0];
        $next = null;

        foreach (self::TIERS as $index => $tier) {
            if ($points >= $tier['minimum']) {
                $current = $tier;
                $next = self::TIERS[$index + 1] ?? null;
            }
        }

        $nextThreshold = $next['minimum'] ?? null;

        $progress = $nextThreshold === null
            ? 100
            : (int) round((($points - $current['minimum']) / ($nextThreshold - $current['minimum'])) * 100);

        return [
            'points' => $points,
            'tier' => $current['name'],
            'tier_label' => $current['label'],
            'next_tier' => $next['name'] ?? null,
            'next_tier_label' => $next['label'] ?? null,
            'next_tier_points' => $nextThreshold,
            'points_to_next_tier' => $nextThreshold === null ? 0 : max(0, $nextThreshold - $points),
            'progress_percent' => min(100, max(0, $progress)),
        ];
    }
}
