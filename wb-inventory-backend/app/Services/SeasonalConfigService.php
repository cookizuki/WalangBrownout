<?php

namespace App\Services;

use App\Models\SeasonalWindow;
use App\Models\TransactionLog;

class SeasonalConfigService
{
    /** @return array{suggested: ?float, sampleSize: int} */
    public function suggestSeasonalMultiplier(string $sku): array
    {
        $window = SeasonalWindow::find($sku);
        if (! $window) {
            return ['suggested' => null, 'sampleSize' => 0];
        }
        $sales = TransactionLog::where('sku', $sku)->where('type', 'SALE')->get();
        $empty = ['suggested' => null, 'sampleSize' => $sales->count()];
        if ($sales->count() < 3) {
            return $empty;
        }
        $inUnits = $outUnits = 0;
        $inDays = $outDays = [];
        foreach ($sales as $sale) {
            $month = $sale->timestamp->month;
            $day = $sale->timestamp->toDateString();
            $inWindow = $window->start_month <= $window->end_month
                ? $month >= $window->start_month && $month <= $window->end_month
                : $month >= $window->start_month || $month <= $window->end_month;
            if ($inWindow) {
                $inUnits += abs($sale->quantity_delta);
                $inDays[$day] = true;
            } else {
                $outUnits += abs($sale->quantity_delta);
                $outDays[$day] = true;
            }
        }
        if (count($inDays) === 0 || count($outDays) === 0 || $outUnits === 0) {
            return $empty;
        }

        return ['suggested' => round(($inUnits / count($inDays)) / ($outUnits / count($outDays)), 1), 'sampleSize' => $sales->count()];
    }
}
