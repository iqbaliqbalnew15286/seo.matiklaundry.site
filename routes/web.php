<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\DashboardController;

Route::middleware('guest')->group(function () {
    Route::get('/', [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login']);
});

Route::middleware('auth')->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
    
    Route::post('/competitors/import', [DashboardController::class, 'import'])->name('competitors.import');
    Route::get('/competitors/{id}', [DashboardController::class, 'show'])->name('competitors.show');
    Route::put('/competitors/{id}', [DashboardController::class, 'updateCompetitor'])->name('competitors.update');
    Route::delete('/competitors/{id}', [DashboardController::class, 'destroyCompetitor'])->name('competitors.destroy');
    Route::post('/competitors/bulk-delete', [DashboardController::class, 'bulkDeleteCompetitors'])->name('competitors.bulkDelete');
    
    // RUTE BARU: Untuk auto-save metadata di latar belakang & bulk action keyword
    Route::put('/keywords/{id}/meta', [DashboardController::class, 'updateKeywordMeta'])->name('keywords.updateMeta');
    Route::post('/keywords/bulk-delete', [DashboardController::class, 'bulkDeleteKeywords'])->name('keywords.bulkDelete');
});