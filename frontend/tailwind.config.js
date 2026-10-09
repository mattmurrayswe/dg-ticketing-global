/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        markazi: ["'Markazi Text'", 'serif'],
        righteous: ["'Righteous'", 'cursive', 'sans-serif'],
        exo: ["'Exo 2'", 'sans-serif'],
        figtree: ["'Figtree'", 'sans-serif'],
      },
      colors: {
        dg: {
          dark: "#08090b",
          card: "#0f1117",
          panel: "#151720",
          border: "#1e222e",
          cyan: "#00f0ff",
          purple: "#8b5cf6",
          red: "#ef4444",
          gold: "#f59e0b"
        }
      },
      boxShadow: {
        neonCyan: "0 0 20px rgba(0, 240, 255, 0.25)",
        cardGlow: "0 8px 32px 0 rgba(0, 0, 0, 0.6)"
      }
    },
  },
  plugins: [],
}
