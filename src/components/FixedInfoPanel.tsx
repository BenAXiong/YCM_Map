import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { CountyTown } from './types';

type Props = {
    hoveredTown: any | null;
    showFixedInfo: boolean;

    hoveredLabel: CountyTown;
    hoveredDialects: string[];

    getDialectColor: (dialect: string) => string;
};

const FixedInfoPanel: React.FC<Props> = ({
    hoveredTown,
    showFixedInfo,
    hoveredLabel,
    hoveredDialects,
    getDialectColor,
}) => {
    return (
        <AnimatePresence>
            {showFixedInfo && hoveredTown && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="absolute bottom-6 left-6 z-10 bg-white/95 backdrop-blur-md p-5 rounded-2xl shadow-xl border border-stone-200 w-72"
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

export default FixedInfoPanel;