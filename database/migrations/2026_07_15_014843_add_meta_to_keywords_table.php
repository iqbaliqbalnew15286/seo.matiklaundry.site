<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('keywords', function (Blueprint $table) {
            // Mengecek apakah kolom sudah ada sebelum menambahkannya
            if (!Schema::hasColumn('keywords', 'relevance_value')) {
                $table->integer('relevance_value')->default(15)->nullable();
            }
            if (!Schema::hasColumn('keywords', 'priority')) {
                $table->string('priority')->nullable();
            }
            if (!Schema::hasColumn('keywords', 'tags')) {
                $table->json('tags')->nullable();
            }
            if (!Schema::hasColumn('keywords', 'notes')) {
                $table->text('notes')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('keywords', function (Blueprint $table) {
            $table->dropColumn(['relevance_value', 'priority', 'tags', 'notes']);
        });
    }
};