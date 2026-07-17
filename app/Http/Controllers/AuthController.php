<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class AuthController extends Controller
{
    public function showLogin()
    {
        // Mengarahkan ke file resources/js/pages/auth/Login.jsx
        return Inertia::render('auth/Login');
    }

    public function login(Request $request)
    {
        // Validasi input
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        // Coba melakukan login
        if (Auth::attempt($credentials)) {
            $request->session()->regenerate();
            
            return redirect()->intended('dashboard');
        }

        // Jika gagal, kembalikan ke halaman sebelumnya dengan pesan error
        return back()->withErrors([
            'email' => 'Email atau Password yang Anda masukkan salah.',
        ]);
    }

    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}