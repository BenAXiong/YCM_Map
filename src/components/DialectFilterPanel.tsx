import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronDown, ChevronRight, Filter, Info, Search, X, ChevronUp, ChevronLeft } from 'lucide-react';

type Props = {
    isMobile: boolean;
    isOpen: boolean;
    setIsOpen: (v: boolean) => void;

    languageGroups: Record<string, string[]>;
    populationMap: Record<string, number>;
    expandedGroups: Set<string>;
    setExpandedGroups: React.Dispatch<React.SetStateAction<Set<string>>>;

    selectedDialects: Set<string>;
    showFilterColors: boolean;
    onToggleLanguage: (lang: string) => void;
    onToggleDialect: (dialect: string) => void;
    onSelectAll: () => void;
    onClearAll: () => void;

    // search
    searchTerm: string;
    setSearchTerm: (v: string) => void;
    searchResults: any[];
    onSelectTownship: (township: any) => void;

    // coloring for dialect chips
    getDialectColor: (dialect: string) => string;
};

const DialectFilterPanel: React.FC<Props> = ({
    isMobile,
    isOpen,
    setIsOpen,
    languageGroups,
    populationMap,
    expandedGroups,
    setExpandedGroups,
    selectedDialects,
    showFilterColors,
    onToggleLanguage,
    onToggleDialect,
    onSelectAll,
    onClearAll,
    searchTerm,
    setSearchTerm,
    searchResults,
    onSelectTownship,
    getDialectColor,
}) => {
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
                        className={`fixed ${isMobile ? 'bottom-0 left-0 right-0 h-[85vh] rounded-t-[2.5rem]' : 'top-0 right-0 h-full w-80 border-l'} bg-white/95 backdrop-blur-2xl border-stone-200 shadow-[0_-20px_50px_rgba(0,0,0,0.1)] z-50 flex flex-col overflow-hidden`}
                    >
                        {/* Drag Handle / Header */}
                        <div className="p-5 pb-2 flex flex-col shrink-0">
                            {isMobile && <div className="w-12 h-1.5 bg-stone-200 rounded-full mx-auto mb-4" />}
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold flex items-center gap-2 text-stone-900">
                                    <Filter className="w-5 h-5 text-emerald-600" />
                                    語言篩選
                                </h2>
                                <div className="flex items-center gap-1.5">
                                    {isMobile && (
                                        <>
                                            <button
                                                onClick={onSelectAll}
                                                className="px-3 py-2 bg-emerald-50 text-emerald-600 text-[15px] font-black tracking-widest uppercase rounded-lg active:bg-emerald-100 transition-colors"
                                            >
                                                全選
                                            </button>
                                            <button
                                                onClick={onClearAll}
                                                className="px-3 py-2 bg-stone-100 text-stone-500 text-[15px] font-black tracking-widest uppercase rounded-lg active:bg-stone-200 transition-colors"
                                            >
                                                清除
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
                                    placeholder="搜尋鄉鎮市或族語..."
                                    value={searchTerm}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-stone-100 border-none rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
                                />

                                <AnimatePresence>
                                    {searchResults.length > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-stone-100 z-50 overflow-hidden max-h-60 overflow-y-auto"
                                        >
                                            {searchResults.map((result: any) => (
                                                <button
                                                    key={result.id}
                                                    onClick={() => onSelectTownship(result)}
                                                    className="w-full text-left px-5 py-4 hover:bg-stone-50 transition-colors border-b border-stone-50 last:border-0 flex flex-col"
                                                >
                                                    <span className="text-sm font-bold text-stone-900">{result.town}</span>
                                                    <span className="text-xs text-stone-500">{result.county}</span>
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Desktop Actions */}
                            {!isMobile && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={onSelectAll}
                                        className="flex-1 py-3 px-4 bg-emerald-600 text-white text-[10px] font-black tracking-widest uppercase rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
                                    >
                                        全選
                                    </button>
                                    <button
                                        onClick={onClearAll}
                                        className="flex-1 py-3 px-4 bg-stone-100 text-stone-600 text-[10px] font-black tracking-widest uppercase rounded-xl hover:bg-stone-200 transition-colors"
                                    >
                                        清除
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto p-5 pt-2 space-y-2 custom-scrollbar">
                            {Object.entries(languageGroups).map(([lang, dialects]) => {
                                const dialectsArray = dialects as string[];
                                const allSelected =
                                    dialectsArray.length > 0 && dialectsArray.every((d) => selectedDialects.has(d));
                                const someSelected =
                                    !allSelected && dialectsArray.some((d) => selectedDialects.has(d));

                                return (
                                    <div key={lang} className={`border border-stone-50 rounded-[1.5rem] overflow-hidden transition-all ${expandedGroups.has(lang) ? 'shadow-md ring-1 ring-emerald-500/10' : ''}`}>
                                        <div
                                            className={`flex items-center justify-between px-4 py-3.5 transition-colors cursor-pointer group/row ${!showFilterColors ? 'bg-stone-50/50 hover:bg-stone-100' : ''}`}
                                            style={{
                                                backgroundColor: showFilterColors ? getDialectColor(lang).replace('hsl(', 'hsla(').replace(')', ', 0.12)') : undefined
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

                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm text-stone-800">{lang}</span>
                                                    {someSelected && !expandedGroups.has(lang) && (
                                                        <span className="text-[10px] text-emerald-600 font-bold">已選 {dialectsArray.filter(d => selectedDialects.has(d)).length} 類</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <div className="relative group/info">
                                                    <Info className="w-4 h-4 text-stone-300 hover:text-emerald-500 transition-colors" />
                                                    <div className="absolute right-0 bottom-full mb-2 bg-stone-900 text-white text-[10px] px-3 py-1.5 rounded-lg opacity-0 group-hover/info:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl font-bold">
                                                        {populationMap[lang]?.toLocaleString() || '---'} 人
                                                        <div className="absolute top-full right-2 border-4 border-transparent border-t-stone-900" />
                                                    </div>
                                                </div>
                                                {expandedGroups.has(lang) ? (
                                                    <ChevronDown className="w-4 h-4 text-stone-400" />
                                                ) : (
                                                    <ChevronRight className="w-4 h-4 text-stone-400" />
                                                )}
                                            </div>
                                        </div>

                                        {expandedGroups.has(lang) && (
                                            <div className="p-3 bg-white grid grid-cols-1 gap-1.5">
                                                {dialectsArray.map((dialect) => {
                                                    const selected = selectedDialects.has(dialect);
                                                    const color = getDialectColor(dialect);

                                                    return (
                                                        <div
                                                            key={dialect}
                                                            className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all ${!showFilterColors ? 'hover:bg-stone-50 border border-stone-50' : ''}`}
                                                            style={{
                                                                backgroundColor: showFilterColors ? color.replace('hsl(', 'hsla(').replace(')', ', 0.08)') : undefined,
                                                                borderColor: showFilterColors ? color.replace('hsl(', 'hsla(').replace(')', ', 0.2)') : undefined
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
                                                            <span className={`text-sm ${selected ? 'font-bold text-stone-900' : 'text-stone-600'}`}>{dialect}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
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
                                    確定
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className={`fixed z-40 shadow-2xl hover:bg-opacity-100 transition-all flex items-center justify-center gap-3 font-black tracking-widest uppercase text-xs active:scale-95 ${isMobile
                            ? 'bottom-8 right-6 rounded-2xl px-5 h-12 bg-white/90 backdrop-blur-md text-stone-900 border border-stone-200'
                            : 'top-6 right-6 rounded-2xl p-4 bg-white/90 backdrop-blur-md text-stone-900 border border-stone-200'
                        }`}
                >
                    {isMobile ? (
                        <>
                            <ChevronUp className="w-4 h-4 text-emerald-600" />
                            語言篩選
                        </>
                    ) : (
                        <>
                            <Filter className="w-4 h-4 text-emerald-600" />
                            顯示篩選面板
                            <ChevronLeft className="w-4 h-4 text-stone-400" />
                        </>
                    )}
                </button>
            )}
        </>
    );
};

export default DialectFilterPanel;
