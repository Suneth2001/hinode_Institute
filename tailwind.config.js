/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hinode: {
          green: '#00B140',
          orange: '#FF671F',
          yellow: '#FEDD00', // Pantone Yellow C
        }
      }
    },
  },
  plugins: [],
}
