import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Map as MapIcon, RotateCcw } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { getDialectColor } from './dialectColors';

import { useTaiwanTopo } from '../hooks/useTaiwanTopo';
import { useDialectData } from '../hooks/useDialectData';

import TaiwanMapCanvas, { type TaiwanMapCanvasHandle } from './TaiwanMapCanvas';
import DialectFilterPanel from './DialectFilterPanel';
import MapSettingsMenu from './MapSettingsMenu';
import CursorTooltip from './CursorTooltip';
import FixedInfoPanel from './FixedInfoPanel';

const TaiwanMap: React.FC = () => {
  const canvasRef = useRef<TaiwanMapCanvasHandle>(null);
  const [hoveredTown, setHoveredTown] = useState<any>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // --- Persistence Keys ---
  const STORAGE_KEYS = {
    SELECTED_DIALECTS: 'ycm_selected_dialects',
    SHOW_COUNTY_BORDERS: 'ycm_show_county_borders',
    SHOW_TOWNSHIP_CONTOURS: 'ycm_show_township_contours',
    SHOW_VILLAGE_BORDERS: 'ycm_show_village_borders',
    SHOW_VILLAGE_COLORS: 'ycm_show_village_colors',
    SHOW_FIXED_INFO: 'ycm_show_fixed_info',
  };

  const [selectedDialects, setSelectedDialects] = useState<Set<string>>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SELECTED_DIALECTS);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const [isFilterOpen, setIsFilterOpen] = useState(() => window.innerWidth > 768);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const [showCountyBorders, setShowCountyBorders] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SHOW_COUNTY_BORDERS);
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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

  // --- Persistence Effects ---
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SELECTED_DIALECTS, JSON.stringify(Array.from(selectedDialects)));
  }, [selectedDialects]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SHOW_COUNTY_BORDERS, JSON.stringify(showCountyBorders));
  }, [showCountyBorders]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SHOW_TOWNSHIP_CONTOURS, JSON.stringify(showTownshipContours));
  }, [showTownshipContours]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SHOW_VILLAGE_BORDERS, JSON.stringify(showVillageBorders));
  }, [showVillageBorders]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SHOW_VILLAGE_COLORS, JSON.stringify(showVillageColors));
  }, [showVillageColors]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SHOW_FIXED_INFO, JSON.stringify(showFixedInfo));
  }, [showFixedInfo]);

  const { townFeatures, countyBorders, villageBorders, villageFeatures, loading, error } = useTaiwanTopo(
    'https://cdn.jsdelivr.net/npm/taiwan-atlas/towns-10t.json',
    (showVillageBorders || showVillageColors) ? 'https://cdn.jsdelivr.net/npm/taiwan-atlas/villages-10t.json' : undefined
  );
  const { languageGroups, allDialects, getDialects, getCountyTownVillageFromProps, getVillageDialects, populationMap } = useDialectData();

  // --- Search list (from topo features) ---
  const allTownships = useMemo(() => {
    if (!townFeatures) return [];
    return (townFeatures as any).features.map((f: any) => {
      const p = f.properties || {};
      const { county, town } = getCountyTownVillageFromProps(p);
      return {
        id: p.TOWNID || p.townId || p.T_Code || `${county}-${town}-${Math.random().toString(16).slice(2)}`,
        county,
        town,
        properties: p,
      };
    });
  }, [townFeatures, getCountyTownVillageFromProps]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setSearchResults([]);
      return;
    }
    const term = searchTerm.trim();
    const filtered = allTownships
      .filter((t: any) => t.county.includes(term) || t.town.includes(term))
      .slice(0, 10);
    setSearchResults(filtered);
  }, [searchTerm, allTownships]);

  const handleTownshipSelect = (township: any) => {
    const dialects = getDialects(township.county, township.town);
    if (dialects.length) {
      setSelectedDialects((prev) => {
        const next = new Set(prev);
        dialects.forEach((d) => next.add(d));
        return next;
      });
    }
    setSearchTerm('');
    setSearchResults([]);
  };

  // --- selection helpers ---
  const toggleLanguage = (lang: string) => {
    const dialects = languageGroups[lang] ?? [];
    const allSelected = dialects.length > 0 && dialects.every((d) => selectedDialects.has(d));

    setSelectedDialects((prev) => {
      const next = new Set(prev);
      if (allSelected) dialects.forEach((d) => next.delete(d));
      else dialects.forEach((d) => next.add(d));
      return next;
    });
  };

  const toggleDialect = (dialect: string) => {
    setSelectedDialects((prev) => {
      const next = new Set(prev);
      if (next.has(dialect)) next.delete(dialect);
      else next.add(dialect);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedDialects(new Set(Object.values(languageGroups).flat()));
  };
  const clearAll = () => setSelectedDialects(new Set());

  const hoveredLabel = useMemo(() => {
    if (!hoveredTown) return { county: '', town: '', village: '' };
    return getCountyTownVillageFromProps(hoveredTown);
  }, [hoveredTown, getCountyTownVillageFromProps]);

  const hoveredDialects = useMemo(() => {
    if (!hoveredTown) return [];
    if (showVillageColors && hoveredLabel.village) {
      return getVillageDialects(hoveredLabel.county, hoveredLabel.town, hoveredLabel.village);
    }
    return getDialects(hoveredLabel.county, hoveredLabel.town);
  }, [hoveredTown, hoveredLabel, getDialects, getVillageDialects, showVillageColors]);

  return (
    <div className="relative w-full h-screen bg-stone-200 overflow-hidden font-sans">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-30 p-6 flex justify-between items-start pointer-events-none">
        <div className="flex flex-col gap-3 pointer-events-auto">
          <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-stone-200">
            <h1 className="text-2xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
              <MapIcon className="w-6 h-6 text-emerald-600" />
              臺灣族語分佈地圖
            </h1>
            <p className="text-stone-500 text-sm mt-1">Taiwan Indigenous Languages Distribution</p>
            {loading && <p className="text-xs text-stone-400 mt-2">Loading topojson…</p>}
            {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
          </div>

          <MapSettingsMenu
            isOpen={isSettingsOpen}
            setIsOpen={setIsSettingsOpen}
            showCountyBorders={showCountyBorders}
            setShowCountyBorders={setShowCountyBorders}
            showFixedInfo={showFixedInfo}
            setShowFixedInfo={setShowFixedInfo}
            showTownshipContours={showTownshipContours}
            setShowTownshipContours={setShowTownshipContours}
            showVillageBorders={showVillageBorders}
            setShowVillageBorders={setShowVillageBorders}
            showVillageColors={showVillageColors}
            setShowVillageColors={setShowVillageColors}
          />
        </div>
      </header>

      {/* Map */}
      <TaiwanMapCanvas
        ref={canvasRef}
        townFeatures={townFeatures}
        countyBorders={countyBorders}
        villageBorders={villageBorders}
        villageFeatures={villageFeatures}
        showCountyBorders={showCountyBorders}
        showTownshipContours={showTownshipContours}
        showVillageBorders={showVillageBorders}
        showVillageColors={showVillageColors}
        selectedDialects={selectedDialects}
        getDialects={getDialects}
        getCountyTownVillageFromProps={getCountyTownVillageFromProps}
        onHover={(props, x, y) => {
          setHoveredTown(props);
          setTooltipPos({ x, y });
        }}
        onLeave={() => setHoveredTown(null)}
        onClickTown={(props) => {
          const { county, town } = getCountyTownVillageFromProps(props);
          const dialectsArray = getDialects(county, town);
          if (!dialectsArray.length) return;

          setSelectedDialects((prev) => {
            const next = new Set(prev);
            const allPresent = dialectsArray.every((x) => prev.has(x));
            if (allPresent) dialectsArray.forEach((x) => next.delete(x));
            else dialectsArray.forEach((x) => next.add(x));
            return next;
          });
        }}
      />

      {/* Reset zoom button */}
      <button
        onClick={() => canvasRef.current?.resetZoom()}
        title="Reset zoom"
        className="absolute bottom-6 right-6 z-20 p-3 bg-white rounded-2xl shadow-lg border border-stone-200 hover:bg-stone-50 active:scale-95 transition-all flex items-center gap-2 text-stone-600 font-medium text-sm"
      >
        <RotateCcw className="w-4 h-4" />
        重設縮放
      </button>

      {/* Filters */}
      <DialectFilterPanel
        isOpen={isFilterOpen}
        setIsOpen={setIsFilterOpen}
        languageGroups={languageGroups}
        populationMap={populationMap}
        expandedGroups={expandedGroups}
        setExpandedGroups={setExpandedGroups}
        selectedDialects={selectedDialects}
        onToggleLanguage={toggleLanguage}
        onToggleDialect={toggleDialect}
        onSelectAll={selectAll}
        onClearAll={clearAll}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        searchResults={searchResults}
        onSelectTownship={handleTownshipSelect}
        getDialectColor={getDialectColor}
      />

      <CursorTooltip
        hoveredTown={hoveredTown}
        showFixedInfo={showFixedInfo}
        tooltipPos={tooltipPos}
        hoveredLabel={hoveredLabel}
        hoveredDialects={hoveredDialects}
        getDialectColor={getDialectColor}
      />

      <FixedInfoPanel
        hoveredTown={hoveredTown}
        showFixedInfo={showFixedInfo}
        hoveredLabel={hoveredLabel}
        hoveredDialects={hoveredDialects}
        getDialectColor={getDialectColor}
      />
    </div>
  );
};

export default TaiwanMap;