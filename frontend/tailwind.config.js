/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        background: '#ffffff',
        surface: '#f7f7f8',
        border: '#e5e5e7',
        ink: '#111114',
        muted: '#6b6b70',
        accent: '#1a1a1e',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Syne', '"Arial Black"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
