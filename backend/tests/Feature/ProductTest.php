<?php

namespace Tests\Feature;

use App\Enums\ProductCategory;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_guest_can_browse_the_catalogue(): void
    {
        Product::factory()->count(3)->create();

        $this->getJson('/api/products')
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonStructure([
                'data' => [['id', 'name', 'category', 'price', 'price_formatted', 'description']],
                'links',
                'meta',
            ]);
    }

    public function test_the_catalogue_can_be_filtered_by_category(): void
    {
        Product::factory()->count(2)->category(ProductCategory::Laptop)->create();
        Product::factory()->category(ProductCategory::Gpu)->create();

        $this->getJson('/api/products?category=laptop')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.category', 'laptop');
    }

    public function test_the_catalogue_can_be_searched_by_name(): void
    {
        Product::factory()->create(['name' => 'ROG Strix SCAR 18']);
        Product::factory()->create(['name' => 'ROG Maximus Z890 Hero']);

        $this->getJson('/api/products?search=SCAR')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'ROG Strix SCAR 18');
    }

    public function test_an_invalid_category_filter_is_rejected(): void
    {
        $this->getJson('/api/products?category=toaster')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('category');
    }

    public function test_a_guest_cannot_create_a_product(): void
    {
        $this->postJson('/api/products', [
            'name' => 'ROG Ally X',
            'category' => 'laptop',
            'price' => 39995,
        ])->assertUnauthorized();
    }

    public function test_a_regular_member_cannot_create_a_product(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/products', [
                'name' => 'ROG Ally X',
                'category' => 'laptop',
                'price' => 39995,
            ])->assertForbidden();
    }

    public function test_an_administrator_can_create_a_product(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/products', [
                'name' => 'ROG Strix GeForce RTX 5090 OC',
                'category' => 'gpu',
                'price' => 134900,
                'description' => 'Next-gen architecture equipped with axial-tech cooling sets.',
            ])
            ->assertCreated()
            ->assertJsonPath('data.name', 'ROG Strix GeForce RTX 5090 OC')
            ->assertJsonPath('data.category', 'gpu')
            ->assertJsonPath('data.price', '134900.00')
            ->assertJsonPath('data.price_formatted', '₱134,900.00');

        $this->assertDatabaseHas('products', [
            'name' => 'ROG Strix GeForce RTX 5090 OC',
            'category' => 'gpu',
        ]);
    }

    public function test_product_creation_validates_input(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/products', [
                'name' => '',
                'category' => 'toaster',
                'price' => -5,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'category', 'price']);
    }

    public function test_an_administrator_can_update_a_product(): void
    {
        $admin = User::factory()->admin()->create();
        $product = Product::factory()->create(['name' => 'Old Name']);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/products/{$product->id}", ['price' => 250000])
            ->assertOk()
            ->assertJsonPath('data.price', '250000.00');

        $this->assertDatabaseHas('products', ['id' => $product->id, 'price' => 250000]);
    }

    public function test_an_administrator_can_delete_a_product(): void
    {
        $admin = User::factory()->admin()->create();
        $product = Product::factory()->create();

        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/products/{$product->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Product deleted successfully.');

        $this->assertDatabaseMissing('products', ['id' => $product->id]);
    }

    public function test_a_missing_product_returns_not_found(): void
    {
        $this->getJson('/api/products/9999')->assertNotFound();
    }
}
