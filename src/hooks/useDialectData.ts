import { useMemo } from 'react';
import bundle from '../data/dialects.bundle.json';
import villageLookupData from '../data/villages.lookup.json';

import languageStats from '../data/language_stats.json';

const villageLookup: Record<string, string[]> = (villageLookupData as any).lookup;
const statsData = languageStats as { rankings: { tribe: string; population: number }[] };

export type DialectEntry = { 族語: string; 方言別: string };

export type Bundle = {
    schema: string;
    generatedAt?: string;
    areaIndex: Record<string, Record<string, DialectEntry[]>>;
    languageGroups: Record<string, string[]>;
    allDialects?: string[];
    allLanguages?: string[];
    stats?: any;
};

const data = bundle as unknown as Bundle;

const norm = (s: string) =>
    (s ?? '')
        .trim()
        .replace(/\s+/g, '')
        .replace('台', '臺');

const getCountyTownVillageFromProps = (p: any) => {
    const county = p?.COUNTYNAME || p?.countyName || p?.C_Name || '';
    const town = p?.TOWNNAME || p?.townName || p?.T_Name || '';
    const village = p?.VILLNAME || p?.VILLAGENAME || p?.villageName || p?.V_Name || '';
    return { county, town, village };
};

const getEntries = (county: string, town: string): DialectEntry[] => {
    const c = norm(county);
    const t = norm(town);
    return data.areaIndex?.[c]?.[t] ?? [];
};

const getDialects = (county: string, town: string): string[] => {
    const entries = getEntries(county, town);
    return Array.from(new Set(entries.map((e) => e.方言別)));
};

const getVillageDialects = (county: string, town: string, village: string): string[] => {
    const c = norm(county);
    const t = norm(town);
    const v = norm(village);
    const key = `${c}|${t}|${v}`;
    return villageLookup[key] || [];
};

export function useDialectData() {
    // 1. Create a population lookup map
    const populationMap = useMemo(() => {
        const map: Record<string, number> = {};
        statsData.rankings.forEach(r => {
            const tribe = r.tribe.trim();
            const lang = tribe.replace(/族$/, '語');

            map[tribe] = r.population;
            map[lang] = r.population;

            // Handle variations in bundle keys
            if (lang === '卡那卡那富語') map['卡那卡那 富語'] = r.population;
        });
        const yamiPop = statsData.rankings.find(r => r.tribe.includes('雅美'))?.population || 0;
        map['雅美語'] = yamiPop;
        map['達悟語'] = yamiPop;
        return map;
    }, []);

    // 2. Sort language groups by population
    const languageGroups = useMemo(() => {
        const rawGroups = data.languageGroups ?? {};
        const entries = Object.entries(rawGroups);

        // Sort by population (descending)
        entries.sort((a, b) => {
            const popA = populationMap[a[0]] || 0;
            const popB = populationMap[b[0]] || 0;
            return popB - popA;
        });

        return Object.fromEntries(entries);
    }, [populationMap]);

    const allDialects = useMemo(() => {
        return (
            data.allDialects ??
            Array.from(new Set(Object.values(languageGroups).flat()))
        );
    }, [languageGroups]);

    return {
        // raw bundle bits
        stats: data.stats,
        schema: data.schema,
        generatedAt: data.generatedAt,

        // lookup helpers
        norm,
        getCountyTownVillageFromProps,
        getEntries,
        getDialects,
        getVillageDialects,

        // filter helpers
        languageGroups,
        allDialects,
        populationMap
    };
}
