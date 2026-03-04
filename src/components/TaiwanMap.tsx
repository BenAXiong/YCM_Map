import React, { useEffect, useMemo, useRef, useState } from 'react';
import { trackEvent } from '../hooks/useAnalytics';
import { Map as MapIcon, RotateCcw, ImageDown, Share2, Loader2, Smartphone, Layout } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { toPng } from 'html-to-image';
import { getDialectColor } from './dialectColors';

import { useTaiwanTopo } from '../hooks/useTaiwanTopo';
import { useDialectData } from '../hooks/useDialectData';

import TaiwanMapCanvas, { type TaiwanMapCanvasHandle } from './TaiwanMapCanvas';
import DialectFilterPanel from './DialectFilterPanel';
import CursorTooltip from './CursorTooltip';
import FixedInfoPanel from './FixedInfoPanel';
import ExplorationProgressPanel from './ExplorationProgressPanel';
import MapSettingsMenu from './MapSettingsMenu';
import MapLegend from './MapLegend';
import { useTranslation } from '../hooks/useTranslation';
import { useUserStats } from '../hooks/useUserStats';
import type { PinnedMap, PinType } from './types';
import { mapTranslations } from '../data/map_translations';

const TaiwanMap: React.FC = () => {
  const canvasRef = useRef<TaiwanMapCanvasHandle>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
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

  const [selectedDialects, setSelectedDialects] = useState<Set<string>>(() => {
    const saved = sessionStorage.getItem(STORAGE_KEYS.SELECTED_DIALECTS);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const [isFilterOpen, setIsFilterOpen] = useState(() => window.innerWidth > 768);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [searchHistory, setSearchHistory] = useState<any[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SEARCH_HISTORY);
    return saved ? JSON.parse(saved) : [];
  });
  const [searchResults, setSearchResults] = useState<{ places: any[], languages: any[] }>({ places: [], languages: [] });

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

  // --- Detail state ---
  const [selectedDetailDialect, setSelectedDetailDialect] = useState<string | null>(null);
  const [isDetailPinned, setIsDetailPinned] = useState(false);  // tooltip pinned by click
  const [showDetailPanel, setShowDetailPanel] = useState(false); // FixedInfoPanel open via More Info btn
  const { t } = useTranslation(language, showDialectUsageNames);
  const [isHoveringTooltip, setIsHoveringTooltip] = useState(false);
  const [isTitleExpanded, setIsTitleExpanded] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [hideLegendForExport, setHideLegendForExport] = useState(false);
  const [activeActionMenu, setActiveActionMenu] = useState<'export' | 'share' | 'reset' | null>(null);

  // --- Persistence Effects ---
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEYS.SELECTED_DIALECTS, JSON.stringify(Array.from(selectedDialects)));
  }, [selectedDialects, STORAGE_KEYS.SELECTED_DIALECTS]);

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
    localStorage.setItem(STORAGE_KEYS.SHOW_DIALECT_USAGE_NAMES, JSON.stringify(showDialectUsageNames));
  }, [showDialectUsageNames]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SHOW_VILLAGE_COLORS, JSON.stringify(showVillageColors));
  }, [showVillageColors]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MAP_BG_COLOR, mapBgColor);
  }, [mapBgColor]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SHOW_FIXED_INFO, JSON.stringify(showFixedInfo));
  }, [showFixedInfo, STORAGE_KEYS.SHOW_FIXED_INFO]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SHOW_LVL1_NAMES, JSON.stringify(showLvl1Names));
  }, [showLvl1Names, STORAGE_KEYS.SHOW_LVL1_NAMES]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SHOW_LVL2_NAMES, JSON.stringify(showLvl2Names));
  }, [showLvl2Names, STORAGE_KEYS.SHOW_LVL2_NAMES]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SHOW_LVL3_NAMES, JSON.stringify(showLvl3Names));
  }, [showLvl3Names, STORAGE_KEYS.SHOW_LVL3_NAMES]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PINNED_LOCATIONS, JSON.stringify(pinnedLocations));
  }, [pinnedLocations]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SHOW_PINS, JSON.stringify(showPins));
  }, [showPins]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SHOW_PIN_CONTOURS, JSON.stringify(showPinContours));
  }, [showPinContours]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SHOW_PIN_GLOW, JSON.stringify(showPinGlow));
  }, [showPinGlow]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SHOW_SHARED_DIALECTS, JSON.stringify(showSharedDialects));
  }, [showSharedDialects, STORAGE_KEYS.SHOW_SHARED_DIALECTS]);

  // --- Handlers ---
  const handleTogglePin = (county: string, town: string, village: string, type: PinType | null) => {
    const key = `${county}|${town}|${village || ''}`;
    setPinnedLocations((prev) => {
      const next = { ...prev };
      if (!type) {
        delete next[key];
        trackEvent('unpin_location', { county, town, village });
      } else {
        next[key] = type;
        trackEvent('pin_location', { county, town, village, type });
      }
      return next;
    });
  };

  const { townFeatures, countyBorders, villageBorders, villageFeatures, loading, error } = useTaiwanTopo(
    '/towns-10t.json',
    (showVillageBorders || showVillageColors) ? '/villages-10t.json' : undefined
  );
  const {
    languageGroups,
    allDialects,
    getDialects,
    getVillageDialects,
    getCountyTownVillageFromProps,
    populationMap
  } = useDialectData();

  const userStats = useUserStats(pinnedLocations);

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
    const rawTerm = searchTerm.trim().toLowerCase();
    if (rawTerm === '') {
      setSearchResults({ places: [], languages: [] });
      return;
    }

    // Normalize term (remove '語' or '族' common suffixes to make search more flexible)
    const term = rawTerm.replace(/[語族]$/, '');

    // 1. Filter Places
    const matchedPlaces = allTownships
      .filter((t: any) => {
        const countyEn = mapTranslations.en[t.county] || "";
        const townEn = mapTranslations.en[t.town] || "";
        return t.county.toLowerCase().includes(term) ||
          t.town.toLowerCase().includes(term) ||
          countyEn.toLowerCase().includes(term) ||
          townEn.toLowerCase().includes(term);
      })
      .slice(0, 5);

    // 2. Filter Languages / Dialects
    const matchedLangsMap = new Map<string, any>();

    // Check Language Groups (e.g., 阿美語)
    Object.keys(languageGroups).forEach(lang => {
      const langEn = mapTranslations.en[lang] || "";
      if (lang.toLowerCase().includes(term) || langEn.toLowerCase().includes(term)) {
        matchedLangsMap.set(lang, { type: 'language', name: lang });
      }
    });

    // Check Dialects (e.g., 馬蘭阿美語)
    // Also match if the parent language name matches the term
    Object.entries(languageGroups).forEach(([lang, dialects]) => {
      const langEn = mapTranslations.en[lang] || "";
      const langMatched = lang.toLowerCase().includes(term) || langEn.toLowerCase().includes(term);

      dialects.forEach(dialect => {
        const dialectEn = mapTranslations.en[dialect] || "";
        const dialectMatched = dialect.toLowerCase().includes(term) || dialectEn.toLowerCase().includes(term);

        if (langMatched || dialectMatched) {
          // Add if not already added as a language group (or if specifically seeking dialects)
          if (!matchedLangsMap.has(dialect)) {
            matchedLangsMap.set(dialect, { type: 'dialect', name: dialect });
          }
        }
      });
    });

    setSearchResults({
      places: matchedPlaces,
      languages: Array.from(matchedLangsMap.values()).slice(0, 20)
    });
  }, [searchTerm, allTownships, languageGroups]);

  const handleSearchSelect = (item: any) => {
    // Add to History
    setSearchHistory(prev => {
      const filtered = prev.filter(h =>
        (h.id && h.id === item.id) || (h.name && h.name === item.name)
      );
      const next = [item, ...prev.filter(h => (h.id !== item.id || !h.id) && (h.name !== item.name || !h.name))].slice(0, 10);
      localStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(next));
      return next;
    });

    if (item.county && item.town) {
      // It's a Place
      const dialects = getDialects(item.county, item.town);
      if (dialects.length) {
        setSelectedDialects((prev) => {
          const next = new Set(prev);
          dialects.forEach((d) => next.add(d));
          return next;
        });
      }
      // Trigger Zoom
      canvasRef.current?.zoomToFeature(item.county, item.town);

      // Simulate Selection after delay
      setTimeout(() => {
        setHoveredTown(item.properties);
        if (isMobile) {
          setTooltipPos({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
        } else {
          setIsDetailPinned(true);
          setShowDetailPanel(false);
        }
        if (dialects.length > 0) setSelectedDetailDialect(dialects[0]);
      }, 1100);

      trackEvent('select_search_place', { county: item.county, town: item.town });
    } else if (item.type === 'language' || item.type === 'dialect') {
      // It's a Language or Dialect - Replace selection for direct filtering
      if (item.type === 'language') {
        const dialects = languageGroups[item.name] || [];
        setSelectedDialects(new Set(dialects));
        if (!expandedGroups.has(item.name)) {
          setExpandedGroups(prev => new Set(prev).add(item.name));
        }
      } else {
        setSelectedDialects(new Set([item.name]));
        const parentGroup = Object.entries(languageGroups).find(([_, dialects]) =>
          dialects.includes(item.name)
        )?.[0];
        if (parentGroup && !expandedGroups.has(parentGroup)) {
          setExpandedGroups(prev => new Set(prev).add(parentGroup));
        }
      }
      trackEvent('select_search_language', { name: item.name, type: item.type });
    }

    setSearchTerm('');
    setSearchResults({ places: [], languages: [] });
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
    trackEvent('toggle_language_group', { languageGroup: lang, allSelected: !allSelected });
  };

  const toggleDialect = (dialect: string) => {
    setSelectedDialects((prev) => {
      const next = new Set(prev);
      if (next.has(dialect)) {
        next.delete(dialect);
        trackEvent('toggle_dialect', { dialect, action: 'remove' });
      } else {
        next.add(dialect);
        trackEvent('toggle_dialect', { dialect, action: 'add' });
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedDialects(new Set(Object.values(languageGroups).flat()));
    trackEvent('select_all');
  };
  const clearAll = () => {
    setSelectedDialects(new Set());
    trackEvent('clear_all');
  };

  const handleExport = async (options?: { hideLegend?: boolean; share?: boolean }) => {
    if (!mapContainerRef.current) return;
    setIsExporting(true);
    trackEvent('export_image', { mode: options?.share ? 'share' : 'download' });
    if (options?.hideLegend) setHideLegendForExport(true);

    // Brief delay to allow React to hide elements and expand legend
    setTimeout(async () => {
      try {
        const dataUrl = await toPng(mapContainerRef.current!, {
          backgroundColor: mapBgColor, // Use mapBgColor for export background
          quality: 0.95,
          pixelRatio: 2,
          filter: (node) => {
            const el = node as HTMLElement;
            if (el.classList?.contains('export-hide')) return false;
            return true;
          }
        });

        if (options?.share && navigator.share) {
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const file = new File([blob], `taiwan-map-${new Date().toISOString().split('T')[0]}.png`, { type: 'image/png' });

          await navigator.share({
            files: [file],
            title: t('title'),
            text: t('shareText')
          });
        } else {
          const link = document.createElement('a');
          link.download = `taiwan-dialects-${new Date().toISOString().split('T')[0]}.png`;
          link.href = dataUrl;
          link.click();
        }
      } catch (err) {
        console.error('Export/Share failed:', err);
        if (!options?.share) alert(t('exportFailed'));
      } finally {
        setIsExporting(false);
        setHideLegendForExport(false);
      }
    }, 500);
  };

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    trackEvent('install_app_click', { outcome });
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: t('title'),
      text: t('shareText'),
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert(t('urlCopied'));
        trackEvent('share_link', { method: 'clipboard' });
      }
      trackEvent('share_link', { method: 'native' });
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

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

  // --- Map Interaction Handlers ---
  const handleHover = (props: any, x: number, y: number) => {
    if (isMobile) return; // Mobile uses onClick for tooltip
    if (!isDetailPinned) {
      setHoveredTown(props);
    }
    setTooltipPos({ x, y });
  };

  const handleLeave = () => {
    if (isMobile) return;
    if (!isDetailPinned) {
      setHoveredTown(null);
      setSelectedDetailDialect(null);
    }
  };

  const handleCloseTooltip = () => {
    setIsDetailPinned(false);
    setHoveredTown(null);
    setSelectedDetailDialect(null);
  };

  const onClickTown = (props: any, x: number, y: number) => {
    if (!props) {
      setIsDetailPinned(false);
      setHoveredTown(null);
      setSelectedDetailDialect(null);
      return;
    }

    const { county, town, village } = getCountyTownVillageFromProps(props);
    const dialectsArray = (showVillageColors && village)
      ? getVillageDialects(county, town, village)
      : getDialects(county, town);

    if (isMobile) {
      // Mobile step 1: tap to show tooltip AND highlight dialects
      // Check if all dialects for this area are currently selected
      const allPresent = dialectsArray.length > 0 && dialectsArray.every(d => selectedDialects.has(d));

      if (allPresent) {
        // REVERT: If already highlighted, remove dialects and hide tooltip
        setSelectedDialects((prev) => {
          const next = new Set(prev);
          dialectsArray.forEach((d) => next.delete(d));
          return next;
        });
        setHoveredTown(null);
        setSelectedDetailDialect(null);
      } else {
        // HIGHLIGHT: If not highlighted, add dialects and show tooltip
        if (dialectsArray.length) {
          setSelectedDialects((prev) => {
            const next = new Set(prev);
            dialectsArray.forEach((x) => next.add(x));
            return next;
          });
        }
        setHoveredTown(props);
        if (x !== undefined && y !== undefined) setTooltipPos({ x, y });
        if (dialectsArray.length > 0) setSelectedDetailDialect(dialectsArray[0]);
      }

      // Important: we no longer set isDetailPinned(true) here
      // It is only triggered via CursorTooltip's onShowMore
      return;
    }

    // Desktop logic: Toggle dialects and Pin immediately
    // Compute allPresent BEFORE the state setter so we can branch on it
    const allPresentDesktop = dialectsArray.length > 0 && dialectsArray.every((x) => selectedDialects.has(x));

    if (dialectsArray.length) {
      setSelectedDialects((prev) => {
        const next = new Set(prev);
        if (allPresentDesktop) dialectsArray.forEach((x) => next.delete(x));
        else dialectsArray.forEach((x) => next.add(x));
        return next;
      });

      if (allPresentDesktop) {
        // 2nd click on same area — toggle off: dismiss tooltip
        setIsDetailPinned(false);
        setShowDetailPanel(false);
        setHoveredTown(null);
        setSelectedDetailDialect(null);
      } else {
        // 1st click — pin the tooltip only, do NOT open the detail panel
        setHoveredTown(props);
        setIsDetailPinned(true);
        setShowDetailPanel(false); // panel stays closed until More Info is clicked
        if (dialectsArray.length > 0) setSelectedDetailDialect(dialectsArray[0]);
      }
    } else {
      // Click outside or neutral area
      setIsDetailPinned(false);
      setShowDetailPanel(false);
      setHoveredTown(null);
      setSelectedDetailDialect(null);
    }

    if (props) {
      const { county, town } = getCountyTownVillageFromProps(props);
      trackEvent('click_area', { county, town, dialects: dialectsArray.join(',') });
    }
  };

  return (
    <div
      ref={mapContainerRef}
      className="relative w-full h-screen bg-stone-200 overflow-hidden font-sans"
    >
      {/* Header */}
      <header className={`absolute top-0 left-0 right-0 z-30 p-4 md:p-6 flex justify-between items-start pointer-events-none transition-opacity duration-300 ${isExporting ? 'opacity-0' : 'opacity-100'}`}>
        <div className="flex flex-col gap-3 pointer-events-auto max-w-[80vw]">
          {/* Title card + desktop action buttons row */}
          <div className="flex items-stretch gap-2">
            <motion.div
              layout
              onClick={() => setIsTitleExpanded(!isTitleExpanded)}
              className={isMobile && !isTitleExpanded ? 'cursor-pointer p-1' : 'bg-white/80 backdrop-blur-md p-3 md:p-4 rounded-2xl shadow-sm border border-stone-200 cursor-pointer hover:bg-white/90 transition-colors overflow-hidden'}
            >
              <div className="flex items-center gap-3">
                <div className={isMobile && !isTitleExpanded ? '' : 'p-2 rounded-xl'}>
                  {/* <MapIcon className={isMobile && !isTitleExpanded ? "w-8 h-8 text-emerald-600 drop-shadow-md" : "w-5 h-5 md:w-6 md:h-6 text-emerald-600"} /> */}
                  <motion.div
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
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
                  </motion.div>
                </div>
                {(!isMobile || isTitleExpanded) && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex flex-col"
                  >
                    <h1 className="text-lg md:text-2xl font-bold text-stone-900 tracking-tight whitespace-nowrap">
                      {t('title')}
                    </h1>
                    <p className="text-stone-500 text-[10px] md:text-sm mt-0.5 whitespace-nowrap tabular-nums">{t('subtitle')}</p>
                  </motion.div>
                )}
              </div>
              {isTitleExpanded && isMobile && (loading || error) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="mt-3 pt-3 border-t border-stone-100"
                >
                  {loading && <p className="text-[10px] text-stone-400">{t('loadingData')}</p>}
                  {error && <p className="text-[10px] text-red-500">{error}</p>}
                </motion.div>
              )}
              {(!isMobile && loading) && <p className="text-xs text-stone-400 mt-2">{t('loadingData')}</p>}
              {(!isMobile && error) && <p className="text-xs text-red-500 mt-2">{error}</p>}
            </motion.div>

            {/* Export + Share — desktop */}
            <div className="hidden md:flex flex-col items-start gap-2">
              <div
                className={`flex items-center h-[42px] bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-stone-200 overflow-hidden transition-all duration-300 ${activeActionMenu === 'export' ? 'bg-white border-stone-300' : ''}`}
                onMouseEnter={() => { if (!activeActionMenu) setActiveActionMenu('export'); }}
                onMouseLeave={() => { if (activeActionMenu === 'export') setActiveActionMenu(null); }}
              >
                <button
                  onClick={() => setActiveActionMenu(activeActionMenu === 'export' ? null : 'export')}
                  disabled={isExporting}
                  className={`h-full w-[42px] flex items-center justify-center transition-colors ${activeActionMenu === 'export' ? 'bg-stone-100' : 'hover:bg-stone-50'}`}
                >
                  {isExporting ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <ImageDown className="w-4 h-4 text-stone-600" />}
                </button>

                <AnimatePresence>
                  {activeActionMenu === 'export' && (
                    <motion.div
                      key="export-desktop-content"
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 'auto', opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      className="flex items-center overflow-hidden"
                    >
                      <span className="text-xs font-bold text-stone-700 uppercase tracking-widest px-3 whitespace-nowrap">
                        {t('exportImage')}
                      </span>
                      <div className="flex items-center gap-1 pr-1.5 border-l border-stone-200 ml-1 py-1">
                        <button
                          onClick={() => handleExport()}
                          className="flex flex-col items-center px-1.5 py-1 hover:bg-stone-100 rounded-xl transition-colors"
                        >
                          <Layout className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-[10px] font-black text-stone-700 uppercase tracking-tighter whitespace-nowrap">{t('exportFull')}</span>
                        </button>
                        <button
                          onClick={() => handleExport({ hideLegend: true })}
                          className="flex flex-col items-center px-1.5 py-1 hover:bg-stone-100 rounded-xl transition-colors"
                        >
                          <MapIcon className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-[10px] font-black text-stone-700 uppercase tracking-tighter whitespace-nowrap">{t('exportNoLegend')}</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div
                className={`flex items-center h-[42px] bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-stone-200 overflow-hidden transition-all duration-300 ${activeActionMenu === 'share' ? 'bg-white border-stone-300' : ''}`}
                onMouseEnter={() => { if (!activeActionMenu) setActiveActionMenu('share'); }}
                onMouseLeave={() => { if (activeActionMenu === 'share') setActiveActionMenu(null); }}
              >
                <button
                  onClick={() => setActiveActionMenu(activeActionMenu === 'share' ? null : 'share')}
                  className={`h-full w-[42px] flex items-center justify-center transition-colors ${activeActionMenu === 'share' ? 'bg-stone-100' : 'hover:bg-stone-50'}`}
                >
                  <Share2 className="w-4 h-4 text-stone-600" />
                </button>

                <AnimatePresence>
                  {activeActionMenu === 'share' && (
                    <motion.div
                      key="share-desktop-content"
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 'auto', opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      className="flex items-center overflow-hidden"
                    >
                      <span className="text-xs font-bold text-stone-700 uppercase tracking-widest px-3 whitespace-nowrap">
                        {t('share')}
                      </span>
                      <div className="flex items-center gap-1 pr-1.5 border-l border-stone-200 ml-1 py-1">
                        <button
                          onClick={() => handleShare()}
                          className="flex flex-col items-center px-1.5 py-1 hover:bg-stone-100 rounded-xl transition-colors"
                        >
                          <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-[10px] font-black text-stone-700 uppercase tracking-tighter whitespace-nowrap">{t('shareURL')}</span>
                        </button>
                        {navigator.share && (
                          <button
                            onClick={() => handleExport({ share: true })}
                            className="flex flex-col items-center px-1.5 py-1 hover:bg-stone-100 rounded-xl transition-colors"
                          >
                            <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-[10px] font-black text-stone-700 uppercase tracking-tighter whitespace-nowrap">{t('sharePic')}</span>
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Settings + Reset Zoom row */}
          <div className="flex items-center gap-2">
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
              showLvl1Names={showLvl1Names}
              setShowLvl1Names={setShowLvl1Names}
              showLvl2Names={showLvl2Names}
              setShowLvl2Names={setShowLvl2Names}
              showLvl3Names={showLvl3Names}
              setShowLvl3Names={setShowLvl3Names}
              showSharedDialects={showSharedDialects}
              setShowSharedDialects={setShowSharedDialects}
              showPins={showPins}
              setShowPins={setShowPins}
              showPinContours={showPinContours}
              setShowPinContours={setShowPinContours}
              showPinGlow={showPinGlow}
              setShowPinGlow={setShowPinGlow}
              showDialectUsageNames={showDialectUsageNames}
              setShowDialectUsageNames={setShowDialectUsageNames}
              language={language}
              setLanguage={setLanguage}
              mapBgColor={mapBgColor}
              setMapBgColor={setMapBgColor}
            />
            <div
              className={`hidden md:flex items-center h-[42px] bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-stone-200 pointer-events-auto overflow-hidden transition-all duration-300 ${isExporting ? 'hidden' : ''}`}
              onMouseEnter={() => { if (!activeActionMenu) setActiveActionMenu('reset'); }}
              onMouseLeave={() => { if (activeActionMenu === 'reset') setActiveActionMenu(null); }}
            >
              <button
                onClick={() => {
                  canvasRef.current?.resetZoom();
                  trackEvent('reset_map_zoom');
                }}
                className={`h-full w-[42px] flex items-center justify-center transition-colors ${activeActionMenu === 'reset' ? 'bg-stone-100' : 'hover:bg-stone-50'} text-stone-600`}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <AnimatePresence>
                {activeActionMenu === 'reset' && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 'auto', opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <span className="text-xs font-bold text-stone-700 uppercase tracking-widest px-3 whitespace-nowrap">
                      {t('resetZoom')}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className={`flex flex-col items-start gap-2 pointer-events-auto ${isExporting ? 'hidden' : ''}`}>
            {/* Mobile Actions */}
            <div className="md:hidden flex flex-col items-start gap-2">
              {/* Capture Button */}
              <div
                className={`flex items-center h-11 bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-stone-200 overflow-hidden transition-all duration-300 ${activeActionMenu === 'export' ? 'bg-stone-50 border-stone-300' : ''}`}
              >
                <button
                  onClick={() => setActiveActionMenu(activeActionMenu === 'export' ? null : 'export')}
                  className={`h-full w-11 flex items-center justify-center transition-colors ${activeActionMenu === 'export' ? 'bg-stone-200' : 'hover:bg-stone-50'}`}
                >
                  <ImageDown className={`w-5 h-5 text-stone-600 transition-transform ${activeActionMenu === 'export' ? 'scale-110' : ''}`} />
                </button>

                <AnimatePresence>
                  {activeActionMenu === 'export' && (
                    <motion.div
                      key="export-content"
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 'auto', opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      className="flex items-center overflow-hidden"
                    >
                      <span className="text-xs font-bold text-stone-700 uppercase tracking-widest px-3 whitespace-nowrap">
                        {t('exportImage')}
                      </span>
                      <div className="flex items-center gap-1 pr-1.5 border-l border-stone-200 ml-1 py-1">
                        <button
                          onClick={() => {
                            handleExport();
                            setActiveActionMenu(null);
                          }}
                          className="flex flex-col items-center px-1.5 py-1 hover:bg-stone-200/50 rounded-xl transition-colors"
                        >
                          <Layout className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-[10px] font-black text-stone-700 uppercase tracking-tighter whitespace-nowrap">{t('exportFull')}</span>
                        </button>
                        <button
                          onClick={() => {
                            handleExport({ hideLegend: true });
                            setActiveActionMenu(null);
                          }}
                          className="flex flex-col items-center px-1.5 py-1 hover:bg-stone-200/50 rounded-xl transition-colors"
                        >
                          <MapIcon className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-[10px] font-black text-stone-700 uppercase tracking-tighter whitespace-nowrap">{t('exportNoLegend')}</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Share Button */}
              <div
                className={`flex items-center h-11 bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-stone-200 overflow-hidden transition-all duration-300 ${activeActionMenu === 'share' ? 'bg-stone-50 border-stone-300' : ''}`}
              >
                <button
                  onClick={() => setActiveActionMenu(activeActionMenu === 'share' ? null : 'share')}
                  className={`h-full w-11 flex items-center justify-center transition-colors ${activeActionMenu === 'share' ? 'bg-stone-200' : 'hover:bg-stone-50'}`}
                >
                  <Share2 className={`w-5 h-5 text-stone-600 transition-transform ${activeActionMenu === 'share' ? 'scale-110' : ''}`} />
                </button>

                <AnimatePresence>
                  {activeActionMenu === 'share' && (
                    <motion.div
                      key="share-content"
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 'auto', opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      className="flex items-center overflow-hidden"
                    >
                      <span className="text-xs font-bold text-stone-700 uppercase tracking-widest px-3 whitespace-nowrap">
                        {t('share')}
                      </span>
                      <div className="flex items-center gap-1 pr-1.5 border-l border-stone-200 ml-1 py-1">
                        <button
                          onClick={() => {
                            handleShare();
                            setActiveActionMenu(null);
                          }}
                          className="flex flex-col items-center px-1.5 py-1 hover:bg-stone-200/50 rounded-xl transition-colors"
                        >
                          <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-[10px] font-black text-stone-700 uppercase tracking-tighter whitespace-nowrap">{t('shareURL')}</span>
                        </button>
                        {navigator.share && (
                          <button
                            onClick={() => {
                              handleExport({ share: true });
                              setActiveActionMenu(null);
                            }}
                            className="flex flex-col items-center px-1.5 py-1 hover:bg-stone-200/50 rounded-xl transition-colors"
                          >
                            <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-[10px] font-black text-stone-700 uppercase tracking-tighter whitespace-nowrap">{t('sharePic')}</span>
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Reset Map Zoom Button */}
              <div
                className="flex items-center h-11 bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-stone-200 overflow-hidden"
              >
                <button
                  onClick={() => {
                    setActiveActionMenu(null);
                    canvasRef.current?.resetZoom();
                    trackEvent('reset_map_zoom');
                  }}
                  className="h-full w-11 flex items-center justify-center hover:bg-stone-50 active:scale-95 transition-all text-stone-600"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>
            </div>

            {deferredPrompt && (
              <button
                onClick={handleInstallApp}
                title={t('installApp')}
                className="p-3 bg-orange-50/80 backdrop-blur-md rounded-2xl shadow-sm border border-orange-200 hover:bg-orange-100/90 active:scale-95 transition-all flex items-center gap-2 text-orange-700 font-bold text-sm w-fit animate-pulse"
              >
                <Smartphone className="w-4 h-4" />
                <span className="hidden md:inline">{t('installApp')}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Map */}
      <TaiwanMapCanvas
        ref={canvasRef}
        townFeatures={townFeatures}
        countyBorders={countyBorders}
        villageBorders={villageBorders}
        villageFeatures={villageFeatures}
        mapBgColor={mapBgColor}
        showCountyBorders={showCountyBorders}
        showTownshipContours={showTownshipContours}
        showVillageBorders={showVillageBorders}
        showVillageColors={showVillageColors}
        showSharedDialects={showSharedDialects}
        pinnedLocations={pinnedLocations}
        showPins={showPins}
        showPinContours={showPinContours}
        showPinGlow={showPinGlow}
        selectedDialects={selectedDialects}
        getDialects={getDialects}
        getVillageDialects={getVillageDialects}
        getCountyTownVillageFromProps={getCountyTownVillageFromProps}
        onHover={handleHover}
        onLeave={handleLeave}
        onClickTown={onClickTown}
        onClickBackground={() => {
          setSelectedDetailDialect(null);
          setHoveredTown(null);
          setIsDetailPinned(false);
          setShowDetailPanel(false);
        }}
        showLvl1Names={showLvl1Names}
        showLvl2Names={showLvl2Names}
        showLvl3Names={showLvl3Names}
        language={language}
        hoveredTown={hoveredTown}
      />

      <DialectFilterPanel
        isMobile={isMobile}
        isOpen={isFilterOpen && !isExporting}
        setIsOpen={setIsFilterOpen}
        language={language}
        userStats={userStats}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        searchHistory={searchHistory}
        searchResults={searchResults}
        onSelectSearchItem={handleSearchSelect}
        expandedGroups={expandedGroups}
        setExpandedGroups={setExpandedGroups}
        selectedDialects={selectedDialects}
        languageGroups={languageGroups}
        populationMap={populationMap}
        onToggleDialect={toggleDialect}
        onToggleLanguage={toggleLanguage}
        onSelectAll={selectAll}
        onClearAll={clearAll}
        getDialectColor={getDialectColor}
        showUsageNames={showDialectUsageNames}
      />

      <CursorTooltip
        hoveredTown={hoveredTown}
        showFixedInfo={showFixedInfo || showDetailPanel}
        tooltipPos={tooltipPos}
        hoveredLabel={hoveredLabel}
        hoveredDialects={hoveredDialects}
        getDialectColor={getDialectColor}
        populationMap={populationMap}
        pinnedLocations={pinnedLocations}
        onTogglePin={handleTogglePin}
        onShowMore={() => setShowDetailPanel(true)}
        onClose={handleCloseTooltip}
        onMouseEnter={() => {
          (window as any).isHoveringTooltip_ycm = true;
          const win = window as any;
          if (win.hoverTimeout_ycm) clearTimeout(win.hoverTimeout_ycm);
        }}
        onMouseLeave={() => {
          (window as any).isHoveringTooltip_ycm = false;
          handleLeave();
        }}
        language={language}
        showUsageNames={showDialectUsageNames}
      />

      {!isMobile && (
        <div
          className={`fixed top-4 right-[78px] z-40 transition-all duration-300 ${isFilterOpen ? 'mr-80' : 'mr-0'} ${isExporting ? 'hidden' : ''}`}
        >
          <ExplorationProgressPanel
            userStats={userStats}
            language={language}
          />
        </div>
      )}

      <div
        className={`fixed top-6 right-6 z-40 pointer-events-none transition-all duration-300 ${isFilterOpen ? 'mr-80' : 'mr-0'} ${isExporting ? 'hidden' : ''}`}
      >
        <FixedInfoPanel
          isOpen={(showFixedInfo || showDetailPanel) && hoveredTown !== null}
          hoveredLabel={hoveredLabel}
          hoveredDialects={hoveredDialects}
          getDialectColor={getDialectColor}
          populationMap={populationMap}
          pinnedLocations={pinnedLocations}
          onTogglePin={handleTogglePin}
          selectedDialect={selectedDetailDialect}
          onSelectDialect={setSelectedDetailDialect}
          onClose={() => {
            setShowDetailPanel(false);
            setIsDetailPinned(false);
            setHoveredTown(null);
            setSelectedDetailDialect(null);
          }}
          language={language}
          showUsageNames={showDialectUsageNames}
        />
      </div>

      {!(isExporting && hideLegendForExport) && (
        <div className="absolute bottom-8 left-6 z-10 pointer-events-none flex flex-col gap-4">
          <MapLegend
            isMobile={isMobile}
            alwaysExpanded={isExporting}
            selectedDialects={selectedDialects}
            languageGroups={languageGroups}
            getDialectColor={getDialectColor}
            language={language}
            showUsageNames={showDialectUsageNames}
          />
        </div>
      )}
    </div>
  );
};

export default TaiwanMap;