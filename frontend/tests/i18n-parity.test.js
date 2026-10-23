import { describe, it, expect } from 'vitest';
import { translations } from '../src/i18n/translations.js';

const LANGUAGES = Object.keys(translations);

describe('i18n dictionaries stay in parity across all languages', () => {
  it('ships more than one language', () => {
    expect(LANGUAGES.length).toBeGreaterThan(1);
  });

  it('every language has exactly the same set of keys as English', () => {
    const englishKeys = new Set(Object.keys(translations.en));

    for (const lang of LANGUAGES) {
      if (lang === 'en') continue;

      const keys = new Set(Object.keys(translations[lang]));

      const missing = [...englishKeys].filter((key) => !keys.has(key));
      const extra = [...keys].filter((key) => !englishKeys.has(key));

      expect(missing, `${lang} is missing keys: ${missing.join(', ')}`).toEqual([]);
      expect(extra, `${lang} has extra keys not in en: ${extra.join(', ')}`).toEqual([]);
    }
  });

  it('no dictionary has an empty or non-string value', () => {
    for (const lang of LANGUAGES) {
      for (const [key, value] of Object.entries(translations[lang])) {
        expect(typeof value, `${lang}.${key} should be a string`).toBe('string');
        expect(value.length, `${lang}.${key} should not be empty`).toBeGreaterThan(0);
      }
    }
  });

  it('{placeholder} tokens match between English and every other language', () => {
    const placeholdersOf = (str) => [...str.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

    for (const lang of LANGUAGES) {
      if (lang === 'en') continue;

      for (const [key, enValue] of Object.entries(translations.en)) {
        const translated = translations[lang][key];
        if (translated === undefined) continue; // already reported by the parity test above

        const enPlaceholders = placeholdersOf(enValue);
        const translatedPlaceholders = placeholdersOf(translated);

        expect(
          translatedPlaceholders,
          `${lang}.${key} has placeholders ${JSON.stringify(translatedPlaceholders)}, English has ${JSON.stringify(enPlaceholders)}`
        ).toEqual(enPlaceholders);
      }
    }
  });
});
