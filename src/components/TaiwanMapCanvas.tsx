import React, { useEffect, useImperativeHandle, useRef } from 'react';
import * as d3 from 'd3';
import { getDialectColor } from './dialectColors';

export interface TaiwanMapCanvasHandle {
    resetZoom: () => void;
}

type Props = {
    townFeatures: any | null;
    countyBorders: any | null;

    // Settings
    showCountyBorders: boolean;
    showTownshipContours: boolean;

    // Selection coloring
    selectedDialects: Set<string>;
    getDialects: (county: string, town: string) => string[];
    getCountyTownFromProps: (p: any) => { county: string; town: string };

    // Interaction callbacks
    onHover: (props: any, clientX: number, clientY: number) => void;
    onLeave: () => void;
    onClickTown: (props: any) => void;
};

const TaiwanMapCanvas = React.forwardRef<TaiwanMapCanvasHandle, Props>(
    (
        {
            townFeatures,
            countyBorders,
            showCountyBorders,
            showTownshipContours,
            selectedDialects,
            getDialects,
            getCountyTownFromProps,
            onHover,
            onLeave,
            onClickTown,
        },
        ref
    ) => {
        const svgRef = useRef<SVGSVGElement>(null);
        const gTownshipsRef = useRef<SVGGElement | null>(null);
        const gBordersRef = useRef<SVGGElement | null>(null);
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

        // Keep the latest contour toggle accessible inside D3 handlers
        const contourRef = useRef<boolean>(showTownshipContours);
        useEffect(() => {
            contourRef.current = showTownshipContours;
        }, [showTownshipContours]);

        // Keep stable refs for all volatile props so D3 handlers never go stale
        const stateRef = useRef({
            showCountyBorders,
            selectedDialects,
            getDialects,
            getCountyTownFromProps,
            onHover,
            onLeave,
            onClickTown,
        });
        useEffect(() => {
            stateRef.current = {
                showCountyBorders,
                selectedDialects,
                getDialects,
                getCountyTownFromProps,
                onHover,
                onLeave,
                onClickTown,
            };
        });

        // Update fills when selectedDialects changes (no full re-render)
        useEffect(() => {
            if (!gTownshipsRef.current) return;

            d3.select(gTownshipsRef.current)
                .selectAll<SVGPathElement, any>('.township')
                .attr('fill', (d: any) => {
                    const p = d.properties || {};
                    const { county, town } = getCountyTownFromProps(p);
                    const dialectsArray = getDialects(county, town);
                    if (!dialectsArray.length) return '#f3f4f6';
                    const selectedHere = dialectsArray.filter((x) => selectedDialects.has(x));
                    if (selectedHere.length > 0) return getDialectColor(selectedHere[0]);
                    return '#f3f4f6';
                });
        }, [selectedDialects, getDialects, getCountyTownFromProps]);

        // Show/hide county borders without redrawing
        useEffect(() => {
            if (!gBordersRef.current) return;
            d3.select(gBordersRef.current)
                .selectAll<SVGPathElement, any>('.county-border')
                .attr('display', showCountyBorders ? 'block' : 'none');
        }, [showCountyBorders]);

        // Toggle township contour strokes without redrawing
        useEffect(() => {
            if (!gTownshipsRef.current) return;
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
        }, [showTownshipContours]);

        // Full draw — only when geo data changes
        useEffect(() => {
            if (!townFeatures || !svgRef.current) return;

            const svg = d3.select(svgRef.current);
            const width = svgRef.current.clientWidth || window.innerWidth;
            const height = svgRef.current.clientHeight || window.innerHeight;

            svg.selectAll('*').remove();

            // Taiwan's main island spans ~3.3° lat.  In D3 Mercator coords the
            // vertical extent equals ≈ 0.053 radians of projection-space.
            // For 80% viewport-height fill: scale = 0.8 * h / 0.053 ≈ h * 15.
            // Use height (not width) so it works regardless of aspect ratio.
            const scale = height * 15;

            const projection = d3
                .geoMercator()
                .center([120.9, 23.65])  // geographic center of main island
                .scale(scale)
                .translate([width / 2, height / 2]);

            const path = d3.geoPath().projection(projection);

            const gTownships = svg.append('g').attr('class', 'townships-group');
            const gBorders = svg.append('g').attr('class', 'borders-group');

            gTownshipsRef.current = gTownships.node();
            gBordersRef.current = gBorders.node();

            const strokeColor = contourRef.current ? '#cbd5e1' : '#ffffff';
            const strokeWidth = contourRef.current ? 0.5 : 0.3;

            gTownships
                .selectAll('path')
                .data((townFeatures as any).features)
                .enter()
                .append('path')
                .attr('d', path as any)
                .attr('class', 'township')
                .attr('fill', '#f3f4f6')
                .attr('stroke', strokeColor)
                .attr('stroke-width', strokeWidth)
                .style('cursor', 'pointer')
                .on('mouseenter', (event: any, d: any) => {
                    stateRef.current.onHover(d.properties, event.clientX, event.clientY);
                    d3.select(event.currentTarget).attr('stroke', '#000000').attr('stroke-width', 1).raise();
                })
                .on('mousemove', (event: any, d: any) => {
                    stateRef.current.onHover(d.properties, event.clientX, event.clientY);
                })
                .on('mouseleave', () => {
                    stateRef.current.onLeave();
                    const contour = contourRef.current;
                    d3.select(gTownshipsRef.current)
                        .selectAll<SVGPathElement, any>('.township')
                        .attr('stroke', contour ? '#cbd5e1' : '#ffffff')
                        .attr('stroke-width', contour ? 0.5 : 0.3);
                })
                .on('click', (_event: any, d: any) => {
                    stateRef.current.onClickTown(d.properties);
                });

            // Zoom — store the behavior so resetZoom() can reach it
            const zoom = d3
                .zoom<SVGSVGElement, unknown>()
                .scaleExtent([1, 20])
                .on('zoom', (event: any) => {
                    gTownships.attr('transform', event.transform);
                    gBorders.attr('transform', event.transform);
                });

            zoomRef.current = zoom;
            svg.call(zoom);

            // County borders
            if (countyBorders) {
                gBorders
                    .append('path')
                    .datum(countyBorders)
                    .attr('d', path as any)
                    .attr('class', 'county-border')
                    .attr('fill', 'none')
                    .attr('stroke', '#94a3b8')
                    .attr('stroke-width', 0.8)
                    .attr('pointer-events', 'none')
                    .attr('display', stateRef.current.showCountyBorders ? 'block' : 'none');
            }

            // Initial color pass
            d3.select(gTownshipsRef.current)
                .selectAll<SVGPathElement, any>('.township')
                .attr('fill', (d: any) => {
                    const { selectedDialects, getDialects, getCountyTownFromProps } = stateRef.current;
                    const p = d.properties || {};
                    const { county, town } = getCountyTownFromProps(p);
                    const dialectsArray = getDialects(county, town);
                    if (!dialectsArray.length) return '#f3f4f6';
                    const selectedHere = dialectsArray.filter((x) => selectedDialects.has(x));
                    if (selectedHere.length > 0) return getDialectColor(selectedHere[0]);
                    return '#f3f4f6';
                });
        }, [townFeatures, countyBorders]);

        return <svg ref={svgRef} className="w-full h-full" />;
    }
);

TaiwanMapCanvas.displayName = 'TaiwanMapCanvas';

export default TaiwanMapCanvas;