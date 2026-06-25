import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Absensi KP PLTS",
  description: "Sistem absensi peserta Kerja Praktek di PLTS ITERA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
   // Di dalam app/layout.tsx
<html lang="id" suppressHydrationWarning={true}>
  <body>
    {children}
  </body>
</html>
  );
}