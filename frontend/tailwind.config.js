/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  safelist: [
    'print-a6-sheet',
    'text-right',
    'text-left',
    'flex-row',
    'flex-row-reverse',
    'grid-cols-2',
    'grid-cols-3',
    'grid-cols-4',
    '[direction:ltr]',
    '[unicode-bidi:embed]',
    'bg-slate-50/40',
    'bg-blue-50/70',
    'border-blue-500',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      colors: {
        primary: {
          50:  '#EFF6FF', 100: '#DBEAFE', 200: '#BFDBFE',
          300: '#93C5FD', 400: '#60A5FA', 500: '#3B82F6',
          600: '#2563EB', 700: '#1D4ED8', 800: '#1E40AF', 900: '#1E3A8A',
        },
      },
    },
  },
  plugins: [],
};
