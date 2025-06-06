import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeProvider from "../components/providers/ThemeProvider";
import { AlertOverlayProvider } from "../components/providers/AlertOverlayProvider";
import React, { Suspense } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Overwarn",
  description: "Real-time weather alert overlay for your live stream. Just add a browser source to your streaming software and start streaming.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Suspense>
          <AlertOverlayProvider>
            <ThemeProvider />
            {children}
          </AlertOverlayProvider>
        </Suspense>
      </body>
    </html>
  );
}
