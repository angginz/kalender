import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/lib/theme-context";
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
  title: {
    default: "Aplikasi Kalender & Jadwal Sholat Indonesia",
    template: "%s | Aplikasi Indonesia"
  },
  description: "Aplikasi lengkap untuk kalender Indonesia dengan hari libur nasional dan jadwal sholat untuk seluruh kota di Indonesia.",
  keywords: "kalender indonesia, jadwal sholat, hari libur, aplikasi indonesia",
  authors: [{ name: "Developer Indonesia" }],
  creator: "Developer Indonesia",
  publisher: "Aplikasi Indonesia",
  robots: "index, follow",
  openGraph: {
    title: "Aplikasi Kalender & Jadwal Sholat Indonesia",
    description: "Aplikasi lengkap untuk kalender Indonesia dengan hari libur nasional dan jadwal sholat",
    type: "website",
    locale: "id_ID",
    siteName: "Aplikasi Indonesia",
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
