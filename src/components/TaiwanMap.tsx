import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Map as MapIcon, RotateCcw } from 'lucide-react';

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

  const [selectedDialects, setSelectedDialects] = useState<Set<string>>(new Set());

  const [isFilterOpen, setIsFilterOpen] = useState(() => window.innerWidth > 768);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const [showCountyBorders, setShowCountyBorders] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showFixedInfo, setShowFixedInfo] = useState(false);
  const [showTownshipContours, setShowTownshipContours] = useState(false);

  const { townFeatures, countyBorders, loading, error } = useTaiwanTopo();
  const { languageGroups, allDialects, getDialects, getCountyTownFromProps } = useDialectData();

  // --- Search list (from topo features) ---
  const allTownships = useMemo(() => {
    if (!townFeatures) return [];
    return (townFeatures as any).features.map((f: any) => {
      const p = f.properties || {};
      const { county, town } = getCountyTownFromProps(p);
      return {
        id: p.TOWNID || p.townId || p.T_Code || `${county}-${town}-${Math.random().toString(16).slice(2)}`,
        county,
        town,
        properties: p,
      };
    });
  }, [townFeatures, getCountyTownFromProps]);

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

  const selectAll = () => setSelectedDialects(new Set(allDialects));
  const clearAll = () => setSelectedDialects(new Set());

  // --- color helper (shared across UI + canvas) ---
  const getDialectColor = (dialect: string) => {
    const colors = [
      '#3b82f6',
      '#ef4444',
      '#10b981',
      '#f59e0b',
      '#8b5cf6',
      '#ec4899',
      '#06b6d4',
      '#84cc16',
      '#f97316',
      '#6366f1',
    ];
    let hash = 0;
    for (let i = 0; i < dialect.length; i++) {
      hash = dialect.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const hoveredLabel = useMemo(() => {
    if (!hoveredTown) return { county: '', town: '' };
    return getCountyTownFromProps(hoveredTown);
  }, [hoveredTown, getCountyTownFromProps]);

  const hoveredDialects = useMemo(() => {
    if (!hoveredTown) return [];
    return getDialects(hoveredLabel.county, hoveredLabel.town);
  }, [hoveredTown, hoveredLabel.county, hoveredLabel.town, getDialects]);

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
          />
        </div>
      </header>

      {/* Map */}
      <TaiwanMapCanvas
        ref={canvasRef}
        townFeatures={townFeatures}
        countyBorders={countyBorders}
        showCountyBorders={showCountyBorders}
        showTownshipContours={showTownshipContours}
        selectedDialects={selectedDialects}
        getDialects={getDialects}
        getCountyTownFromProps={getCountyTownFromProps}
        onHover={(props, x, y) => {
          setHoveredTown(props);
          setTooltipPos({ x, y });
        }}
        onLeave={() => setHoveredTown(null)}
        onClickTown={(props) => {
          const { county, town } = getCountyTownFromProps(props);
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