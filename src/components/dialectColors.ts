import dialectsBundle from '../data/dialects.bundle.json';
import languageStats from '../data/language_stats.json';

const statsData = languageStats as { rankings: { tribe: string; population: number }[] };

// 0. Compute ranked languages to map hues to the new sequence
const rankedLanguages = statsData.rankings.map((r) => {
    const lang = r.tribe.trim().replace(/族$/, '語');
    return lang === '雅美語' ? '達悟語' : lang;
});

/**
 * Generates a stable color for a dialect based on its language group.
 * Language -> Hue (Rainbow gradient)
 * Dialect -> Lightness/Saturation variation
 */
export const getDialectColor = (dialectOrKey: string): string => {
    // 1. Resolve full key (Language|Dialect)
    let lang = '';
    let dia = '';

    if (dialectOrKey.includes('|')) {
        [lang, dia] = dialectOrKey.split('|');
    } else {
        const groups = dialectsBundle.languageGroups as Record<string, string[]>;
        if (dialectOrKey in groups) {
            lang = dialectOrKey;
            dia = '';
        } else {
            // If only dialect name is provided, find its language group
            for (const [l, dialects] of Object.entries(groups)) {
                if (dialects.includes(dialectOrKey)) {
                    lang = l;
                    dia = dialectOrKey;
                    break;
                }
            }
        }
    }

    // 2. Identify Language Index for Hue using population sequence
    let langIndex = rankedLanguages.indexOf(lang);

    // Handle variants map fallback
    if (langIndex === -1 && lang === '雅美語') langIndex = rankedLanguages.indexOf('達悟語');
    if (langIndex === -1 && lang === '卡那卡那 富語') langIndex = rankedLanguages.indexOf('卡那卡那富語');

    // Fallback if truly not in ranking
    if (langIndex === -1) {
        langIndex = dialectsBundle.allLanguages.indexOf(lang);
    }

    const totalHues = rankedLanguages.length || 16;
    const hue = langIndex === -1 ? 0 : (langIndex * (360 / totalHues)) % 360;

    // 3. Identify Dialect Index within that language for Lightness/Saturation
    const group = dialectsBundle.languageGroups[lang as keyof typeof dialectsBundle.languageGroups] || [];
    const diaIndex = group.indexOf(dia);

    // Default HSL: Base color at 50% lightness, 70% saturation
    let s = 75;
    let l = 50;

    // Apply variations for dialects
    if (diaIndex > 0) {
        const variations = [
            { l: 65, s: 85 }, // Lighter, vivid
            { l: 35, s: 70 }, // Darker
            { l: 50, s: 40 }, // Muted
            { l: 75, s: 60 }, // Very light, soft
            { l: 30, s: 40 }, // Deep, muted
            { l: 55, s: 95 }, // Super vivid
        ];
        const v = variations[(diaIndex - 1) % variations.length];
        l = v.l;
        s = v.s;
    }

    return `hsl(${hue}, ${s}%, ${l}%)`;
};