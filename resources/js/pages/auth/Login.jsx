import React, { useState, useEffect } from 'react';
import { useForm, Head } from '@inertiajs/react';

export default function Login() {
    const { data, setData, post, processing, errors, clearErrors } = useForm({
        email: '',
        password: '',
    });

    const [showPassword, setShowPassword] = useState(false);
    const [toastError, setToastError] = useState(null);

    // Menangkap pesan error dari backend secara reaktif
    useEffect(() => {
        // Jika ada error apapun dari backend, tampilkan pesan generik
        if (errors.email || errors.password) {
            setToastError('Email dan password salah.');

            const timer = setTimeout(() => {
                setToastError(null);
                clearErrors();
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [errors]);

    const submit = (e) => {
        e.preventDefault();
        setToastError(null); // Bersihkan error lama saat submit baru
        post('/login');
    };

    return (
        <>
            <style>
                {`
                    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
                    .font-jakarta { font-family: 'Plus Jakarta Sans', sans-serif; }
                `}
            </style>

            <div className="relative flex justify-center items-center min-h-screen bg-[#F8FAFC] font-jakarta overflow-hidden selection:bg-blue-500 selection:text-white">

                {/* TOAST ERROR NOTIFICATION */}
                {toastError && (
                    <div className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-rose-500/95 backdrop-blur-md text-white px-5 py-3.5 rounded-2xl shadow-[0_20px_50px_rgba(244,63,94,0.25)] z-[9999] flex items-center gap-3 animate-in slide-in-from-top-5 fade-in duration-300 border border-rose-400/20 transition-all">
                        <div className="flex items-center justify-center w-5 h-5 bg-white/10 rounded-lg text-white">
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                            </svg>
                        </div>
                        <span className="text-xs font-extrabold tracking-wide">{toastError}</span>
                    </div>
                )}

                {/* --- AMBIENT GLOW --- */}
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-300/20 rounded-full blur-[100px] opacity-70 pointer-events-none"></div>
                <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] bg-indigo-300/10 rounded-full blur-[100px] opacity-70 pointer-events-none"></div>

                <Head title="Log in - SEO Dashboard" />

                <div className="relative w-full max-w-[420px] p-8 sm:p-10 bg-white rounded-[32px] border border-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.03)] z-10 mx-4 transition-all duration-300 hover:shadow-[0_20px_60px_rgba(0,0,0,0.06)]">

                    {/* Elemen Brand/Logo */}
                    <div className="flex justify-center mb-8">
                        <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-900/10 hover:scale-105 transition-all duration-300 ease-out cursor-pointer">
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                            </svg>
                        </div>
                    </div>

                    <div className="text-center mb-10">
                        <h2 className="text-[24px] font-extrabold text-slate-900 tracking-tight mb-2">
                            Welcome back
                        </h2>
                        <p className="text-sm text-slate-500 font-medium">
                            Enter your details to access the dashboard.
                        </p>
                    </div>

                    <form onSubmit={submit} className="space-y-5">
                        <div className="space-y-1.5">
                            <label htmlFor="email" className="block text-sm font-bold text-slate-700 ml-1">
                                Email Address
                            </label>
                            <input
                                id="email"
                                type="email"
                                name="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                className="w-full px-5 py-3.5 text-sm font-semibold text-slate-800 bg-slate-50/50 border border-slate-200 rounded-2xl outline-none transition-all duration-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 placeholder-slate-400 hover:border-slate-300"
                                placeholder="name@company.com"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="password" className="block text-sm font-bold text-slate-700 ml-1">
                                Password
                            </label>
                            <div className="relative flex items-center">
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    className="w-full pl-5 pr-12 py-3.5 text-sm font-semibold text-slate-800 bg-slate-50/50 border border-slate-200 rounded-2xl outline-none transition-all duration-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 placeholder-slate-400 hover:border-slate-300 tracking-wide"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-0 pr-4 h-full flex items-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                                >
                                    {showPassword ? (
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.05 10.05 0 011.66-3.1m2.1-2.1A10.05 10.05 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.05 10.05 0 01-1.39 2.52m-2.1 2.1A10.05 10.05 0 0115 15m-3-3l3 3M6.9 6.9l10.2 10.2" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={processing}
                            className="w-full py-4 mt-2 text-white text-sm font-bold tracking-wide bg-slate-900 hover:bg-slate-800 rounded-2xl transition-all duration-300 disabled:bg-slate-400 disabled:cursor-not-allowed shadow-[0_8px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_10px_25px_rgba(0,0,0,0.2)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] flex justify-center items-center"
                        >
                            {processing ? (
                                <span className="flex items-center gap-2.5">
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Signing in...
                                </span>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
}