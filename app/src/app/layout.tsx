import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ProgressProvider } from "@/context/ProgressContext";
import type { Curriculum } from "@/lib/types";
import { promises as fs } from "fs";
import path from "path";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "CFA Level 3 — Study Platform",
  description: "Personal study platform for CFA Level 3",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0f172a",
};

async function getCurriculum(): Promise<Curriculum | null> {
  try {
    const filePath = path.join(process.cwd(), "public", "content", "curriculum.json");
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as Curriculum;
  } catch {
    return null;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const curriculum = await getCurriculum();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}>
        <ProgressProvider curriculum={curriculum}>
          {children}
        </ProgressProvider>
      </body>
    </html>
  );
}
