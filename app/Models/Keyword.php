<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Keyword extends Model
{
    use HasFactory;

    protected $fillable = [
        'competitor_id', 'keyword', 'currency', 'avg_monthly_searches',
        'three_month_change', 'yoy_change', 'competition', 'competition_indexed_value',
        'bid_low_range', 'bid_high_range', 'ad_impression_share',
        'organic_impression_share', 'organic_average_position',
        'in_account', 'in_plan', 'monthly_trends', 'is_selected', 
        'priority', 'tags', 'relevance_value', 'notes', 'content_brief' // Penambahan kolom meta
    ];

    protected $casts = [
        'monthly_trends' => 'array',
        'tags' => 'array',
        'is_selected' => 'boolean',
        'relevance_value' => 'integer', // Memastikan nilainya selalu angka
    ];

    public function competitor()
    {
        return $this->belongsTo(Competitor::class);
    }
}