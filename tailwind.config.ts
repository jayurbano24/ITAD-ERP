import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Paleta de colores ITAD Guatemala
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        surface: {
          50: 'rgb(var(--surface-50-rgb))',
          100: 'rgb(var(--surface-100-rgb))',
          200: 'rgb(var(--surface-200-rgb))',
          300: 'rgb(var(--surface-300-rgb))',
          400: 'rgb(var(--surface-400-rgb))',
          500: 'rgb(var(--surface-500-rgb))',
          600: 'rgb(var(--surface-600-rgb))',
          700: 'rgb(var(--surface-700-rgb))',
          800: 'rgb(var(--surface-800-rgb))',
          900: 'rgb(var(--surface-900-rgb))',
          950: 'rgb(var(--surface-950-rgb))',
        },
        // Temas específicos solicitados
        dark: {
          primary: '#0f1419',
          secondary: '#1a1f2e',
          card: '#242936',
          hover: '#2d3548',
        },
        light: {
          primary: '#ffffff',
          secondary: '#f9fafb',
          card: '#ffffff',
          hover: '#f3f4f6',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config

