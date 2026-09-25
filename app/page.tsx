"use client";
import React, { Suspense } from "react";
import { Geist } from "next/font/google";
import { Menu } from "lucide-react";
import AppMenu from "../components/menu/AppMenu";
import AlertOverlayLayoutDefault from "../components/themes/default/LayoutDefault";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

function LoadingOverlay() {
  return (
    <div className={`fixed bottom-0 left-0 w-full z-50 ${geistSans.variable}`}>
      <div className="grid grid-cols-[auto_1fr] grid-rows-2 w-full min-h-[90px] bg-gray-800 animate-pulse">
        <div className="col-span-1 row-span-1"></div>
        <div className="col-span-1 row-span-1"></div>
        <div className="col-span-1 row-span-1"></div>
        <div className="col-span-1 row-span-1"></div>
      </div>
    </div>
  );
}

export default function LiveAlertOverlay() {
  return (
    <div className="group min-h-screen w-full fixed inset-0">
      <div className="fixed top-4 left-4 z-50">
        <AppMenu>
          <button
            aria-label="Open menu"
            className="opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 transition-opacity duration-300 bg-black/50 p-1 rounded-md"
          >
            <Menu className="w-8 h-8 text-white" />
          </button>
        </AppMenu>
      </div>
      <Suspense fallback={<LoadingOverlay />}>
        <AlertOverlayLayoutDefault />
      </Suspense>
    </div>
  );
}
