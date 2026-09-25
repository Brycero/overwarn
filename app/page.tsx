"use client";

import React, { Suspense } from "react";
import { Menu } from "lucide-react";
import AppMenu from "@/components/menu/AppMenu";
import AlertOverlayLayoutDefault from "@/components/themes/default/LayoutDefault";

function LoadingOverlay() {
  return (
    <div className="fixed bottom-0 left-0 z-50 w-full">
      <div className="grid min-h-22.5 w-full grid-cols-[auto_1fr] grid-rows-2 animate-pulse bg-gray-800">
        <div className="col-span-1 row-span-1" />
        <div className="col-span-1 row-span-1" />
        <div className="col-span-1 row-span-1" />
        <div className="col-span-1 row-span-1" />
      </div>
    </div>
  );
}

export default function LiveAlertOverlay() {
  return (
    <div className="group fixed inset-0 min-h-screen w-full">
      <div className="fixed top-4 left-4 z-50">
        <AppMenu>
          <button
            type="button"
            aria-label="Open menu"
            className="rounded-md bg-black/50 p-1 opacity-0 transition-opacity duration-300 group-hover:opacity-100 data-[state=open]:opacity-100"
          >
            <Menu className="size-8 text-white" />
          </button>
        </AppMenu>
      </div>
      <Suspense fallback={<LoadingOverlay />}>
        <AlertOverlayLayoutDefault />
      </Suspense>
    </div>
  );
}
