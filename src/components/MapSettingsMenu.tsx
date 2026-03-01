import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Settings } from 'lucide-react';

type Props = {
    isOpen: boolean;
    setIsOpen: (v: boolean) => void;

    showCountyBorders: boolean;
    setShowCountyBorders: (v: boolean) => void;

    showFixedInfo: boolean;
    setShowFixedInfo: (v: boolean) => void;

    showTownshipContours: boolean;
    setShowTownshipContours: (v: boolean) => void;

    showVillageBorders: boolean;
    setShowVillageBorders: (v: boolean) => void;

    showVillageColors: boolean;
    setShowVillageColors: (v: boolean) => void;

    showFilterColors: boolean;
    setShowFilterColors: (v: boolean) => void;
};

const MapSettingsMenu: React.FC<Props> = ({
    isOpen,
    setIsOpen,
    showCountyBorders,
    setShowCountyBorders,
    showFixedInfo,
    setShowFixedInfo,
    showTownshipContours,
    setShowTownshipContours,
    showVillageBorders,
    setShowVillageBorders,
    showVillageColors,
    setShowVillageColors,
    showFilterColors,
    setShowFilterColors,
}) => {
    return (
        <div
            className="relative self-start"
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
        >
            <button className="p-3 bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-stone-200 hover:bg-stone-50 transition-all text-stone-600 flex items-center gap-2">
                <Settings className={`w-5 h-5 ${isOpen ? 'rotate-90' : ''} transition-transform duration-300`} />
                <span className="text-xs font-bold uppercase tracking-wider">地圖設定</span>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, x: -10, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -10, scale: 0.95 }}
                        className="absolute top-0 left-full ml-3 w-48 bg-white rounded-2xl shadow-xl border border-stone-200 p-4 z-40"
                    >
                        <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">地圖設定</h3>

                        <div className="space-y-4">
                            <ToggleRow
                                label="顯示縣市邊界"
                                value={showCountyBorders}
                                onToggle={() => setShowCountyBorders(!showCountyBorders)}
                            />
                            <ToggleRow
                                label="顯示鄉鎮邊界"
                                value={showTownshipContours}
                                onToggle={() => setShowTownshipContours(!showTownshipContours)}
                            />
                            <ToggleRow
                                label="顯示村里邊界"
                                value={showVillageBorders}
                                onToggle={() => setShowVillageBorders(!showVillageBorders)}
                            />
                            <ToggleRow
                                label="固定資訊面板"
                                value={showFixedInfo}
                                onToggle={() => setShowFixedInfo(!showFixedInfo)}
                            />                            <ToggleRow
                                label="村里著色模式"
                                value={showVillageColors}
                                onToggle={() => setShowVillageColors(!showVillageColors)}
                            />
                            <ToggleRow
                                label="篩選選項著色"
                                value={showFilterColors}
                                onToggle={() => setShowFilterColors(!showFilterColors)}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const ToggleRow: React.FC<{ label: string; value: boolean; onToggle: () => void }> = ({
    label,
    value,
    onToggle,
}) => (
    <div className="flex items-center justify-between">
        <span className="text-sm text-stone-700 font-medium">{label}</span>
        <button
            onClick={onToggle}
            className={`w-10 h-5 rounded-full transition-colors relative ${value ? 'bg-emerald-500' : 'bg-stone-300'}`}
        >
            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${value ? 'left-6' : 'left-1'}`} />
        </button>
    </div>
);

export default MapSettingsMenu;