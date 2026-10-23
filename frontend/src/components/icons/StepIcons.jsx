const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export function CountryIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 21c4-4.2 6.5-8 6.5-11.2A6.5 6.5 0 0 0 5.5 9.8C5.5 13 8 16.8 12 21Z" />
      <circle cx="12" cy="9.5" r="2.4" />
    </svg>
  );
}

export function LanguageIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 5h9" />
      <path d="M8.5 3.5v2.2c0 3.6-2 6.3-4.5 8" />
      <path d="M6 9.8c1 1.7 3 3 5.5 3.4" />
      <path d="M14 21l3.5-8L21 21" />
      <path d="M15.3 18h4.4" />
    </svg>
  );
}

export function CurrencyIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="6.5" width="18" height="11" rx="2.2" />
      <path d="M8 17.5V6.5" />
      <circle cx="15" cy="12" r="2.4" />
    </svg>
  );
}
