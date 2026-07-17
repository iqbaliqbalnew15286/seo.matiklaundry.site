<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Competitor extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'category', 'website', 'notes'];

    public function keywords()
    {
        return $this->hasMany(Keyword::class);
    }
}