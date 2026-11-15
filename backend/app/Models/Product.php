<?php

namespace App\Models;

use App\Enums\ProductCategory;
use Database\Factories\ProductFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    /** @use HasFactory<ProductFactory> */
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'category',
        'price',
        'description',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'category' => ProductCategory::class,
            'price' => 'decimal:2',
        ];
    }

    /**
     * Filter the catalogue by category.
     */
    public function scopeCategory(Builder $query, ProductCategory|string $category): Builder
    {
        return $query->where('category', $category instanceof ProductCategory ? $category->value : $category);
    }

    /**
     * Search the catalogue by product name or description.
     */
    public function scopeSearch(Builder $query, string $term): Builder
    {
        $term = '%'.$term.'%';

        return $query->where(function (Builder $query) use ($term) {
            $query->where('name', 'like', $term)
                ->orWhere('description', 'like', $term);
        });
    }
}
