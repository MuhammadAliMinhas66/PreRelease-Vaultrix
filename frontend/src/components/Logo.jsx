import { Link } from 'react-router-dom';

const sizes = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-5xl xl:text-6xl',
};

function Logo({ size = 'md', dark = false, className = '', linkTo = null }) {
  const mark = (
    <span
      className={`uppercase leading-none tracking-wide ${sizes[size]} ${
        dark ? 'text-white' : 'text-ink'
      } ${className}`}
      style={{ fontFamily: "'Anton', 'Inter', sans-serif" }}
    >
      Vaultrix
    </span>
  );

  if (!linkTo) return mark;

  return (
    <Link to={linkTo} aria-label="Vaultrix" className="rounded-sm outline-none transition hover:opacity-80 focus-visible:ring-2 focus-visible:ring-accent/40">
      {mark}
    </Link>
  );
}

export default Logo;
