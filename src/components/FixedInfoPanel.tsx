import React, { useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Info } from 'lucide-react';
import type { AreaLabel } from './types';

type Props = {
    isOpen: boolean;

    hoveredLabel: AreaLabel;
    hoveredDialects: string[];

    getDialectColor: (dialect: string) => string;
    populationMap: Record<string, number>;
    pinnedLocations: PinnedMap;
    onTogglePin: (county: string, town: string, village: string, type: PinType | null) => void;

    // Advanced info
    selectedDialect: string | null;
    onSelectDialect: (d: string) => void;
    onClose?: () => void;
    language: 'zh' | 'en';
    showUsageNames: boolean;
};
import { useTranslation } from '../hooks/useTranslation';
import { MapPin, Heart, Footprints, Trash2 } from 'lucide-react';
import type { PinType, PinnedMap } from './types';

const PIN_CONFIG: Record<PinType, { color: string; icon: any; label: string; labelEn: string }> = {
    went: { color: '#10b981', icon: Footprints, label: '踩點', labelEn: 'Been' },
    loved: { color: '#f59e0b', icon: Heart, label: '喜愛', labelEn: 'Loved' },
    wanna_go: { color: '#ef4444', icon: MapPin, label: '想去', labelEn: 'Wish' },
};

const FixedInfoPanel: React.FC<Props> = ({
    isOpen,
    hoveredLabel,
    hoveredDialects,
    getDialectColor,
    populationMap,
    pinnedLocations,
    onTogglePin,
    selectedDialect,
    onSelectDialect,
    onClose,
    language,
    showUsageNames,
}) => {
    const { t, mt } = useTranslation(language, showUsageNames);
    const [showPinSelector, setShowPinSelector] = React.useState(false);

    const pinKey = `${hoveredLabel.county}|${hoveredLabel.town}|${hoveredLabel.village || ''}`;
    const currentPin = pinnedLocations[pinKey] || null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, x: 20, scale: 0.98 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 20, scale: 0.98 }}
                    className="bg-white/80 backdrop-blur-2xl p-6 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/40 w-80 pointer-events-auto h-auto max-h-[95vh] flex flex-col overflow-hidden relative"
                >
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex flex-col">
                            {hoveredLabel.village && (
                                <span className="block text-3xl font-black text-emerald-600 mb-1 tracking-tighter">
                                    {mt(hoveredLabel.village)}
                                </span>
                            )}
                            <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">
                                {mt(hoveredLabel.county)} / {mt(hoveredLabel.town)}
                            </h3>
                        </div>

                        {/* Pin Selector Trigger (Village Mode Only) */}
                        {hoveredLabel.village && (
                            <div className="relative">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowPinSelector(!showPinSelector);
                                    }}
                                    className={`p-2 rounded-2xl transition-all ${currentPin ? 'bg-white shadow-lg' : 'hover:bg-stone-50 text-emerald-500'}`}
                                    style={{ color: currentPin ? PIN_CONFIG[currentPin].color : undefined }}
                                >
                                    {currentPin ? React.createElement(PIN_CONFIG[currentPin].icon, { className: 'w-6 h-6 fill-current' }) : <MapPin className="w-6 h-6" />}
                                </button>

                                <AnimatePresence>
                                    {showPinSelector && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.9 }}
                                            className="absolute top-full right-0 mt-3 bg-white rounded-2xl shadow-2xl border border-stone-100 p-2 flex flex-col gap-1 z-50 min-w-[100px]"
                                        >
                                            {(Object.keys(PIN_CONFIG) as PinType[]).map((type) => {
                                                const config = PIN_CONFIG[type];
                                                const Icon = config.icon;
                                                return (
                                                    <button
                                                        key={type}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onTogglePin(hoveredLabel.county, hoveredLabel.town, hoveredLabel.village || '', type);
                                                            setShowPinSelector(false);
                                                        }}
                                                        className={`p-3 rounded-xl transition-all flex items-center gap-3 ${currentPin === type ? 'bg-stone-50' : 'hover:bg-stone-50'}`}
                                                    >
                                                        <Icon className="w-5 h-5" style={{ color: config.color, fill: currentPin === type ? config.color : 'none' }} />
                                                        <span className="text-xs font-bold text-stone-700">{language === 'zh' ? config.label : config.labelEn}</span>
                                                    </button>
                                                );
                                            })}
                                            {currentPin && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onTogglePin(hoveredLabel.county, hoveredLabel.town, hoveredLabel.village || '', null);
                                                        setShowPinSelector(false);
                                                    }}
                                                    className="p-3 rounded-xl hover:bg-red-50 transition-all flex items-center gap-3 border-t border-stone-50 mt-1"
                                                >
                                                    <Trash2 className="w-5 h-5 text-red-400" />
                                                    <span className="text-xs font-bold text-red-500">{language === 'zh' ? '移除標記' : 'Remove'}</span>
                                                </button>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>

                    {onClose && (
                        <button
                            onClick={onClose}
                            className="absolute -top-2 -right-2 p-1 bg-white shadow-md hover:bg-stone-50 rounded-full text-stone-400 hover:text-stone-600 transition-colors pointer-events-auto"
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
                                <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block mb-2">{language === 'zh' ? '常用詞彙' : 'Common Phrases'}</span>

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
                                                {mt(d)}
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
                                                [{mt(selectedDialect || '') || (language === 'zh' ? '選擇一個族語' : 'Select a dialect')} placeholder]
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {!hoveredDialects.length && (
                            <div className="flex flex-col items-center justify-center py-10 text-center">
                                <span className="text-sm text-stone-400 font-medium">{language === 'zh' ? '無特定族語分佈數據' : 'No dialect data for this area'}</span>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default FixedInfoPanel;