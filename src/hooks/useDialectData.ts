import { useMemo } from 'react';
import bundle from '../data/dialects.bundle.json';
import villageLookupData from '../data/villages.lookup.json';

const villageLookup: Record<string, string[]> = (villageLookupData as any).lookup;

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
        .replace('台', '臺'); // minimal, deterministic

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
    const languageGroups = data.languageGroups ?? {};

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
    };
}