import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronUp, ListFilter } from 'lucide-react';

type Props = {
    isMobile?: boolean;
    alwaysExpanded?: boolean;
    selectedDialects: Set<string>;
    languageGroups: Record<string, string[]>;
    getDialectColor: (dialect: string) => string;
};

const MapLegend: React.FC<Props> = ({
    isMobile = false,
    alwaysExpanded = false,
    selectedDialects,
    languageGroups,
    getDialectColor
}) => {
    const [isExpanded, setIsExpanded] = useState(!isMobile);

    useEffect(() => {
        if (alwaysExpanded) {
            setIsExpanded(true);
        } else {
            setIsExpanded(!isMobile);
        }
    }, [isMobile, alwaysExpanded]);

    const effectiveExpanded = alwaysExpanded || isExpanded;

    // Determine which languages should be displayed
    const activeLanguages: Array<{ lang: string; dialects: string[] }> = [];

    for (const [lang, dialects] of Object.entries(languageGroups)) {
        const activeDialects = dialects.filter(d => selectedDialects.has(d));
        if (activeDialects.length > 0) {
            activeLanguages.push({ lang, dialects: activeDialects });
        }
    }

    if (activeLanguages.length === 0) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className={`bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-stone-200 ${effectiveExpanded ? 'w-64 md:w-72' : 'w-fit'} max-h-[70vh] flex flex-col pointer-events-auto overflow-hidden transition-all duration-300`}
            >
                {/* Header / Minimized State */}
                <button
                    disabled={alwaysExpanded}
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={`flex items-center justify-between ${isMobile && !effectiveExpanded ? 'px-5 h-12' : isMobile ? 'p-3' : 'p-4'} w-full ${alwaysExpanded ? 'cursor-default' : 'hover:bg-stone-50'} transition-colors`}
                >
                    <div className="flex items-center gap-3">
                        {isMobile && !effectiveExpanded ? (
                            <ListFilter className="w-4 h-4 text-emerald-600" />
                        ) : (
                            <div className={`${isMobile ? 'p-1' : 'p-1.5'} bg-emerald-50 rounded-lg`}>
                                <ListFilter className="w-4 h-4 text-emerald-600" />
                            </div>
                        )}
                        <span className={`${isMobile && !effectiveExpanded ? 'font-black tracking-widest uppercase text-xs text-stone-900' : `font-bold text-stone-800 ${isMobile ? 'text-xs' : 'text-sm'}`}`}>圖例</span>
                    </div>
                    {!alwaysExpanded && (
                        <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        >
                            <ChevronUp className="w-4 h-4 text-emerald-600" />
                        </motion.div>
                    )}
                </button>

                {/* Content */}
                <motion.div
                    initial={false}
                    animate={{ height: effectiveExpanded ? 'auto' : 0, opacity: effectiveExpanded ? 1 : 0 }}
                    className="overflow-hidden"
                >
                    <div className="p-4 pt-0 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                        <div className="border-t border-stone-100 pt-4" />
                        {activeLanguages.map(({ lang, dialects }) => (
                            <div key={lang} className="flex flex-col">
                                <span className="text-[16px] font-black text-stone-800 uppercase tracking-widest mb-2">
                                    {lang}
                                </span>
                                <div className="flex flex-col gap-2 pl-3 border-l-2 border-stone-100">
                                    {dialects.map((dialect) => (
                                        <div key={dialect} className="flex items-center gap-3">
                                            <div
                                                className="w-3 h-3 rounded-full shadow-sm shrink-0 border border-white/50"
                                                style={{ backgroundColor: getDialectColor(dialect) }}
                                            />
                                            <span className="text-[14px] font-medium text-stone-600 truncate" title={dialect}>
                                                {dialect}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default MapLegend;
