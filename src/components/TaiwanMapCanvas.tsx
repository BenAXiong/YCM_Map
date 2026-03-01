import React, { useEffect, useImperativeHandle, useRef } from 'react';
import * as d3 from 'd3';
import { getDialectColor } from './dialectColors';

export interface TaiwanMapCanvasHandle {
    resetZoom: () => void;
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
};
import { useTranslation } from '../hooks/useTranslation';

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
            showTownshipContours
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
                showTownshipContours
            };
        });

        const norm = (s: string) => (s ?? '').trim().replace('台', '臺');

        // 1. Update fills when selection or mode changes
        useEffect(() => {
            const { getDialects, getVillageDialects, getCountyTownVillageFromProps, selectedDialects, showSharedDialects } = stateRef.current;

            if (gTownshipsRef.current) {
                d3.select(gTownshipsRef.current)
                    .selectAll<SVGPathElement, any>('.township')
                    .attr('fill', (d: any) => {
                        if (showVillageColors) return 'transparent';
                        const p = d.properties || {};
                        const { county, town } = getCountyTownVillageFromProps(p);
                        const dialectsArray = getDialects(county, town);
                        return generateAreaFill(dialectsArray, selectedDialects, showSharedDialects, gDefsRef);
                    });
            }

            if (gVillagePolygonsRef.current) {
                d3.select(gVillagePolygonsRef.current)
                    .selectAll<SVGPathElement, any>('.village-poly')
                    .attr('fill', (d: any) => {
                        const p = d.properties || {};
                        const { county, town, village } = getCountyTownVillageFromProps(p);
                        const dialectsArray = getVillageDialects(county, town, village);
                        if (!dialectsArray.length) return showVillageColors ? '#f5f5f4' : 'transparent';
                        const fill = generateAreaFill(dialectsArray, selectedDialects, showSharedDialects, gDefsRef);
                        return (fill === '#ffffff' && !showVillageColors) ? 'transparent' : fill;
                    });
            }
        }, [selectedDialects, showSharedDialects, showVillageColors, getDialects, getVillageDialects, getCountyTownVillageFromProps]);

        // 2. Toggle Layers Visibility
        useEffect(() => {
            if (gBordersRef.current) {
                d3.select(gBordersRef.current)
                    .selectAll('.county-border')
                    .attr('display', showCountyBorders ? 'block' : 'none');
            }
        }, [showCountyBorders]);

        useEffect(() => {
            if (gTownshipsRef.current) {
                const strokeColor = showTownshipContours ? '#cbd5e1' : '#ffffff';
                const strokeWidth = showTownshipContours ? 0.5 : 0.3;
                d3.select(gTownshipsRef.current)
                    .selectAll<SVGPathElement, any>('.township')
                    .each(function () {
                        const sel = d3.select(this);
                        if (sel.attr('stroke') !== '#000000') {
                            sel.attr('stroke', strokeColor).attr('stroke-width', strokeWidth);
                        }
                    });
            }
        }, [showTownshipContours]);

        useEffect(() => {
            if (gVillagesRef.current) {
                d3.select(gVillagesRef.current)
                    .selectAll('.village-border')
                    .attr('display', showVillageBorders ? 'block' : 'none');
            }
            if (gVillagePolygonsRef.current) {
                d3.select(gVillagePolygonsRef.current)
                    .attr('display', showVillageColors ? 'block' : 'none')
                    .selectAll('.village-poly')
                    .attr('pointer-events', showVillageColors ? 'auto' : 'none');
            }
            if (gTownshipsRef.current) {
                d3.select(gTownshipsRef.current)
                    .selectAll('.township')
                    .attr('pointer-events', showVillageColors ? 'none' : 'auto');
            }
        }, [showVillageBorders, showVillageColors]);

        // 3. Labels Update
        useEffect(() => {
            if (!svgRef.current || !townFeatures || !gLabelsRef.current) return;

            const gLabels = d3.select(gLabelsRef.current);
            gLabels.selectAll('*').remove();

            const width = svgRef.current.clientWidth || window.innerWidth;
            const height = svgRef.current.clientHeight || window.innerHeight;
            const projection = d3.geoMercator()
                .center([120.9, 23.65])
                .scale(height * 14)
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
                    .text((d: any) => getCountyTownVillageFromProps(d.properties).village);
            }

            const currentTransform = d3.zoomTransform(svgRef.current as any);
            gLabels.attr('transform', currentTransform.toString());
        }, [showLvl1Names, showLvl2Names, showLvl3Names, townFeatures, villageFeatures, getCountyTownVillageFromProps]);

        // 4. MAIN DRAW
        useEffect(() => {
            if (!townFeatures || !svgRef.current) return;

            const svg = d3.select(svgRef.current);
            const width = svgRef.current.clientWidth || window.innerWidth;
            const height = svgRef.current.clientHeight || window.innerHeight;

            svg.selectAll('*').remove();

            const projection = d3.geoMercator()
                .center([120.9, 23.65])
                .scale(height * 14)
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
                        stateRef.current.onLeave();
                        d3.select(event.currentTarget).attr('stroke', 'none');
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
                    stateRef.current.onLeave();
                    const s = stateRef.current.showTownshipContours ? '#cbd5e1' : '#ffffff';
                    const w = stateRef.current.showTownshipContours ? 0.5 : 0.3;
                    d3.select(this).attr('stroke', s).attr('stroke-width', w);
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
            const { selectedDialects, showSharedDialects } = stateRef.current;
            d3.select(gTownshipsRef.current).selectAll('.township')
                .attr('fill', (d: any) => {
                    if (showVillageColors) return 'transparent';
                    const dialects = getDialects(getCountyTownVillageFromProps(d.properties).county, getCountyTownVillageFromProps(d.properties).town);
                    return generateAreaFill(dialects, selectedDialects, showSharedDialects, gDefsRef);
                })
                .attr('pointer-events', showVillageColors ? 'none' : 'auto');

            if (villageFeatures) {
                d3.select(gVillagePolygonsRef.current).selectAll('.village-poly')
                    .attr('fill', (d: any) => {
                        const { county, town, village } = getCountyTownVillageFromProps(d.properties);
                        const dialects = getVillageDialects(county, town, village);
                        return generateAreaFill(dialects, selectedDialects, showSharedDialects, gDefsRef);
                    })
                    .attr('pointer-events', showVillageColors ? 'auto' : 'none');

                d3.select(gVillagePolygonsRef.current).attr('display', showVillageColors ? 'block' : 'none');
            }

        }, [townFeatures, villageFeatures, countyBorders, villageBorders]);

        return <svg ref={svgRef} className="w-full h-full bg-slate-50" />;
    }
);

TaiwanMapCanvas.displayName = 'TaiwanMapCanvas';
export default TaiwanMapCanvas;