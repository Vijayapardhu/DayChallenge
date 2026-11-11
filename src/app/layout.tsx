import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Outfit, Playfair_Display, Space_Mono } from "next/font/google";
import "./globals.css";

const bebas = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-spacemono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Can I Vibecode It? — One-Day Challenge Roulette",
  description:
    "Spin a mechanical roulette to get a small, satisfying coding project you can ship in 1–8 hours with an AI coding assistant. 115 curated builds, MVP checklists, and ready-to-paste AI prompts.",
  applicationName: "Can I Vibecode It?",
  keywords: [
    "vibecoding",
    "coding challenge",
    "one day build",
    "project ideas",
    "roulette",
    "ai coding",
  ],
  openGraph: {
    title: "Can I Vibecode It?",
    description:
      "A one-day coding challenge roulette. Spin for a small project you can actually ship today.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0a0705",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${bebas.variable} ${outfit.variable} ${playfair.variable} ${spaceMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}