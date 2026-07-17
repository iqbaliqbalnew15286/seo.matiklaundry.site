<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('keywords', function (Blueprint $table) {
            if (!Schema::hasColumn('keywords', 'content_brief')) {
                $table->text('content_brief')->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('keywords', function (Blueprint $table) {
            if (Schema::hasColumn('keywords', 'content_brief')) {
                $table->dropColumn('content_brief');
            }
        });
    }
};
