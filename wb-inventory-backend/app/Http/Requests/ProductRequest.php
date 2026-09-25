<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ProductRequest extends FormRequest
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
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            ...($this->isMethod('post') ? ['sku' => ['required', 'string', 'max:255', 'unique:products,sku']] : []),
            'name' => ['required', 'string', 'max:255'],
            'unitCost' => ['required', 'numeric', 'gt:0', 'max:99999999.99', 'decimal:0,2'],
            'reorderPoint' => ['required', 'integer', 'min:1', 'max:9999999'],
            'leadTimeDays' => ['required', 'integer', 'min:1', 'max:2147483647'],
            'abc' => ['required', 'in:A,B,C'],
            'seasonalFlag' => ['required', 'boolean'],
        ];
    }
}
