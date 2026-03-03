import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronUp, ListFilter, RotateCcw, Move } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { trackEvent } from '../hooks/useAnalytics';

type Props = {
    isMobile?: boolean;
    alwaysExpanded?: boolean;
    selectedDialects: Set<string>;
    languageGroups: Record<string, string[]>;
    getDialectColor: (dialect: string) => string;
    language: 'zh' | 'en';
    showUsageNames: boolean;
};

const MapLegend: React.FC<Props> = ({
    isMobile = false,
    alwaysExpanded = false,
    selectedDialects,
    languageGroups,
    getDialectColor,
    language,
    showUsageNames,
}) => {
    const { t, mt } = useTranslation(language, showUsageNames);
    const [isExpanded, setIsExpanded] = useState(!isMobile);
    const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
    const [customSize, setCustomSize] = useState<{ width: number; height: number } | null>(null);

    useEffect(() => {
        if (alwaysExpanded) {
            setIsExpanded(true);
        } else {
            setIsExpanded(!isMobile);
        }
    }, [isMobile, alwaysExpanded]);

    const handleReset = (e: React.MouseEvent) => {
        e.stopPropagation();
        setDragPos({ x: 0, y: 0 });
        setCustomSize(null);
        trackEvent('reset_legend_layout');
    };

    const effectiveExpanded = alwaysExpanded || isExpanded;

    const activeLanguages: Array<{ lang: string; dialects: string[] }> = [];
    for (const [lang, dialects] of Object.entries(languageGroups)) {
        const activeDialects = dialects.filter(d => selectedDialects.has(d));
        if (activeDialects.length > 0) {
            activeLanguages.push({ lang, dialects: activeDialects });
        }
    }

    if (activeLanguages.length === 0) return null;

    // Manual Drag handler
    const handleDragStart = (e: React.PointerEvent) => {
        const target = e.target as HTMLElement;

        // On mobile, don't initiate drag if clicking on the scrollable content area
        // to preserve the ability to scroll through the dialect list.
        if (isMobile && target.closest('.overflow-y-auto')) {
            return;
        }

        e.currentTarget.setPointerCapture(e.pointerId);
        const startX = e.clientX;
        const startY = e.clientY;
        const startPosX = dragPos.x;
        const startPosY = dragPos.y;

        const onPointerMove = (moveEvent: PointerEvent) => {
            setDragPos({
                x: startPosX + (moveEvent.clientX - startX),
                y: startPosY + (moveEvent.clientY - startY)
            });
        };

        const onPointerUp = (upEvent: PointerEvent) => {
            try {
                e.currentTarget.releasePointerCapture(upEvent.pointerId);
            } catch (err) {
                // Ignore capture errors
            }
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    };

    // Manual Resize handler
    const handleResize = (direction: string, e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const startY = e.clientY;
        const rect = e.currentTarget.parentElement?.getBoundingClientRect();
        const startH = rect?.height || 300;
        const startPosY = dragPos.y;

        const onPointerMove = (moveEvent: PointerEvent) => {
            const deltaY = moveEvent.clientY - startY;
            let newH = startH;
            let newY = startPosY;

            if (direction === 'bottom') {
                newH = Math.max(120, startH + deltaY);
            } else if (direction === 'top') {
                const addH = -deltaY;
                if (startH + addH > 120) {
                    newH = startH + addH;
                    newY = startPosY + deltaY;
                }
            }

            setCustomSize({ width: 288, height: newH });
            setDragPos(prev => ({ ...prev, y: newY }));
        };

        const onPointerUp = () => {
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    };

    return (
        <AnimatePresence>
            <motion.div
                animate={{
                    x: dragPos.x,
                    y: dragPos.y,
                    width: effectiveExpanded
                        ? (customSize?.width || (isMobile ? '205px' : '288px'))
                        : (isMobile ? '144px' : '288px'),
                    height: effectiveExpanded
                        ? (customSize?.height || 'auto')
                        : (isMobile ? '48px' : 'auto')
                }}
                onPointerDown={handleDragStart}
                className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-stone-200 flex flex-col pointer-events-auto overflow-hidden transition-[background-color] duration-300 z-[45] relative group/legend select-none cursor-grab active:cursor-grabbing"
                style={{ touchAction: 'none' }}
            >
                {/* Resize Handles - PC Only and only when expanded */}
                {!isMobile && effectiveExpanded && (
                    <>
                        <div className="absolute top-0 left-0 w-full h-2.5 cursor-ns-resize z-50 hover:bg-emerald-500/10 transition-colors" onPointerDown={(e) => handleResize('top', e)} />
                        <div className="absolute bottom-0 left-0 w-full h-2.5 cursor-ns-resize z-50 hover:bg-emerald-500/10 transition-colors" onPointerDown={(e) => handleResize('bottom', e)} />
                    </>
                )}

                {/* Header Display */}
                <div className="flex flex-col shrink-0">
                    <div
                        onClick={(e) => {
                            if (isMobile && !effectiveExpanded) {
                                e.stopPropagation();
                                setIsExpanded(true);
                            }
                        }}
                        className={`flex items-center justify-between ${isMobile && !effectiveExpanded ? 'px-4 h-12 active:scale-95' : isMobile ? 'p-3' : 'p-3.5'} w-full transition-all duration-300 relative bg-white/50 group/legend-header cursor-pointer`}
                    >
                        {isMobile && !effectiveExpanded ? (
                            <>
                                <div className="p-1 bg-emerald-50 rounded-lg shrink-0">
                                    <ListFilter className="w-3.5 h-3.5 text-emerald-600" />
                                </div>
                                <span className="font-black text-stone-900 uppercase tracking-widest text-[12px] select-none flex-1 text-center">
                                    {t('legend')}
                                </span>
                                <div className="w-[22px] flex justify-center shrink-0">
                                    <ChevronUp className="w-3.5 h-3.5 text-emerald-600" />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center gap-2.5">
                                    <div className={`${isMobile ? 'p-1' : 'p-1.5'} bg-emerald-50 rounded-lg shrink-0`}>
                                        <ListFilter className={`${isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-emerald-600`} />
                                    </div>
                                    <span className={`font-black text-stone-900 uppercase tracking-widest ${isMobile ? 'text-[11px]' : 'text-xs'} select-none`}>
                                        {t('legend')}
                                    </span>
                                    {!isMobile && (
                                        <Move className="w-3.5 h-3.5 text-stone-300 opacity-20 group-hover/legend-header:opacity-100 transition-opacity" />
                                    )}
                                </div>

                                <div className="flex items-center gap-1">
                                    {(dragPos.x !== 0 || dragPos.y !== 0 || customSize !== null) && (
                                        <button
                                            onClick={handleReset}
                                            onPointerDown={(e) => e.stopPropagation()}
                                            className="p-1.5 hover:bg-stone-200 rounded-lg transition-colors text-stone-400 hover:text-stone-600"
                                            title="Reset"
                                        >
                                            <RotateCcw className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                    {!alwaysExpanded && (
                                        <button
                                            onPointerDown={(e) => e.stopPropagation()}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsExpanded(!isExpanded);
                                            }}
                                            className="p-1 hover:bg-stone-200 rounded-lg transition-colors group/toggle"
                                        >
                                            <motion.div
                                                animate={{ rotate: isExpanded ? 180 : 0 }}
                                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                            >
                                                <ChevronUp className={`${isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-emerald-600`} />
                                            </motion.div>
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Content */}
                <motion.div
                    initial={false}
                    animate={{ height: effectiveExpanded ? 'auto' : 0, opacity: effectiveExpanded ? 1 : 0 }}
                    className="overflow-hidden MapLegend-content-container"
                >
                    <div
                        className="p-4 pt-0 space-y-4 overflow-y-auto custom-scrollbar"
                        style={{ maxHeight: customSize ? `${customSize.height - 56}px` : '60vh' }}
                        onPointerDown={(e) => isMobile && e.stopPropagation()}
                    >
                        <div className="border-t border-stone-100 pt-3" />
                        {activeLanguages.map(({ lang, dialects }) => (
                            <div key={lang} className="flex flex-col">
                                <span className="text-[13px] font-bold text-stone-700 uppercase tracking-widest mb-2 px-1">
                                    {mt(lang)}
                                </span>
                                <div className="flex flex-col gap-1.5 pl-2">
                                    {dialects.map((dialect) => (
                                        <div key={dialect} className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-stone-50 transition-colors">
                                            <div
                                                className="w-2.5 h-2.5 rounded-full shadow-sm shrink-0 border border-white"
                                                style={{ backgroundColor: getDialectColor(dialect) }}
                                            />
                                            <span className="text-[13px] font-bold text-stone-600 truncate leading-tight" title={mt(dialect)}>
                                                {mt(dialect)}
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
