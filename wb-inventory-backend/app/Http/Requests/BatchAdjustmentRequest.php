<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BatchAdjustmentRequest extends FormRequest
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
            'batch_id' => ['required', 'string', Rule::in([$this->route('batch')->id])],
            'reason' => ['required', Rule::in(['DAMAGE', 'LOSS', 'CORRECTION'])],
            'quantity' => ['required', 'integer', 'not_in:0', 'between:-2147483647,2147483647'],
            'notes' => ['nullable', 'string', 'max:255'],
        ];
    }
}
