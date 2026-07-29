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
        label: ["var(--font-label)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
        comic: ["var(--font-comic)", "cursive"],
      },
      // DESIGN.md typography scale
      fontSize: {
        "display-lg": ["4rem", { lineHeight: "1.1", letterSpacing: "-0.04em", fontWeight: "800" }],
        "headline-lg": ["2.5rem", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-lg-mobile": ["2rem", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-md": ["1.5rem", { lineHeight: "1.3", letterSpacing: "-0.01em", fontWeight: "600" }],
        "body-lg": ["1.125rem", { lineHeight: "1.6", letterSpacing: "-0.01em" }],
        "body-md": ["0.9375rem", { lineHeight: "1.5" }],
        "label-sm": ["0.75rem", { lineHeight: "1", letterSpacing: "0.05em", fontWeight: "600" }],
      },
      // DESIGN.md rounded scale (rounded-xl = hero cards)
      borderRadius: {
        sm: "0.25rem",
        DEFAULT: "0.5rem",
        md: "0.75rem",
        lg: "1rem",
        xl: "1.5rem",
      },
      maxWidth: {
        container: "75rem", // 1200px fixed grid
      },
      spacing: {
        gutter: "2rem", // 32px grid gutter
        section: "8rem", // 128px section gap (desktop)
        "section-mobile": "4rem", // 64px section gap (mobile)
      },
    },
  },
  darkMode: "class",
  plugins: [heroui({
    themes: {
      light: {
        colors: {
          background: "#ffffff",
          foreground: "#1d1d1f",
          divider: "#d2d2d7",
          focus: "#ff5c00",
          content1: "#ffffff",
          content2: "#f5f5f7",
          content3: "#e8e8ed",
          content4: "#d2d2d7",
          default: {
            50: "#f5f5f7",
            100: "#e8e8ed",
            200: "#d2d2d7",
            300: "#aeaeb2",
            400: "#86868b",
            500: "#6e6e73",
            600: "#515154",
            700: "#424245",
            800: "#2c2c2e",
            900: "#1d1d1f",
            DEFAULT: "#d2d2d7",
            foreground: "#1d1d1f",
          },
          primary: {
            50: "#fff3ed",
            100: "#ffdbce",
            200: "#ffb59a",
            300: "#ff9166",
            400: "#ff7433",
            500: "#ff5c00",
            600: "#d44b00",
            700: "#a73a00",
            800: "#802a00",
            900: "#521800",
            DEFAULT: "#ff5c00",
            foreground: "#ffffff",
          },
          secondary: {
            DEFAULT: "#5f5e60",
            foreground: "#ffffff",
          },
          danger: {
            DEFAULT: "#ba1a1a",
            foreground: "#ffffff",
          },
        },
        layout: {
          radius: {
            small: "0.25rem",
            medium: "0.5rem",
            large: "1rem",
          },
          boxShadow: {
            small: "0px 0px 24px 0px rgb(0 0 0 / 0.03)",
            medium: "0px 0px 40px 0px rgb(0 0 0 / 0.04)",
            large: "0px 10px 50px 0px rgb(0 0 0 / 0.08)",
          },
        },
      },
      dark: {
        colors: {
          background: "#000000",
          foreground: "#f5f5f7",
          divider: "#424245",
          focus: "#ff5c00",
          content1: "#1d1d1f",
          content2: "#2c2c2e",
          content3: "#3a3a3c",
          content4: "#48484a",
          default: {
            50: "#1d1d1f",
            100: "#2c2c2e",
            200: "#3a3a3c",
            300: "#48484a",
            400: "#636366",
            500: "#8e8e93",
            600: "#aeaeb2",
            700: "#d2d2d7",
            800: "#e8e8ed",
            900: "#f5f5f7",
            DEFAULT: "#3a3a3c",
            foreground: "#f5f5f7",
          },
          primary: {
            50: "#521800",
            100: "#802a00",
            200: "#a73a00",
            300: "#d44b00",
            400: "#ff7433",
            500: "#ff5c00",
            600: "#ff9166",
            700: "#ffb59a",
            800: "#ffdbce",
            900: "#fff3ed",
            DEFAULT: "#ff5c00",
            foreground: "#ffffff",
          },
          secondary: {
            DEFAULT: "#c8c6c8",
            foreground: "#1d1d1f",
          },
          danger: {
            DEFAULT: "#ff5449",
            foreground: "#ffffff",
          },
        },
        layout: {
          radius: {
            small: "0.25rem",
            medium: "0.5rem",
            large: "1rem",
          },
          boxShadow: {
            small: "0px 0px 24px 0px rgb(0 0 0 / 0.3)",
            medium: "0px 0px 40px 0px rgb(0 0 0 / 0.35)",
            large: "0px 10px 50px 0px rgb(0 0 0 / 0.45)",
          },
        },
      },
    },
  })],
}
