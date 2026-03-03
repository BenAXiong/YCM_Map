import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Info } from 'lucide-react';
import type { AreaLabel, TooltipPos } from './types';

type Props = {
    hoveredTown: any | null;
    showFixedInfo: boolean;
    tooltipPos: TooltipPos;

    hoveredLabel: AreaLabel;
    hoveredDialects: string[];

    getDialectColor: (dialect: string) => string;
    populationMap: Record<string, number>;
    pinnedLocations: PinnedMap;
    onTogglePin: (county: string, town: string, village: string, type: PinType | null) => void;
    onShowMore: () => void;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
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

const CursorTooltip: React.FC<Props> = ({
    hoveredTown,
    showFixedInfo,
    tooltipPos,
    hoveredLabel,
    hoveredDialects,
    getDialectColor,
    populationMap,
    pinnedLocations,
    onTogglePin,
    onShowMore,
    onMouseEnter,
    onMouseLeave,
    language,
    showUsageNames,
}) => {
    const { t, mt } = useTranslation(language, showUsageNames);
    const [showPinSelector, setShowPinSelector] = React.useState(false);

    const pinKey = `${hoveredLabel.county}|${hoveredLabel.town}|${hoveredLabel.village || ''}`;
    const currentPin = pinnedLocations[pinKey] || null;

    const population = React.useMemo(() => {
        const key = `${hoveredLabel.county}|${hoveredLabel.town}|${hoveredLabel.village || ''}`;
        return populationMap[key] || populationMap[`${hoveredLabel.county}|${hoveredLabel.town}|`] || 0;
    }, [hoveredLabel, populationMap]);

    const getPillStyle = (bgColor: string) => ({
        backgroundColor: bgColor,
        color: 'white',
        textShadow: '0 0 1px black, 0 0 1px black, 0 0 1px black, 0 0 1px black',
    });

    return (
        <AnimatePresence>
            {hoveredTown && !showFixedInfo && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                    style={{
                        left: typeof window !== 'undefined' ? Math.max(10, Math.min(tooltipPos.x + 20, window.innerWidth - 280)) : tooltipPos.x + 20,
                        top: typeof window !== 'undefined' ? Math.max(10, Math.min(tooltipPos.y + 20, window.innerHeight - 250)) : tooltipPos.y + 20,
                        position: 'fixed',
                    }}
                    className="z-50 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-stone-200 min-w-[200px] pointer-events-auto"
                >
                    <div className="flex flex-col">
                        {hoveredLabel.village && (
                            <span className="block text-2xl font-black text-emerald-600 mb-0.5 tracking-tight">
                                {mt(hoveredLabel.village)}
                            </span>
                        )}
                        <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wider">
                            {mt(hoveredLabel.county)} {mt(hoveredLabel.town)}
                        </h3>
                    </div>

                    {/* Top Action Bar */}
                    <div className="absolute top-4 right-4 flex items-center gap-2">
                        {/* Pin System (Village Mode Only) */}
                        {hoveredLabel.village && (
                            <div className="relative group/pin">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowPinSelector(!showPinSelector);
                                    }}
                                    className={`p-1.5 rounded-full transition-all ${currentPin ? 'bg-white shadow-md' : 'hover:bg-stone-100'}`}
                                    style={{ color: currentPin ? PIN_CONFIG[currentPin].color : '#10b981' }}
                                >
                                    {currentPin ? React.createElement(PIN_CONFIG[currentPin].icon, { className: 'w-5 h-5 fill-current' }) : <MapPin className="w-5 h-5" />}
                                </button>

                                <AnimatePresence>
                                    {showPinSelector && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 5, scale: 0.9 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 5, scale: 0.9 }}
                                            className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-2xl border border-stone-100 p-1.5 flex gap-1 z-[60]"
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
                                                        className={`p-2 rounded-lg transition-colors flex flex-col items-center gap-1 group/item ${currentPin === type ? 'bg-stone-50' : 'hover:bg-stone-50'}`}
                                                        title={language === 'zh' ? config.label : config.labelEn}
                                                    >
                                                        <Icon className="w-5 h-5" style={{ color: config.color, fill: currentPin === type ? config.color : 'none' }} />
                                                        <span className="text-[8px] font-bold uppercase text-stone-400">{language === 'zh' ? config.label : config.labelEn}</span>
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
                                                    className="p-2 rounded-lg hover:bg-red-50 transition-colors flex flex-col items-center gap-1"
                                                >
                                                    <Trash2 className="w-5 h-5 text-red-400" />
                                                    <span className="text-[8px] font-bold uppercase text-red-400">{language === 'zh' ? '移除' : 'Clear'}</span>
                                                </button>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}

                        {/* Population Info */}
                        <div className="group/pop relative">
                            <Info className="w-4 h-4 text-stone-300 hover:text-emerald-500 transition-colors cursor-help" />
                            <div className="absolute right-0 bottom-full mb-2 opacity-0 group-hover/pop:opacity-100 transition-opacity pointer-events-none translate-y-1 group-hover/pop:translate-y-0 duration-200">
                                <div className="bg-stone-900 text-white text-[10px] py-1.5 px-3 rounded-lg shadow-xl whitespace-nowrap font-bold flex flex-col gap-0.5">
                                    <span className="text-stone-400 uppercase tracking-widest text-[8px]">{t('population')}</span>
                                    <span className="text-emerald-400 font-mono text-sm">{population > 0 ? population.toLocaleString() : '---'}</span>
                                </div>
                                <div className="w-2 h-2 bg-stone-900 rotate-45 absolute -bottom-1 right-2" />
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 space-y-3">
                        <div className="border-t border-stone-100 pt-3">
                            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1.5">{t('dialectsInArea')}</span>
                            <div className="flex flex-wrap gap-1.5">
                                {hoveredDialects.length ? (
                                    hoveredDialects.map((d) => (
                                        <span
                                            key={d}
                                            className="px-3 py-1.5 rounded-lg text-lg font-bold shadow-sm"
                                            style={getPillStyle(getDialectColor(d))}
                                        >
                                            {mt(d)}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-sm text-stone-400 italic">{language === 'zh' ? '無特定數據' : 'No data'}</span>
                                )}
                            </div>
                        </div>

                        <div className="pt-2 flex justify-end">
                            <button
                                className="w-full py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl text-sm font-black tracking-widest transition-colors flex items-center justify-center gap-1 shadow-sm uppercase"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onShowMore();
                                }}
                            >
                                {language === 'zh' ? '例句 & 文化 →' : 'Learning & Culture →'}
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CursorTooltip;