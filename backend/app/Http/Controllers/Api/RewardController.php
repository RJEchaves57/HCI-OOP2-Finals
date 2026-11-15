<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\RewardTiers;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RewardController extends Controller
{
    /**
     * Return the loyalty summary for the authenticated member.
     */
    public function summary(Request $request): JsonResponse
    {
        return response()->json([
            'data' => RewardTiers::summary($request->user()->points),
        ]);
    }
}
