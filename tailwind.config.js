/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#FFF5F2',
          100: '#FFE8E0',
          200: '#FFD4C7',
          300: '#FFB5A0',
          400: '#FF8F6B',
          500: '#FF6B45',
          600: '#E85A38',
          700: '#C44B2E',
          800: '#A03D26',
          900: '#7C2F1E',
        },
      },
    },
  },
  plugins: [],
}
