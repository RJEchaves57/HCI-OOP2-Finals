<?php

namespace App\Http\Controllers\Api;

use App\Enums\ProductCategory;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreProductRequest;
use App\Http\Requests\Api\UpdateProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    /**
     * List the catalogue with optional category and search filters.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'category' => ['sometimes', Rule::enum(ProductCategory::class)],
            'search' => ['sometimes', 'string', 'max:100'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:50'],
        ]);

        $products = Product::query()
            ->when(
                isset($filters['category']),
                fn ($query) => $query->category($filters['category'])
            )
            ->when(
                isset($filters['search']),
                fn ($query) => $query->search(trim($filters['search']))
            )
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($filters['per_page'] ?? 15)
            ->withQueryString();

        return ProductResource::collection($products);
    }

    /**
     * Show a single catalogue item.
     */
    public function show(Product $product): ProductResource
    {
        return new ProductResource($product);
    }

    /**
     * Create a catalogue item. Administrator only.
     */
    public function store(StoreProductRequest $request): JsonResponse
    {
        $product = Product::create($request->validated());

        return response()->json([
            'message' => 'Product created successfully.',
            'data' => new ProductResource($product),
        ], 201);
    }

    /**
     * Update a catalogue item. Administrator only.
     */
    public function update(UpdateProductRequest $request, Product $product): JsonResponse
    {
        $product->update($request->validated());

        return response()->json([
            'message' => 'Product updated successfully.',
            'data' => new ProductResource($product->fresh()),
        ]);
    }

    /**
     * Delete a catalogue item. Administrator only.
     */
    public function destroy(Product $product): JsonResponse
    {
        $product->delete();

        return response()->json([
            'message' => 'Product deleted successfully.',
        ]);
    }
}
