/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Apple design system colors
        'apple-blue': {
          DEFAULT: '#007AFF',
          50: '#E9F3FF',
          100: '#D0E6FF',
          200: '#A1CDFF',
          300: '#71B4FF',
          400: '#419BFF',
          500: '#007AFF',
          600: '#0062CC',
          700: '#004999',
          800: '#003166',
          900: '#001833',
        },
        'apple-indigo': {
          DEFAULT: '#5856D6',
          50: '#EEEEFE',
          100: '#DCDCFD',
          200: '#B9B8FA',
          300: '#9795F7',
          400: '#7472F4',
          500: '#5856D6',
          600: '#3734BE',
          700: '#292789',
          800: '#1B1A58',
          900: '#0E0D2C',
        },
        'apple-purple': {
          DEFAULT: '#AF52DE',
          50: '#F6EAFC',
          100: '#EED5FA',
          200: '#DCACF5',
          300: '#CB83EF',
          400: '#BA5AEA',
          500: '#AF52DE',
          600: '#8F2FC2',
          700: '#6B2391',
          800: '#471861',
          900: '#230C30',
        },
        'apple-green': {
          DEFAULT: '#34C759',
          50: '#E8F9EE',
          100: '#D1F4DD',
          200: '#A3E9BB',
          300: '#75DE99',
          400: '#47D377',
          500: '#34C759',
          600: '#299F47',
          700: '#1F7735',
          800: '#144F23',
          900: '#0A2812',
        },
        'apple-yellow': {
          DEFAULT: '#FFCC00',
          50: '#FFF9E6',
          100: '#FFF3CC',
          200: '#FFE799',
          300: '#FFDB66',
          400: '#FFCF33',
          500: '#FFCC00',
          600: '#CCA300',
          700: '#997A00',
          800: '#665200',
          900: '#332900',
        },
        'apple-orange': {
          DEFAULT: '#FF9500',
          50: '#FFF1E6',
          100: '#FFE3CC',
          200: '#FFC799',
          300: '#FFAB66',
          400: '#FF8F33',
          500: '#FF9500',
          600: '#CC7700',
          700: '#995900',
          800: '#663C00',
          900: '#331E00',
        },
        'apple-red': {
          DEFAULT: '#FF3B30',
          50: '#FFE9E8',
          100: '#FFD4D1',
          200: '#FFA9A3',
          300: '#FF7E75',
          400: '#FF5347',
          500: '#FF3B30',
          600: '#F01408',
          700: '#B30F06',
          800: '#750A04',
          900: '#380502',
        },
        'apple-gray': {
          DEFAULT: '#8E8E93',
          50: '#F5F5F7',
          100: '#E5E5EA',
          200: '#D1D1D6',
          300: '#C7C7CC',
          400: '#AEAEB2',
          500: '#8E8E93',
          600: '#636366',
          700: '#48484A',
          800: '#3A3A3C',
          900: '#2C2C2E',
        },
        // Default Tailwind colors are kept as fallback

        // CSS variables for theming
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: 'var(--card)',
        'card-foreground': 'var(--card-foreground)',
        primary: 'var(--primary)',
        'primary-foreground': 'var(--primary-foreground)',
        secondary: 'var(--secondary)',
        'secondary-foreground': 'var(--secondary-foreground)',
        muted: 'var(--muted)',
        'muted-foreground': 'var(--muted-foreground)',
        accent: 'var(--accent)',
        'accent-foreground': 'var(--accent-foreground)',
        destructive: 'var(--destructive)',
        'destructive-foreground': 'var(--destructive-foreground)',
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'San Francisco',
          'Helvetica Neue',
          'Arial',
          'sans-serif'
        ],
      },
      borderRadius: {
        'apple': '10px',
        'apple-lg': '20px',
        'apple-full': '9999px',
      },
      boxShadow: {
        'apple-sm': '0 1px 2px rgba(0, 0, 0, 0.05)',
        'apple': '0 2px 10px rgba(0, 0, 0, 0.05)',
        'apple-md': '0 4px 12px rgba(0, 0, 0, 0.08)',
        'apple-lg': '0 10px 20px rgba(0, 0, 0, 0.1)',
        'apple-xl': '0 20px 30px rgba(0, 0, 0, 0.12)',
      },
      opacity: {
        '15': '0.15',
        '85': '0.85',
      },
    },
  },
  plugins: [],
}