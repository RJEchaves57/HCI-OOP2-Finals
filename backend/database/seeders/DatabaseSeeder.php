<?php

namespace Database\Seeders;

use App\Enums\ProductCategory;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@rog.test'],
            [
                'name' => 'Administrator Root',
                'password' => 'Password123!',
                'role' => User::ROLE_ADMIN,
                'points' => 3200,
                'email_verified_at' => now(),
            ],
        );

        User::updateOrCreate(
            ['email' => 'gamer@rog.test'],
            [
                'name' => 'Juan Dela Cruz',
                'password' => 'Password123!',
                'role' => User::ROLE_USER,
                'points' => 100,
                'email_verified_at' => now(),
            ],
        );

        $catalogue = [
            [
                'name' => 'ROG Strix SCAR 18 (2026)',
                'category' => ProductCategory::Laptop,
                'price' => 189995.00,
                'description' => 'Intel Core i9 with NVIDIA RTX 5080 Laptop GPU.',
            ],
            [
                'name' => 'ROG Maximus Z890 Hero',
                'category' => ProductCategory::Cpu,
                'price' => 38500.00,
                'description' => 'Premium ATX motherboard engineered for extreme overclocking performance.',
            ],
            [
                'name' => 'ROG Strix GeForce RTX 5090 OC',
                'category' => ProductCategory::Gpu,
                'price' => 134900.00,
                'description' => 'Next-gen architecture equipped with axial-tech cooling sets.',
            ],
            [
                'name' => 'ROG Zephyrus G14 (2026)',
                'category' => ProductCategory::Laptop,
                'price' => 119995.00,
                'description' => '14-inch ultraportable gaming laptop with an OLED Nebula display.',
            ],
            [
                'name' => 'AMD Ryzen 9 9950X3D',
                'category' => ProductCategory::Cpu,
                'price' => 42995.00,
                'description' => '16-core gaming processor with 3D V-Cache technology.',
            ],
            [
                'name' => 'ROG Strix GeForce RTX 5070 Ti',
                'category' => ProductCategory::Gpu,
                'price' => 62995.00,
                'description' => 'High refresh 1440p graphics card tuned for competition play.',
            ],
        ];

        foreach ($catalogue as $product) {
            Product::updateOrCreate(
                ['name' => $product['name']],
                $product,
            );
        }
    }
}
