/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        expedition: {
          dark: '#0f1f16',
          forest: '#1b4332',
          pine: '#2d6a4f',
          moss: '#40916c',
          sage: '#74c69d',
          sand: '#fdfbf7',
          parchment: '#f4ede2',
          clay: '#e07a5f',
          terracotta: '#c95738',
          rock: '#2b2d42',
          ice: '#e0f2fe',
        }
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
