import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Map as MapIcon, RotateCcw } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { getDialectColor } from './dialectColors';

import { useTaiwanTopo } from '../hooks/useTaiwanTopo';
import { useDialectData } from '../hooks/useDialectData';

import TaiwanMapCanvas, { type TaiwanMapCanvasHandle } from './TaiwanMapCanvas';
import DialectFilterPanel from './DialectFilterPanel';
import MapSettingsMenu from './MapSettingsMenu';
import CursorTooltip from './CursorTooltip';
import FixedInfoPanel from './FixedInfoPanel';
import MapLegend from './MapLegend';

const TaiwanMap: React.FC = () => {
  const canvasRef = useRef<TaiwanMapCanvasHandle>(null);
  const [hoveredTown, setHoveredTown] = useState<any>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- Persistence Keys ---
  const STORAGE_KEYS = {
    SELECTED_DIALECTS: 'ycm_selected_dialects',
    SHOW_COUNTY_BORDERS: 'ycm_show_county_borders',
    SHOW_TOWNSHIP_CONTOURS: 'ycm_show_township_contours',
    SHOW_VILLAGE_BORDERS: 'ycm_show_village_borders',
    SHOW_VILLAGE_COLORS: 'ycm_show_village_colors',
    SHOW_FILTER_COLORS: 'ycm_show_filter_colors',
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
  const [showFilterColors, setShowFilterColors] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SHOW_FILTER_COLORS);
    return saved !== null ? JSON.parse(saved) : false;
  });

  // --- Detail state ---
  const [selectedDetailDialect, setSelectedDetailDialect] = useState<string | null>(null);
  const [isDetailPinned, setIsDetailPinned] = useState(false);
  const [isHoveringTooltip, setIsHoveringTooltip] = useState(false);
  const [isTitleExpanded, setIsTitleExpanded] = useState(false);

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
    localStorage.setItem(STORAGE_KEYS.SHOW_FILTER_COLORS, JSON.stringify(showFilterColors));
  }, [showFilterColors]);

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

  // Sync selected dialect with hover
  useEffect(() => {
    if (!hoveredTown) {
      setSelectedDetailDialect(null);
    } else if (!selectedDetailDialect && hoveredDialects.length > 0) {
      setSelectedDetailDialect(hoveredDialects[0]);
    }
  }, [hoveredTown, hoveredDialects, selectedDetailDialect]);

  return (
    <div className="relative w-full h-screen bg-stone-200 overflow-hidden font-sans">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-30 p-4 md:p-6 flex justify-between items-start pointer-events-none">
        <div className="flex flex-col gap-3 pointer-events-auto max-w-[80vw]">
          <motion.div
            layout
            onClick={() => setIsTitleExpanded(!isTitleExpanded)}
            className={isMobile && !isTitleExpanded ? 'cursor-pointer p-1' : 'bg-white/80 backdrop-blur-md p-3 md:p-4 rounded-2xl shadow-sm border border-stone-200 cursor-pointer hover:bg-white/90 transition-colors overflow-hidden'}
          >
            <div className="flex items-center gap-3">
              <div className={isMobile && !isTitleExpanded ? '' : 'p-2 rounded-xl'}>
                {/* <MapIcon className={isMobile && !isTitleExpanded ? "w-8 h-8 text-emerald-600 drop-shadow-md" : "w-5 h-5 md:w-6 md:h-6 text-emerald-600"} /> */}
                <div
                  className={
                    isMobile && !isTitleExpanded
                      ? ""
                      : "rounded-xl p-0 bg-transparent w-10 h-10 md:w-12 md:h-12" // desktop size
                  }
                >
                  <img
                    src="/logo-test_t.png"
                    alt="Taiwan Yincumin Map"
                    className={
                      isMobile && !isTitleExpanded
                        ? "w-8 h-8 drop-shadow-md object-contain"
                        : "w-full h-full object-contain" // fill container on desktop
                    }
                  />
                </div>
              </div>
              {(!isMobile || isTitleExpanded) && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex flex-col"
                >
                  <h1 className="text-lg md:text-2xl font-bold text-stone-900 tracking-tight whitespace-nowrap">
                    以~
                    {/* 臺灣族語分佈地圖 */}
                  </h1>
                  <p className="text-stone-500 text-[10px] md:text-sm mt-0.5 whitespace-nowrap tabular-nums">Taiwan Indigenous Languages Distribution</p>
                </motion.div>
              )}
            </div>
            {isTitleExpanded && isMobile && (loading || error) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="mt-3 pt-3 border-t border-stone-100"
              >
                {loading && <p className="text-[10px] text-stone-400">正在載入地理數據...</p>}
                {error && <p className="text-[10px] text-red-500">{error}</p>}
              </motion.div>
            )}
            {(!isMobile && loading) && <p className="text-xs text-stone-400 mt-2">Loading topojson…</p>}
            {(!isMobile && error) && <p className="text-xs text-red-500 mt-2">{error}</p>}
          </motion.div>

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
            showFilterColors={showFilterColors}
            setShowFilterColors={setShowFilterColors}
          />

          <button
            onClick={() => canvasRef.current?.resetZoom()}
            title="Reset zoom"
            className="p-3 bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-stone-200 pointer-events-auto hover:bg-stone-50 active:scale-95 transition-all flex items-center gap-2 text-stone-600 font-medium text-sm w-fit"
          >
            <RotateCcw className="w-4 h-4" />
            重設縮放
          </button>
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
          if (!isDetailPinned) {
            // Add a small delay/grace period via state is already handled by standard React state, 
            // but we can ensure the move logic is smooth.
            setHoveredTown(props);
          }
          setTooltipPos({ x, y });
        }}
        onLeave={() => {
          if (!isDetailPinned) setHoveredTown(null);
        }}
        onClickTown={(props) => {
          if (!props) {
            setIsDetailPinned(false);
            setHoveredTown(null);
            return;
          }

          const { county, town, village } = getCountyTownVillageFromProps(props);
          const dialectsArray = (showVillageColors && village)
            ? getVillageDialects(county, town, village)
            : getDialects(county, town);

          if (dialectsArray.length) {
            setSelectedDialects((prev) => {
              const next = new Set(prev);
              const allPresent = dialectsArray.every((x) => prev.has(x));
              if (allPresent) dialectsArray.forEach((x) => next.delete(x));
              else dialectsArray.forEach((x) => next.add(x));
              return next;
            });

            setHoveredTown(props);
            setIsDetailPinned(true);
          } else {
            // Click outside or neutral area
            setIsDetailPinned(false);
            setHoveredTown(null);
          }
        }}
        onClickBackground={() => {
          setIsDetailPinned(false);
          setHoveredTown(null);
        }}
      />

      {/* Filters */}
      <DialectFilterPanel
        isMobile={isMobile}
        isOpen={isFilterOpen}
        setIsOpen={setIsFilterOpen}
        languageGroups={languageGroups}
        populationMap={populationMap}
        expandedGroups={expandedGroups}
        setExpandedGroups={setExpandedGroups}
        selectedDialects={selectedDialects}
        showFilterColors={showFilterColors}
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
        hoveredTown={isDetailPinned ? null : hoveredTown} // Hide simple tooltip if pinned
        showFixedInfo={showFixedInfo}
        tooltipPos={tooltipPos}
        hoveredLabel={hoveredLabel}
        hoveredDialects={hoveredDialects}
        getDialectColor={getDialectColor}
        populationMap={populationMap}
        onShowMore={() => setIsDetailPinned(true)}
        onMouseEnter={() => { }}
        onMouseLeave={() => { }}
      />

      {/* Pinned / Fixed Panel at Top Right */}
      <div
        className={`fixed top-6 right-6 z-40 pointer-events-none transition-all duration-300 ${isFilterOpen ? 'mr-80' : 'mr-0'}`}
      >
        <FixedInfoPanel
          hoveredTown={hoveredTown}
          showFixedInfo={showFixedInfo || isDetailPinned}
          hoveredLabel={hoveredLabel}
          hoveredDialects={hoveredDialects}
          getDialectColor={getDialectColor}
          selectedDialect={selectedDetailDialect}
          onSelectDialect={setSelectedDetailDialect}
          onClose={() => {
            setIsDetailPinned(false);
            if (!showFixedInfo) setHoveredTown(null);
          }}
        />
      </div>

      <div className="absolute bottom-8 left-6 z-10 pointer-events-none flex flex-col gap-4">
        <MapLegend
          isMobile={isMobile}

          selectedDialects={selectedDialects}
          languageGroups={languageGroups}
          getDialectColor={getDialectColor}
        />
      </div>
    </div>
  );
};

export default TaiwanMap;