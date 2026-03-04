import { useEffect, useRef, useState } from 'react';
import * as topojson from 'topojson-client';

type UseTaiwanTopoResult = {
    townFeatures: any | null;
    countyBorders: any | null;
    villageBorders: any | null;
    villageFeatures: any | null;
    loading: boolean;        // true only during initial township load
    villageLoading: boolean; // true during village data fetch
    error: string | null;
};

export function useTaiwanTopo(
    url: string = 'https://cdn.jsdelivr.net/npm/taiwan-atlas/towns-10t.json',
    villageUrl?: string
): UseTaiwanTopoResult {
    const [townFeatures, setTownFeatures] = useState<any | null>(null);
    const [countyBorders, setCountyBorders] = useState<any | null>(null);
    const [villageBorders, setVillageBorders] = useState<any | null>(null);
    const [villageFeatures, setVillageFeatures] = useState<any | null>(null);
    const [townsLoading, setTownsLoading] = useState<boolean>(true);
    const [villageLoading, setVillageLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const villageFetchedRef = useRef<string | null>(null);

    // Effect 1: Township Load (Run once or when url changes)
    useEffect(() => {
        let cancelled = false;
        async function loadTowns() {
            try {
                setTownsLoading(true);
                setError(null);
                const res = await fetch(url);
                if (!res.ok) throw new Error(`Failed to fetch towns: ${res.status}`);
                const topo = await res.json();
                if (cancelled) return;

                const objectName = Object.keys(topo.objects)[0];
                const obj = topo.objects[objectName];
                setTownFeatures(topojson.feature(topo, obj as any));
                setCountyBorders(topojson.mesh(topo, obj as any, (a: any, b: any) => {
                    const aCounty = a.properties?.COUNTYNAME || a.properties?.countyName || a.properties?.C_Name;
                    const bCounty = b.properties?.COUNTYNAME || b.properties?.countyName || b.properties?.C_Name;
                    return aCounty !== bCounty;
                }));
            } catch (e: any) {
                if (!cancelled) setError(e?.message ?? String(e));
            } finally {
                if (!cancelled) setTownsLoading(false);
            }
        }
        loadTowns();
        return () => { cancelled = true; };
    }, [url]);

    // Effect 2: Village Load (Lazy)
    useEffect(() => {
        if (!villageUrl || villageFetchedRef.current === villageUrl) return;

        let cancelled = false;
        async function loadVillages() {
            try {
                setVillageLoading(true);
                const res = await fetch(villageUrl!);
                if (!res.ok) throw new Error(`Failed to fetch villages: ${res.status}`);
                const vTopo = await res.json();
                if (cancelled) return;

                const vObjName = Object.keys(vTopo.objects)[0];
                const vObj = vTopo.objects[vObjName];

                setVillageFeatures(topojson.feature(vTopo, vObj as any));
                setVillageBorders(topojson.mesh(vTopo, vObj as any));
                villageFetchedRef.current = villageUrl!;
            } catch (e: any) {
                console.error("Village Load Error:", e);
                // We don't set the main error state for village failures to avoid blocking the whole app
            } finally {
                if (!cancelled) setVillageLoading(false);
            }
        }
        loadVillages();
        return () => { cancelled = true; };
    }, [villageUrl]);

    return {
        townFeatures,
        countyBorders,
        villageBorders,
        villageFeatures,
        loading: townsLoading,
        villageLoading,
        error
    };
}
