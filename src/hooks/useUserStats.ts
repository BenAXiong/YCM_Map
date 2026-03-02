import { useMemo } from 'react';
import villageLookupData from '../data/villages.lookup.json';
import bundle from '../data/dialects.bundle.json';
import type { PinnedMap } from '../components/types';

export type UserStats = {
    totalVillages: number;
    pinnedCount: number;
    byLanguage: Record<string, { total: number; pinned: number }>;
    byDialect: Record<string, { total: number; pinned: number }>;
};

export function useUserStats(pinnedLocations: PinnedMap): UserStats {
    return useMemo(() => {
        const lookup = (villageLookupData as any).lookup as Record<string, string[]>;
        const groups = (bundle as any).languageGroups as Record<string, string[]>;

        // Map dialect to language
        const dialectToLang: Record<string, string> = {};
        for (const [lang, dialects] of Object.entries(groups)) {
            dialects.forEach(d => {
                dialectToLang[d] = lang;
            });
        }

        const stats: UserStats = {
            totalVillages: Object.keys(lookup).length,
            pinnedCount: 0,
            byLanguage: {},
            byDialect: {},
        };

        // Initialize total counts for all languages and dialects
        for (const lang of Object.keys(groups)) {
            stats.byLanguage[lang] = { total: 0, pinned: 0 };
        }
        for (const dialect of Object.values(groups).flat()) {
            stats.byDialect[dialect] = { total: 0, pinned: 0 };
        }

        // Process each village
        for (const [key, dialects] of Object.entries(lookup)) {
            const isPinned = pinnedLocations[key] === 'went';
            if (isPinned) stats.pinnedCount++;

            const uniqueLangs = new Set<string>();

            dialects.forEach(d => {
                if (stats.byDialect[d]) {
                    stats.byDialect[d].total++;
                    if (isPinned) stats.byDialect[d].pinned++;
                }

                const lang = dialectToLang[d];
                if (lang) uniqueLangs.add(lang);
            });

            uniqueLangs.forEach(lang => {
                if (stats.byLanguage[lang]) {
                    stats.byLanguage[lang].total++;
                    if (isPinned) stats.byLanguage[lang].pinned++;
                }
            });
        }

        return stats;
    }, [pinnedLocations]);
}
