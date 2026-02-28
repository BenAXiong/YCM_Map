// src/components/taiwan-map/types.ts

export type DialectEntry = {
    族語: string;
    方言別: string;
};

export type Bundle = {
    schema: string;
    generatedAt?: string;
    areaIndex: Record<string, Record<string, DialectEntry[]>>;
    languageGroups: Record<string, string[]>;
    allDialects?: string[];
    allLanguages?: string[];
    stats?: any;
};

export type CountyTown = {
    county: string;
    town: string;
};

export type TooltipPos = {
    x: number;
    y: number;
};