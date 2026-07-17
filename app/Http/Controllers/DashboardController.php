<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Competitor;
use App\Models\Keyword;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        $competitors = Competitor::withCount('keywords')->latest()->get();
        return Inertia::render('Dashboard', [
            'competitors' => $competitors
        ]);
    }

    public function show($id)
    {
        $competitor = Competitor::findOrFail($id);
        $keywords = Keyword::where('competitor_id', $id)->get();

        return Inertia::render('competitor/Analysis', [
            'competitor' => $competitor,
            'keywords' => $keywords
        ]);
    }

    public function import(Request $request)
    {
        $request->validate([
            'competitor_name' => 'required|string|max:255',
            'competitor_category' => 'nullable|string|max:255',
            'headers' => 'required|array',
            'rows' => 'required|array'
        ]);

        $competitor = Competitor::create([
            'name' => $request->input('competitor_name'),
            'category' => $request->input('competitor_category'),
        ]);

        $headers = $request->input('headers');
        $rows = $request->input('rows');
        $headerMap = array_flip($headers);
        $keywordsToInsert = [];

        foreach ($rows as $row) {
            if (empty($row) || !isset($row[0])) continue;

            $getVal = function($colName) use ($headerMap, $row) {
                if (!isset($headerMap[$colName])) return null;
                $idx = $headerMap[$colName];
                return isset($row[$idx]) && $row[$idx] !== '' ? $row[$idx] : null;
            };

            $cleanDecimal = function($val) {
                if ($val === null) return null;
                $val = str_replace('"', '', (string)$val);
                $val = str_replace('.', '', $val);
                $val = str_replace(',', '.', $val);
                return is_numeric($val) ? (float)$val : null;
            };

            $cleanInt = function($val) {
                if ($val === null) return null;
                $val = str_replace('"', '', (string)$val);
                $val = str_replace('.', '', $val); 
                return is_numeric($val) ? (int)$val : null;
            };

            $monthlyTrends = [];
            foreach ($headers as $idx => $headerName) {
                if (str_starts_with($headerName, 'Searches:')) {
                    $monthlyTrends[$headerName] = isset($row[$idx]) && $row[$idx] !== '' ? $cleanInt($row[$idx]) : null;
                }
            }

            $keywordsToInsert[] = [
                'competitor_id' => $competitor->id,
                'keyword' => $getVal('Keyword'),
                'currency' => $getVal('Currency'),
                'avg_monthly_searches' => $cleanInt($getVal('Avg. monthly searches')),
                'three_month_change' => $getVal('Perubahan tiga bulan'),
                'yoy_change' => $getVal('Perubahan tahun ke tahun'),
                'competition' => $getVal('Competition'),
                'competition_indexed_value' => $cleanInt($getVal('Competition (indexed value)')),
                'bid_low_range' => $cleanDecimal($getVal('Top of page bid (low range)')),
                'bid_high_range' => $cleanDecimal($getVal('Top of page bid (high range)')),
                'ad_impression_share' => $getVal('Ad impression share'),
                'organic_impression_share' => $getVal('Organic impression share'),
                'organic_average_position' => $cleanDecimal($getVal('Organic average position')),
                'in_account' => $getVal('In account?'),
                'in_plan' => $getVal('In plan?'),
                'monthly_trends' => json_encode($monthlyTrends),
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        foreach (array_chunk($keywordsToInsert, 500) as $chunk) {
            Keyword::insert($chunk);
        }

        return redirect()->route('dashboard');
    }

    // FUNGSI BARU: Menyimpan perubahan metadata secara spesifik
    public function updateKeywordMeta(Request $request, $id)
    {
        $keyword = Keyword::findOrFail($id);
        
        // Memperbarui hanya data yang diizinkan agar aman
        $keyword->update($request->only([
            'relevance_value', 
            'priority', 
            'tags', 
            'notes',
            'content_brief'
        ]));

        // PERBAIKAN: Menggunakan redirect()->back() agar sesuai dengan standar response Inertia.js
        // Frontend (React) sudah menangani UI state dan notifikasinya, sehingga cukup kembalikan respons ini.
        return redirect()->back();
    }

    // Mengubah detail kompetitor (nama dan kategori)
    public function updateCompetitor(Request $request, $id)
    {
        $competitor = Competitor::findOrFail($id);
        
        $request->validate([
            'name' => 'required|string|max:255',
            'category' => 'nullable|string|max:255',
        ]);

        $competitor->update($request->only(['name', 'category']));

        return redirect()->back();
    }

    // Menghapus satu kompetitor (cascade keywords)
    public function destroyCompetitor($id)
    {
        $competitor = Competitor::findOrFail($id);
        $competitor->delete();

        return redirect()->back();
    }

    // Menghapus beberapa kompetitor sekaligus
    public function bulkDeleteCompetitors(Request $request)
    {
        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:competitors,id'
        ]);

        Competitor::whereIn('id', $request->input('ids'))->delete();

        return redirect()->back();
    }

    // Menghapus beberapa keyword sekaligus
    public function bulkDeleteKeywords(Request $request)
    {
        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:keywords,id'
        ]);

        Keyword::whereIn('id', $request->input('ids'))->delete();

        return redirect()->back();
    }
}