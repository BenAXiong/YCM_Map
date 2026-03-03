import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Settings, Globe, ChevronDown } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

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

    showLvl1Names: boolean;
    setShowLvl1Names: (v: boolean) => void;
    showLvl2Names: boolean;
    setShowLvl2Names: (v: boolean) => void;
    showLvl3Names: boolean;
    setShowLvl3Names: (v: boolean) => void;

    showSharedDialects: boolean;
    setShowSharedDialects: (v: boolean) => void;

    showPins: boolean;
    setShowPins: (v: boolean) => void;
    showPinContours: boolean;
    setShowPinContours: (v: boolean) => void;
    showPinGlow: boolean;
    setShowPinGlow: (v: boolean) => void;

    showDialectUsageNames: boolean;
    setShowDialectUsageNames: (v: boolean) => void;

    language: 'zh' | 'en';
    setLanguage: (v: 'zh' | 'en') => void;
    mapBgColor: string;
    setMapBgColor: (v: string) => void;
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
    showLvl1Names,
    setShowLvl1Names,
    showLvl2Names,
    setShowLvl2Names,
    showLvl3Names,
    setShowLvl3Names,
    showSharedDialects,
    setShowSharedDialects,
    showPins,
    setShowPins,
    showPinContours,
    setShowPinContours,
    showPinGlow,
    setShowPinGlow,
    showDialectUsageNames,
    setShowDialectUsageNames,
    language,
    setLanguage,
    mapBgColor,
    setMapBgColor,
}) => {
    const { t } = useTranslation(language);

    return (
        <div
            className="relative self-start"
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
        >
            <button className="p-3 bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-stone-200 hover:bg-stone-50 transition-all text-stone-600 flex items-center gap-2">
                <Settings className={`w-5 h-5 ${isOpen ? 'rotate-90' : ''} transition-transform duration-300`} />
                <span className="text-xs font-bold uppercase tracking-wider hidden md:inline">{t('settings')}</span>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, x: -10, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -10, scale: 0.95 }}
                        className="absolute top-0 left-full ml-3 w-48 bg-white rounded-2xl shadow-xl border border-stone-200 p-4 z-40"
                    >
                        <div className="space-y-6">
                            {/* SECTION: Map Layers */}
                            <div>
                                <h3 className="text-[16px] font-black text-stone-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    {t('boundaryDisplay')}
                                </h3>
                                <div className="space-y-3">
                                    <ToggleRow
                                        label={t('countyBorders')}
                                        value={showCountyBorders}
                                        onToggle={() => setShowCountyBorders(!showCountyBorders)}
                                    />
                                    <ToggleRow
                                        label={t('townshipContours')}
                                        value={showTownshipContours}
                                        onToggle={() => setShowTownshipContours(!showTownshipContours)}
                                    />
                                    <ToggleRow
                                        label={t('villageBorders')}
                                        value={showVillageBorders}
                                        onToggle={() => setShowVillageBorders(!showVillageBorders)}
                                    />
                                    <ToggleRow
                                        label={t('boundaryDisplay')}
                                        value={showVillageColors}
                                        onToggle={() => setShowVillageColors(!showVillageColors)}
                                        sublabel={t('villageColors')}
                                    />
                                    <ToggleRow
                                        label={t('sharedDialects')}
                                        value={showSharedDialects}
                                        onToggle={() => setShowSharedDialects(!showSharedDialects)}
                                    />
                                    <div className="pt-1">
                                        <ColorRow
                                            label={t('mapBgColor')}
                                            value={mapBgColor}
                                            onChange={setMapBgColor}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* SECTION: Pins */}
                            <div className="pt-2 border-t border-stone-100">
                                <h3 className="text-[16px] font-black text-stone-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    {t('pinsSection')}
                                </h3>
                                <div className="space-y-3">
                                    <ToggleRow
                                        label={t('showPins')}
                                        value={showPins}
                                        onToggle={() => setShowPins(!showPins)}
                                    />
                                    <ToggleRow
                                        label={t('showPinContours')}
                                        value={showPinContours}
                                        onToggle={() => setShowPinContours(!showPinContours)}
                                    />
                                    <ToggleRow
                                        label={t('showPinGlow')}
                                        value={showPinGlow}
                                        onToggle={() => setShowPinGlow(!showPinGlow)}
                                    />
                                </div>
                            </div>

                            {/* SECTION: Area Names */}
                            <div className="pt-2 border-t border-stone-100">
                                <h3 className="text-[16px] font-black text-stone-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    {t('areaNames')}
                                </h3>
                                <div className="space-y-3">
                                    <ToggleRow
                                        label={t('level1Names')}
                                        value={showLvl1Names}
                                        onToggle={() => setShowLvl1Names(!showLvl1Names)}
                                    />
                                    <ToggleRow
                                        label={t('level2Names')}
                                        value={showLvl2Names}
                                        onToggle={() => setShowLvl2Names(!showLvl2Names)}
                                    />
                                    <ToggleRow
                                        label={t('level3Names')}
                                        value={showLvl3Names}
                                        onToggle={() => setShowLvl3Names(!showLvl3Names)}
                                    />
                                </div>
                            </div>

                            {/* SECTION: UI Options */}
                            <div className="pt-2 border-t border-stone-100">
                                <h3 className="text-[16px] font-black text-stone-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    {t('boundaryDisplay')}
                                </h3>
                                <div className="space-y-3">
                                    <ToggleRow
                                        label={t('showFixedInfo')}
                                        value={showFixedInfo}
                                        onToggle={() => setShowFixedInfo(!showFixedInfo)}
                                    />

                                    <ToggleRow
                                        label={t('dialectUsageToggle')}
                                        value={showDialectUsageNames}
                                        onToggle={() => setShowDialectUsageNames(!showDialectUsageNames)}
                                    />

                                    <div className="flex flex-col gap-2 pt-1">
                                        <div className="flex items-center gap-2 text-stone-500">
                                            <Globe className="w-3.5 h-3.5" />
                                            <span className="text-xs font-bold">語言 / Language</span>
                                        </div>
                                        <div className="relative group/select">
                                            <select
                                                value={language}
                                                onChange={(e) => setLanguage(e.target.value as 'zh' | 'en')}
                                                className="w-full appearance-none bg-stone-100 border-none rounded-xl px-4 py-2.5 text-sm font-bold text-stone-700 focus:ring-2 focus:ring-emerald-500/20 cursor-pointer transition-all pr-10 hover:bg-stone-200"
                                            >
                                                <option value="zh">繁體中文</option>
                                                <option value="en">English</option>
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none group-hover/select:text-stone-600 transition-colors" />
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-8 pt-2 border-t border-stone-100 flex justify-between items-center opacity-30 select-none">
                                    <span className="text-[9px] font-black tracking-tighter text-stone-400">BUILD VER</span>
                                    <span className="text-[9px] font-mono font-bold text-stone-500">2026.03.03.1328</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const ToggleRow: React.FC<{ label: string; sublabel?: string; value: boolean; onToggle: () => void }> = ({
    label,
    sublabel,
    value,
    onToggle,
}) => (
    <div className="flex items-center justify-between">
        <div className="flex flex-col">
            <span className="text-sm text-stone-700 font-bold">{label}</span>
            {sublabel && <span className="text-[10px] text-stone-400">{sublabel}</span>}
        </div>
        <button
            onClick={onToggle}
            className={`w-9 h-5 rounded-full transition-all relative shrink-0 ${value ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-stone-200'}`}
        >
            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all duration-300 ${value ? 'left-5' : 'left-1'}`} />
        </button>
    </div>
);

const ColorRow: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({
    label,
    value,
    onChange,
}) => (
    <div className="flex items-center justify-between">
        <span className="text-sm text-stone-700 font-bold">{label}</span>
        <div className="relative flex items-center h-5 w-9">
            <input
                type="color"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div
                className="w-9 h-5 rounded-md border border-stone-200 shadow-sm transition-all"
                style={{ backgroundColor: value }}
            />
        </div>
    </div>
);

export default MapSettingsMenu;