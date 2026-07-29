import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";

export const fontSans = localFont({
  src: [
    { path: "../public/fonts/San-Francisco-Pro/SF-Pro-Text-Thin.otf", weight: "100", style: "normal" },
    { path: "../public/fonts/San-Francisco-Pro/SF-Pro-Text-ThinItalic.otf", weight: "100", style: "italic" },
    { path: "../public/fonts/San-Francisco-Pro/SF-Pro-Text-Ultralight.otf", weight: "200", style: "normal" },
    { path: "../public/fonts/San-Francisco-Pro/SF-Pro-Text-UltralightItalic.otf", weight: "200", style: "italic" },
    { path: "../public/fonts/San-Francisco-Pro/SF-Pro-Text-Light.otf", weight: "300", style: "normal" },
    { path: "../public/fonts/San-Francisco-Pro/SF-Pro-Text-LightItalic.otf", weight: "300", style: "italic" },
    { path: "../public/fonts/San-Francisco-Pro/SF-Pro-Text-Regular.otf", weight: "400", style: "normal" },
    { path: "../public/fonts/San-Francisco-Pro/SF-Pro-Text-RegularItalic.otf", weight: "400", style: "italic" },
    { path: "../public/fonts/San-Francisco-Pro/SF-Pro-Text-Medium.otf", weight: "500", style: "normal" },
    { path: "../public/fonts/San-Francisco-Pro/SF-Pro-Text-MediumItalic.otf", weight: "500", style: "italic" },
    { path: "../public/fonts/San-Francisco-Pro/SF-Pro-Text-Semibold.otf", weight: "600", style: "normal" },
    { path: "../public/fonts/San-Francisco-Pro/SF-Pro-Text-SemiboldItalic.otf", weight: "600", style: "italic" },
    { path: "../public/fonts/San-Francisco-Pro/SF-Pro-Text-Bold.otf", weight: "700", style: "normal" },
    { path: "../public/fonts/San-Francisco-Pro/SF-Pro-Text-BoldItalic.otf", weight: "700", style: "italic" },
    { path: "../public/fonts/San-Francisco-Pro/SF-Pro-Text-Heavy.otf", weight: "800", style: "normal" },
    { path: "../public/fonts/San-Francisco-Pro/SF-Pro-Text-HeavyItalic.otf", weight: "800", style: "italic" },
    { path: "../public/fonts/San-Francisco-Pro/SF-Pro-Text-Black.otf", weight: "900", style: "normal" },
    { path: "../public/fonts/San-Francisco-Pro/SF-Pro-Text-BlackItalic.otf", weight: "900", style: "italic" },
  ],
  variable: "--font-sans",
});

// labels, chips, metadata — DESIGN.md `font-label`
export const fontLabel = Geist({
  subsets: ["latin", "cyrillic"],
  variable: "--font-label",
});

// archival codes, tabular data points — DESIGN.md `font-mono`
export const fontMono = Geist_Mono({
  subsets: ["latin", "cyrillic"],
  variable: "--font-mono",
});

export const fontComic = localFont({
  src: "../public/fonts/CCJimLee/CCJimLee.ttf",
  variable: "--font-comic",
});
