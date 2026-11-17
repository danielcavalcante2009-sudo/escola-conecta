/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { 50: "#eefaf1", 100: "#d7f2dd", 200: "#b3e5c0", 300: "#84d19a", 400: "#55b874", 500: "#349c58", 600: "#258046", 700: "#1d6639", 800: "#17512e", 900: "#123d24", 950: "#082414" },
      },
      borderRadius: { "lg": "0.625rem", "xl": "0.875rem" },
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
};
