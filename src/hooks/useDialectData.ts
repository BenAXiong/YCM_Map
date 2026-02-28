import { useMemo } from 'react';
import bundle from '../data/原住民16族42方言分佈參考.bundle.json';

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

const getCountyTownFromProps = (p: any) => {
    const county = p?.COUNTYNAME || p?.countyName || p?.C_Name || '';
    const town = p?.TOWNNAME || p?.townName || p?.T_Name || '';
    return { county, town };
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
        getCountyTownFromProps,
        getEntries,
        getDialects,

        // filter helpers
        languageGroups,
        allDialects,
    };
}