import { Fira_Code, Inter } from "next/font/google";
import localFont from 'next/font/local'

export const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const fontMono = Fira_Code({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const fontComic = localFont({
  src: '../public/fonts/CCJimLee/CCJimLee.ttf',
  variable: "--font-comic",
})