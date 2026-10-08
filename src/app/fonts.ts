import {
  Inter,
  Playfair_Display,
  Noto_Sans_Sinhala,
  Noto_Serif_Sinhala,
  Noto_Sans_Tamil,
  Noto_Serif_Tamil,
} from "next/font/google";

/**
 * Latin fonts are preloaded. Sinhala/Tamil fonts are NOT preloaded: their @font-face rules use
 * unicode-range, so a phone only downloads them when the page actually shows that script.
 */
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap" });

const sansSi = Noto_Sans_Sinhala({ subsets: ["sinhala"], variable: "--font-sans-si", display: "swap", preload: false });
const serifSi = Noto_Serif_Sinhala({ subsets: ["sinhala"], variable: "--font-serif-si", display: "swap", preload: false });
const sansTa = Noto_Sans_Tamil({ subsets: ["tamil"], variable: "--font-sans-ta", display: "swap", preload: false });
const serifTa = Noto_Serif_Tamil({ subsets: ["tamil"], variable: "--font-serif-ta", display: "swap", preload: false });

export const fontVariables = [inter, playfair, sansSi, serifSi, sansTa, serifTa]
  .map((f) => f.variable)
  .join(" ");
