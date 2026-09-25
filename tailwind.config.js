/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        sand: {
          50: '#FDFBF7',
          100: '#F9F6F0',
          200: '#F4EFE6',
          300: '#E8DDD1',
          400: '#D6CEBF',
          500: '#C5A880',
          600: '#8E8271',
          700: '#5A5144',
          800: '#3D362E',
          900: '#2C2825',
        },
        terracotta: {
          50: '#FDF7F5',
          100: '#FAEEEA',
          200: '#F5DDD5',
          300: '#EABFB2',
          400: '#E2927C',
          500: '#D97757',
          600: '#C25D3D',
          700: '#A34628',
        },
        champagne: '#D4AF37'
      }
    },
  },
  plugins: [],
}
