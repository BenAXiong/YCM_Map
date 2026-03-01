import { useEffect, useState } from 'react';
import * as topojson from 'topojson-client';

type UseTaiwanTopoResult = {
    townFeatures: any | null;
    countyBorders: any | null;
    villageBorders: any | null;
    villageFeatures: any | null;
    loading: boolean;
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
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function run() {
            try {
                setLoading(true);
                setError(null);

                // 1. Fetch towns
                const res = await fetch(url);
                if (!res.ok) throw new Error(`Failed to fetch topojson: ${res.status} ${res.statusText}`);
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

                // 2. Fetch villages if requested
                if (villageUrl) {
                    const vRes = await fetch(villageUrl);
                    if (vRes.ok) {
                        const vTopo = await vRes.json();
                        if (!cancelled) {
                            const vObjName = Object.keys(vTopo.objects)[0];
                            const vObj = vTopo.objects[vObjName];

                            setVillageFeatures(topojson.feature(vTopo, vObj as any));
                            setVillageBorders(topojson.mesh(vTopo, vObj as any));
                        }
                    }
                }
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
    }, [url, villageUrl]);

    return { townFeatures, countyBorders, villageBorders, villageFeatures, loading, error };
}
