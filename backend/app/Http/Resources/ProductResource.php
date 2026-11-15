<?php

namespace App\Http\Resources;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Product
 */
class ProductResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $price = (float) $this->price;

        return [
            'id' => $this->id,
            'name' => $this->name,
            'category' => $this->category->value,
            'category_label' => $this->category->label(),
            'price' => number_format($price, 2, '.', ''),
            'price_formatted' => '₱'.number_format($price, 2),
            'description' => $this->description,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
