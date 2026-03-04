import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronUp, ListFilter, RotateCcw, Plus, Minus, MoreVertical, EyeOff, Image as ImageIcon, Square, LayoutGrid, Save, Type } from 'lucide-react';
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
    const [customSize, setCustomSize] = useState<{ width?: number; height?: number } | null>(null);
    const [legendFontSize, setLegendFontSize] = useState(13);

    const [showHeader, setShowHeader] = useState(true);
    const [transparentBg, setTransparentBg] = useState(false);
    const [transparentBorders, setTransparentBorders] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [legendStyle, setLegendStyle] = useState<'dots' | 'rectangles' | 'full'>('dots');
    const [showToast, setShowToast] = useState(false);

    const STORAGE_KEY = 'ycm_legend_settings';

    // Load saved settings
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.customSize !== undefined) setCustomSize(parsed.customSize);
                if (parsed.legendFontSize !== undefined) setLegendFontSize(parsed.legendFontSize);
                if (parsed.showHeader !== undefined) setShowHeader(parsed.showHeader);
                if (parsed.transparentBg !== undefined) setTransparentBg(parsed.transparentBg);
                if (parsed.transparentBorders !== undefined) setTransparentBorders(parsed.transparentBorders);
                if (parsed.legendStyle !== undefined) setLegendStyle(parsed.legendStyle);
            }
        } catch (e) {
            console.error('Failed to load legend settings', e);
        }
    }, []);

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
        setLegendFontSize(13);
        setShowHeader(true);
        setTransparentBg(false);
        setTransparentBorders(false);
        setLegendStyle('dots');
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (e) { }
        trackEvent('reset_legend_layout');
    };

    const handleSaveSettings = () => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                customSize,
                legendFontSize,
                showHeader,
                transparentBg,
                transparentBorders,
                legendStyle
            }));

            // Optional visually appealing feedback
            setShowOptions(false);
            setShowToast(true);
            setTimeout(() => {
                setShowToast(false);
            }, 2000);
        } catch (e) {
            console.error('Failed to save legend settings', e);
        }
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
        const startX = e.clientX;
        const rect = e.currentTarget.parentElement?.getBoundingClientRect();
        const startH = rect?.height || 300;
        const startW = rect?.width || 288;
        const startPosY = dragPos.y;

        // Capture current dimensions
        const currentCustomWidth = customSize?.width || startW;
        const currentCustomHeight = customSize?.height || startH;

        const onPointerMove = (moveEvent: PointerEvent) => {
            const deltaY = moveEvent.clientY - startY;
            const deltaX = moveEvent.clientX - startX;
            let newH = customSize?.height; // Keep as is unless dragging top/bottom
            let newW = customSize?.width;  // Keep as is unless dragging right
            let newY = dragPos.y;

            if (direction === 'bottom') {
                newH = Math.max(120, startH + deltaY);
            } else if (direction === 'top') {
                const addH = -deltaY;
                if (startH + addH > 120) {
                    newH = startH + addH;
                    newY = startPosY + deltaY;
                }
            } else if (direction === 'right') {
                newW = Math.max(200, startW + deltaX);
            }

            setCustomSize(prev => ({
                width: newW ?? prev?.width,
                height: newH ?? prev?.height
            }));
            if (direction === 'top') setDragPos(prev => ({ ...prev, y: newY }));
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
                layout
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => { setIsHovered(false); setShowOptions(false); }}
                animate={{
                    x: dragPos.x,
                    y: dragPos.y,
                    width: effectiveExpanded
                        ? (customSize?.width || (isMobile ? '205px' : '288px'))
                        : (isMobile ? '144px' : (customSize?.width || '288px')),
                    height: effectiveExpanded
                        ? (customSize?.height || 'auto')
                        : (isMobile ? '48px' : 'auto')
                }}
                onPointerDown={handleDragStart}
                className={`rounded-2xl flex flex-col pointer-events-auto overflow-visible transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300 z-[45] relative group/legend select-none cursor-grab active:cursor-grabbing ${transparentBg ? 'bg-transparent shadow-none backdrop-blur-none' : 'bg-white/95 backdrop-blur-xl shadow-2xl'
                    } ${transparentBorders ? 'border-transparent' : 'border border-stone-200'
                    }`}
                style={{ touchAction: 'none' }}
            >
                {/* Resize Handles - PC Only and only when expanded */}
                {!isMobile && effectiveExpanded && (
                    <>
                        <div className="absolute top-0 left-0 w-full h-2.5 cursor-ns-resize z-50 hover:bg-emerald-500/10 transition-colors" onPointerDown={(e) => handleResize('top', e)} />
                        <div className="absolute bottom-0 left-0 w-full h-2.5 cursor-ns-resize z-50 hover:bg-emerald-500/10 transition-colors" onPointerDown={(e) => handleResize('bottom', e)} />
                        <div className="absolute top-0 right-0 w-2.5 h-full cursor-ew-resize z-50 hover:bg-emerald-500/10 transition-colors" onPointerDown={(e) => handleResize('right', e)} />
                    </>
                )}

                {/* Header Display */}
                <motion.div
                    initial={false}
                    animate={{
                        height: (!effectiveExpanded || isMobile || showHeader || isHovered) ? 'auto' : 0,
                        opacity: (!effectiveExpanded || isMobile || showHeader || isHovered) ? 1 : 0
                    }}
                    className={`flex flex-col shrink-0 ${(!effectiveExpanded || isMobile || showHeader || isHovered) ? 'overflow-visible relative z-50' : 'overflow-hidden'}`}
                >
                    <div
                        onClick={(e) => {
                            if (isMobile && !effectiveExpanded) {
                                e.stopPropagation();
                                setIsExpanded(true);
                            }
                        }}
                        className={`flex items-center justify-between ${isMobile && !effectiveExpanded ? 'px-4 h-12 active:scale-95' : isMobile ? 'p-3' : 'p-3.5'} w-full transition-all duration-300 relative ${transparentBg ? 'bg-transparent' : 'bg-white/50'} group/legend-header cursor-pointer`}
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
                                </div>

                                <div className="flex items-center gap-1">
                                    {(dragPos.x !== 0 || dragPos.y !== 0 || customSize !== null || !showHeader || transparentBg || transparentBorders || legendFontSize !== 13) && (
                                        <button
                                            onClick={handleReset}
                                            onPointerDown={(e) => e.stopPropagation()}
                                            className="p-1.5 hover:bg-stone-200 rounded-lg transition-colors text-stone-400 hover:text-stone-600"
                                            title="Reset"
                                        >
                                            <RotateCcw className="w-3.5 h-3.5" />
                                        </button>
                                    )}

                                    {/* Options Dropdown */}
                                    <div className="relative">
                                        <button
                                            onPointerDown={(e) => e.stopPropagation()}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowOptions(!showOptions);
                                            }}
                                            className="p-1 hover:bg-stone-200 rounded-lg transition-colors text-stone-400 hover:text-stone-600"
                                            title="Options"
                                        >
                                            <MoreVertical className={`${isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-emerald-600`} />
                                        </button>
                                        <AnimatePresence>
                                            {showOptions && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.9, x: -10 }}
                                                    animate={{ opacity: 1, scale: 1, x: 0 }}
                                                    exit={{ opacity: 0, scale: 0.9, x: -10 }}
                                                    className="absolute top-0 left-[calc(100%+0.5rem)] bg-white shadow-xl rounded-xl border border-stone-100 w-48 overflow-hidden z-[60] py-1 pointer-events-auto"
                                                >
                                                    {/* Font Size Tuner */}
                                                    <div className="flex items-center justify-between px-3 py-2 border-b border-stone-50">
                                                        <span className="flex items-center gap-2.5 text-stone-700 text-xs">
                                                            <Type className="w-3.5 h-3.5" />
                                                            {language === 'zh' ? '字體大小' : 'Font Size'}
                                                        </span>
                                                        <div className="flex items-center bg-stone-100 rounded-md p-0.5" onPointerDown={(e) => e.stopPropagation()}>
                                                            <button
                                                                onClick={() => setLegendFontSize(v => Math.max(8, v - 1))}
                                                                className="p-1 hover:bg-white rounded text-stone-400 hover:text-emerald-600 transition-all active:scale-90"
                                                            >
                                                                <Minus className="w-3 h-3" />
                                                            </button>
                                                            <div className="w-[1px] h-3 bg-stone-200 mx-0.5" />
                                                            <button
                                                                onClick={() => setLegendFontSize(v => Math.min(24, v + 1))}
                                                                className="p-1 hover:bg-white rounded text-stone-400 hover:text-emerald-600 transition-all active:scale-90"
                                                            >
                                                                <Plus className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <button
                                                        onPointerDown={(e) => e.stopPropagation()}
                                                        onClick={() => { setShowHeader(!showHeader); }}
                                                        className="flex items-center gap-2.5 w-full text-left px-3 py-2 hover:bg-emerald-50 text-stone-700 text-xs transition-colors"
                                                    >
                                                        <EyeOff className="w-3.5 h-3.5" />
                                                        {showHeader ? (language === 'zh' ? '隱藏標題' : 'Hide Header') : (language === 'zh' ? '顯示標題' : 'Show Header')}
                                                    </button>
                                                    <button
                                                        onPointerDown={(e) => e.stopPropagation()}
                                                        onClick={() => { setTransparentBg(!transparentBg); }}
                                                        className="flex items-center gap-2.5 w-full text-left px-3 py-2 hover:bg-emerald-50 text-stone-700 text-xs transition-colors"
                                                    >
                                                        <ImageIcon className="w-3.5 h-3.5" />
                                                        {transparentBg ? (language === 'zh' ? '恢復背景' : 'Restore Background') : (language === 'zh' ? '透明背景' : 'Transparent Background')}
                                                    </button>
                                                    <button
                                                        onPointerDown={(e) => e.stopPropagation()}
                                                        onClick={() => { setTransparentBorders(!transparentBorders); }}
                                                        className="flex items-center gap-2.5 w-full text-left px-3 py-2 hover:bg-emerald-50 text-stone-700 text-xs transition-colors"
                                                    >
                                                        <Square className="w-3.5 h-3.5" />
                                                        {transparentBorders ? (language === 'zh' ? '恢復邊框' : 'Restore Borders') : (language === 'zh' ? '透明邊框' : 'Transparent Borders')}
                                                    </button>
                                                    <button
                                                        onPointerDown={(e) => e.stopPropagation()}
                                                        onClick={() => {
                                                            setLegendStyle(prev => prev === 'dots' ? 'rectangles' : prev === 'rectangles' ? 'full' : 'dots');
                                                        }}
                                                        className="flex items-center gap-2.5 w-full text-left px-3 py-2 hover:bg-emerald-50 text-stone-700 text-xs transition-colors"
                                                    >
                                                        <LayoutGrid className="w-3.5 h-3.5" />
                                                        {language === 'zh' ? '切換樣式' : 'Change Style'}
                                                    </button>

                                                    <div className="mx-2 my-1 border-t border-stone-100" />

                                                    <button
                                                        onPointerDown={(e) => e.stopPropagation()}
                                                        onClick={(e) => { e.stopPropagation(); handleSaveSettings(); }}
                                                        className="flex items-center gap-2.5 w-full text-left px-3 py-2 hover:bg-emerald-50 text-emerald-700 font-bold text-xs transition-colors"
                                                    >
                                                        <Save className="w-3.5 h-3.5" />
                                                        {language === 'zh' ? '儲存當前樣式' : 'Save Styling'}
                                                    </button>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

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
                </motion.div>

                {/* Content */}
                <motion.div
                    initial={false}
                    animate={{ height: effectiveExpanded ? 'auto' : 0, opacity: effectiveExpanded ? 1 : 0 }}
                    className="overflow-hidden MapLegend-content-container relative z-40 rounded-b-2xl"
                >
                    <div
                        className={`p-4 pt-0 space-y-2 overflow-y-auto custom-scrollbar ${transparentBg ? 'bg-transparent' : ''}`}
                        style={{ maxHeight: (customSize && customSize.height) ? `${customSize.height - 56}px` : (isMobile ? '60vh' : '70vh') }}
                        onPointerDown={(e) => isMobile && e.stopPropagation()}
                    >
                        <div className={`border-t pt-3 ${transparentBorders || transparentBg ? 'border-transparent' : 'border-stone-100'}`} />
                        {activeLanguages.map(({ lang, dialects }) => (
                            <div key={lang} className="flex flex-col">
                                <span
                                    className="font-bold text-black uppercase tracking-widest mb-1 px-1"
                                    style={{ fontSize: `${legendFontSize + 2}px` }}
                                >
                                    {mt(lang)}
                                </span>
                                <div className="flex flex-col gap-1.5 pl-2">
                                    {dialects.map((dialect) => {
                                        const color = getDialectColor(dialect);
                                        return (
                                            <div
                                                key={dialect}
                                                className={`flex items-center gap-2.5 transition-colors overflow-hidden
                                                    ${legendStyle === 'full' ? 'px-2 py-1 rounded' : 'p-1 rounded-lg hover:bg-stone-50'}
                                                `}
                                                style={{
                                                    backgroundColor: legendStyle === 'full' ? color : 'transparent',
                                                    color: legendStyle === 'full' ? 'white' : 'black'
                                                }}
                                            >
                                                {legendStyle === 'dots' && (
                                                    <div
                                                        className="w-2.5 h-2.5 rounded-full shadow-sm shrink-0 border border-white"
                                                        style={{ backgroundColor: color }}
                                                    />
                                                )}
                                                {legendStyle === 'rectangles' && (
                                                    <div
                                                        className="w-3 h-2.5 shrink-0 border border-black/10 rounded-sm"
                                                        style={{ backgroundColor: color }}
                                                    />
                                                )}
                                                <span
                                                    className={`truncate leading-tight flex-1`}
                                                    style={{
                                                        fontSize: `${legendFontSize}px`,
                                                        textShadow: legendStyle === 'full' ? '0px 1px 2px rgba(0,0,0,0.3)' : 'none'
                                                    }}
                                                    title={mt(dialect)}
                                                >
                                                    {mt(dialect)}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Toast Notification */}
                <AnimatePresence>
                    {showToast && (
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.9 }}
                            className="absolute top-[3.25rem] right-2 px-3 py-1.5 bg-emerald-500/90 backdrop-blur-sm text-white text-[11px] font-bold tracking-widest uppercase rounded-lg shadow-lg z-50 pointer-events-none flex items-center gap-1.5 border border-emerald-400/30"
                        >
                            <Save className="w-3 h-3" />
                            {language === 'zh' ? '已儲存!' : 'Saved!'}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </AnimatePresence>
    );
};

export default MapLegend;
