"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Code, Scale } from "lucide-react";
import Image from "next/image";

const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || "Dev";
const currentYear = new Date().getFullYear();

export function AboutDialog({
  open,
  onOpenChange,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <div className="flex flex-col items-center gap-3">
          <Image
            src="/icon.svg"
            alt=""
            width={64}
            height={64}
            priority
            className="size-16 rounded-xl shadow-sm"
          />
          <DialogHeader className="w-full items-center text-center sm:text-center">
            <DialogTitle>Overwarn</DialogTitle>
            <DialogDescription>Version {appVersion}</DialogDescription>
          </DialogHeader>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Created by{" "}
          <a
            href="https://github.com/Brycero"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
          >
            Brycero
          </a>
        </p>

        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            className="w-full justify-start"
            nativeButton={false}
            render={
              <a
                href="https://github.com/Brycero/overwarn/blob/main/LICENSE"
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            <Scale data-icon="inline-start" />
            GPL-3.0 License
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            nativeButton={false}
            render={
              <a
                href="https://github.com/brycero/overwarn"
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            <Code data-icon="inline-start" />
            View on GitHub
          </Button>
        </div>

        <Separator />

        <div className="flex flex-col gap-1 text-center text-sm text-muted-foreground">
          <p>&copy; {currentYear} Mirra</p>
          <p>
            A{" "}
            <a
              href="https://mirra.tv"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
            >
              Mirra
            </a>{" "}
            product
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
