<?php

namespace Tests\Unit;

use App\Support\RewardTiers;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class RewardTiersTest extends TestCase
{
    /**
     * @return array<string, array{0: int, 1: string}>
     */
    public static function tierBoundaries(): array
    {
        return [
            'zero points' => [0, 'explorer'],
            'just below vanguard' => [599, 'explorer'],
            'vanguard threshold' => [600, 'vanguard'],
            'just below elite' => [1499, 'vanguard'],
            'elite threshold' => [1500, 'elite'],
            'just below legend' => [2999, 'elite'],
            'legend threshold' => [3000, 'legend'],
            'far above legend' => [9000, 'legend'],
        ];
    }

    #[DataProvider('tierBoundaries')]
    public function test_it_resolves_the_correct_tier(int $points, string $expected): void
    {
        $this->assertSame($expected, RewardTiers::summary($points)['tier']);
    }

    public function test_it_clamps_negative_points_to_zero(): void
    {
        $summary = RewardTiers::summary(-50);

        $this->assertSame(0, $summary['points']);
        $this->assertSame(0, $summary['progress_percent']);
    }

    public function test_it_reports_progress_towards_the_next_tier(): void
    {
        $summary = RewardTiers::summary(300);

        $this->assertSame('vanguard', $summary['next_tier']);
        $this->assertSame(600, $summary['next_tier_points']);
        $this->assertSame(300, $summary['points_to_next_tier']);
        $this->assertSame(50, $summary['progress_percent']);
    }
}
