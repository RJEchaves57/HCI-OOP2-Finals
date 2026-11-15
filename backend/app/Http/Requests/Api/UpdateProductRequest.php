<?php

namespace App\Http\Requests\Api;

use App\Enums\ProductCategory;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProductRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'category' => ['sometimes', 'required', Rule::enum(ProductCategory::class)],
            'price' => ['sometimes', 'required', 'numeric', 'min:0', 'max:9999999999.99'],
            'description' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ];
    }
}
