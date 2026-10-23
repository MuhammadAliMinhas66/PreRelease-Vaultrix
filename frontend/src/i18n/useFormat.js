import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const resolveLocale = (language) => {
  try {
    return Intl.NumberFormat.supportedLocalesOf([language]).length ? language : 'en';
  } catch (error) {
    return 'en';
  }
};

export function useFormat() {
  const { language, currency } = useAuth();

  return useMemo(() => {
    const locale = resolveLocale(language);

    const formatNumber = (value, options) => new Intl.NumberFormat(locale, options).format(value);

    const formatMoney = (value, { decimals = 0, signed = false, currency: code = currency } = {}) => {
      const base = { minimumFractionDigits: decimals, maximumFractionDigits: decimals };
      if (signed) base.signDisplay = 'exceptZero';
      if (code) {
        try {
          return new Intl.NumberFormat(locale, {
            ...base,
            style: 'currency',
            currency: code,
            currencyDisplay: 'narrowSymbol',
          }).format(value);
        } catch (error) {
          // unknown currency code, fall through to a plain number
        }
      }
      return new Intl.NumberFormat(locale, base).format(value);
    };

    const formatPercent = (fraction) => formatNumber(fraction, { style: 'percent', maximumFractionDigits: 0 });

    const formatDate = (date, options = { day: 'numeric', month: 'short' }) =>
      new Intl.DateTimeFormat(locale, options).format(date);

    const formatMonth = (date) => formatDate(date, { month: 'long' });

    const formatTime = (date) => formatDate(date, { hour: 'numeric', minute: '2-digit' });

    return { locale, currency, formatNumber, formatMoney, formatPercent, formatDate, formatMonth, formatTime };
  }, [language, currency]);
}
