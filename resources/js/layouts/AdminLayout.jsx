import React, { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';

export default function AdminLayout({ children }) {
    const { url } = usePage();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    return (
        <div className="flex min-h-screen bg-[#F4F7FB] font-sans selection:bg-blue-500 selection:text-white text-slate-800">
            
            {/* Sidebar Modern & Minimalis */}
            <aside 
                className={`relative bg-white/60 backdrop-blur-xl border-r border-slate-200/50 flex flex-col z-40 transition-all duration-300 ease-in-out shadow-[4px_0_24px_rgba(0,0,0,0.02)] ${
                    isSidebarOpen ? 'w-[260px]' : 'w-[80px]'
                }`}
            >
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="absolute -right-3.5 top-9 flex items-center justify-center w-7 h-7 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-blue-600 transition-all shadow-sm z-50 focus:outline-none hover:scale-110 active:scale-95"
                >
                    <svg className={`w-4 h-4 transition-transform duration-300 ${!isSidebarOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>

                <div className="h-[90px] flex items-center px-6 border-b border-slate-200/50">
                    <div className={`flex items-center w-full ${!isSidebarOpen && 'justify-center'}`}>
                        <div className="min-w-[36px] h-9 bg-slate-900 rounded-xl flex items-center justify-center shadow-sm">
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                        </div>
                        
                        <div className={`ml-3.5 overflow-hidden transition-all duration-300 whitespace-nowrap ${isSidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
                            <h1 className="text-xl font-black text-slate-800 tracking-tight">
                                SEO.Dash
                            </h1>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 py-6 px-3 overflow-y-auto custom-scrollbar">
                    <ul className="space-y-1.5">
                        <li>
                            <Link 
                                href="/dashboard" 
                                className={`flex items-center rounded-2xl text-sm font-bold transition-all duration-300 group ${
                                    isSidebarOpen ? 'px-4 py-3.5' : 'p-3.5 justify-center'
                                } ${
                                    url.startsWith('/dashboard') 
                                        ? 'bg-blue-600 text-white shadow-[0_4px_12px_rgba(37,99,235,0.2)]' 
                                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                                }`}
                            >
                                <svg className={`w-5 h-5 min-w-[20px] transition-colors ${url.startsWith('/dashboard') ? 'text-white' : 'text-slate-400 group-hover:text-blue-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                </svg>
                                
                                <div className={`ml-3.5 overflow-hidden transition-all duration-300 whitespace-nowrap ${isSidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
                                    Overview
                                </div>
                            </Link>
                        </li>
                    </ul>
                </nav>

                <div className="p-4 m-3 border border-rose-100/50 bg-rose-50/30 rounded-2xl">
                    <Link 
                        href="/logout" 
                        method="post" 
                        as="button"
                        className={`flex items-center w-full rounded-xl text-sm font-bold text-slate-500 hover:text-rose-600 hover:bg-white transition-all duration-300 group ${
                            isSidebarOpen ? 'px-4 py-3' : 'p-3 justify-center'
                        }`}
                    >
                        <svg className="w-5 h-5 min-w-[20px] text-rose-400/70 group-hover:text-rose-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        
                        <div className={`ml-3.5 overflow-hidden transition-all duration-300 whitespace-nowrap ${isSidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
                            Sign out
                        </div>
                    </Link>
                </div>
            </aside>

            {/* Main Content Area - z-index dihapus agar fullscreen bisa bebas */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <div className="flex-1 p-6 sm:p-8 overflow-y-auto custom-scrollbar">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}