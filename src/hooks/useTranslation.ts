import { uiTranslations, type Language } from '../data/ui_translations';
import { mapTranslations } from '../data/map_translations';

export const useTranslation = (lang: Language) => {
    const t = (key: keyof typeof uiTranslations.zh): string => {
        return uiTranslations[lang][key] || uiTranslations['zh'][key];
    };

    const mt = (text: string): string => {
        if (!text) return text;
        // Map internal Chinese keys to the current language
        if (lang === 'zh') return text;
        return mapTranslations[lang]?.[text] || text;
    };

    return { t, mt, currentLang: lang };
};
export type { Language };
