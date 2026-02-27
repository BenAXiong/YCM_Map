import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { motion, AnimatePresence } from 'motion/react';
import { Filter, Info, Map as MapIcon, ChevronRight, ChevronDown, Check, X, Search, Settings } from 'lucide-react';
import languagesData from '../data/languages.json';

interface LanguageDistribution {
  族語: string;
  方言別: string;
  分佈: {
    縣: string;
    鄉鎮市: string;
    村里: string[];
  }[];
}

const TaiwanMap: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const [geoData, setGeoData] = useState<any>(null);
  const [hoveredTown, setHoveredTown] = useState<any>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [selectedDialects, setSelectedDialects] = useState<Set<string>>(new Set());
  const [isFilterOpen, setIsFilterOpen] = useState(window.innerWidth > 768);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showCountyBorders, setShowCountyBorders] = useState(true);
  const [countyBorders, setCountyBorders] = useState<any>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showFixedInfo, setShowFixedInfo] = useState(false);
  const [showTownshipContours, setShowTownshipContours] = useState(false);
  const contourRef = useRef(false);

  useEffect(() => {
    d3.select('.county-border').attr('display', showCountyBorders ? 'block' : 'none');
  }, [showCountyBorders]);

  useEffect(() => {
    contourRef.current = showTownshipContours;
    const strokeColor = showTownshipContours ? '#cbd5e1' : '#ffffff';
    const strokeWidth = showTownshipContours ? 0.5 : 0.3;
    d3.selectAll('.township').each(function () {
      const selection = d3.select(this);
      if (selection.attr('stroke') !== '#000000') {
        selection.attr('stroke', strokeColor).attr('stroke-width', strokeWidth);
      }
    });
  }, [showTownshipContours]);

  // List of all townships for search
  const allTownships = useMemo(() => {
    if (!geoData) return [];
    return (geoData as any).features.map((f: any) => ({
      id: f.properties.TOWNID || f.properties.townId || f.properties.T_Code || Math.random().toString(),
      county: f.properties.COUNTYNAME || f.properties.countyName || f.properties.C_Name || '',
      town: f.properties.TOWNNAME || f.properties.townName || f.properties.T_Name || '',
      properties: f.properties
    }));
  }, [geoData]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setSearchResults([]);
      return;
    }
    const filtered = allTownships.filter((t: any) =>
      t.county.includes(searchTerm) || t.town.includes(searchTerm)
    ).slice(0, 10);
    setSearchResults(filtered);
  }, [searchTerm, allTownships]);

  const handleTownshipSelect = (township: any) => {
    const county = township.county;
    const town = township.town;
    const key = `${county}${town}`;
    const dialects = townToLanguages[key];

    if (dialects) {
      setSelectedDialects((prev: Set<string>) => {
        const next = new Set(prev);
        const dialectsArray = Array.from(dialects);
        dialectsArray.forEach(dialect => next.add(dialect));
        return next;
      });
    }
    setSearchTerm('');
    setSearchResults([]);
  };

  // Group languages and dialects
  const languageGroups = useMemo<Record<string, string[]>>(() => {
    const groups: Record<string, string[]> = {};
    (languagesData as LanguageDistribution[]).forEach((item) => {
      if (!groups[item.族語]) {
        groups[item.族語] = [];
      }
      groups[item.族語].push(item.方言別);
    });
    return groups;
  }, []);

  // Map township to languages
  const townToLanguages = useMemo<Record<string, Set<string>>>(() => {
    const map: Record<string, Set<string>> = {};
    (languagesData as LanguageDistribution[]).forEach((item) => {
      item.分佈.forEach((dist) => {
        const county = dist.縣.trim();
        const town = dist.鄉鎮市.trim();
        const key = `${county}${town}`;
        if (!map[key]) {
          map[key] = new Set<string>();
        }
        map[key].add(item.方言別);
      });
    });
    return map;
  }, []);

  useEffect(() => {
    const url = 'https://cdn.jsdelivr.net/npm/taiwan-atlas/towns-10t.json';
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then((data) => {
        const objectName = Object.keys(data.objects)[0];
        const features = topojson.feature(data, data.objects[objectName] as any);
        setGeoData(features);

        // Generate county borders mesh
        const mesh = topojson.mesh(data, data.objects[objectName] as any, (a: any, b: any) => {
          const aCounty = a.properties.COUNTYNAME || a.properties.countyName || a.properties.C_Name;
          const bCounty = b.properties.COUNTYNAME || b.properties.countyName || b.properties.C_Name;
          return aCounty !== bCounty;
        });
        setCountyBorders(mesh);
      })
      .catch((err) => {
        console.error('Error loading TopoJSON:', err);
        fetch('https://raw.githubusercontent.com/g0v/tw-stats/master/data/township.topo.json')
          .then(res => res.json())
          .then(data => {
            const objectName = Object.keys(data.objects)[0];
            const features = topojson.feature(data, data.objects[objectName] as any);
            setGeoData(features);

            const mesh = topojson.mesh(data, data.objects[objectName] as any, (a: any, b: any) => {
              const aCounty = a.properties.COUNTYNAME || a.properties.countyName || a.properties.C_Name;
              const bCounty = b.properties.COUNTYNAME || b.properties.countyName || b.properties.C_Name;
              return aCounty !== bCounty;
            });
            setCountyBorders(mesh);
          })
          .catch(e => console.error('Fallback failed:', e));
      });
  }, []);

  // Initial Map Render
  useEffect(() => {
    if (!geoData || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    const isMobile = width < 768;

    svg.selectAll('*').remove();

    const projection = d3.geoMercator()
      .center([120.9, 23.7]) // Slightly adjusted center for Taiwan
      .scale(isMobile ? width * 10 : width * 12)
      .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    // Create separate groups for townships and borders to prevent overlap issues
    const gTownships = svg.append('g').attr('class', 'townships-group');
    const gBorders = svg.append('g').attr('class', 'borders-group');

    (gRef as any).current = gTownships.node();

    // Draw townships
    gTownships.selectAll('path')
      .data((geoData as any).features)
      .enter()
      .append('path')
      .attr('d', path as any)
      .attr('class', 'township')
      .attr('fill', '#f3f4f6')
      .attr('stroke', contourRef.current ? '#cbd5e1' : '#ffffff')
      .attr('stroke-width', contourRef.current ? 0.5 : 0.3)
      .style('cursor', 'pointer')
      .on('mouseenter', (event, d: any) => {
        setHoveredTown(d.properties);
        setTooltipPos({ x: event.clientX, y: event.clientY });
        d3.select(event.currentTarget)
          .attr('stroke', '#000000')
          .attr('stroke-width', 1)
          .raise();
      })
      .on('mousemove', (event) => {
        setTooltipPos({ x: event.clientX, y: event.clientY });
      })
      .on('mouseleave', (event) => {
        setHoveredTown(null);
        const contour = contourRef.current;
        d3.selectAll('.township')
          .attr('stroke', contour ? '#cbd5e1' : '#ffffff')
          .attr('stroke-width', contour ? 0.5 : 0.3);
      })
      .on('click', (event, d: any) => {
        const county = d.properties.COUNTYNAME || d.properties.countyName || d.properties.C_Name || '';
        const town = d.properties.TOWNNAME || d.properties.townName || d.properties.T_Name || '';
        const key = `${county}${town}`;
        const dialects = townToLanguages[key];

        if (!dialects) return;

        setSelectedDialects((prev: Set<string>) => {
          const next = new Set(prev);
          const dialectsArray = Array.from(dialects);
          const allPresent = dialectsArray.every(dialect => prev.has(dialect));

          if (allPresent) {
            dialectsArray.forEach(dialect => next.delete(dialect));
          } else {
            dialectsArray.forEach(dialect => next.add(dialect));
          }
          return next;
        });
      });

    // Add zoom
    const zoom = d3.zoom()
      .scaleExtent([1, 20])
      .on('zoom', (event) => {
        gTownships.attr('transform', event.transform);
        gBorders.attr('transform', event.transform);
      });

    svg.call(zoom as any);

    // Draw county borders - always in the top group
    if (countyBorders) {
      gBorders.append('path')
        .datum(countyBorders)
        .attr('d', path as any)
        .attr('class', 'county-border')
        .attr('fill', 'none')
        .attr('stroke', '#94a3b8') // Slate 400
        .attr('stroke-width', 0.8)
        .attr('pointer-events', 'none')
        .attr('display', showCountyBorders ? 'block' : 'none');
    }

    // Initial color update
    updateColors();

  }, [geoData, countyBorders]);

  // Update colors when selectedDialects changes
  const updateColors = () => {
    if (!gRef.current) return;

    d3.select(gRef.current)
      .selectAll('.township')
      .transition()
      .duration(200)
      .attr('fill', (d: any) => {
        const county = d.properties.COUNTYNAME || d.properties.countyName || d.properties.C_Name || '';
        const town = d.properties.TOWNNAME || d.properties.townName || d.properties.T_Name || '';
        const key = `${county}${town}`;
        const dialects = townToLanguages[key];

        if (!dialects) return '#f3f4f6';

        const dialectsArray = Array.from(dialects);
        const selectedInTown = dialectsArray.filter(d => selectedDialects.has(d));

        if (selectedInTown.length > 0) {
          return getDialectColor(selectedInTown[0] as string);
        }

        return '#f3f4f6';
      });
  };

  useEffect(() => {
    updateColors();
  }, [selectedDialects, townToLanguages]);

  const getDialectColor = (dialect: string) => {
    const colors = [
      '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
      '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
    ];
    // Simple hash for color
    let hash = 0;
    for (let i = 0; i < dialect.length; i++) {
      hash = dialect.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const toggleLanguage = (lang: string) => {
    const newSelectedDialects = new Set(selectedDialects);
    const dialects = languageGroups[lang];

    const allSelected = dialects.every(d => selectedDialects.has(d));

    if (allSelected) {
      dialects.forEach(d => newSelectedDialects.delete(d));
    } else {
      dialects.forEach(d => newSelectedDialects.add(d));
    }

    setSelectedDialects(newSelectedDialects);
  };

  const toggleDialect = (dialect: string) => {
    const newSelectedDialects = new Set(selectedDialects);
    if (newSelectedDialects.has(dialect)) {
      newSelectedDialects.delete(dialect);
    } else {
      newSelectedDialects.add(dialect);
    }
    setSelectedDialects(newSelectedDialects);
  };

  const toggleGroup = (lang: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(lang)) {
      newExpanded.delete(lang);
    } else {
      newExpanded.add(lang);
    }
    setExpandedGroups(newExpanded);
  };

  const selectAll = () => {
    const allDialects = new Set<string>();
    Object.values(languageGroups).forEach((dialects: string[]) => {
      dialects.forEach(d => allDialects.add(d));
    });
    setSelectedDialects(allDialects);
  };

  const clearAll = () => {
    setSelectedDialects(new Set());
  };

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
          </div>

          <div
            className="relative self-start"
            onMouseEnter={() => setIsSettingsOpen(true)}
            onMouseLeave={() => setIsSettingsOpen(false)}
          >
            <button
              className="p-3 bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-stone-200 hover:bg-stone-50 transition-all text-stone-600 flex items-center gap-2"
            >
              <Settings className={`w-5 h-5 ${isSettingsOpen ? 'rotate-90' : ''} transition-transform duration-300`} />
              <span className="text-xs font-bold uppercase tracking-wider">地圖設定</span>
            </button>

            <AnimatePresence>
              {isSettingsOpen && (
                <motion.div
                  initial={{ opacity: 0, x: -10, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -10, scale: 0.95 }}
                  className="absolute top-0 left-full ml-3 w-48 bg-white rounded-2xl shadow-xl border border-stone-200 p-4 z-40"
                >
                  <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">地圖設定</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-stone-700 font-medium">顯示縣市邊界</span>
                      <button
                        onClick={() => setShowCountyBorders(!showCountyBorders)}
                        className={`w-10 h-5 rounded-full transition-colors relative ${showCountyBorders ? 'bg-emerald-500' : 'bg-stone-300'}`}
                      >
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${showCountyBorders ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-stone-700 font-medium">固定資訊面板</span>
                      <button
                        onClick={() => setShowFixedInfo(!showFixedInfo)}
                        className={`w-10 h-5 rounded-full transition-colors relative ${showFixedInfo ? 'bg-emerald-500' : 'bg-stone-300'}`}
                      >
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${showFixedInfo ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-stone-700 font-medium">顯示鄉鎮邊界</span>
                      <button
                        onClick={() => setShowTownshipContours(!showTownshipContours)}
                        className={`w-10 h-5 rounded-full transition-colors relative ${showTownshipContours ? 'bg-emerald-500' : 'bg-stone-300'}`}
                      >
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${showTownshipContours ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Map Container */}
      <svg ref={svgRef} className="w-full h-full" />

      {/* Filters Sidebar */}
      <AnimatePresence>
        {isFilterOpen && (
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="absolute top-0 right-0 h-full w-80 bg-white/90 backdrop-blur-xl border-l border-stone-200 shadow-2xl z-20 overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  語言篩選
                </h2>
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="p-2 hover:bg-stone-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative mb-6">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Search className="w-4 h-4 text-stone-400" />
                </div>
                <input
                  type="text"
                  placeholder="搜尋鄉鎮市..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-stone-100 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                />
                <AnimatePresence>
                  {searchResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-stone-200 z-30 overflow-hidden"
                    >
                      {searchResults.map((result: any) => (
                        <button
                          key={result.id}
                          onClick={() => handleTownshipSelect(result)}
                          className="w-full text-left px-4 py-3 hover:bg-stone-50 transition-colors border-b border-stone-100 last:border-0 flex flex-col"
                        >
                          <span className="text-sm font-bold text-stone-900">{result.town}</span>
                          <span className="text-xs text-stone-500">{result.county}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex gap-2 mb-6">
                <button
                  onClick={selectAll}
                  className="flex-1 py-2 px-3 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  全選
                </button>
                <button
                  onClick={clearAll}
                  className="flex-1 py-2 px-3 bg-stone-200 text-stone-700 text-xs font-bold rounded-lg hover:bg-stone-300 transition-colors shadow-sm"
                >
                  清除
                </button>
              </div>

              <div className="space-y-2">
                {Object.entries(languageGroups).map(([lang, dialects]) => {
                  const dialectsArray = dialects as string[];
                  const allSelected = dialectsArray.every(d => selectedDialects.has(d));

                  return (
                    <div key={lang} className="border border-stone-100 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between p-3 bg-stone-50/50 hover:bg-stone-100 transition-colors cursor-pointer" onClick={() => toggleGroup(lang)}>
                        <div className="flex items-center gap-3 flex-1">
                          <div
                            className="w-5 h-5 rounded border flex items-center justify-center transition-colors"
                            style={{
                              backgroundColor: allSelected ? '#10b981' : 'transparent',
                              borderColor: allSelected ? '#10b981' : '#d1d5db'
                            }}
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              toggleLanguage(lang);
                            }}
                          >
                            {allSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <span className="font-medium text-stone-800">{lang}</span>
                        </div>
                        {expandedGroups.has(lang) ? <ChevronDown className="w-4 h-4 text-stone-400" /> : <ChevronRight className="w-4 h-4 text-stone-400" />}
                      </div>

                      {expandedGroups.has(lang) && (
                        <div className="p-2 bg-white space-y-1">
                          {dialectsArray.map(dialect => (
                            <div
                              key={dialect}
                              className="flex items-center gap-3 p-2 hover:bg-stone-50 rounded-lg cursor-pointer transition-colors"
                              onClick={() => toggleDialect(dialect)}
                            >
                              <div
                                className="w-4 h-4 rounded border flex items-center justify-center transition-colors"
                                style={{
                                  backgroundColor: selectedDialects.has(dialect) ? getDialectColor(dialect) : 'transparent',
                                  borderColor: selectedDialects.has(dialect) ? getDialectColor(dialect) : '#d1d5db'
                                }}
                              >
                                {selectedDialects.has(dialect) && <Check className="w-2 h-2 text-white" />}
                              </div>
                              <span className="text-sm text-stone-600">{dialect}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isFilterOpen && (
        <button
          onClick={() => setIsFilterOpen(true)}
          className="absolute top-6 right-6 z-20 p-4 bg-white rounded-2xl shadow-lg border border-stone-200 hover:bg-stone-50 transition-all flex items-center gap-2 font-medium"
        >
          <Filter className="w-5 h-5 text-emerald-600" />
          顯示篩選
        </button>
      )}

      {/* Tooltip (Floating) */}
      <AnimatePresence>
        {hoveredTown && !showFixedInfo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{
              left: tooltipPos.x + 20,
              top: tooltipPos.y + 20,
              position: 'fixed'
            }}
            className="z-50 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-stone-200 min-w-[200px]"
          >
            <h3 className="text-xl font-bold text-stone-900">
              {hoveredTown.COUNTYNAME || hoveredTown.countyName || hoveredTown.C_Name || ''} {hoveredTown.TOWNNAME || hoveredTown.townName || hoveredTown.T_Name || ''}
            </h3>
            <div className="mt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">估計人口</span>
                <span className="font-mono font-medium">---</span>
              </div>
              <div className="border-t border-stone-100 pt-2">
                <span className="text-xs font-semibold text-stone-400 block mb-1">分佈族語</span>
                <div className="flex flex-wrap gap-1">
                  {(() => {
                    const county = hoveredTown.COUNTYNAME || hoveredTown.countyName || hoveredTown.C_Name || '';
                    const town = hoveredTown.TOWNNAME || hoveredTown.townName || hoveredTown.T_Name || '';
                    const key = `${county}${town}`;
                    const dialects = townToLanguages[key];
                    return dialects ? (
                      Array.from<string>(dialects).map((d: string) => (
                        <span
                          key={d}
                          className="px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
                          style={{ backgroundColor: getDialectColor(d) }}
                        >
                          {d}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-stone-400 italic">無特定族語分佈數據</span>
                    );
                  })()}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fixed Info Panel (Replaces Legend) */}
      <AnimatePresence>
        {showFixedInfo && hoveredTown && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-6 left-6 z-10 bg-white/95 backdrop-blur-md p-5 rounded-2xl shadow-xl border border-stone-200 w-72"
          >
            <h3 className="text-xl font-bold text-stone-900">
              {hoveredTown.COUNTYNAME || hoveredTown.countyName || hoveredTown.C_Name || ''} {hoveredTown.TOWNNAME || hoveredTown.townName || hoveredTown.T_Name || ''}
            </h3>
            <div className="mt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">估計人口</span>
                <span className="font-mono font-medium">---</span>
              </div>
              <div className="border-t border-stone-100 pt-2">
                <span className="text-xs font-semibold text-stone-400 block mb-1">分佈族語</span>
                <div className="flex flex-wrap gap-1">
                  {(() => {
                    const county = hoveredTown.COUNTYNAME || hoveredTown.countyName || hoveredTown.C_Name || '';
                    const town = hoveredTown.TOWNNAME || hoveredTown.townName || hoveredTown.T_Name || '';
                    const key = `${county}${town}`;
                    const dialects = townToLanguages[key];
                    return dialects ? (
                      Array.from<string>(dialects).map((d: string) => (
                        <span
                          key={d}
                          className="px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
                          style={{ backgroundColor: getDialectColor(d) }}
                        >
                          {d}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-stone-400 italic">無特定族語分佈數據</span>
                    );
                  })()}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TaiwanMap;
