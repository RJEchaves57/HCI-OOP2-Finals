<?php

namespace Database\Factories;

use App\Enums\ProductCategory;
use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    protected $model = Product::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => 'ROG '.fake()->unique()->words(3, true),
            'category' => fake()->randomElement(ProductCategory::cases()),
            'price' => fake()->randomFloat(2, 5000, 250000),
            'description' => fake()->sentence(12),
        ];
    }

    /**
     * Indicate the product belongs to the given category.
     */
    public function category(ProductCategory $category): static
    {
        return $this->state(fn () => ['category' => $category]);
    }
}
