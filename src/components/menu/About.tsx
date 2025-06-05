"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { Code, Scale } from "lucide-react";
import Image from "next/image";
import React from "react";

const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || "Dev";
const currentYear = new Date().getFullYear();

export function AboutDialog({ open, onOpenChange }: { open?: boolean, onOpenChange?: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-sm flex flex-col items-center text-center">
        <DialogHeader>
          <div className="flex flex-col items-center justify-center gap-1 mt-2">
            <Image src="/icon.svg" alt="Overwarn Logo" width={64} height={64} priority className="shadow" />
            <DialogTitle className="text-2xl font-bold mt-1">Overwarn</DialogTitle>
            <DialogDescription className="text-base mt-0.5">v{appVersion}</DialogDescription>
          </div>
        </DialogHeader>
        <div className="mt-2 text-sm text-muted-foreground">Created by <span className="font-semibold">Brycero</span></div>
        <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground hover:text-primary">
          <a
            href="https://www.gnu.org/licenses/gpl-3.0.html"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1"
          >
            <Scale className="w-4 h-4" />
            GPL-3.0 License
          </a>
        </div>
        <div className="text-sm text-muted-foreground hover:text-primary">
          <a href="https://github.com/brycero/overwarn" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
            <Code className="w-4 h-4" />
            View on GitHub
          </a>
        </div>
        <DialogFooter className="w-full mt-4 flex items-center !flex-col !gap-1 !justify-center">
          <div className="text-center text-xs text-muted-foreground opacity-80">&copy; {currentYear} Mirra</div>
          <div className="text-center text-xs text-muted-foreground opacity-80">A <span className="font-semibold">Mirra</span> product</div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
