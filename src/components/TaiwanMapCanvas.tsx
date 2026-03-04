import React, { useEffect, useImperativeHandle, useRef } from 'react';
import * as d3 from 'd3';
import { getDialectColor } from './dialectColors';

export interface TaiwanMapCanvasHandle {
    resetZoom: () => void;
    zoomToFeature: (county: string, town: string) => void;
}

type Props = {
    townFeatures: any | null;
    countyBorders: any | null;
    villageBorders: any | null;
    villageFeatures: any | null;

    // Settings
    showCountyBorders: boolean;
    showTownshipContours: boolean;
    showVillageBorders: boolean;
    showVillageColors: boolean;
    showSharedDialects: boolean;
    pinnedLocations: PinnedMap;
    showPins: boolean;
    showPinContours: boolean;
    showPinGlow: boolean;

    // Selection coloring
    selectedDialects: Set<string>;
    getDialects: (county: string, town: string) => string[];
    getVillageDialects: (county: string, town: string, village: string) => string[];
    getCountyTownVillageFromProps: (p: any) => { county: string; town: string; village: string };

    // Interaction callbacks
    onHover: (props: any, clientX: number, clientY: number) => void;
    onLeave: () => void;
    onClickTown: (props: any, clientX?: number, clientY?: number) => void;
    onClickBackground?: () => void;

    // Area Names
    showLvl1Names: boolean;
    showLvl2Names: boolean;
    showLvl3Names: boolean;
    language: 'zh' | 'en';
    mapBgColor: string;
};
import { useTranslation } from '../hooks/useTranslation';
import type { PinnedMap } from './types';

const PIN_COLORS = {
    went: '#10b981',
    loved: '#f59e0b',
    wanna_go: '#ef4444',
};

// Moved helper outside to avoid any closure/initialization issues
const generateAreaFill = (
    dialectsArray: string[],
    selectedDialects: Set<string>,
    showShared: boolean,
    gDefsRef: React.MutableRefObject<SVGDefsElement | null>
) => {
    if (!dialectsArray.length) return '#f5f5f4';

    const selectedHere = dialectsArray.filter((x) => selectedDialects.has(x));
    if (selectedHere.length === 0) return '#ffffff';

    if (!showShared || selectedHere.length === 1) {
        return getDialectColor(selectedHere[0]);
    }

    const sorted = [...selectedHere].sort();
    const gradId = `grad-${sorted.join('-').replace(/\s+/g, '')}`;

    if (gDefsRef.current && !document.getElementById(gradId)) {
        const grad = d3.select(gDefsRef.current)
            .append('linearGradient')
            .attr('id', gradId)
            .attr('x1', '0%')
            .attr('y1', '0%')
            .attr('x2', '100%')
            .attr('y2', '0%');

        const step = 100 / sorted.length;
        sorted.forEach((d, i) => {
            const color = getDialectColor(d);
            grad.append('stop')
                .attr('offset', `${i * step}%`)
                .attr('stop-color', color);
            grad.append('stop')
                .attr('offset', `${(i + 1) * step}%`)
                .attr('stop-color', color);
        });
    }

    return `url(#${gradId})`;
};

const TaiwanMapCanvas = React.forwardRef<TaiwanMapCanvasHandle, Props>(
    (
        {
            townFeatures,
            countyBorders,
            villageBorders,
            villageFeatures,
            showCountyBorders,
            showTownshipContours,
            showVillageBorders,
            showVillageColors,
            showSharedDialects,
            pinnedLocations,
            showPins,
            showPinContours,
            showPinGlow,
            selectedDialects,
            getDialects,
            getVillageDialects,
            getCountyTownVillageFromProps,
            onHover,
            onLeave,
            onClickTown,
            onClickBackground,
            showLvl1Names,
            showLvl2Names,
            showLvl3Names,
            language,
            mapBgColor,
        },
        ref
    ) => {
        const { mt } = useTranslation(language);
        const svgRef = useRef<SVGSVGElement>(null);
        const gTownshipsRef = useRef<SVGGElement | null>(null);
        const gBordersRef = useRef<SVGGElement | null>(null);
        const gVillagesRef = useRef<SVGGElement | null>(null);
        const gVillagePolygonsRef = useRef<SVGGElement | null>(null);
        const gLabelsRef = useRef<SVGGElement | null>(null);
        const gDefsRef = useRef<SVGDefsElement | null>(null);
        const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
        // Incremented by the main draw effect so fill/label effects re-run after SVG is ready
        const [mapVersion, setMapVersion] = React.useState(0);

        // Expose resetZoom to parent via ref
        useImperativeHandle(ref, () => ({
            resetZoom: () => {
                if (svgRef.current && zoomRef.current) {
                    d3.select(svgRef.current)
                        .transition()
                        .duration(500)
                        .call(zoomRef.current.transform as any, d3.zoomIdentity);
                }
            },
            zoomToFeature: (county: string, town: string) => {
                if (!svgRef.current || !zoomRef.current || !townFeatures) return;

                const feature = townFeatures.features.find((f: any) => {
                    const p = f.properties;
                    const { county: c, town: t } = getCountyTownVillageFromProps(p);
                    return norm(c) === norm(county) && norm(t) === norm(town);
                });

                if (feature) {
                    const svg = d3.select(svgRef.current);
                    const width = svgRef.current.clientWidth || window.innerWidth;
                    const height = svgRef.current.clientHeight || window.innerHeight;

                    const projection = d3.geoMercator()
                        .center([120.9, 23.65])
                        .scale(height * 11)
                        .translate([width / 2, height / 2]);
                    const path = d3.geoPath().projection(projection);

                    const [[x0, y0], [x1, y1]] = path.bounds(feature);
                    const dx = x1 - x0;
                    const dy = y1 - y0;
                    const x = (x0 + x1) / 2;
                    const y = (y0 + y1) / 2;
                    const scale = Math.max(1, Math.min(20, 0.4 / Math.max(dx / width, dy / height))); // 0.4 for some padding
                    const translate = [width / 2 - scale * x, height / 2 - scale * y];

                    svg.transition()
                        .duration(1000)
                        .call(
                            zoomRef.current.transform as any,
                            d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
                        );
                }
            }
        }));

        // Keep stable refs for all volatile props so D3 handlers never go stale
        const stateRef = useRef({
            showCountyBorders,
            selectedDialects,
            getDialects,
            getVillageDialects,
            getCountyTownVillageFromProps,
            onHover,
            onLeave,
            onClickTown,
            showSharedDialects,
            showTownshipContours,
            showPinContours,
            showPinGlow,
            pinnedLocations
        });

        useEffect(() => {
            stateRef.current = {
                showCountyBorders,
                selectedDialects,
                getDialects,
                getVillageDialects,
                getCountyTownVillageFromProps,
                onHover,
                onLeave,
                onClickTown,
                showSharedDialects,
                showTownshipContours,
                showPinContours,
                showPinGlow,
                pinnedLocations
            };
        }, [showCountyBorders, selectedDialects, getDialects, getVillageDialects, getCountyTownVillageFromProps, onHover, onLeave, onClickTown, showSharedDialects, showTownshipContours, showPinContours, showPinGlow, pinnedLocations]);

        const norm = (s: string) => (s ?? '').trim().replace('台', '臺');

        // 1. Update fills & strokes when selection or mode changes
        useEffect(() => {
            const {
                getDialects,
                getVillageDialects,
                getCountyTownVillageFromProps,
                selectedDialects,
                showSharedDialects,
                pinnedLocations,
                showPinContours,
                showPinGlow
            } = stateRef.current;

            // Update Townships
            if (gTownshipsRef.current) {
                const scColor = showTownshipContours ? '#cbd5e1' : '#ffffff';
                const swWidth = showTownshipContours ? 0.5 : 0.2; // Thin white stroke to seal gaps

                d3.select(gTownshipsRef.current)
                    .selectAll<SVGPathElement, any>('.township')
                    .attr('stroke', scColor)
                    .attr('stroke-width', swWidth)
                    .attr('fill', (d: any) => {
                        if (showVillageColors) return 'transparent';
                        const p = d.properties || {};
                        const { county, town } = getCountyTownVillageFromProps(p);
                        const dialectsArray = getDialects(county, town);
                        return generateAreaFill(dialectsArray, selectedDialects, showSharedDialects, gDefsRef);
                    })
                    .attr('pointer-events', showVillageColors ? 'none' : 'auto');
            }

            // Update Village Polygons
            if (gVillagePolygonsRef.current) {
                d3.select(gVillagePolygonsRef.current)
                    .attr('display', showVillageColors ? 'block' : 'none')
                    .selectAll<SVGPathElement, any>('.village-poly')
                    .attr('fill', (d: any) => {
                        const p = d.properties || {};
                        const { county, town, village } = getCountyTownVillageFromProps(p);
                        const dialectsArray = getVillageDialects(county, town, village);
                        if (!dialectsArray.length) return showVillageColors ? '#f5f5f4' : 'transparent';
                        const fill = generateAreaFill(dialectsArray, selectedDialects, showSharedDialects, gDefsRef);
                        return (fill === '#ffffff' && !showVillageColors) ? 'transparent' : fill;
                    })
                    .attr('stroke', (d: any) => {
                        if (!showPinContours) return 'none';
                        const { county, town, village } = getCountyTownVillageFromProps(d.properties);
                        const pin = pinnedLocations[`${county}|${town}|${village || ''}`];
                        return pin ? PIN_COLORS[pin] : 'none';
                    })
                    .attr('stroke-width', (d: any) => {
                        if (!showPinContours) return 0;
                        const { county, town, village } = getCountyTownVillageFromProps(d.properties);
                        return pinnedLocations[`${county}|${town}|${village || ''}`] ? 1.5 : 0;
                    })
                    .attr('filter', (d: any) => {
                        if (!showPinGlow) return 'none';
                        const { county, town, village } = getCountyTownVillageFromProps(d.properties);
                        const pin = pinnedLocations[`${county}|${town}|${village || ''}`];
                        if (!pin) return 'none';
                        const filterId = `glow-${pin}`;
                        if (gDefsRef.current && !document.getElementById(filterId)) {
                            const color = PIN_COLORS[pin];
                            const filt = d3.select(gDefsRef.current).append('filter').attr('id', filterId).attr('x', '-50%').attr('y', '-100%').attr('width', '200%').attr('height', '200%');
                            filt.append('feFlood').attr('flood-color', color).attr('flood-opacity', 0.8).attr('result', 'flood');
                            filt.append('feComposite').attr('in', 'flood').attr('in2', 'SourceAlpha').attr('operator', 'in').attr('result', 'mask');
                            filt.append('feGaussianBlur').attr('in', 'mask').attr('stdDeviation', 2).attr('result', 'blur');
                            filt.append('feOffset').attr('in', 'blur').attr('dy', -3).attr('result', 'offsetBlur');
                            const merge = filt.append('feMerge');
                            merge.append('feMergeNode').attr('in', 'offsetBlur');
                            merge.append('feMergeNode').attr('in', 'SourceGraphic');
                        }
                        return `url(#${filterId})`;
                    })
                    .attr('pointer-events', showVillageColors ? 'auto' : 'none');
            }
        }, [
            selectedDialects,
            showSharedDialects,
            showVillageColors,
            getDialects,
            getVillageDialects,
            getCountyTownVillageFromProps,
            pinnedLocations,
            showPinContours,
            showPinGlow,
            showTownshipContours,
            mapVersion
        ]);

        // 2. Toggle Layers Visibility
        useEffect(() => {
            if (gBordersRef.current) {
                d3.select(gBordersRef.current)
                    .selectAll('.county-border')
                    .attr('display', showCountyBorders ? 'block' : 'none');
            }
            if (gVillagesRef.current) {
                d3.select(gVillagesRef.current)
                    .selectAll('.village-border')
                    .attr('display', showVillageBorders ? 'block' : 'none');
            }
        }, [showCountyBorders, showVillageBorders]);

        // 3. Labels Update
        useEffect(() => {
            if (!svgRef.current || !townFeatures || !gLabelsRef.current) return;

            const gLabels = d3.select(gLabelsRef.current);
            gLabels.selectAll('*').remove();

            const width = svgRef.current.clientWidth || window.innerWidth;
            const height = svgRef.current.clientHeight || window.innerHeight;
            const projection = d3.geoMercator()
                .center([120.9, 23.65])
                .scale(height * 11)
                .translate([width / 2, height / 2]);
            const path = d3.geoPath().projection(projection);

            if (showLvl1Names) {
                const countyGroups = d3.group(townFeatures.features, (d: any) => norm(getCountyTownVillageFromProps(d.properties).county));
                const countyCenters = Array.from(countyGroups.entries()).map(([name, features]) => {
                    const center = path.centroid({ type: 'FeatureCollection', features } as any);
                    return { name, center };
                });

                gLabels.selectAll('.label-lvl1')
                    .data(countyCenters)
                    .enter()
                    .append('text')
                    .attr('class', 'label-lvl1 pointer-events-none')
                    .attr('x', d => d.center[0])
                    .attr('y', d => d.center[1])
                    .attr('text-anchor', 'middle')
                    .attr('font-size', '14px')
                    .attr('font-weight', '900')
                    .attr('fill', '#475569')
                    .attr('stroke', 'white')
                    .attr('stroke-width', 2)
                    .attr('paint-order', 'stroke')
                    .text(d => mt(d.name));
            }

            if (showLvl2Names) {
                gLabels.selectAll('.label-lvl2')
                    .data(townFeatures.features)
                    .enter()
                    .append('text')
                    .attr('class', 'label-lvl2 pointer-events-none')
                    .attr('x', (d: any) => path.centroid(d)[0])
                    .attr('y', (d: any) => path.centroid(d)[1])
                    .attr('text-anchor', 'middle')
                    .attr('font-size', '8px')
                    .attr('font-weight', '700')
                    .attr('fill', '#64748b')
                    .attr('stroke', 'white')
                    .attr('stroke-width', 1.5)
                    .attr('paint-order', 'stroke')
                    .text((d: any) => mt(getCountyTownVillageFromProps(d.properties).town));
            }

            if (showLvl3Names && villageFeatures) {
                gLabels.selectAll('.label-lvl3')
                    .data(villageFeatures.features)
                    .enter()
                    .append('text')
                    .attr('class', 'label-lvl3 pointer-events-none')
                    .attr('x', (d: any) => path.centroid(d)[0])
                    .attr('y', (d: any) => path.centroid(d)[1])
                    .attr('text-anchor', 'middle')
                    .attr('font-size', '1.5px')
                    .attr('font-weight', '500')
                    .attr('fill', '#94a3b8')
                    .attr('stroke', 'white')
                    .attr('stroke-width', 0.5)
                    .attr('paint-order', 'stroke')
                    .text((d: any) => mt(getCountyTownVillageFromProps(d.properties).village));
            }

            if (showPins && villageFeatures) {
                const pinnedFeatures = villageFeatures.features.filter((f: any) => {
                    const { county, town, village } = getCountyTownVillageFromProps(f.properties);
                    return !!pinnedLocations[`${county}|${town}|${village || ''}`];
                });

                const pinGroup = gLabels.selectAll('.pin-marker')
                    .data(pinnedFeatures)
                    .enter()
                    .append('g')
                    .attr('class', 'pin-marker pointer-events-none')
                    .attr('transform', (d: any) => {
                        const center = path.centroid(d);
                        return `translate(${center[0]}, ${center[1]})`;
                    });

                pinGroup.append('path')
                    .attr('d', 'M0,0 C-1.5,-1.5 -5,-6 -5,-10 A5,5 0 1,1 5,-10 C5,-6 1.5,-1.5 0,0 Z')
                    .attr('fill', (d: any) => {
                        const { county, town, village } = getCountyTownVillageFromProps(d.properties);
                        const type = pinnedLocations[`${county}|${town}|${village || ''}`];
                        return type ? PIN_COLORS[type] : '#ccc';
                    })
                    .attr('stroke', 'white')
                    .attr('stroke-width', 1.5)
                    .attr('filter', 'drop-shadow(0 2px 2px rgba(0,0,0,0.2))');
            }

            const currentTransform = d3.zoomTransform(svgRef.current as any);
            gLabels.attr('transform', currentTransform.toString());
        }, [showLvl1Names, showLvl2Names, showLvl3Names, showPins, pinnedLocations, townFeatures, villageFeatures, getCountyTownVillageFromProps, mapVersion]);

        // 4. MAIN DRAW
        useEffect(() => {
            if (!townFeatures || !svgRef.current) return;

            const svg = d3.select(svgRef.current);
            const width = svgRef.current.clientWidth || window.innerWidth;
            const height = svgRef.current.clientHeight || window.innerHeight;

            svg.selectAll('*').remove();

            const projection = d3.geoMercator()
                .center([120.9, 23.65])
                .scale(height * 11)
                .translate([width / 2, height / 2]);
            const path = d3.geoPath().projection(projection);

            const gDefs = svg.append('defs');
            const gVillagePolygons = svg.append('g').attr('class', 'village-polygons-group');
            const gTownships = svg.append('g').attr('class', 'townships-group');
            const gVillages = svg.append('g').attr('class', 'villages-group');
            const gBorders = svg.append('g').attr('class', 'borders-group');
            const gLabels = svg.append('g').attr('class', 'labels-group');

            gDefsRef.current = gDefs.node() as any;
            gVillagePolygonsRef.current = gVillagePolygons.node();
            gTownshipsRef.current = gTownships.node();
            gVillagesRef.current = gVillages.node();
            gBordersRef.current = gBorders.node();
            gLabelsRef.current = gLabels.node();

            const sc = stateRef.current.showTownshipContours ? '#cbd5e1' : '#ffffff';
            const sw = stateRef.current.showTownshipContours ? 0.5 : 0.3;

            if (villageFeatures) {
                gVillagePolygons.selectAll('path')
                    .data(villageFeatures.features)
                    .enter()
                    .append('path')
                    .attr('d', path as any)
                    .attr('class', 'village-poly')
                    .attr('fill', '#f5f5f4')
                    .style('cursor', 'pointer')
                    .on('mouseenter', (event: any, d: any) => {
                        if ((window as any).hoverTimeout_ycm) clearTimeout((window as any).hoverTimeout_ycm);
                        (window as any).hoverTimeout_ycm = setTimeout(() => {
                            stateRef.current.onHover(d.properties, event.clientX, event.clientY);
                        }, 250);
                        d3.select(event.currentTarget).attr('stroke', '#000000').attr('stroke-width', 0.8).raise();
                    })
                    .on('mousemove', (event: any, d: any) => {
                        stateRef.current.onHover(d.properties, event.clientX, event.clientY);
                    })
                    .on('mouseleave', (event: any) => {
                        if ((window as any).hoverTimeout_ycm) clearTimeout((window as any).hoverTimeout_ycm);
                        // Reset stroke immediately (visual feedback)
                        d3.select(event.currentTarget).attr('stroke', 'none');
                        // Delay onLeave — guard with flag in case tooltip mouseenter already fired
                        (window as any).hoverTimeout_ycm = setTimeout(() => {
                            if (!(window as any).isHoveringTooltip_ycm) {
                                stateRef.current.onLeave();
                            }
                        }, 200);
                    })
                    .on('click', (event: any, d: any) => {
                        if ((window as any).hoverTimeout_ycm) clearTimeout((window as any).hoverTimeout_ycm);
                        stateRef.current.onClickTown(d.properties, event.clientX, event.clientY);
                    });
            }

            gTownships.selectAll('path')
                .data(townFeatures.features)
                .enter()
                .append('path')
                .attr('d', path as any)
                .attr('class', 'township')
                .attr('fill', '#ffffff')
                .attr('stroke', sc)
                .attr('stroke-width', sw)
                .style('cursor', 'pointer')
                .on('mouseenter', (event: any, d: any) => {
                    if ((window as any).hoverTimeout_ycm) clearTimeout((window as any).hoverTimeout_ycm);
                    (window as any).hoverTimeout_ycm = setTimeout(() => {
                        stateRef.current.onHover(d.properties, event.clientX, event.clientY);
                    }, 50);
                    d3.select(event.currentTarget).attr('stroke', '#000000').attr('stroke-width', 1).raise();
                    if (gVillagesRef.current) d3.select(gVillagesRef.current).raise();
                    if (gBordersRef.current) d3.select(gBordersRef.current).raise();
                })
                .on('mousemove', (event: any, d: any) => {
                    stateRef.current.onHover(d.properties, event.clientX, event.clientY);
                })
                .on('mouseleave', function () {
                    if ((window as any).hoverTimeout_ycm) clearTimeout((window as any).hoverTimeout_ycm);
                    // Reset stroke immediately (visual feedback)
                    const s = stateRef.current.showTownshipContours ? '#cbd5e1' : '#ffffff';
                    const w = stateRef.current.showTownshipContours ? 0.5 : 0.3;
                    d3.select(this).attr('stroke', s).attr('stroke-width', w);
                    // Delay onLeave — guard with flag in case tooltip mouseenter already fired
                    (window as any).hoverTimeout_ycm = setTimeout(() => {
                        if (!(window as any).isHoveringTooltip_ycm) {
                            stateRef.current.onLeave();
                        }
                    }, 200);
                })
                .on('click', (event: any, d: any) => {
                    if ((window as any).hoverTimeout_ycm) clearTimeout((window as any).hoverTimeout_ycm);
                    stateRef.current.onClickTown(d.properties, event.clientX, event.clientY);
                });

            const zoom = d3.zoom<SVGSVGElement, unknown>()
                .scaleExtent([0.5, 40])
                .on('zoom', (event) => {
                    gVillagePolygons.attr('transform', event.transform);
                    gTownships.attr('transform', event.transform);
                    gVillages.attr('transform', event.transform);
                    gBorders.attr('transform', event.transform);
                    gLabels.attr('transform', event.transform);
                });

            zoomRef.current = zoom;
            svg.call(zoom)
                .on('dblclick.zoom', null)
                .on('click', (event) => {
                    if (event.target === svgRef.current && onClickBackground) onClickBackground();
                });

            if (villageBorders) {
                gVillages.append('path')
                    .datum(villageBorders)
                    .attr('d', path as any)
                    .attr('class', 'village-border')
                    .attr('fill', 'none')
                    .attr('stroke', '#e2e8f0')
                    .attr('stroke-width', 0.2)
                    .attr('display', showVillageBorders ? 'block' : 'none');
            }

            if (countyBorders) {
                gBorders.append('path')
                    .datum(countyBorders)
                    .attr('d', path as any)
                    .attr('class', 'county-border')
                    .attr('fill', 'none')
                    .attr('stroke', '#94a3b8')
                    .attr('stroke-width', 0.8)
                    .attr('display', stateRef.current.showCountyBorders ? 'block' : 'none');
            }

            // Initial fills (Sync with current selection)
            const { selectedDialects, showSharedDialects, showPinContours, showPinGlow, pinnedLocations } = stateRef.current;
            d3.select(gTownshipsRef.current).selectAll('.township')
                .attr('fill', (d: any) => {
                    if (showVillageColors) return 'transparent';
                    const dialects = getDialects(getCountyTownVillageFromProps(d.properties).county, getCountyTownVillageFromProps(d.properties).town);
                    return generateAreaFill(dialects, selectedDialects, showSharedDialects, gDefsRef);
                })
                .attr('pointer-events', showVillageColors ? 'none' : 'auto');

            if (villageFeatures) {
                d3.select(gVillagePolygonsRef.current).selectAll<SVGPathElement, any>('.village-poly')
                    .attr('fill', (d: any) => {
                        const { county, town, village } = getCountyTownVillageFromProps(d.properties);
                        const dialects = getVillageDialects(county, town, village);
                        return generateAreaFill(dialects, selectedDialects, showSharedDialects, gDefsRef);
                    })
                    .attr('stroke', (d: any) => {
                        if (!showPinContours) return 'none';
                        const { county, town, village } = getCountyTownVillageFromProps(d.properties);
                        const pin = pinnedLocations[`${county}|${town}|${village || ''}`];
                        return pin ? PIN_COLORS[pin] : 'none';
                    })
                    .attr('stroke-width', (d: any) => {
                        if (!showPinContours) return 0;
                        const { county, town, village } = getCountyTownVillageFromProps(d.properties);
                        return pinnedLocations[`${county}|${town}|${village || ''}`] ? 1.5 : 0;
                    })
                    .attr('filter', (d: any) => {
                        if (!showPinGlow) return 'none';
                        const { county, town, village } = getCountyTownVillageFromProps(d.properties);
                        const pin = pinnedLocations[`${county}|${town}|${village || ''}`];
                        if (!pin) return 'none';
                        const filterId = `glow-${pin}`;
                        if (gDefsRef.current && !document.getElementById(filterId)) {
                            const color = PIN_COLORS[pin];
                            const filt = d3.select(gDefsRef.current).append('filter').attr('id', filterId).attr('x', '-50%').attr('y', '-100%').attr('width', '200%').attr('height', '200%');
                            filt.append('feFlood').attr('flood-color', color).attr('flood-opacity', 0.8).attr('result', 'flood');
                            filt.append('feComposite').attr('in', 'flood').attr('in2', 'SourceAlpha').attr('operator', 'in').attr('result', 'mask');
                            filt.append('feGaussianBlur').attr('in', 'mask').attr('stdDeviation', 2).attr('result', 'blur');
                            // Add upward offset
                            filt.append('feOffset').attr('in', 'blur').attr('dy', -3).attr('result', 'offsetBlur');

                            const merge = filt.append('feMerge');
                            merge.append('feMergeNode').attr('in', 'offsetBlur');
                            merge.append('feMergeNode').attr('in', 'SourceGraphic');
                        }
                        return `url(#${filterId})`;
                    })
                    .attr('pointer-events', showVillageColors ? 'auto' : 'none');

                d3.select(gVillagePolygonsRef.current).attr('display', showVillageColors ? 'block' : 'none');
            }

            // Signal to fill & label effects that the SVG is now ready
            setMapVersion(v => v + 1);

        }, [townFeatures, villageFeatures, countyBorders, villageBorders]);

        return <svg ref={svgRef} className="w-full h-full" style={{ backgroundColor: mapBgColor }} />;
    }
);

TaiwanMapCanvas.displayName = 'TaiwanMapCanvas';
export default TaiwanMapCanvas;