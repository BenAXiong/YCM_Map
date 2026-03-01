import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { AreaLabel, TooltipPos } from './types';

type Props = {
    hoveredTown: any | null;
    showFixedInfo: boolean;
    tooltipPos: TooltipPos;

    hoveredLabel: AreaLabel;
    hoveredDialects: string[];

    getDialectColor: (dialect: string) => string;
    onShowMore: () => void;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
};

const CursorTooltip: React.FC<Props> = ({
    hoveredTown,
    showFixedInfo,
    tooltipPos,
    hoveredLabel,
    hoveredDialects,
    getDialectColor,
    onShowMore,
    onMouseEnter,
    onMouseLeave,
}) => {
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
                        left: tooltipPos.x + 20,
                        top: tooltipPos.y + 20,
                        position: 'fixed',
                    }}
                    className="z-50 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-stone-200 min-w-[200px] pointer-events-auto"
                >
                    <div className="flex flex-col">
                        {hoveredLabel.village && (
                            <span className="block text-2xl font-black text-emerald-600 mb-0.5 tracking-tight">
                                {hoveredLabel.village}
                            </span>
                        )}
                        <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wider">
                            {hoveredLabel.county} {hoveredLabel.town}
                        </h3>
                    </div>

                    <div className="mt-4 space-y-3">
                        <div className="border-t border-stone-100 pt-3">
                            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1.5">分佈族語</span>
                            <div className="flex flex-wrap gap-1.5">
                                {hoveredDialects.length ? (
                                    hoveredDialects.map((d) => (
                                        <span
                                            key={d}
                                            className="px-2.5 py-1 rounded-lg text-xs font-bold text-white shadow-sm"
                                            style={{ backgroundColor: getDialectColor(d) }}
                                        >
                                            {d}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-xs text-stone-400 italic">無特定數據</span>
                                )}
                            </div>
                        </div>

                        <div className="pt-2 flex justify-end">
                            <button
                                className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl text-[10px] font-black tracking-widest transition-colors flex items-center justify-center gap-1 shadow-sm uppercase"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onShowMore();
                                }}
                            >
                                詳情例句 / 人口數據 →
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CursorTooltip;