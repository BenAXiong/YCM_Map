import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronDown, ChevronRight, Filter, Info, Search, X, ChevronUp, ChevronLeft, Footprints, ListFilter, MapPin, Languages } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import type { UserStats } from '../hooks/useUserStats';
import { mapTranslations } from '../data/map_translations';

type Props = {
    isMobile: boolean;
    isOpen: boolean;
    setIsOpen: (v: boolean) => void;

    languageGroups: Record<string, string[]>;
    populationMap: Record<string, number>;
    userStats: UserStats;
    expandedGroups: Set<string>;
    setExpandedGroups: React.Dispatch<React.SetStateAction<Set<string>>>;

    selectedDialects: Set<string>;
    onToggleLanguage: (lang: string) => void;
    onToggleDialect: (dialect: string) => void;
    onSelectAll: () => void;
    onClearAll: () => void;

    // search
    searchTerm: string;
    setSearchTerm: (v: string) => void;
    searchHistory: any[];
    searchResults: { places: any[], languages: any[] };
    onSelectSearchItem: (item: any) => void;

    // coloring for dialect chips
    getDialectColor: (dialect: string) => string;
    language: 'zh' | 'en';
    showUsageNames: boolean;
};

const InfoTooltip: React.FC<{ lang: string; stats: any; population: number; language: string; showUsageNames: boolean }> = ({ lang, stats, population, language, showUsageNames }) => {
    const [isHovered, setIsHovered] = useState(false);
    const iconRef = useRef<HTMLDivElement>(null);

    const { mt: mtLocal } = useTranslation(language as any, showUsageNames);

    const getPortalPosition = () => {
        if (!iconRef.current) return { top: 0, left: 0 };
        const rect = iconRef.current.getBoundingClientRect();
        return {
            top: rect.top - 8, // Standard padding
            left: rect.left + (rect.width / 2)
        };
    };

    const pos = getPortalPosition();

    return (
        <div
            ref={iconRef}
            className="relative flex items-center justify-center p-1"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <Info className="w-4 h-4 text-stone-300 hover:text-emerald-500 transition-colors" />
            {isHovered && createPortal(
                <div
                    className="fixed z-[9999] -translate-x-1/2 -translate-y-full pointer-events-none"
                    style={{ top: pos.top, left: pos.left }}
                >
                    <div className="bg-stone-900 text-white text-[10px] px-3 py-2 rounded-xl shadow-2xl flex flex-col gap-1 border border-white/10 whitespace-nowrap mb-2">
                        <div className="flex justify-between gap-4 font-bold">
                            <span className="opacity-60">{language === 'zh' ? '人口' : 'Population'}</span>
                            <span>{population?.toLocaleString() || '---'} 人</span>
                        </div>
                        <div className="text-[10px] text-emerald-400 font-bold border-b border-white/5 mb-1 pb-1">
                            {mtLocal(lang)}
                        </div>
                        {stats?.total > 0 && (
                            <div className="flex justify-between gap-4 font-bold border-t border-white/10 pt-1 mt-0.5 text-emerald-400">
                                <span className="opacity-80">📍 {language === 'zh' ? '探索進度' : 'Exploration'}</span>
                                <span>{stats.pinned} / {stats.total}</span>
                            </div>
                        )}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-stone-900" />
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

const DialectFilterPanel: React.FC<Props> = ({
    isMobile,
    isOpen,
    setIsOpen,
    languageGroups,
    populationMap,
    userStats,
    expandedGroups,
    setExpandedGroups,
    selectedDialects,
    onToggleLanguage,
    onToggleDialect,
    onSelectAll,
    onClearAll,
    searchTerm,
    setSearchTerm,
    searchHistory,
    searchResults,
    onSelectSearchItem,
    getDialectColor,
    language,
    showUsageNames,
}) => {
    const { t, mt } = useTranslation(language, showUsageNames);
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    const historyPlaces = searchHistory.filter(h => h.county && h.town);
    const historyLanguages = searchHistory.filter(h => h.type === 'language' || h.type === 'dialect');

    const showSuggestions = (searchTerm.trim() !== '' && (searchResults.places.length > 0 || searchResults.languages.length > 0)) ||
        (searchTerm.trim() === '' && isSearchFocused && searchHistory.length > 0);

    const displayPlaces = searchTerm.trim() === '' ? historyPlaces : searchResults.places;
    const displayLanguages = searchTerm.trim() === '' ? historyLanguages : searchResults.languages;
    const suggestionsTitle = searchTerm.trim() === '' ? (language === 'zh' ? '最近搜尋' : 'Recent') : '';

    const toggleGroup = (lang: string) => {
        setExpandedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(lang)) next.delete(lang);
            else next.add(lang);
            return next;
        });
    };

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={isMobile ? { y: '100%' } : { x: 300, opacity: 0 }}
                        animate={isMobile ? { y: 0 } : { x: 0, opacity: 1 }}
                        exit={isMobile ? { y: '100%' } : { x: 300, opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className={`fixed ${isMobile ? 'bottom-0 left-0 right-0 h-[85vh] rounded-t-3xl' : 'top-0 right-0 h-full w-80 border-l'} bg-white/95 backdrop-blur-2xl border-stone-200 shadow-[0_-20px_50px_rgba(0,0,0,0.1)] z-50 flex flex-col overflow-hidden`}
                    >
                        {/* Drag Handle / Header */}
                        <div className="p-5 pb-2 flex flex-col shrink-0">
                            {isMobile && <div className="w-12 h-1.5 bg-stone-200 rounded-full mx-auto mb-4" />}
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold flex items-center gap-2 text-stone-900">
                                    <Filter className="w-5 h-5 text-emerald-600" />
                                    {t('filterLanguages')}
                                </h2>
                                <div className="flex items-center gap-1.5">
                                    {isMobile && (
                                        <>
                                            <button
                                                onClick={onSelectAll}
                                                className="px-3 py-2 bg-emerald-50 text-emerald-600 text-[15px] font-black tracking-widest uppercase rounded-lg active:bg-emerald-100 transition-colors"
                                            >
                                                {t('selectAll')}
                                            </button>
                                            <button
                                                onClick={onClearAll}
                                                className="px-3 py-2 bg-stone-100 text-stone-500 text-[15px] font-black tracking-widest uppercase rounded-lg active:bg-stone-200 transition-colors"
                                            >
                                                {t('clearAll')}
                                            </button>
                                        </>
                                    )}
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="p-2 hover:bg-stone-100 rounded-full transition-colors text-stone-400 hover:text-stone-600 ml-1"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>

                            {/* Search */}
                            <div className="relative mb-4">
                                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                    <Search className="w-4 h-4 text-stone-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder={t('searchPlaceholder')}
                                    value={searchTerm}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                                    onFocus={() => setIsSearchFocused(true)}
                                    // Blur needs a small delay to handle clicks on results
                                    onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                                    className="w-full pl-11 pr-4 py-3 bg-stone-100 border-none rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
                                />

                                <AnimatePresence>
                                    {showSuggestions && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-stone-100 z-50 overflow-hidden"
                                        >
                                            {suggestionsTitle && (
                                                <div className="px-4 py-2 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-between">
                                                    <span>{suggestionsTitle}</span>
                                                    <Footprints className="w-3 h-3 opacity-50" />
                                                </div>
                                            )}
                                            <div className="flex divide-x divide-stone-50 max-h-80">
                                                {/* Column 1: Places */}
                                                <div className="flex-1 overflow-y-auto">
                                                    <div className="px-4 py-2 bg-stone-50/50 border-b border-stone-100 flex items-center gap-1.5 sticky top-0 z-10 backdrop-blur-sm">
                                                        <MapPin className="w-3 h-3 text-stone-400" />
                                                        <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">{t('places')}</span>
                                                    </div>
                                                    {displayPlaces.length > 0 ? (
                                                        displayPlaces.map((result: any, idx) => (
                                                            <button
                                                                key={`place-${result.id || idx}`}
                                                                onClick={() => onSelectSearchItem(result)}
                                                                className="w-full text-left px-4 py-3 hover:bg-emerald-50 transition-colors border-b border-stone-50 last:border-0 flex flex-col group"
                                                            >
                                                                <span className="text-sm font-bold text-stone-900 group-hover:text-emerald-700">{mt(result.town)}</span>
                                                                <span className="text-[10px] text-stone-500">{mt(result.county)}</span>
                                                            </button>
                                                        ))
                                                    ) : (
                                                        <div className="px-4 py-6 text-center text-stone-300 italic text-[10px]">
                                                            {language === 'zh' ? '無相符地方' : 'No places'}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Column 2: Languages */}
                                                <div className="flex-1 overflow-y-auto">
                                                    <div className="px-4 py-2 bg-stone-50/50 border-b border-stone-100 flex items-center gap-1.5 sticky top-0 z-10 backdrop-blur-sm">
                                                        <Languages className="w-3 h-3 text-stone-400" />
                                                        <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">{t('languages')}</span>
                                                    </div>
                                                    {displayLanguages.length > 0 ? (
                                                        displayLanguages.map((result: any, idx) => (
                                                            <button
                                                                key={`lang-${idx}`}
                                                                onClick={() => onSelectSearchItem(result)}
                                                                className="w-full text-left px-4 py-3 hover:bg-emerald-50 transition-colors border-b border-stone-50 last:border-0 flex flex-col group"
                                                            >
                                                                <span className="text-sm font-bold text-stone-900 group-hover:text-emerald-700">{result.name}</span>
                                                                {mapTranslations.en[result.name] && (
                                                                    <span className="text-[10px] text-stone-500 uppercase font-black tracking-tighter">
                                                                        {mapTranslations.en[result.name]}
                                                                    </span>
                                                                )}
                                                            </button>
                                                        ))
                                                    ) : (
                                                        <div className="px-4 py-6 text-center text-stone-300 italic text-[10px]">
                                                            {language === 'zh' ? '無相符語言' : 'No languages'}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Desktop Actions */}
                            {!isMobile && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={onSelectAll}
                                        className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-sm hover:bg-emerald-700 active:scale-95 transition-all"
                                    >
                                        {t('selectAll')}
                                    </button>
                                    <button
                                        onClick={onClearAll}
                                        className="flex-1 py-3 bg-stone-100 text-stone-600 rounded-xl font-black text-xs uppercase tracking-widest shadow-sm hover:bg-stone-200 active:scale-95 transition-all"
                                    >
                                        {t('clearAll')}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Exploration progress is now in a separate panel on desktop */}
                        {isMobile && (
                            <div className="px-6 py-4 bg-emerald-50/50 border-b border-stone-100">
                                <div className="flex justify-between items-end mb-2">
                                    <h3 className="text-[10px] font-black text-emerald-800 uppercase tracking-widest flex items-center gap-1.5">
                                        <Footprints className="w-3 h-3" />
                                        {language === 'zh' ? '探索進度' : 'Exploration'}
                                    </h3>
                                    <span className="text-[10px] font-mono font-bold text-emerald-600">
                                        {userStats.pinnedCount} / {userStats.totalVillages}
                                    </span>
                                </div>
                                <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(userStats.pinnedCount / userStats.totalVillages) * 100}%` }}
                                        className="h-full bg-emerald-500 rounded-full"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="p-4 py-2 flex flex-col gap-1 overflow-y-auto flex-1 min-h-0 custom-scrollbar overflow-x-hidden">
                            {Object.entries(languageGroups).map(([lang, dialects], index) => {
                                const dialectsArray = dialects as string[];
                                const allSelected =
                                    dialectsArray.length > 0 && dialectsArray.every((d) => selectedDialects.has(d));
                                const someSelected =
                                    !allSelected && dialectsArray.some((d) => selectedDialects.has(d));
                                const isExpanded = expandedGroups.has(lang);
                                const isAnySelected = allSelected || someSelected;
                                const pop = populationMap[lang] || 0;

                                return (
                                    <div key={lang} className="flex flex-col gap-1">
                                        <div
                                            className="flex items-center justify-between px-4 py-2 rounded-xl transition-all cursor-pointer group/row"
                                            style={{
                                                backgroundColor: getDialectColor(lang).replace('hsl(', 'hsla(').replace(')', ', 0.12)')
                                            }}
                                            onClick={() => toggleGroup(lang)}
                                        >
                                            <div className="flex items-center gap-4 flex-1">
                                                <button
                                                    className="w-6 h-6 rounded-lg border flex shrink-0 items-center justify-center transition-all bg-white shadow-sm"
                                                    style={{
                                                        borderColor: allSelected ? '#10b981' : someSelected ? '#a8a29e' : '#e5e7eb',
                                                        backgroundColor: allSelected ? '#10b981' : someSelected ? '#a8a29e' : 'white'
                                                    }}
                                                    onClick={(e: React.MouseEvent) => {
                                                        e.stopPropagation();
                                                        onToggleLanguage(lang);
                                                    }}
                                                >
                                                    {allSelected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={4} />}
                                                    {someSelected && <div className="w-2.5 h-1 bg-white rounded-full" />}
                                                </button>

                                                <span className={`text-sm font-bold tracking-tight ${isAnySelected ? 'text-emerald-900' : 'text-stone-700'}`}>
                                                    {mt(lang)}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <InfoTooltip
                                                    lang={lang}
                                                    stats={userStats.byLanguage[lang]}
                                                    population={populationMap[lang]}
                                                    language={language}
                                                    showUsageNames={showUsageNames}
                                                />
                                                {isAnySelected && (
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                                )}
                                                {isExpanded ? <ChevronDown className="w-4 h-4 text-stone-400" /> : <ChevronRight className="w-4 h-4 text-stone-400" />}
                                            </div>
                                        </div>

                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="flex flex-col gap-1 mt-1 ml-5 border-l-2 border-stone-100 pl-3"
                                                >
                                                    {dialectsArray.map((dialect) => {
                                                        const selected = selectedDialects.has(dialect);
                                                        const color = getDialectColor(dialect);

                                                        return (
                                                            <div
                                                                key={dialect}
                                                                className="flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all"
                                                                style={{
                                                                    backgroundColor: color.replace('hsl(', 'hsla(').replace(')', ', 0.08)'),
                                                                    borderColor: color.replace('hsl(', 'hsla(').replace(')', ', 0.2)')
                                                                }}
                                                                onClick={() => onToggleDialect(dialect)}
                                                            >
                                                                <div
                                                                    className="w-5 h-5 rounded-md border flex items-center justify-center transition-all shadow-sm bg-white"
                                                                    style={{
                                                                        borderColor: selected ? color : '#e5e7eb',
                                                                        backgroundColor: selected ? color : 'white'
                                                                    }}
                                                                >
                                                                    {selected && <Check className="w-3 h-3 text-white" strokeWidth={4} />}
                                                                </div>
                                                                <span className={`text-sm ${selected ? 'font-bold text-stone-900' : 'text-stone-600'}`}>
                                                                    {mt(dialect)}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Mobile Apply Button */}
                        {isMobile && (
                            <div className="p-5 pt-0 shrink-0">
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="w-full py-4 bg-emerald-600 text-white font-black tracking-widest uppercase rounded-[1.5rem] shadow-xl hover:bg-emerald-700 transition-all active:scale-[0.98]"
                                >
                                    {language === 'zh' ? '確定' : 'OK'}
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className={`fixed z-40 shadow-2xl hover:bg-opacity-100 transition-all flex items-center font-black tracking-widest uppercase text-[12px] active:scale-95 transition-all duration-300 ${isMobile
                        ? 'bottom-8 right-6 rounded-2xl w-[144px] h-12 px-4 justify-between bg-white/95 backdrop-blur-xl text-stone-900 border border-stone-200'
                        : 'top-6 right-6 rounded-2xl p-4 justify-center gap-2 bg-white/90 backdrop-blur-md text-stone-900 border border-stone-200'
                        }`}
                >
                    {isMobile ? (
                        <>
                            <div className="w-[22px] flex justify-center shrink-0">
                                <ChevronUp className="w-3.5 h-3.5 text-emerald-600" />
                            </div>
                            <span className="truncate flex-1 text-center">{t('filterLanguages')}</span>
                            <div className="p-1 bg-emerald-50 rounded-lg shrink-0">
                                <ListFilter className="w-3.5 h-3.5 text-emerald-600" />
                            </div>
                        </>
                    ) : (
                        <>
                            <Filter className="w-4 h-4 text-emerald-600" />
                            {language === 'zh' ? '顯示篩選面板' : 'Show Filter Panel'}
                            <ChevronLeft className="w-4 h-4 text-stone-400" />
                        </>
                    )}
                </button>
            )}
        </>
    );
};

export default React.memo(DialectFilterPanel);
