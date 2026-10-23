import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { COUNTRIES } from '../utils/countries.js';
import { CURRENCIES, LANGUAGES } from '../utils/options.js';

const normalize = (text) =>
  String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const namesFor = (locale, type) => {
  try {
    return new Intl.DisplayNames([locale], { type });
  } catch (error) {
    return null;
  }
};

const nameOf = (names, code, fallback) => {
  try {
    const name = names?.of(code);
    return name && name !== code ? name : fallback;
  } catch (error) {
    return fallback;
  }
};

const capitalize = (text, locale) =>
  text ? text.charAt(0).toLocaleUpperCase(locale) + text.slice(1) : text;

export function useLocalizedOptions() {
  const { language } = useAuth();

  return useMemo(() => {
    const regionNames = namesFor(language, 'region');
    const currencyNames = namesFor(language, 'currency');
    const uiLanguageNames = namesFor(language, 'language');

    const countries = COUNTRIES.map((country) => {
      const label = nameOf(regionNames, country.value, country.label);
      return { ...country, label, search: normalize(`${label} ${country.label} ${country.value}`) };
    }).sort((a, b) => a.label.localeCompare(b.label, language));

    const languages = LANGUAGES.map((item) => {
      const native = capitalize(nameOf(namesFor(item.value, 'language'), item.value, item.label), item.value);
      const localized = capitalize(nameOf(uiLanguageNames, item.value, native), language);
      const label = normalize(native) === normalize(localized) ? native : `${native} (${localized})`;
      return { ...item, label, search: normalize(`${native} ${localized} ${item.label}`) };
    });

    const currencies = CURRENCIES.map((item) => {
      const label = nameOf(currencyNames, item.value, item.label);
      return { ...item, label, search: normalize(`${label} ${item.label} ${item.value}`) };
    });

    return { countries, languages, currencies };
  }, [language]);
}
