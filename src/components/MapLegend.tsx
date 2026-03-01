import React from 'react';
import { AnimatePresence, motion } from 'motion/react';

type Props = {
    selectedDialects: Set<string>;
    languageGroups: Record<string, string[]>;
    getDialectColor: (dialect: string) => string;
};

const MapLegend: React.FC<Props> = ({ selectedDialects, languageGroups, getDialectColor }) => {
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
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-lg border border-stone-200 w-64 max-h-[70vh] overflow-y-auto pointer-events-auto"
            >
                <div className="space-y-3">
                    {activeLanguages.map(({ lang, dialects }) => (
                        <div key={lang} className="flex flex-col">
                            <span className="text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">
                                {lang}
                            </span>
                            <div className="flex flex-col gap-1.5 pl-2 border-l-2 border-stone-100">
                                {dialects.map((dialect) => (
                                    <div key={dialect} className="flex items-center gap-2">
                                        <div
                                            className="w-3 h-3 rounded-full shadow-inner shrink-0"
                                            style={{ backgroundColor: getDialectColor(dialect) }}
                                        />
                                        <span className="text-xs text-stone-600 truncate" title={dialect}>
                                            {dialect}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default MapLegend;
