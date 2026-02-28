import { useEffect, useState } from 'react';
import * as topojson from 'topojson-client';

type UseTaiwanTopoResult = {
    townFeatures: any | null;
    countyBorders: any | null;
    loading: boolean;
    error: string | null;
};

export function useTaiwanTopo(
    url: string = 'https://cdn.jsdelivr.net/npm/taiwan-atlas/towns-10t.json'
): UseTaiwanTopoResult {
    const [townFeatures, setTownFeatures] = useState<any | null>(null);
    const [countyBorders, setCountyBorders] = useState<any | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function run() {
            try {
                setLoading(true);
                setError(null);

                const res = await fetch(url);
                if (!res.ok) throw new Error(`Failed to fetch topojson: ${res.status} ${res.statusText}`);
                const topo = await res.json();

                if (cancelled) return;

                const objectName = Object.keys(topo.objects)[0];
                const obj = topo.objects[objectName];

                const features = topojson.feature(topo, obj as any);
                setTownFeatures(features);

                const mesh = topojson.mesh(topo, obj as any, (a: any, b: any) => {
                    const aCounty = a.properties?.COUNTYNAME || a.properties?.countyName || a.properties?.C_Name;
                    const bCounty = b.properties?.COUNTYNAME || b.properties?.countyName || b.properties?.C_Name;
                    return aCounty !== bCounty;
                });
                setCountyBorders(mesh);
            } catch (e: any) {
                if (!cancelled) setError(e?.message ?? String(e));
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        run();
        return () => {
            cancelled = true;
        };
    }, [url]);

    return { townFeatures, countyBorders, loading, error };
}