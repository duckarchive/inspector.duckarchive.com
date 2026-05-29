import { heroui } from "@heroui/theme"

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './providers/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    "./node_modules/@heroui/theme/dist/components/*.{js,ts,jsx,tsx}",
    "./node_modules/@duckarchive/framework/dist/components/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@duckarchive/map/dist/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
        comic: ["var(--font-comic)", "cursive"],
      },
    },
  },
  darkMode: "class",
  plugins: [heroui()],
}
