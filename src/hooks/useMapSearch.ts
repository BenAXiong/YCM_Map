import { useState, useEffect, useMemo } from 'react';
import { mapTranslations } from '../data/map_translations';

export function useMapSearch(
    townFeatures: any,
    languageGroups: Record<string, string[]>,
    getCountyTownVillageFromProps: (p: any) => { county: string; town: string; village: string }
) {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchHistory, setSearchHistory] = useState<any[]>(() => {
        const saved = localStorage.getItem('ycm_search_history');
        return saved ? JSON.parse(saved) : [];
    });
    const [searchResults, setSearchResults] = useState<{ places: any[], languages: any[] }>({ places: [], languages: [] });

    const allTownships = useMemo(() => {
        if (!townFeatures) return [];
        return (townFeatures as any).features.map((f: any) => {
            const p = f.properties || {};
            const { county, town } = getCountyTownVillageFromProps(p);
            return {
                id: p.TOWNID || p.townId || p.T_Code || `${county}-${town}-${Math.random().toString(16).slice(2)}`,
                county,
                town,
                properties: p,
            };
        });
    }, [townFeatures, getCountyTownVillageFromProps]);

    useEffect(() => {
        const timer = setTimeout(() => {
            const rawTerm = searchTerm.trim().toLowerCase();
            if (rawTerm === '') {
                setSearchResults({ places: [], languages: [] });
                return;
            }

            const term = rawTerm.replace(/[語族]$/, '');

            // 1. Filter Places
            const matchedPlaces = allTownships
                .filter((t: any) => {
                    const countyEn = mapTranslations.en[t.county] || "";
                    const townEn = mapTranslations.en[t.town] || "";
                    return t.county.toLowerCase().includes(term) ||
                        t.town.toLowerCase().includes(term) ||
                        countyEn.toLowerCase().includes(term) ||
                        townEn.toLowerCase().includes(term);
                })
                .slice(0, 5);

            // 2. Filter Languages / Dialects
            const matchedLangsMap = new Map<string, any>();

            Object.keys(languageGroups).forEach(lang => {
                const langEn = mapTranslations.en[lang] || "";
                if (lang.toLowerCase().includes(term) || langEn.toLowerCase().includes(term)) {
                    matchedLangsMap.set(lang, { type: 'language', name: lang });
                }
            });

            Object.entries(languageGroups).forEach(([lang, dialects]) => {
                const langEn = mapTranslations.en[lang] || "";
                const langMatched = lang.toLowerCase().includes(term) || langEn.toLowerCase().includes(term);

                dialects.forEach(dialect => {
                    const dialectEn = mapTranslations.en[dialect] || "";
                    const dialectMatched = dialect.toLowerCase().includes(term) || dialectEn.toLowerCase().includes(term);

                    if (langMatched || dialectMatched) {
                        if (!matchedLangsMap.has(dialect)) {
                            matchedLangsMap.set(dialect, { type: 'dialect', name: dialect });
                        }
                    }
                });
            });

            setSearchResults({
                places: matchedPlaces,
                languages: Array.from(matchedLangsMap.values()).slice(0, 20)
            });
        }, 150);

        return () => clearTimeout(timer);
    }, [searchTerm, allTownships, languageGroups]);

    const addToHistory = (item: any) => {
        setSearchHistory(prev => {
            const next = [item, ...prev.filter(h =>
                (h.id !== item.id || !h.id) && (h.name !== item.name || !h.name)
            )].slice(0, 10);
            localStorage.setItem('ycm_search_history', JSON.stringify(next));
            return next;
        });
    };

    const clearSearch = () => {
        setSearchTerm('');
        setSearchResults({ places: [], languages: [] });
    };

    return {
        searchTerm,
        setSearchTerm,
        searchResults,
        searchHistory,
        addToHistory,
        clearSearch
    };
}
