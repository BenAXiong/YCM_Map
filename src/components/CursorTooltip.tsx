import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { CountyTown, TooltipPos } from './types';

type Props = {
    hoveredTown: any | null;
    showFixedInfo: boolean;
    tooltipPos: TooltipPos;

    hoveredLabel: CountyTown;
    hoveredDialects: string[];

    getDialectColor: (dialect: string) => string;
};

const CursorTooltip: React.FC<Props> = ({
    hoveredTown,
    showFixedInfo,
    tooltipPos,
    hoveredLabel,
    hoveredDialects,
    getDialectColor,
}) => {
    return (
        <AnimatePresence>
            {hoveredTown && !showFixedInfo && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    style={{
                        left: tooltipPos.x + 20,
                        top: tooltipPos.y + 20,
                        position: 'fixed',
                    }}
                    className="z-50 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-stone-200 min-w-[200px]"
                >
                    <h3 className="text-xl font-bold text-stone-900">
                        {hoveredLabel.county} {hoveredLabel.town}
                    </h3>

                    <div className="mt-3 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-stone-500">估計人口</span>
                            <span className="font-mono font-medium">---</span>
                        </div>

                        <div className="border-t border-stone-100 pt-2">
                            <span className="text-xs font-semibold text-stone-400 block mb-1">分佈族語</span>
                            <div className="flex flex-wrap gap-1">
                                {hoveredDialects.length ? (
                                    hoveredDialects.map((d) => (
                                        <span
                                            key={d}
                                            className="px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
                                            style={{ backgroundColor: getDialectColor(d) }}
                                        >
                                            {d}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-xs text-stone-400 italic">無特定族語分佈數據</span>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CursorTooltip;