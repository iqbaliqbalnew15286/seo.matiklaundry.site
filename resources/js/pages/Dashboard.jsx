import React, { useState } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import AdminLayout from '../layouts/AdminLayout';
import Papa from 'papaparse'; 

export default function Dashboard({ competitors }) {
    const [currentView, setCurrentView] = useState('list');
    const [competitorName, setCompetitorName] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

    const [tableHeaders, setTableHeaders] = useState([]);
    const [parsedData, setParsedData] = useState([]);
    const [isParsing, setIsParsing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            setSelectedFile(e.dataTransfer.files[0]);
        }
    };
    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) setSelectedFile(e.target.files[0]);
    };

    const handleSimpanPreview = (e) => {
        e.preventDefault();
        if (!selectedFile) return;
        setIsParsing(true);

        const findHeader = (dataset) => {
            for (let i = 0; i < Math.min(10, dataset.length); i++) {
                const row = dataset[i];
                if (row.some(cell => typeof cell === 'string' && cell.toLowerCase().trim() === 'keyword')) return i;
            }
            return -1;
        };

        Papa.parse(selectedFile, {
            skipEmptyLines: true,
            complete: (results) => {
                let data = results.data;
                let headerIndex = findHeader(data);

                if (headerIndex === -1 || data[headerIndex].length < 10) {
                    Papa.parse(selectedFile, {
                        delimiter: '\t',
                        skipEmptyLines: true,
                        complete: (resultsTab) => {
                            let dataTab = resultsTab.data;
                            let headerIndexTab = findHeader(dataTab);
                            if (headerIndexTab !== -1) {
                                setTableHeaders(dataTab[headerIndexTab]);
                                setParsedData(dataTab.slice(headerIndexTab + 1));
                                setCurrentView('preview');
                            } else {
                                alert("Gagal mendeteksi kolom 'Keyword'. Pastikan file asli dari Google.");
                            }
                            setIsParsing(false);
                        }
                    });
                } else {
                    setTableHeaders(data[headerIndex]);
                    setParsedData(data.slice(headerIndex + 1));
                    setCurrentView('preview');
                    setIsParsing(false);
                }
            },
            error: (err) => {
                alert("Error membaca file: " + err.message);
                setIsParsing(false);
            }
        });
    };

    const handleSimpanKeDatabase = () => {
        setIsSaving(true);
        
        router.post('/competitors/import', {
            competitor_name: competitorName,
            headers: tableHeaders,
            rows: parsedData
        }, {
            onSuccess: () => {
                setCompetitorName('');
                setSelectedFile(null);
                setTableHeaders([]);
                setParsedData([]);
                setCurrentView('list');
                setIsSaving(false);
            },
            onError: (errors) => {
                console.error(errors);
                alert('Terjadi kesalahan saat menyimpan data. Cek Console browser.');
                setIsSaving(false);
            }
        });
    };

    return (
        <AdminLayout>
            <Head title="Dashboard Utama" />
            
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-[0_4px_24px_rgba(0,0,0,0.02)] transition-all duration-300">
                
                {/* --- HEADER KONTROL --- */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                            {currentView === 'list' && 'Statistik Kompetitor'}
                            {currentView === 'create' && 'Buat Kompetitor Baru'}
                            {currentView === 'preview' && 'Pratinjau Data SEO'}
                        </h2>
                        <p className="text-sm text-slate-500 font-medium mt-1.5">
                            {currentView === 'list' && 'Kelola dan analisis data keyword dari kompetitor Anda.'}
                            {currentView === 'create' && 'Unggah file mentah dari Google Keyword Planner.'}
                            {currentView === 'preview' && `Memeriksa format data untuk: ${competitorName}`}
                        </p>
                    </div>

                    {currentView === 'list' ? (
                        <button 
                            onClick={() => setCurrentView('create')}
                            className="inline-flex items-center px-4 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-indigo-600 transition-colors shadow-md active:scale-95"
                        >
                            + Tambah Data
                        </button>
                    ) : (
                        <button 
                            onClick={() => {
                                setCurrentView('list');
                                setCompetitorName('');
                                setSelectedFile(null);
                            }}
                            className="inline-flex items-center px-4 py-2.5 bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-200 transition-colors active:scale-95"
                        >
                            Batal & Kembali
                        </button>
                    )}
                </div>

                {/* --- HALAMAN 1: TABEL DAFTAR KOMPETITOR --- */}
                {currentView === 'list' && (
                    <div className="overflow-hidden border border-slate-200 rounded-xl">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nama Kompetitor</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Total Keyword</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {competitors && competitors.length > 0 ? (
                                    competitors.map((comp) => (
                                        <tr key={comp.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="px-6 py-4 text-sm font-bold text-slate-900">{comp.name}</td>
                                            <td className="px-6 py-4 text-sm font-medium text-slate-500">
                                                <span className="bg-indigo-50 text-indigo-700 py-1.5 px-3 rounded-lg border border-indigo-100">
                                                    {comp.keywords_count} keywords
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-right">
                                                {/* INI BAGIAN YANG DIPERBARUI: Class opacity dihapus dan dibuat menjadi tombol modern yang tetap tampil */}
                                                <Link 
                                                    href={`/competitors/${comp.id}`}
                                                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-indigo-600 font-semibold rounded-lg hover:bg-indigo-50 hover:text-indigo-700 transition-all active:scale-95"
                                                >
                                                    Buka Analisis <span aria-hidden="true">&rarr;</span>
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="3" className="px-6 py-16 text-center">
                                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 mb-4">
                                                <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                                            </div>
                                            <p className="text-sm font-bold text-slate-900">Belum ada data tersedia</p>
                                            <p className="text-xs text-slate-500 mt-1">Klik tombol Tambah Data untuk memulai.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* --- HALAMAN 2: FORM UPLOAD --- */}
                {currentView === 'create' && (
                    <form onSubmit={handleSimpanPreview} className="max-w-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="mb-6">
                            <label className="block mb-2 text-sm font-bold text-slate-700">Nama Target Kompetitor <span className="text-rose-500">*</span></label>
                            <input type="text" required value={competitorName} onChange={(e) => setCompetitorName(e.target.value)} placeholder="Contoh: Tokopedia, Shopee..." className="w-full px-4 py-3.5 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"/>
                        </div>
                        <div className="mb-8">
                            <label className="block mb-2 text-sm font-bold text-slate-700">File Keyword Planner (CSV/TSV) <span className="text-rose-500">*</span></label>
                            <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} className={`relative flex flex-col items-center justify-center w-full p-10 border-2 border-dashed rounded-2xl transition-all ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}`}>
                                <input type="file" accept=".csv,.tsv" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" required={!selectedFile} />
                                <div className="w-14 h-14 mb-4 rounded-full bg-white shadow-sm flex items-center justify-center text-indigo-500"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg></div>
                                {selectedFile ? (
                                    <div className="text-center"><p className="text-sm font-bold text-slate-900">{selectedFile.name}</p><p className="text-xs font-semibold text-emerald-500 mt-1">✓ File siap diekstraksi</p></div>
                                ) : (
                                    <div className="text-center"><p className="text-sm font-bold text-slate-900">Seret file Anda ke sini, atau klik</p><p className="text-xs text-slate-500 mt-1 font-medium">Support: File langsung dari Google Keyword Planner</p></div>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-end pt-5 border-t border-slate-100">
                            <button type="submit" disabled={!competitorName || !selectedFile || isParsing} className="px-6 py-3 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-indigo-600 transition-all disabled:bg-slate-300 shadow-lg hover:shadow-indigo-600/20 active:scale-95">
                                {isParsing ? 'Menganalisis File...' : 'Pratinjau Data Sekarang'}
                            </button>
                        </div>
                    </form>
                )}

                {/* --- HALAMAN 3: PREVIEW TABEL RAPI --- */}
                {currentView === 'preview' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex flex-wrap gap-4 mb-6">
                            <div className="bg-white px-5 py-4 rounded-xl border border-slate-200 shadow-sm flex-1 min-w-[200px]"><p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Total Keyword Terdeteksi</p><p className="text-3xl font-black text-indigo-600">{parsedData.length}</p></div>
                            <div className="bg-white px-5 py-4 rounded-xl border border-slate-200 shadow-sm flex-1 min-w-[200px]"><p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Status Kolom Data</p><p className="text-3xl font-black text-emerald-500 flex items-center">Valid <svg className="w-6 h-6 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg></p></div>
                        </div>

                        <div className="overflow-x-auto border border-slate-200 rounded-xl mb-6 shadow-sm custom-scrollbar">
                            <table className="w-full text-left border-collapse whitespace-nowrap">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-5 py-4 text-xs font-extrabold text-slate-600 bg-slate-100 sticky left-0 z-10 border-r border-slate-200 shadow-[1px_0_0_rgba(0,0,0,0.05)]">No</th>
                                        {tableHeaders.slice(0, 8).map((header, index) => (
                                            <th key={index} className="px-5 py-4 text-xs font-bold text-slate-600">{header}</th>
                                        ))}
                                        {tableHeaders.length > 8 && <th className="px-5 py-4 text-xs font-bold text-slate-400 bg-slate-50 italic">... +{tableHeaders.length - 8} kolom lain</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {parsedData.slice(0, 8).map((row, rowIndex) => (
                                        <tr key={rowIndex} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="px-5 py-3 text-xs font-bold text-slate-500 bg-white sticky left-0 z-10 border-r border-slate-100 shadow-[1px_0_0_rgba(0,0,0,0.02)]">{rowIndex + 1}</td>
                                            {row.slice(0, 8).map((cell, cellIndex) => (
                                                <td key={cellIndex} className="px-5 py-3 text-sm text-slate-700 truncate max-w-[250px]">{cell || <span className="text-slate-300">-</span>}</td>
                                            ))}
                                            {row.length > 8 && <td className="px-5 py-3"></td>}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-5 border-t border-slate-100">
                            <p className="text-xs font-medium text-slate-500">Menampilkan 8 baris pertama sebagai sampel pratinjau.</p>
                            <div className="flex w-full sm:w-auto gap-3">
                                <button onClick={() => setCurrentView('create')} disabled={isSaving} className="flex-1 sm:flex-none px-6 py-3 bg-slate-100 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50">Ubah File</button>
                                <button onClick={handleSimpanKeDatabase} disabled={isSaving} className="flex-1 sm:flex-none px-6 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-indigo-600/20 active:scale-95 disabled:bg-indigo-400 flex items-center justify-center">
                                    {isSaving ? (
                                        <><svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Menyimpan...</>
                                    ) : 'Simpan & Import Data'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}