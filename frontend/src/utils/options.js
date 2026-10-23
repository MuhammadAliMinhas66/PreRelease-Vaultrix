// APPLICATION languages only: each code here must have a dictionary in
// i18n/locales and be registered in i18n/translations.js. Currencies and
// countries below/elsewhere are plain data values and never act as locales.
export const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'French, Fran\u00e7ais' },
  { value: 'es', label: 'Spanish, Espa\u00f1ol' },
  { value: 'ar', label: 'Arabic, \u0627\u0644\u0639\u0631\u0628\u064a\u0629' },
  { value: 'hi', label: 'Hindi, \u0939\u093f\u0928\u094d\u0926\u0940' },
  { value: 'ur', label: 'Urdu, \u0627\u0631\u062f\u0648' },
];

export const CURRENCIES = [
  { value: 'USD', label: 'US Dollar', symbol: '$' },
  { value: 'EUR', label: 'Euro', symbol: '\u20ac' },
  { value: 'GBP', label: 'British Pound', symbol: '\u00a3' },
  { value: 'PKR', label: 'Pakistani Rupee', symbol: '\u20a8' },
  { value: 'INR', label: 'Indian Rupee', symbol: '\u20b9' },
  { value: 'AED', label: 'UAE Dirham', symbol: '\u062f.\u0625' },
  { value: 'SAR', label: 'Saudi Riyal', symbol: '\ufdfc' },
  { value: 'CNY', label: 'Chinese Yuan', symbol: '\u00a5' },
  { value: 'JPY', label: 'Japanese Yen', symbol: '\u00a5' },
  { value: 'CAD', label: 'Canadian Dollar', symbol: '$' },
  { value: 'AUD', label: 'Australian Dollar', symbol: '$' },
  { value: 'CHF', label: 'Swiss Franc', symbol: 'Fr' },
  { value: 'TRY', label: 'Turkish Lira', symbol: '\u20ba' },
  { value: 'ZAR', label: 'South African Rand', symbol: 'R' },
  { value: 'NGN', label: 'Nigerian Naira', symbol: '\u20a6' },
  { value: 'BDT', label: 'Bangladeshi Taka', symbol: '\u09f3' },
  { value: 'IDR', label: 'Indonesian Rupiah', symbol: 'Rp' },
  { value: 'MYR', label: 'Malaysian Ringgit', symbol: 'RM' },
  { value: 'SGD', label: 'Singapore Dollar', symbol: '$' },
  { value: 'KRW', label: 'South Korean Won', symbol: '\u20a9' },
  { value: 'RUB', label: 'Russian Ruble', symbol: '\u20bd' },
  { value: 'BRL', label: 'Brazilian Real', symbol: 'R$' },
  { value: 'MXN', label: 'Mexican Peso', symbol: '$' },
  { value: 'EGP', label: 'Egyptian Pound', symbol: '\u00a3' },
  { value: 'KES', label: 'Kenyan Shilling', symbol: 'KSh' },
  { value: 'QAR', label: 'Qatari Riyal', symbol: '\ufdfc' },
  { value: 'KWD', label: 'Kuwaiti Dinar', symbol: '\u062f.\u0643' },
];

export const formatCurrency = (amountInMajorUnits, currencyCode, locale = 'en') => {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode }).format(
      amountInMajorUnits
    );
  } catch (error) {
    return `${currencyCode} ${amountInMajorUnits.toFixed(2)}`;
  }
};
