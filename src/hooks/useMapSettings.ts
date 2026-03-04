import { useState, useEffect } from 'react';
import type { PinnedMap } from '../components/types';

export const STORAGE_KEYS = {
    SELECTED_DIALECTS: 'ycm_selected_dialects',
    SHOW_COUNTY_BORDERS: 'ycm_show_county_borders',
    SHOW_TOWNSHIP_CONTOURS: 'ycm_show_township_contours',
    SHOW_VILLAGE_BORDERS: 'ycm_show_village_borders',
    SHOW_VILLAGE_COLORS: 'ycm_show_village_colors',
    SHOW_FIXED_INFO: 'ycm_show_fixed_info',
    SHOW_LVL1_NAMES: 'ycm_show_lvl1_names',
    SHOW_LVL2_NAMES: 'ycm_show_lvl2_names',
    SHOW_LVL3_NAMES: 'ycm_show_lvl3_names',
    SHOW_SHARED_DIALECTS: 'ycm_show_shared_dialects',
    LANGUAGE: 'ycm_language',
    PINNED_LOCATIONS: 'ycm_pinned_locations',
    SHOW_PINS: 'ycm_show_pins',
    SHOW_PIN_CONTOURS: 'ycm_show_pin_contours',
    SHOW_PIN_GLOW: 'ycm_show_pin_glow',
    SHOW_DIALECT_USAGE_NAMES: 'ycm_show_dialect_usage_names',
    MAP_BG_COLOR: 'ycm_map_bg_color',
    SEARCH_HISTORY: 'ycm_search_history',
};

export function useMapSettings() {
    const [selectedDialects, setSelectedDialects] = useState<Set<string>>(() => {
        const saved = sessionStorage.getItem(STORAGE_KEYS.SELECTED_DIALECTS);
        return saved ? new Set(JSON.parse(saved)) : new Set();
    });

    const [showCountyBorders, setShowCountyBorders] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.SHOW_COUNTY_BORDERS);
        return saved !== null ? JSON.parse(saved) : true;
    });

    const [showFixedInfo, setShowFixedInfo] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.SHOW_FIXED_INFO);
        return saved !== null ? JSON.parse(saved) : false;
    });

    const [showTownshipContours, setShowTownshipContours] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.SHOW_TOWNSHIP_CONTOURS);
        return saved !== null ? JSON.parse(saved) : false;
    });

    const [showVillageBorders, setShowVillageBorders] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.SHOW_VILLAGE_BORDERS);
        return saved !== null ? JSON.parse(saved) : false;
    });

    const [showVillageColors, setShowVillageColors] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.SHOW_VILLAGE_COLORS);
        return saved !== null ? JSON.parse(saved) : false;
    });

    const [showLvl1Names, setShowLvl1Names] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.SHOW_LVL1_NAMES);
        return saved !== null ? JSON.parse(saved) : true;
    });

    const [showLvl2Names, setShowLvl2Names] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.SHOW_LVL2_NAMES);
        return saved !== null ? JSON.parse(saved) : false;
    });

    const [showLvl3Names, setShowLvl3Names] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.SHOW_LVL3_NAMES);
        return saved !== null ? JSON.parse(saved) : false;
    });

    const [showSharedDialects, setShowSharedDialects] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.SHOW_SHARED_DIALECTS);
        return saved !== null ? JSON.parse(saved) : false;
    });

    const [mapBgColor, setMapBgColor] = useState(() => {
        return localStorage.getItem(STORAGE_KEYS.MAP_BG_COLOR) || '#f8fafc';
    });

    const [language, setLanguage] = useState<'zh' | 'en'>(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.LANGUAGE);
        return (saved as 'zh' | 'en') || 'zh';
    });

    const [pinnedLocations, setPinnedLocations] = useState<PinnedMap>(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.PINNED_LOCATIONS);
        return saved ? JSON.parse(saved) : {};
    });

    const [showPins, setShowPins] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.SHOW_PINS);
        return saved !== null ? JSON.parse(saved) : true;
    });

    const [showPinContours, setShowPinContours] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.SHOW_PIN_CONTOURS);
        return saved !== null ? JSON.parse(saved) : true;
    });

    const [showPinGlow, setShowPinGlow] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.SHOW_PIN_GLOW);
        return saved !== null ? JSON.parse(saved) : false;
    });

    const [showDialectUsageNames, setShowDialectUsageNames] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.SHOW_DIALECT_USAGE_NAMES);
        return saved !== null ? JSON.parse(saved) : true;
    });

    // Consolidated Persistence Effect
    useEffect(() => {
        sessionStorage.setItem(STORAGE_KEYS.SELECTED_DIALECTS, JSON.stringify(Array.from(selectedDialects)));
    }, [selectedDialects]);

    useEffect(() => {
        const settingsMap = {
            [STORAGE_KEYS.SHOW_COUNTY_BORDERS]: showCountyBorders,
            [STORAGE_KEYS.SHOW_TOWNSHIP_CONTOURS]: showTownshipContours,
            [STORAGE_KEYS.SHOW_VILLAGE_BORDERS]: showVillageBorders,
            [STORAGE_KEYS.SHOW_VILLAGE_COLORS]: showVillageColors,
            [STORAGE_KEYS.SHOW_DIALECT_USAGE_NAMES]: showDialectUsageNames,
            [STORAGE_KEYS.MAP_BG_COLOR]: mapBgColor,
            [STORAGE_KEYS.SHOW_FIXED_INFO]: showFixedInfo,
            [STORAGE_KEYS.SHOW_LVL1_NAMES]: showLvl1Names,
            [STORAGE_KEYS.SHOW_LVL2_NAMES]: showLvl2Names,
            [STORAGE_KEYS.SHOW_LVL3_NAMES]: showLvl3Names,
            [STORAGE_KEYS.LANGUAGE]: language,
            [STORAGE_KEYS.PINNED_LOCATIONS]: pinnedLocations,
            [STORAGE_KEYS.SHOW_PINS]: showPins,
            [STORAGE_KEYS.SHOW_PIN_CONTOURS]: showPinContours,
            [STORAGE_KEYS.SHOW_PIN_GLOW]: showPinGlow,
            [STORAGE_KEYS.SHOW_SHARED_DIALECTS]: showSharedDialects,
        };

        Object.entries(settingsMap).forEach(([key, val]) => {
            localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
        });
    }, [
        showCountyBorders, showTownshipContours, showVillageBorders, showVillageColors,
        showDialectUsageNames, mapBgColor, showFixedInfo, showLvl1Names, showLvl2Names,
        showLvl3Names, language, pinnedLocations, showPins, showPinContours,
        showPinGlow, showSharedDialects
    ]);

    return {
        selectedDialects, setSelectedDialects,
        showCountyBorders, setShowCountyBorders,
        showFixedInfo, setShowFixedInfo,
        showTownshipContours, setShowTownshipContours,
        showVillageBorders, setShowVillageBorders,
        showVillageColors, setShowVillageColors,
        showLvl1Names, setShowLvl1Names,
        showLvl2Names, setShowLvl2Names,
        showLvl3Names, setShowLvl3Names,
        showSharedDialects, setShowSharedDialects,
        mapBgColor, setMapBgColor,
        language, setLanguage,
        pinnedLocations, setPinnedLocations,
        showPins, setShowPins,
        showPinContours, setShowPinContours,
        showPinGlow, setShowPinGlow,
        showDialectUsageNames, setShowDialectUsageNames,
    };
}
