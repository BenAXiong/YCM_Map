import React, { useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Info } from 'lucide-react';
import type { AreaLabel } from './types';

type Props = {
    hoveredTown: any | null;
    showFixedInfo: boolean;

    hoveredLabel: AreaLabel;
    hoveredDialects: string[];

    getDialectColor: (dialect: string) => string;

    // Advanced info
    selectedDialect: string | null;
    onSelectDialect: (d: string) => void;
    onClose?: () => void;
};

const FixedInfoPanel: React.FC<Props> = ({
    hoveredTown,
    showFixedInfo,
    hoveredLabel,
    hoveredDialects,
    getDialectColor,
    selectedDialect,
    onSelectDialect,
    onClose,
}) => {
    return (
        <AnimatePresence>
            {showFixedInfo && hoveredTown && (
                <motion.div
                    initial={{ opacity: 0, x: 20, scale: 0.98 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 20, scale: 0.98 }}
                    className="bg-white/80 backdrop-blur-2xl p-6 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/40 w-80 pointer-events-auto h-auto max-h-[95vh] flex flex-col overflow-hidden relative"
                >
                    <div className="flex flex-col mb-6">
                        {hoveredLabel.village && (
                            <span className="block text-3xl font-black text-emerald-600 mb-1 tracking-tighter">
                                {hoveredLabel.village}
                            </span>
                        )}
                        <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">
                            {hoveredLabel.county} / {hoveredLabel.town}
                        </h3>
                    </div>

                    {onClose && (
                        <button
                            onClick={onClose}
                            className="absolute top-6 right-6 p-1.5 hover:bg-stone-50 rounded-full text-stone-400 hover:text-stone-600 transition-colors pointer-events-auto"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}

                    <div className="space-y-6 overflow-hidden flex flex-col flex-1">
                        {/* Dialect Tabs + Phrases */}
                        {hoveredDialects.length > 0 && (
                            <div className="flex flex-col flex-1 overflow-hidden">
                                <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block mb-2">常用詞彙</span>

                                <div className="flex flex-wrap gap-1 mb-3">
                                    {hoveredDialects.map((d) => {
                                        const bgColor = getDialectColor(d);
                                        const isActive = selectedDialect === d;

                                        return (
                                            <button
                                                key={d}
                                                onClick={() => onSelectDialect(d)}
                                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border ${isActive
                                                    ? 'border-transparent shadow-sm'
                                                    : 'bg-white text-stone-500 border-stone-200 hover:border-stone-400'
                                                    }`}
                                                style={{
                                                    backgroundColor: isActive ? bgColor : undefined,
                                                    color: isActive ? 'white' : undefined,
                                                    textShadow: isActive ? '0 0 1px black, 0 0 1px black, 0 0 1px black, 0 0 1px black' : 'none'
                                                }}
                                            >
                                                {d}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Phrases List */}
                                <div className="space-y-2 overflow-y-auto pr-1 flex-1 min-h-0">
                                    {[
                                        { zh: '你好', en: 'Hello' },
                                        { zh: '謝謝', en: 'Thank you' },
                                        { zh: '你好嗎？', en: 'How are you?' },
                                        { zh: '我叫...', en: 'My name is...' },
                                        { zh: '早安', en: 'Good morning' },
                                        { zh: '晚安', en: 'Good night' },
                                        { zh: '我愛你', en: 'I love you' },
                                        { zh: '水', en: 'Water' },
                                        { zh: '食物', en: 'Food' },
                                        { zh: '在哪裡？', en: 'Where is...?' }
                                    ].map((p, i) => (
                                        <div key={i} className="p-2.5 rounded-xl bg-white border border-stone-100 shadow-sm group hover:border-emerald-200 transition-colors">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wide">{p.zh}</span>
                                                <span className="text-[9px] text-stone-400 font-medium uppercase tracking-widest">{p.en}</span>
                                            </div>
                                            <div className="text-sm font-medium text-stone-800 leading-snug">
                                                [{selectedDialect || 'Select a dialect'} placeholder]
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {!hoveredDialects.length && (
                            <div className="flex flex-col items-center justify-center py-10 text-center">
                                <span className="text-sm text-stone-400 font-medium">無特定族語分佈數據</span>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default FixedInfoPanel;