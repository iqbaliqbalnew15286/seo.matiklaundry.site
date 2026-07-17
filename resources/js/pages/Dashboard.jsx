import React, { useState, useMemo } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import AdminLayout from '../layouts/AdminLayout';
import Papa from 'papaparse'; 

export default function Dashboard({ competitors }) {
    const [currentView, setCurrentView] = useState('list');
    const [competitorName, setCompetitorName] = useState('');
    const [competitorCategory, setCompetitorCategory] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

    const [tableHeaders, setTableHeaders] = useState([]);
    const [parsedData, setParsedData] = useState([]);
    const [isParsing, setIsParsing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // States baru untuk Kategori, Edit & Bulk Action
    const [selectedCategoryTab, setSelectedCategoryTab] = useState('Semua Kategori');
    const [selectedCompetitorIds, setSelectedCompetitorIds] = useState([]);
    const [editingCompetitor, setEditingCompetitor] = useState(null);
    const [editForm, setEditForm] = useState({ name: '', category: '' });

    // States untuk Modal Konfirmasi Hapus Kustom
    const [competitorToDelete, setCompetitorToDelete] = useState(null);
    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

    // 1. Grouping & Tabs Kategori Kompetitor
    const categories = useMemo(() => {
        const list = new Set();
        competitors.forEach(c => {
            if (c.category) list.add(c.category.trim());
        });
        return ['Semua Kategori', ...Array.from(list), 'Tanpa Kategori'];
    }, [competitors]);

    const filteredCompetitors = useMemo(() => {
        if (selectedCategoryTab === 'Semua Kategori') return competitors;
        if (selectedCategoryTab === 'Tanpa Kategori') return competitors.filter(c => !c.category);
        return competitors.filter(c => c.category?.trim() === selectedCategoryTab);
    }, [competitors, selectedCategoryTab]);

    // 2. Handlers untuk Edit & Hapus
    const openEditModal = (comp) => {
        setEditingCompetitor(comp);
        setEditForm({
            name: comp.name,
            category: comp.category || ''
        });
    };

    const handleSaveEdit = (e) => {
        e.preventDefault();
        router.put(`/competitors/${editingCompetitor.id}`, {
            name: editForm.name,
            category: editForm.category
        }, {
            onSuccess: () => {
                setEditingCompetitor(null);
            }
        });
    };

    const executeDeleteCompetitor = () => {
        if (!competitorToDelete) return;
        router.delete(`/competitors/${competitorToDelete.id}`, {
            onSuccess: () => {
                setSelectedCompetitorIds(prev => prev.filter(item => item !== competitorToDelete.id));
                setCompetitorToDelete(null);
            }
        });
    };

    const executeBulkDelete = () => {
        router.post('/competitors/bulk-delete', {
            ids: selectedCompetitorIds
        }, {
            onSuccess: () => {
                setSelectedCompetitorIds([]);
                setIsBulkDeleteModalOpen(false);
            }
        });
    };

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
            competitor_category: competitorCategory,
            headers: tableHeaders,
            rows: parsedData
        }, {
            onSuccess: () => {
                setCompetitorName('');
                setCompetitorCategory('');
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
                    <div className="space-y-4">
                        {/* Tabs Kategori Grouping */}
                        {/* Tabs Kategori Grouping */}
                        <div className="flex flex-wrap gap-2.5 mb-6 border-b border-slate-100 pb-5">
                            {categories.map((cat) => {
                                const isActive = selectedCategoryTab === cat;
                                return (
                                    <button
                                        key={cat}
                                        onClick={() => {
                                            setSelectedCategoryTab(cat);
                                            setSelectedCompetitorIds([]);
                                        }}
                                        className={`group inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl border transition-all duration-300 active:scale-95 ${
                                            isActive
                                                ? 'bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/10'
                                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-100'
                                        }`}
                                    >
                                        {cat === 'Semua Kategori' ? (
                                            <svg className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-.778.099-1.533.284-2.253" />
                                            </svg>
                                        ) : cat === 'Tanpa Kategori' ? (
                                            <svg className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.884 2.223v6.19a2.25 2.25 0 002.25 2.25h16.5a2.25 2.25 0 002.25-2.25v-6.19a2.25 2.25 0 00-1.884-2.223m-16.5 0l2.062-6.19A2.25 2.25 0 015.753 3h12.494a2.25 2.25 0 012.115 1.488l2.062 6.19" />
                                            </svg>
                                        ) : (
                                            <svg className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                                            </svg>
                                        )}
                                        {cat}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="overflow-hidden border border-slate-200 rounded-xl bg-white shadow-sm">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 text-center w-12">
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer transition-all"
                                                checked={selectedCompetitorIds.length === filteredCompetitors.length && filteredCompetitors.length > 0} 
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedCompetitorIds(filteredCompetitors.map(c => c.id));
                                                    } else {
                                                        setSelectedCompetitorIds([]);
                                                    }
                                                }} 
                                            />
                                        </th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nama Kompetitor</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Kategori</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Total Keyword</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredCompetitors && filteredCompetitors.length > 0 ? (
                                        filteredCompetitors.map((comp) => (
                                            <tr key={comp.id} className={`hover:bg-slate-50/80 transition-colors ${selectedCompetitorIds.includes(comp.id) ? 'bg-indigo-50/20' : ''}`}>
                                                <td className="px-6 py-4 text-center">
                                                    <input 
                                                        type="checkbox" 
                                                        className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                                        checked={selectedCompetitorIds.includes(comp.id)} 
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedCompetitorIds(prev => [...prev, comp.id]);
                                                            } else {
                                                                setSelectedCompetitorIds(prev => prev.filter(id => id !== comp.id));
                                                            }
                                                        }} 
                                                    />
                                                </td>
                                                <td className="px-6 py-4 text-sm font-bold text-slate-900">{comp.name}</td>
                                                <td className="px-6 py-4 text-sm">
                                                    {comp.category ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                                            {comp.category}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-slate-400 italic">Tanpa Kategori</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-medium text-slate-500">
                                                    <span className="bg-slate-100 text-slate-700 py-1.5 px-3 rounded-lg border border-slate-200">
                                                        {comp.keywords_count} keywords
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => openEditModal(comp)}
                                                            className="inline-flex items-center justify-center p-2 bg-white text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 transition-all active:scale-90"
                                                            title="Edit Kompetitor"
                                                        >
                                                            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => setCompetitorToDelete(comp)}
                                                            className="inline-flex items-center justify-center p-2 bg-white text-slate-500 border border-slate-200 rounded-xl hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all active:scale-90"
                                                            title="Hapus Kompetitor"
                                                        >
                                                            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                                            </svg>
                                                        </button>
                                                        <Link 
                                                            href={`/competitors/${comp.id}`}
                                                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-indigo-600 text-white font-extrabold rounded-xl transition-all text-xs active:scale-95 shadow-sm hover:shadow-md"
                                                        >
                                                            Analisis
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                                            </svg>
                                                        </Link>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-16 text-center">
                                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 mb-4">
                                                    <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                                                </div>
                                                <p className="text-sm font-bold text-slate-900">Belum ada data tersedia di kategori ini</p>
                                                <p className="text-xs text-slate-500 mt-1">Klik tombol Tambah Data untuk memulai.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* --- HALAMAN 2: FORM UPLOAD --- */}
                {currentView === 'create' && (
                    <form onSubmit={handleSimpanPreview} className="max-w-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="mb-6">
                            <label className="block mb-2 text-sm font-bold text-slate-700">Nama Target Kompetitor <span className="text-rose-500">*</span></label>
                            <input type="text" required value={competitorName} onChange={(e) => setCompetitorName(e.target.value)} placeholder="Contoh: Tokopedia, Shopee..." className="w-full px-4 py-3.5 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"/>
                        </div>
                        <div className="mb-6">
                            <label className="block mb-2 text-sm font-bold text-slate-700">Kategori Kompetitor</label>
                            <input type="text" value={competitorCategory} onChange={(e) => setCompetitorCategory(e.target.value)} placeholder="Contoh: matik laundry, matik of sale..." className="w-full px-4 py-3.5 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"/>
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

            {/* FLOATING BULK ACTION BAR */}
            {selectedCompetitorIds.length > 0 && (
                <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-slate-950/95 backdrop-blur-xl border border-slate-800 shadow-[0_25px_60px_rgba(0,0,0,0.5)] rounded-2xl px-5 py-3.5 flex items-center gap-4.5 z-[9999] animate-in slide-in-from-bottom-8 fade-in duration-300 ease-out">
                    <div className="text-white flex items-center gap-2.5">
                        <span className="flex items-center justify-center w-6 h-6 bg-indigo-500 text-white rounded-full font-black text-[11px] shadow-md shadow-indigo-500/20">{selectedCompetitorIds.length}</span>
                        <span className="text-xs font-bold tracking-wide text-slate-200">Kompetitor Terpilih</span>
                    </div>
                    <div className="w-px h-4.5 bg-slate-800"></div>
                    <button 
                        onClick={() => setIsBulkDeleteModalOpen(true)}
                        className="bg-rose-600 hover:bg-rose-500 text-white px-4.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 active:scale-95 shadow-md shadow-rose-500/20"
                    >
                        Hapus Massal
                    </button>
                    <button 
                        onClick={() => setSelectedCompetitorIds([])} 
                        className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition-all"
                        title="Batalkan Pilihan"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            )}

            {/* EDIT COMPETITOR MODAL */}
            {editingCompetitor && (
                <div className="fixed inset-0 z-[10000] overflow-y-auto flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setEditingCompetitor(null)}></div>
                    
                    <div className="relative bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-md p-8 sm:p-10 animate-in zoom-in-95 duration-200 z-10">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black text-slate-900 leading-tight">Edit Kompetitor</h3>
                            <button onClick={() => setEditingCompetitor(null)} className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full text-slate-400 hover:text-rose-500 transition-colors">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        
                        <form onSubmit={handleSaveEdit} className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="block text-sm font-bold text-slate-700 ml-1">Nama Kompetitor</label>
                                <input 
                                    type="text" 
                                    required 
                                    value={editForm.name} 
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} 
                                    className="w-full px-5 py-3.5 text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                />
                            </div>
                            
                            <div className="space-y-1.5">
                                <label className="block text-sm font-bold text-slate-700 ml-1">Kategori</label>
                                <input 
                                    type="text" 
                                    value={editForm.category} 
                                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} 
                                    placeholder="Contoh: matik laundry, matik of sale..."
                                    className="w-full px-5 py-3.5 text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                />
                            </div>
                            
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button 
                                    type="button" 
                                    onClick={() => setEditingCompetitor(null)} 
                                    className="px-5 py-3 bg-slate-100 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-200 transition-colors"
                                >
                                    Batal
                                </button>
                                <button 
                                    type="submit" 
                                    className="px-5 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20 active:scale-95"
                                >
                                    Simpan Perubahan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* CUSTOM SINGLE DELETE CONFIRMATION MODAL */}
            {competitorToDelete && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setCompetitorToDelete(null)}></div>
                    <div className="relative bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-sm p-6 sm:p-8 animate-in zoom-in-95 duration-200 z-10 text-center">
                        <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-rose-50 text-rose-600 mb-5">
                            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mb-2">Hapus Kompetitor?</h3>
                        <p className="text-sm text-slate-500 mb-6">Apakah Anda yakin ingin menghapus kompetitor <strong>{competitorToDelete.name}</strong>? Semua data keyword di dalamnya juga akan terhapus secara permanen.</p>
                        <div className="flex gap-3 justify-center">
                            <button onClick={() => setCompetitorToDelete(null)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold rounded-xl transition-all">
                                Batal
                            </button>
                            <button onClick={executeDeleteCompetitor} className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold rounded-xl transition-all shadow-md shadow-rose-500/20 active:scale-95">
                                Ya, Hapus
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CUSTOM BULK DELETE CONFIRMATION MODAL */}
            {isBulkDeleteModalOpen && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsBulkDeleteModalOpen(false)}></div>
                    <div className="relative bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-sm p-6 sm:p-8 animate-in zoom-in-95 duration-200 z-10 text-center">
                        <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-rose-50 text-rose-600 mb-5">
                            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mb-2">Hapus Kompetitor Terpilih?</h3>
                        <p className="text-sm text-slate-500 mb-6">Apakah Anda yakin ingin menghapus <strong>{selectedCompetitorIds.length}</strong> kompetitor terpilih? Semua data keyword di dalamnya juga akan terhapus secara permanen.</p>
                        <div className="flex gap-3 justify-center">
                            <button onClick={() => setIsBulkDeleteModalOpen(false)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold rounded-xl transition-all">
                                Batal
                            </button>
                            <button onClick={executeBulkDelete} className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold rounded-xl transition-all shadow-md shadow-rose-500/20 active:scale-95">
                                Ya, Hapus Massal
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}