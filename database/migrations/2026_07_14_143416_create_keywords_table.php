<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('keywords', function (Blueprint $table) {
            $table->id();
            $table->foreignId('competitor_id')->constrained()->cascadeOnDelete();
            $table->string('keyword');
            $table->string('currency')->nullable();
            $table->integer('avg_monthly_searches')->nullable();
            $table->string('three_month_change')->nullable();
            $table->string('yoy_change')->nullable();
            $table->string('competition')->nullable(); // Rendah, Menengah, Tinggi, Tidak diketahui
            $table->integer('competition_indexed_value')->nullable();
            $table->decimal('bid_low_range', 10, 2)->nullable();
            $table->decimal('bid_high_range', 10, 2)->nullable();
            $table->string('ad_impression_share')->nullable();
            $table->string('organic_impression_share')->nullable();
            $table->decimal('organic_average_position', 8, 2)->nullable();
            $table->string('in_account')->nullable();
            $table->string('in_plan')->nullable();
            $table->json('monthly_trends')->nullable(); // Menyimpan data Jul 2025 - Jun 2026
            $table->boolean('is_selected')->default(false); // Untuk fitur bulk action/export
            $table->string('priority')->nullable(); // High, Medium, Low, Watchlist, Ignore
            $table->json('tags')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('keywords');
    }
};