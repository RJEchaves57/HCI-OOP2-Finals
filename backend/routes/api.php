<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\RewardController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json([
    'status' => 'ok',
    'service' => 'ROG API',
    'time' => now()->toIso8601String(),
]));

Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:6,1');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:6,1');

Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{product}', [ProductController::class, 'show']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/rewards', [RewardController::class, 'summary']);
});

Route::middleware(['auth:sanctum', 'admin'])->group(function () {
    Route::post('/products', [ProductController::class, 'store']);
    Route::match(['put', 'patch'], '/products/{product}', [ProductController::class, 'update']);
    Route::delete('/products/{product}', [ProductController::class, 'destroy']);
});
