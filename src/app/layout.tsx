import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Can I Vibecode It? — One-Day Challenge Roulette",
  description:
    "Spin a roulette to get a small, satisfying coding project you can ship in 1–8 hours with an AI coding assistant. 111 curated builds, MVP checklists, and ready-to-paste AI prompts.",
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
      <body>{children}</body>
    </html>
  );
}
