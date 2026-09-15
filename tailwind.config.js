/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // <-- Tiene que estar justo aquí
  theme: {
    extend: {},
  },
  plugins: [],
}