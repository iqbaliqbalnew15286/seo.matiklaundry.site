import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '../../layouts/AdminLayout';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Analysis({ competitor, keywords }) {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [sortConfig, setSortConfig] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    
    // State Data & Panel
    const [customRelevance, setCustomRelevance] = useState({});
    const [keywordMeta, setKeywordMeta] = useState({});
    const [selectedKeyword, setSelectedKeyword] = useState(null);
    const [newTagInput, setNewTagInput] = useState('');
    
    // State Toast Notification 
    const [toastMessage, setToastMessage] = useState(null);
    const dropdownRef = useRef(null);

    // State untuk form edit Sidebar (Lokal)
    const [editingNotes, setEditingNotes] = useState('');
    const [editingTags, setEditingTags] = useState([]);

    useEffect(() => {
        if (selectedKeyword) {
            setEditingNotes(selectedKeyword.meta?.notes || '');
            setEditingTags(selectedKeyword.meta?.tags || []);
            setNewTagInput('');
        }
    }, [selectedKeyword]);

    const handleAddLocalTag = () => {
        if (!newTagInput.trim()) return;
        if (editingTags.includes(newTagInput)) return;
        setEditingTags([...editingTags, newTagInput]);
        setNewTagInput('');
    };

    const handleRemoveLocalTag = (tagToRemove) => {
        setEditingTags(editingTags.filter(t => t !== tagToRemove));
    };

    const handleSaveSidebar = () => {
        if (!selectedKeyword) return;

        let finalTags = [...editingTags];
        const pendingTag = newTagInput.trim();
        if (pendingTag !== '' && !finalTags.includes(pendingTag)) {
            finalTags.push(pendingTag);
        }

        setKeywordMeta(prev => ({ 
            ...prev, 
            [selectedKeyword.id]: { 
                ...selectedKeyword.meta, 
                notes: editingNotes, 
                tags: finalTags 
            } 
        }));
        saveToServer(selectedKeyword.id, { 
            notes: editingNotes, 
            tags: finalTags 
        });

        // Tutup panel setelah simpan
        setSelectedKeyword(null);
        setNewTagInput('');
    };

    // Kunci scroll body saat fullscreen atau panel terbuka
    useEffect(() => {
        if (isFullscreen || selectedKeyword) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; }
    }, [isFullscreen, selectedKeyword]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsExportMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const showToast = (message) => {
        setToastMessage(message);
        setTimeout(() => setToastMessage(null), 3000);
    };

    const saveToServer = (kwId, data) => {
        router.put(`/keywords/${kwId}/meta`, data, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            onSuccess: () => showToast("Tersimpan!"),
            onError: () => showToast("Gagal menyimpan data.")
        });
    };

    // --- ALGORITMA SKORING ---
    const highestVolumeOverall = useMemo(() => {
        return Math.max(...keywords.map(kw => kw.avg_monthly_searches || 0), 1);
    }, [keywords]);

    const calculateScore = (kw, relScore) => {
        let score = 0;
        const vol = kw.avg_monthly_searches || 0;
        score += (vol / highestVolumeOverall) * 30;

        const comp = kw.competition?.toLowerCase() || '';
        if (comp === 'rendah') score += 20;
        else if (comp === 'menengah') score += 10;

        const trend = kw.three_month_change || '0%';
        if (trend.includes('-')) score += 0;
        else if (trend !== '0%' && trend !== '-') score += 15;
        else score += 7.5; 

        if (kw.bid_low_range > 0 || kw.bid_high_range > 0) score += 10;
        score += relScore; 
        return Math.min(Math.round(score), 100);
    };

    const getRecommendation = (score) => {
        if (score >= 70) return { label: 'Prioritas', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
        if (score >= 50) return { label: 'Potensial', color: 'bg-blue-100 text-blue-700 border-blue-200' };
        if (score >= 30) return { label: 'Pantau', color: 'bg-amber-100 text-amber-700 border-amber-200' };
        return { label: 'Abaikan', color: 'bg-slate-100 text-slate-600 border-slate-200' };
    };

    const keywordsWithScore = useMemo(() => {
        return keywords.map(kw => {
            // Auto calculate relevansi based on volume, competition, indexed value
            const vol = kw.avg_monthly_searches || 0;
            const comp = kw.competition?.toLowerCase() || '';
            const idxVal = kw.competition_indexed_value !== null ? kw.competition_indexed_value : 100;
            
            let autoRel = 5; // Default Rendah
            if (vol >= 1000 && (comp === 'rendah' || idxVal <= 33)) {
                autoRel = 25; // Tinggi
            } else if (vol >= 100 && (comp === 'rendah' || comp === 'menengah' || idxVal <= 66)) {
                autoRel = 15; // Sedang
            } else if (vol === 0 || comp === 'tinggi') {
                autoRel = 0; // Abaikan
            }

            // Gunakan customRelevance jika diubah di sesi ini, jika tidak gunakan sinkronisasi auto
            const relScore = customRelevance[kw.id] !== undefined ? customRelevance[kw.id] : autoRel;
            const meta = keywordMeta[kw.id] || { tags: kw.tags || [], notes: kw.notes || '', priority: kw.priority || '' };
            const score = calculateScore(kw, relScore);
            return {
                ...kw,
                relevance_value: relScore,
                opportunity_score: score,
                recommendation: getRecommendation(score),
                meta: meta
            };
        });
    }, [keywords, highestVolumeOverall, customRelevance, keywordMeta]);

    const summary = useMemo(() => {
        let total = keywordsWithScore.length;
        let lowCompetition = 0;
        let priorityCount = 0;
        keywordsWithScore.forEach(kw => {
            if (kw.competition?.toLowerCase() === 'rendah') lowCompetition++;
            if (kw.opportunity_score >= 70) priorityCount++;
        });
        return { total, lowCompetition, priorityCount };
    }, [keywordsWithScore]);

    const filteredAndSortedKeywords = useMemo(() => {
        let result = keywordsWithScore.filter(kw => 
            kw.keyword.toLowerCase().includes(searchQuery.toLowerCase())
        );

        if (sortConfig !== null) {
            result.sort((a, b) => {
                let aValue = a[sortConfig.key] || 0;
                let bValue = b[sortConfig.key] || 0;

                if (typeof aValue === 'string') aValue = aValue.toLowerCase();
                if (typeof bValue === 'string') bValue = bValue.toLowerCase();

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        } else {
            // Sortir default by relevansi, kompetisi, bid low/bid high
            result.sort((a, b) => {
                if (b.relevance_value !== a.relevance_value) {
                    return b.relevance_value - a.relevance_value; // Relevansi (Desc)
                }

                const getCompScore = (kw) => {
                    const c = kw.competition?.toLowerCase();
                    if (c === 'rendah') return 3;
                    if (c === 'menengah') return 2;
                    if (c === 'tinggi') return 1;
                    return kw.competition_indexed_value !== null ? (100 - kw.competition_indexed_value) / 100 : 0;
                };
                const compA = getCompScore(a);
                const compB = getCompScore(b);
                if (compA !== compB) {
                    return compB - compA; // Kompetisi (Rendah lebih dulu)
                }

                const bidA = (a.bid_low_range || 0) + (a.bid_high_range || 0);
                const bidB = (b.bid_low_range || 0) + (b.bid_high_range || 0);
                return bidB - bidA; // Bid Low/High (Desc)
            });
        }
        return result;
    }, [keywordsWithScore, sortConfig, searchQuery]);

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    // --- HANDLER INTERAKSI ---
    const handleSelectAll = (e) => {
        if (e.target.checked) setSelectedIds(filteredAndSortedKeywords.map(kw => kw.id));
        else setSelectedIds([]);
    };

    const handleSelectOne = (e, id) => {
        if (e.target.checked) setSelectedIds(prev => [...prev, id]);
        else setSelectedIds(prev => prev.filter(item => item !== id));
    };

    const handleRelevanceChange = (id, value) => {
        setCustomRelevance(prev => ({ ...prev, [id]: value }));
        saveToServer(id, { relevance_value: value });
    };

    const handleAddTag = (kw) => {
        if (!newTagInput.trim()) return;
        const currentTags = kw.meta?.tags || [];
        if (currentTags.includes(newTagInput)) return;
        
        const newTags = [...currentTags, newTagInput];
        setKeywordMeta(prev => ({ ...prev, [kw.id]: { ...kw.meta, tags: newTags } }));
        saveToServer(kw.id, { tags: newTags });
        setNewTagInput('');
        showToast(`Tag #${newTagInput} berhasil ditambahkan.`);
    };

    const handleRemoveTag = (kw, tagToRemove) => {
        const currentTags = kw.meta?.tags || [];
        const newTags = currentTags.filter(t => t !== tagToRemove);
        setKeywordMeta(prev => ({ ...prev, [kw.id]: { ...kw.meta, tags: newTags } }));
        saveToServer(kw.id, { tags: newTags });
    };

    const handleUpdateNotes = (kw, notes) => {
        setKeywordMeta(prev => ({ ...prev, [kw.id]: { ...kw.meta, notes } }));
    };

    const handleBulkSetPriority = (priority) => {
        setKeywordMeta(prev => {
            const newMeta = { ...prev };
            selectedIds.forEach(id => {
                const currentKw = keywordsWithScore.find(k => k.id === id);
                newMeta[id] = { ...(currentKw.meta || {}), priority };
                saveToServer(id, { priority: priority });
            });
            return newMeta;
        });
        showToast(`${selectedIds.length} keyword diset ke ${priority} Priority.`);
        setSelectedIds([]);
    };

    const exportToExcel = () => {
        const dataToExport = selectedIds.length > 0 ? filteredAndSortedKeywords.filter(kw => selectedIds.includes(kw.id)) : filteredAndSortedKeywords;
        const mappedData = dataToExport.map(kw => ({
            'Keyword': kw.keyword,
            'Relevansi': kw.relevance_value.toString(),
            'Volume': kw.avg_monthly_searches ? kw.avg_monthly_searches.toLocaleString('id-ID') : '0',
            '3M Change': kw.three_month_change || '-',
            'YoY': kw.yoy_change || '-',
            'Kompetisi': kw.competition || 'Unknown',
            'Idx Val': kw.competition_indexed_value !== null ? kw.competition_indexed_value.toString() : '-',
            'Bid L/H': `${kw.bid_low_range || '-'} / ${kw.bid_high_range || '-'}`,
            'Ad Impr': kw.ad_impression_share || '-',
            'Score': kw.opportunity_score.toString(),
            'Tags': kw.meta?.tags?.join(', ') || '-',
            'Priority': kw.meta.priority || '-',
            'Notes': kw.meta.notes || '-'
        }));

        const wb = XLSX.utils.book_new();
        const wsData = XLSX.utils.json_to_sheet(mappedData);
        XLSX.utils.book_append_sheet(wb, wsData, "Data Keyword");
        XLSX.writeFile(wb, `SEO_Report_${competitor.name}.xlsx`);
        showToast("Laporan Excel berhasil diunduh.");
        setIsExportMenuOpen(false);
    };

    const exportToPDF = () => {
        const doc = new jsPDF('l', 'pt', 'a4'); 
        const dataToExport = selectedIds.length > 0 ? filteredAndSortedKeywords.filter(kw => selectedIds.includes(kw.id)) : filteredAndSortedKeywords;

        doc.setFontSize(16);
        doc.text(`Laporan Keyword SEO: ${competitor.name}`, 40, 40);
        doc.setFontSize(10);
        doc.text(`Total diekspor: ${dataToExport.length} keyword`, 40, 60);

        const tableColumn = ["Keyword", "Relevansi", "Volume", "3M Change", "YoY", "Kompetisi", "Idx Val", "Bid L/H", "Ad Impr", "Score", "Tags", "Priority", "Notes"];
        const tableRows = dataToExport.map(kw => [
            kw.keyword,
            kw.relevance_value.toString(),
            kw.avg_monthly_searches ? kw.avg_monthly_searches.toLocaleString('id-ID') : '0',
            kw.three_month_change || '-',
            kw.yoy_change || '-',
            kw.competition || 'Unknown',
            kw.competition_indexed_value !== null ? kw.competition_indexed_value.toString() : '-',
            `${kw.bid_low_range || '-'} / ${kw.bid_high_range || '-'}`,
            kw.ad_impression_share || '-',
            kw.opportunity_score.toString(),
            kw.meta?.tags?.join(', ') || '-',
            kw.meta.priority || '-',
            kw.meta.notes || '-'
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 80,
            theme: 'grid',
            styles: { fontSize: 7, cellPadding: 4, lineColor: [236, 239, 244] },
            headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' } 
        });

        doc.save(`SEO_Report_${competitor.name}.pdf`);
        showToast("Laporan PDF berhasil diunduh.");
        setIsExportMenuOpen(false);
    };

    const renderCompetitionBadge = (level) => {
        const lowerLevel = level?.toLowerCase() || '';
        if (lowerLevel === 'rendah') return <span className="inline-flex items-center text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border border-emerald-100"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5 animate-pulse"></span>Rendah</span>;
        if (lowerLevel === 'menengah') return <span className="inline-flex items-center text-amber-700 bg-amber-50 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border border-amber-100"><span className="w-1.5 h-1.5 bg-amber-500 rounded-full mr-1.5"></span>Menengah</span>;
        if (lowerLevel === 'tinggi') return <span className="inline-flex items-center text-rose-700 bg-rose-50 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border border-rose-100"><span className="w-1.5 h-1.5 bg-rose-500 rounded-full mr-1.5"></span>Tinggi</span>;
        return <span className="inline-flex items-center text-slate-600 bg-slate-100 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border border-slate-200">Unknown</span>;
    };

    const SortIcon = ({ columnKey }) => {
        if (sortConfig?.key !== columnKey) return <span className="text-slate-300 opacity-0 group-hover:opacity-100 ml-1.5 transition-opacity duration-200">↕</span>;
        return <span className="text-blue-500 ml-1.5 font-bold">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
    };

    // --- STRUKTUR UTAMA KONTEN ---
    const contentData = (
        <div className={`flex flex-col transition-all duration-500 ease-out ${isFullscreen ? 'fixed inset-0 z-[9998] bg-slate-50/95 backdrop-blur-md p-6 sm:p-10 overflow-hidden' : 'mt-4'}`}>
            
            {/* Header Area */}
            <div className={`flex flex-col xl:flex-row items-start xl:items-center justify-between gap-5 ${isFullscreen ? 'mb-4' : 'mb-8'}`}>
                {!isFullscreen && (
                    <div>
                        <h3 className="text-3xl font-black text-slate-900 tracking-tight">{competitor.name}</h3>
                        <p className="text-sm font-medium text-slate-500 mt-1.5">Kurasi, analisis, dan manajemen peluang SEO.</p>
                    </div>
                )}
                
                <div className={`flex flex-wrap items-center gap-3 w-full ${!isFullscreen ? 'xl:w-auto' : ''} ${isFullscreen ? 'justify-end' : ''}`}>
                    {/* Search Input Modern */}
                    <div className={`relative group w-full ${isFullscreen ? 'sm:w-1/2' : 'sm:w-80'}`}>
                        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                            <svg className="w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                        <input 
                            type="text" 
                            placeholder="Ketik keyword untuk mencari..." 
                            className="w-full pl-11 pr-4 py-3 text-sm font-medium text-slate-700 bg-white border-transparent rounded-full shadow-sm outline-none transition-all duration-300 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 hover:shadow-md"
                            value={searchQuery} 
                            onChange={(e) => setSearchQuery(e.target.value)} 
                        />
                    </div>

                    <button 
                        onClick={() => setIsFullscreen(!isFullscreen)} 
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-700 hover:bg-slate-50 hover:text-blue-600 rounded-full text-sm font-bold transition-all duration-300 shadow-sm border border-slate-200/60 active:scale-95"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            {isFullscreen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 14h6m0 0v6m0-6l-7 7m17-11h-6m0 0V4m0 6l7-7M4 10h6m0 0V4m0 6l-7-7m17 11h-6m0 0v6m0-6l7 7" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                            )}
                        </svg>
                        {isFullscreen ? 'Keluar Fullscreen' : 'Fullscreen'}
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            {!isFullscreen && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-5 hover:-translate-y-1 transition-transform duration-300">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-500">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Keyword</span>
                        <span className="text-3xl font-black text-slate-800 leading-none">{summary.total}</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-5 hover:-translate-y-1 transition-transform duration-300">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center flex-shrink-0 text-emerald-500">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Peluang Cepat</span>
                        <span className="text-3xl font-black text-slate-800 leading-none">{summary.lowCompetition}</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-5 hover:-translate-y-1 transition-transform duration-300">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center flex-shrink-0 text-amber-500">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Prioritas Tinggi</span>
                        <span className="text-3xl font-black text-slate-800 leading-none">{summary.priorityCount}</span>
                    </div>
                </div>
            </div>
            )}

            {/* Main Table Modern & Lembut */}
            <div className={`bg-white border border-slate-100 shadow-[0_12px_40px_rgb(0,0,0,0.04)] flex flex-col rounded-3xl ${isFullscreen ? 'flex-1 overflow-hidden' : 'max-h-[650px] overflow-hidden'}`}>
                <div className="overflow-auto custom-scrollbar flex-1">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead className="bg-slate-50/80 backdrop-blur-md sticky top-0 z-20 shadow-sm">
                            <tr>
                                <th className="px-4 py-4 text-center w-14 bg-slate-50/80 backdrop-blur-md">
                                    <input type="checkbox" className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer transition-all" checked={selectedIds.length === filteredAndSortedKeywords.length && filteredAndSortedKeywords.length > 0} onChange={handleSelectAll} />
                                </th>
                                <th className="px-4 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/80 backdrop-blur-md cursor-pointer hover:text-blue-600 group transition-colors" onClick={() => requestSort('keyword')}>
                                    Keyword <SortIcon columnKey="keyword" />
                                </th>
                                <th className="px-4 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-blue-600 group transition-colors" onClick={() => requestSort('relevance_value')}>
                                    Relevansi <SortIcon columnKey="relevance_value" />
                                </th>
                                <th className="px-4 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-blue-600 group transition-colors" onClick={() => requestSort('avg_monthly_searches')}>
                                    Volume <SortIcon columnKey="avg_monthly_searches" />
                                </th>
                                <th className="px-4 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-blue-600 group transition-colors" onClick={() => requestSort('three_month_change')}>
                                    3 Month Change <SortIcon columnKey="three_month_change" />
                                </th>
                                <th className="px-4 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-blue-600 group transition-colors" onClick={() => requestSort('yoy_change')}>
                                    YoY Change <SortIcon columnKey="yoy_change" />
                                </th>
                                <th className="px-4 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-blue-600 group transition-colors" onClick={() => requestSort('competition')}>
                                    Kompetisi <SortIcon columnKey="competition" />
                                </th>
                                <th className="px-4 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-blue-600 group transition-colors" onClick={() => requestSort('competition_indexed_value')}>
                                    Indexed Value <SortIcon columnKey="competition_indexed_value" />
                                </th>
                                <th className="px-4 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-blue-600 group transition-colors" onClick={() => requestSort('bid_low_range')}>
                                    Bid Low <SortIcon columnKey="bid_low_range" />
                                </th>
                                <th className="px-4 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-blue-600 group transition-colors" onClick={() => requestSort('bid_high_range')}>
                                    Bid High <SortIcon columnKey="bid_high_range" />
                                </th>
                                <th className="px-4 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-blue-600 group transition-colors" onClick={() => requestSort('ad_impression_share')}>
                                    Ad Impr. Share <SortIcon columnKey="ad_impression_share" />
                                </th>
                                <th className="px-4 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                    Catatan
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredAndSortedKeywords.length > 0 ? filteredAndSortedKeywords.map((kw) => (
                                <tr key={kw.id} className={`group transition-colors duration-200 ${selectedIds.includes(kw.id) ? 'bg-blue-50/60' : 'bg-white hover:bg-slate-50/60'}`}>
                                    <td className={`px-4 py-3 text-center transition-colors duration-200 ${selectedIds.includes(kw.id) ? 'bg-blue-50' : 'bg-white group-hover:bg-slate-50/60'}`}>
                                        <input type="checkbox" className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer" checked={selectedIds.includes(kw.id)} onChange={(e) => handleSelectOne(e, kw.id)} />
                                    </td>
                                    <td 
                                        className={`px-4 py-3 cursor-pointer transition-colors duration-200 ${selectedIds.includes(kw.id) ? 'bg-blue-50' : 'bg-white group-hover:bg-slate-50/60'}`}
                                        onClick={() => setSelectedKeyword(kw)}
                                    >
                                        <div className="flex flex-col gap-1.5">
                                            <span className={`text-sm font-extrabold transition-colors duration-200 ${selectedIds.includes(kw.id) ? 'text-blue-700' : 'text-slate-700 group-hover:text-blue-600'}`}>
                                                {kw.keyword}
                                            </span>
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${kw.recommendation.color}`}>
                                                    Score: {kw.opportunity_score} ({kw.recommendation.label})
                                                </span>
                                                {kw.meta.priority && (
                                                    <span className="bg-rose-50 text-rose-600 border border-rose-100 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide">
                                                        ★ {kw.meta.priority}
                                                    </span>
                                                )}
                                                {kw.meta.tags.slice(0, 2).map(tag => (
                                                    <span key={tag} className="bg-slate-100 text-slate-500 border border-slate-200/60 px-2 py-0.5 rounded text-[10px] font-bold">
                                                        #{tag}
                                                    </span>
                                                ))}
                                                {kw.meta.tags.length > 2 && <span className="text-[10px] text-slate-400 font-medium bg-slate-50 px-1.5 py-0.5 rounded">+{kw.meta.tags.length - 2}</span>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="relative">
                                            <select
                                                value={kw.relevance_value}
                                                onChange={(e) => handleRelevanceChange(kw.id, parseInt(e.target.value))}
                                                className="appearance-none bg-slate-50/50 border border-slate-200 text-slate-600 text-[11px] font-bold rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 block w-24 pl-2 pr-6 py-1.5 outline-none cursor-pointer hover:bg-slate-100 transition-all"
                                            >
                                                <option value={25}>Tinggi</option>
                                                <option value={15}>Sedang</option>
                                                <option value={5}>Rendah</option>
                                                <option value={0}>Abaikan</option>
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-slate-400">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm font-semibold text-slate-600">
                                        {kw.avg_monthly_searches ? kw.avg_monthly_searches.toLocaleString('id-ID') : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-sm font-medium text-slate-600">
                                        {kw.three_month_change || '-'}
                                    </td>
                                    <td className="px-4 py-3 text-sm font-medium text-slate-600">
                                        {kw.yoy_change || '-'}
                                    </td>
                                    <td className="px-4 py-3">
                                        {renderCompetitionBadge(kw.competition)}
                                    </td>
                                    <td className="px-4 py-3 text-sm font-medium text-slate-600">
                                        {kw.competition_indexed_value !== null ? kw.competition_indexed_value : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-sm font-medium text-slate-600">
                                        {kw.bid_low_range !== null ? kw.bid_low_range : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-sm font-medium text-slate-600">
                                        {kw.bid_high_range !== null ? kw.bid_high_range : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-sm font-medium text-slate-600">
                                        {kw.ad_impression_share || '-'}
                                    </td>
                                    <td className="px-4 py-3 text-xs font-medium text-slate-500 max-w-[150px] truncate" title={kw.meta.notes}>
                                        {kw.meta.notes || <span className="italic text-slate-300">Kosong</span>}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="12" className="px-5 py-24 text-center">
                                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-3">
                                            <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        </div>
                                        <p className="text-sm font-bold text-slate-500">Pencarian tidak menemukan hasil.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* FLOATING BULK ACTION BAR (Mulus & Glassmorphism) */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-full px-6 py-3.5 flex items-center gap-5 z-[9999] animate-in slide-in-from-bottom-8 fade-in duration-300 ease-out">
                    <div className="text-white flex items-center">
                        <span className="flex items-center justify-center w-7 h-7 bg-blue-500 rounded-full font-black text-sm shadow-inner mr-2.5">{selectedIds.length}</span>
                        <span className="text-sm font-semibold text-slate-300">Data Terpilih</span>
                    </div>
                    <div className="w-px h-6 bg-slate-700"></div>
                    
                    <div className="flex items-center gap-3 relative">
                        <select 
                            onChange={(e) => {
                                if(e.target.value) {
                                    handleBulkSetPriority(e.target.value);
                                    e.target.value = ""; 
                                }
                            }}
                            className="bg-slate-800/80 text-slate-200 text-sm font-semibold rounded-full px-5 py-2 outline-none border border-slate-700 hover:bg-slate-700 hover:text-white cursor-pointer appearance-none transition-all"
                        >
                            <option value="">⚙ Set Prioritas...</option>
                            <option value="High">Tinggi (High)</option>
                            <option value="Medium">Menengah (Medium)</option>
                            <option value="Low">Rendah (Low)</option>
                        </select>
                        
                        <div ref={dropdownRef} className="relative">
                            <button 
                                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 active:scale-95"
                            >
                                Export
                                <svg className={`w-4 h-4 transition-transform duration-300 ${isExportMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7" /></svg>
                            </button>

                            {isExportMenuOpen && (
                                <div className="absolute bottom-full mb-4 right-0 w-48 bg-slate-800/95 backdrop-blur-md border border-slate-700 rounded-2xl shadow-2xl z-[9999] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    <button onClick={exportToPDF} className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors border-b border-slate-700/50">
                                        <svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 9h1.5m1.5 0H15m-4.5 4h3m-3 4h3M9 13h.01M9 17h.01" /></svg> Download PDF
                                    </button>
                                    <button onClick={exportToExcel} className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">
                                        <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> Download Excel
                                    </button>
                                </div>
                            )}
                        </div>

                        <button onClick={() => setSelectedIds([])} className="ml-2 w-8 h-8 flex items-center justify-center bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 rounded-full transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <AdminLayout>
            <Head title={`Analisis - ${competitor.name}`} />
            
            {/* Custom Font Injeksi (seperti halaman login) */}
            <style>
                {`
                    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
                    body { font-family: 'Plus Jakarta Sans', sans-serif; }
                `}
            </style>

            {toastMessage && (
                <div className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-slate-800/90 backdrop-blur-md text-white px-5 py-3.5 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.2)] z-[9999] flex items-center gap-3 animate-in slide-in-from-top-5 fade-in duration-300 border border-slate-700/50">
                    <span className="flex items-center justify-center w-5 h-5 bg-emerald-500 rounded-full text-white text-xs font-bold shadow-sm">✓</span>
                    <span className="text-sm font-semibold tracking-wide">{toastMessage}</span>
                </div>
            )}

            {!isFullscreen && (
                <div className="mb-6">
                    <Link href="/dashboard" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors bg-white/70 px-4 py-2 rounded-full border border-slate-200/60 shadow-sm hover:shadow-md hover:bg-white">
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7V3" /></svg>
                        Kembali ke Dashboard
                    </Link>
                </div>
            )}

            {contentData}

            {/* Sidebar Detail Keyword Lembut & Elegan */}
            {selectedKeyword && (
                <div className="fixed inset-0 z-[10000] overflow-hidden flex justify-end">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-300" onClick={() => setSelectedKeyword(null)}></div>
                    <div className="relative w-full max-w-lg bg-white shadow-[-20px_0_50px_rgba(0,0,0,0.1)] flex flex-col transform transition-transform duration-500 ease-out border-l border-slate-200/60 rounded-l-[2.5rem] animate-in slide-in-from-right-full h-full m-2">
                        
                        <div className="flex items-center justify-between p-8 pb-6 border-b border-slate-100 bg-white rounded-tl-[2.5rem] z-10"> 
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span> Detail Keyword
                                </p>
                                <h2 className="text-2xl font-black text-slate-800 leading-tight pr-4">{selectedKeyword.keyword}</h2>
                            </div>
                            <button onClick={() => setSelectedKeyword(null)} className="w-10 h-10 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-200 transition-all shadow-sm active:scale-95 flex-shrink-0">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-8 flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50">
                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-200 hover:shadow-md transition-all group">
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 group-hover:text-blue-500 transition-colors">Opp. Score</p>
                                    <div className="flex items-end gap-2">
                                        <p className="text-4xl font-black text-slate-800">{selectedKeyword.opportunity_score}</p>
                                        <span className={`px-2 py-1 mb-1 rounded border text-[9px] font-bold uppercase ${selectedKeyword.recommendation.color}`}>
                                            {selectedKeyword.recommendation.label}
                                        </span>
                                    </div>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-200 hover:shadow-md transition-all group">
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 group-hover:text-blue-500 transition-colors">Vol (Avg)</p>
                                    <p className="text-4xl font-black text-slate-800">{selectedKeyword.avg_monthly_searches?.toLocaleString('id-ID') || '-'}</p>
                                </div>
                            </div>

                            <div className="mb-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                                    Pengelompokan (Tags)
                                </h4>
                                <div className="flex flex-wrap gap-2 mb-5">
                                    {editingTags.map(tag => (
                                        <span key={tag} className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 transition-colors group/tag">
                                            #{tag}
                                            <button onClick={() => handleRemoveLocalTag(tag)} className="ml-2 w-4 h-4 flex items-center justify-center bg-slate-300 rounded-full text-slate-500 group-hover/tag:bg-rose-500 group-hover/tag:text-white transition-colors">
                                                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
                                            </button>
                                        </span>
                                    ))}
                                    {editingTags.length === 0 && <span className="text-xs text-slate-400 italic bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">Belum ada tag ditambahkan.</span>}
                                </div>
                                <div className="relative flex items-center group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="text-slate-400 font-bold">#</span>
                                    </div>
                                    <input 
                                        type="text" 
                                        placeholder="Ketik tag baru lalu Enter..." 
                                        className="w-full text-sm font-medium bg-white border border-slate-300 rounded-xl pl-8 pr-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm hover:border-slate-400"
                                        value={newTagInput}
                                        onChange={(e) => setNewTagInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if(e.key === 'Enter') handleAddLocalTag();
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative group">
                                <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                    Catatan & Brief Konten
                                </h4>
                                <div className="relative">
                                    <textarea 
                                        className="w-full bg-white border border-slate-300 rounded-xl p-4 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 resize-none h-40 transition-all shadow-sm hover:border-slate-400 custom-scrollbar"
                                        placeholder="Tuliskan ide konten, intent pengguna, atau instruksi untuk tim penulis disini..."
                                        value={editingNotes}
                                        onChange={(e) => setEditingNotes(e.target.value)}
                                    ></textarea>
                                </div>
                            </div>
                        </div>

                        {/* Footer Sidebar - Single Save Button */}
                        <div className="p-6 border-t border-slate-100 bg-white">
                            <button 
                                onClick={handleSaveSidebar}
                                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold shadow-sm hover:shadow-md transition-all active:scale-95"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                Simpan Perubahan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}