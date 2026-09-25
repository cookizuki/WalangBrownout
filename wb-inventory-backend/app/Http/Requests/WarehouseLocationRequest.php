<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class WarehouseLocationRequest extends FormRequest
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
        if ($this->isMethod('put')) {
            return ['description' => ['required', 'string', 'max:255']];
        }

        return [
            'zone' => ['required', 'string', 'max:2'],
            'aisle' => ['required', 'string', 'max:4'],
            'description' => ['nullable', 'string', 'max:255'],
        ];
    }
}
