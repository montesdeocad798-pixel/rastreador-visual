/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      keyframes: {
        scanLine: {
          '0%, 100%': { top: '0%' },
          '50%': { top: 'calc(100% - 2px)' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'scan-line': 'scanLine 2.5s ease-in-out infinite',
        'fade-up': 'fadeUp 0.4s ease-out both',
      },
    },
  },
  plugins: [],
}
