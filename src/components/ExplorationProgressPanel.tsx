import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Footprints, ChevronLeft, ChevronRight } from 'lucide-react';
import type { UserStats } from '../hooks/useUserStats';

type Props = {
    userStats: UserStats;
    language: 'zh' | 'en';
};

const ExplorationProgressPanel: React.FC<Props> = ({ userStats, language }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const progress = (userStats.pinnedCount / userStats.totalVillages) * 100;

    return (
        <div className="flex items-start gap-2 pointer-events-none">
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, x: 20, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 20, scale: 0.95 }}
                        className="pointer-events-auto bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/50 p-6 w-72"
                    >
                        <div className="flex flex-col gap-5">
                            <div className="flex flex-col gap-2">
                                <h2 className="text-xl font-bold flex items-center gap-2 text-stone-900">
                                    <Footprints className="w-5 h-5 text-emerald-600" />
                                    {language === 'zh' ? '探索進度' : 'Exploration'}
                                </h2>
                                <div className="flex justify-between items-center text-xs font-mono font-bold text-emerald-600/60 uppercase tracking-widest">
                                    <span>{language === 'zh' ? '已走訪' : 'Visited'}</span>
                                    <span>{userStats.pinnedCount} / {userStats.totalVillages}</span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden p-0.5">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                                    />
                                </div>
                                <p className="text-xs text-stone-500 font-bold leading-relaxed">
                                    {language === 'zh'
                                        ? `您已走訪臺灣 ${progress.toFixed(1)}% 的原住民族部落。`
                                        : `You have visited ${progress.toFixed(1)}% of all indigenous villages in Taiwan.`}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="pointer-events-auto p-4 bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-stone-200 text-emerald-600 hover:bg-stone-50 transition-all active:scale-95 flex items-center justify-center relative"
            >
                <Footprints className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'scale-110' : ''}`} />
            </button>
        </div>
    );
};

export default ExplorationProgressPanel;
