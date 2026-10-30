"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ALERT_TYPES, TAILWIND_TO_HEX } from "@/config/alertConfig";
import {
  isHexColor,
  normalizeHex,
  parseColorsParam,
  serializeColorsParam,
  isPassiveMode,
  setPassiveMode,
} from "@/utils/queryParamUtils";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-4 overflow-hidden sm:max-w-xl">
        <SettingsContent />
      </DialogContent>
    </Dialog>
  );
}

function SettingsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [zoneInput, setZoneInput] = useState(() => searchParams.get("zone") || "");
  const [stagedColors, setStagedColors] = useState(() =>
    parseColorsParam(searchParams.get("colors") || undefined),
  );
  const [colorInputs, setColorInputs] = useState<Record<string, string>>({});

  const showNewAlertBadge = !isPassiveMode(searchParams);
  const handleShowNewBadgeChange = (checked: boolean) => {
    const params = setPassiveMode(searchParams, !checked);
    router.replace(`${pathname}${params.toString() ? `?${params}` : ""}`);
  };

  const sanitizeZoneInput = (input: string) => {
    const noSpaces = input.replace(/\s+/g, "");
    return noSpaces
      .split(",")
      .map((z) => z.trim().toUpperCase())
      .filter((z) => /^[A-Z]{3}\d{3}$/.test(z))
      .join(",");
  };

  const updateZoneParam = (newZone: string) => {
    const sanitized = sanitizeZoneInput(newZone);
    const params = new URLSearchParams(searchParams.toString());
    if (sanitized) {
      params.set("zone", sanitized);
    } else {
      params.delete("zone");
    }
    const queryString = params.toString().replace(/%2C/g, ",");
    router.replace(`${pathname}${queryString ? `?${queryString}` : ""}`);
    setZoneInput(sanitized);
  };

  const handleColorChange = (key: string, hex: string) => {
    setStagedColors((colors) => ({ ...colors, [key]: normalizeHex(hex) }));
    setColorInputs((inputs) => ({ ...inputs, [key]: hex }));
  };

  const handleResetColors = () => {
    setStagedColors({});
    setColorInputs({});
  };

  const handleSaveAndClose = () => {
    const params = new URLSearchParams(searchParams.toString());
    const zone = sanitizeZoneInput(zoneInput);
    if (zone) params.set("zone", zone);
    else params.delete("zone");
    const colors = serializeColorsParam(stagedColors);
    if (colors) params.set("colors", colors);
    else params.delete("colors");
    const queryString = params.toString().replace(/%2C/g, ",");
    router.replace(`${pathname}${queryString ? `?${queryString}` : ""}`);
  };

  const handleZoneInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.currentTarget.blur();
    }
  };

  const handleZoneInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setZoneInput(e.target.value.replace(/\s+/g, ""));
  };

  const getHexForType = (key: string, fallbackColor: string) =>
    stagedColors[key] || TAILWIND_TO_HEX[fallbackColor] || "#404040";

  return (
    <>
      <DialogHeader>
        <DialogTitle>Settings</DialogTitle>
        <DialogDescription>
          Configure how your Overwarn overlay behaves and appears.
        </DialogDescription>
      </DialogHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
        <FieldGroup>
          <Field orientation="horizontal">
            <Checkbox
              id="passive-mode-checkbox"
              checked={showNewAlertBadge}
              onCheckedChange={(checked) => handleShowNewBadgeChange(!!checked)}
            />
            <FieldContent>
              <FieldLabel htmlFor="passive-mode-checkbox">
                Show newly issued alerts immediately and play sound
              </FieldLabel>
              <FieldDescription>
                When disabled, Overwarn cycles through active alerts without
                interrupting when new alerts are issued.
              </FieldDescription>
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor="zone-input">
              Filter by NWS counties/zones
            </FieldLabel>
            <FieldDescription>
              Comma-separated zone codes (e.g. TXC123, OKZ456).
            </FieldDescription>
            <Input
              id="zone-input"
              type="text"
              placeholder="TXC123,OKZ456"
              value={zoneInput}
              onChange={handleZoneInputChange}
              onKeyDown={handleZoneInputKeyDown}
              onBlur={() => updateZoneParam(zoneInput)}
              autoComplete="off"
            />
          </Field>
        </FieldGroup>

        <Separator />

        <Accordion className="rounded-lg border border-border">
          <AccordionItem value="custom-colors" className="border-b-0">
            <AccordionTrigger className="px-3 hover:no-underline">
              Custom colors
            </AccordionTrigger>
            <AccordionContent className="flex flex-col gap-4 border-t px-3 pt-3 pb-4">
              <div className="flex flex-col gap-3">
                {ALERT_TYPES.map((type) => {
                  const hex = getHexForType(type.key, type.color);
                  return (
                    <div
                      key={type.key}
                      className="flex flex-col gap-2 sm:grid sm:grid-cols-[10rem_1fr] sm:items-center sm:gap-3"
                    >
                      <label
                        htmlFor={`color-${type.key}`}
                        className="text-sm leading-snug"
                      >
                        {type.label}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          id={`color-${type.key}`}
                          type="color"
                          value={hex}
                          onChange={(e) =>
                            handleColorChange(type.key, e.target.value)
                          }
                          className="size-8 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
                          aria-label={`Color for ${type.label}`}
                        />
                        <Input
                          className="min-w-0 flex-1 font-mono"
                          value={colorInputs[type.key] ?? hex}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (isHexColor(val)) {
                              handleColorChange(type.key, val);
                            } else {
                              setColorInputs((inputs) => ({ ...inputs, [type.key]: val }));
                            }
                          }}
                          onBlur={() => {
                            setColorInputs((inputs) => ({ ...inputs, [type.key]: hex }));
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.currentTarget.blur();
                            }
                          }}
                          aria-label={`Hex code for ${type.label}`}
                          spellCheck={false}
                          maxLength={7}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={handleResetColors}
              >
                Reset to defaults
              </Button>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      <DialogFooter showCloseButton={false} className="shrink-0">
        <DialogClose
          render={<Button type="button" onClick={handleSaveAndClose} />}
        >
          Done
        </DialogClose>
      </DialogFooter>
    </>
  );
}
