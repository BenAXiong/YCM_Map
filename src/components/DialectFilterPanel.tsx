import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronDown, ChevronRight, Filter, Info, Search, X } from 'lucide-react';

type Props = {
    isOpen: boolean;
    setIsOpen: (v: boolean) => void;

    languageGroups: Record<string, string[]>;
    populationMap: Record<string, number>;
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
    searchResults: any[];
    onSelectTownship: (township: any) => void;

    // coloring for dialect chips
    getDialectColor: (dialect: string) => string;
};

const DialectFilterPanel: React.FC<Props> = ({
    isOpen,
    setIsOpen,
    languageGroups,
    populationMap,
    expandedGroups,
    setExpandedGroups,
    selectedDialects,
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
                        initial={{ x: 300, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 300, opacity: 0 }}
                        className="absolute top-0 right-0 h-full w-80 bg-white/90 backdrop-blur-xl border-l border-stone-200 shadow-2xl z-20 overflow-y-auto"
                    >
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-semibold flex items-center gap-2">
                                    <Filter className="w-5 h-5" />
                                    語言篩選
                                </h2>
                                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Search */}
                            <div className="relative mb-6">
                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                    <Search className="w-4 h-4 text-stone-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="搜尋鄉鎮市..."
                                    value={searchTerm}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-stone-100 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                />

                                <AnimatePresence>
                                    {searchResults.length > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-stone-200 z-30 overflow-hidden"
                                        >
                                            {searchResults.map((result: any) => (
                                                <button
                                                    key={result.id}
                                                    onClick={() => onSelectTownship(result)}
                                                    className="w-full text-left px-4 py-3 hover:bg-stone-50 transition-colors border-b border-stone-100 last:border-0 flex flex-col"
                                                >
                                                    <span className="text-sm font-bold text-stone-900">{result.town}</span>
                                                    <span className="text-xs text-stone-500">{result.county}</span>
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-2 mb-6">
                                <button
                                    onClick={onSelectAll}
                                    className="flex-1 py-2 px-3 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                                >
                                    全選
                                </button>
                                <button
                                    onClick={onClearAll}
                                    className="flex-1 py-2 px-3 bg-stone-200 text-stone-700 text-xs font-bold rounded-lg hover:bg-stone-300 transition-colors shadow-sm"
                                >
                                    清除
                                </button>
                            </div>

                            {/* Groups */}
                            <div className="space-y-2">
                                {Object.entries(languageGroups).map(([lang, dialects]) => {
                                    const dialectsArray = dialects as string[];
                                    const allSelected =
                                        dialectsArray.length > 0 && dialectsArray.every((d) => selectedDialects.has(d));

                                    return (
                                        <div key={lang} className="border border-stone-100 rounded-xl">
                                            <div
                                                className={`flex items-center justify-between p-3 bg-stone-50/50 hover:bg-stone-100 transition-colors cursor-pointer group/row ${expandedGroups.has(lang) ? 'rounded-t-xl' : 'rounded-xl'}`}
                                                onClick={() => toggleGroup(lang)}
                                            >
                                                <div className="flex items-center gap-3 flex-1">
                                                    <div
                                                        className="w-5 h-5 rounded border flex shrink-0 items-center justify-center transition-colors"
                                                        style={{
                                                            backgroundColor: allSelected ? '#10b981' : 'transparent',
                                                            borderColor: allSelected ? '#10b981' : '#d1d5db',
                                                        }}
                                                        onClick={(e: React.MouseEvent) => {
                                                            e.stopPropagation();
                                                            onToggleLanguage(lang);
                                                        }}
                                                    >
                                                        {allSelected && <Check className="w-3 h-3 text-white" />}
                                                    </div>

                                                    {/* Info Icon with Tooltip */}
                                                    <div className="relative group/info">
                                                        <Info className="w-3.5 h-3.5 text-stone-300 hover:text-emerald-500 transition-colors" />
                                                        <div className="absolute left-1/2 -top-8 -translate-x-1/2 bg-stone-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover/info:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl">
                                                            {populationMap[lang]?.toLocaleString() || '---'} 人
                                                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-stone-800" />
                                                        </div>
                                                    </div>

                                                    <span className="font-medium text-stone-800">{lang}</span>
                                                </div>

                                                {expandedGroups.has(lang) ? (
                                                    <ChevronDown className="w-4 h-4 text-stone-400" />
                                                ) : (
                                                    <ChevronRight className="w-4 h-4 text-stone-400" />
                                                )}
                                            </div>

                                            {expandedGroups.has(lang) && (
                                                <div className="p-2 bg-white space-y-1 rounded-b-xl">
                                                    {dialectsArray.map((dialect) => {
                                                        const selected = selectedDialects.has(dialect);
                                                        const color = getDialectColor(dialect);

                                                        return (
                                                            <div
                                                                key={dialect}
                                                                className="flex items-center gap-3 p-2 hover:bg-stone-50 rounded-lg cursor-pointer transition-colors"
                                                                onClick={() => onToggleDialect(dialect)}
                                                            >
                                                                <div
                                                                    className="w-4 h-4 rounded border flex items-center justify-center transition-colors"
                                                                    style={{
                                                                        backgroundColor: selected ? color : 'transparent',
                                                                        borderColor: selected ? color : '#d1d5db',
                                                                    }}
                                                                >
                                                                    {selected && <Check className="w-2 h-2 text-white" />}
                                                                </div>
                                                                <span className="text-sm text-stone-600">{dialect}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="absolute top-6 right-6 z-20 p-4 bg-white rounded-2xl shadow-lg border border-stone-200 hover:bg-stone-50 transition-all flex items-center gap-2 font-medium"
                >
                    <Filter className="w-5 h-5 text-emerald-600" />
                    顯示篩選
                </button>
            )}
        </>
    );
};

export default DialectFilterPanel;