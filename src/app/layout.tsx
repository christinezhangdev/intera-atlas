import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import { Providers } from "@/components/Providers";
import { getAllSites } from "@/lib/sites";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Intera Atlas",
  description:
    "The verified org graph for clinical research — find who should meet for the next trial.",
  icons: {
    icon: [
      { url: "/favicon-64.png", sizes: "64x64", type: "image/png" },
      { url: "/atlas-mark.png", type: "image/png" },
    ],
    shortcut: "/favicon-64.png",
    apple: [{ url: "/atlas-mark.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const searchIndex = getAllSites().map((s) => ({
    id: s.id,
    name: s.name,
    hq: s.hq,
    type: s.type,
    states: s.states,
    therapeuticAreas: s.therapeuticAreas.slice(0, 160),
    sponsorsWorkedWith: s.sponsorsWorkedWith.slice(0, 120),
    scores: s.scores,
  }));

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Providers searchIndex={searchIndex}>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
