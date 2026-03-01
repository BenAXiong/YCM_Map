import dialectsBundle from '../data/dialects.bundle.json';

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
        // If only dialect name is provided, find its language group
        const groups = dialectsBundle.languageGroups;
        for (const [l, dialects] of Object.entries(groups)) {
            if (dialects.includes(dialectOrKey)) {
                lang = l;
                dia = dialectOrKey;
                break;
            }
        }
    }

    // 2. Identify Language Index for Hue
    const allLanguages = dialectsBundle.allLanguages;
    const langIndex = allLanguages.indexOf(lang);

    // Use a default hue if not found, otherwise spread 16 languages across 360 degrees
    const hue = langIndex === -1 ? 0 : (langIndex * (360 / allLanguages.length)) % 360;

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