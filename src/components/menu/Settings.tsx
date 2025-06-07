"use client";

import React, { useState, useEffect, useRef, Suspense, useReducer } from "react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "../ui/dialog";
import { Settings as SettingsIcon, FlaskConical } from "lucide-react";
import { DropdownMenuItem } from "../ui/dropdown-menu";
import { Input } from "../ui/input";
import { Checkbox } from "../ui/checkbox";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "../ui/select";
import { Button } from "../ui/button";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ALERT_TYPES } from "../../config/alertConfig";
import { TAILWIND_TO_HEX } from "../../config/alertConfig";
import { parseColorsParam, serializeColorsParam, isPassiveMode, setPassiveMode } from "../../utils/queryParamUtils";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "../ui/accordion";

const FONT_OPTIONS = [
  { label: "Default", value: "default" },
  { label: "Serif", value: "serif" },
  { label: "Monospace", value: "monospace" },
];

export function SettingsDialog({ onSeenSettings, showNewBadge }: { onSeenSettings?: () => void, showNewBadge?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  // Forcing re-render on dialog open/close
  const [, forceRender] = useReducer((x) => x + 1, 0);

  // Initialize from current query param
  const zoneParam = searchParams.get("zone") || "";
  const [zoneInput, setZoneInput] = useState(zoneParam);
  const [font, setFont] = useState(FONT_OPTIONS[0].value);

  // --- Alert Color Customization ---
  const colorsParam = searchParams.get("colors") || undefined;
  // Use a ref to stage color changes
  const stagedColors = useRef<Record<string, string>>(parseColorsParam(colorsParam));

  // When dialog opens, re-initialize stagedColors from query param
  const dialogOpenRef = useRef(false);
  const handleDialogOpenChange = (open: boolean) => {
    if (open) {
      stagedColors.current = parseColorsParam(searchParams.get("colors") || undefined);
    }
    dialogOpenRef.current = open;
    forceRender();
  };

  // Keep input in sync with query param if it changes externally
  useEffect(() => {
    setZoneInput(zoneParam);
  }, [zoneParam]);

  // --- New Alert Badge/Sound Setting ---
  const [showNewAlertBadge, setShowNewAlertBadge] = useState(() => !isPassiveMode(searchParams));
  useEffect(() => {
    setShowNewAlertBadge(!isPassiveMode(searchParams));
  }, [searchParams]);
  const handleShowNewBadgeChange = (checked: boolean) => {
    setShowNewAlertBadge(checked);
    const params = setPassiveMode(searchParams, !checked);
    router.replace(`${pathname}${params.toString() ? `?${params}` : ""}`);
  };

  // Helper to sanitize and validate zone codes
  const sanitizeZoneInput = (input: string) => {
    // Remove all spaces
    const noSpaces = input.replace(/\s+/g, "");
    // Split by comma, trim, filter valid codes, and join
    const validZones = noSpaces
      .split(",")
      .map(z => z.trim().toUpperCase())
      .filter(z => /^[A-Z]{3}\d{3}$/.test(z));
    return validZones.join(",");
  };

  // Helper to update the zone param in the URL
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
    setZoneInput(sanitized); // reflect sanitized value in input
  };

  // Handle color change for a specific alert type (staged only)
  const handleColorChange = (key: string, hex: string) => {
    stagedColors.current = { ...stagedColors.current, [key]: hex };
    forceRender();
  };

  // Reset to default colors (staged only)
  const handleResetColors = () => {
    stagedColors.current = {};
    forceRender();
  };

  // Update the 'colors' param in the URL (called only on dialog close)
  const commitColorsToUrl = () => {
    const params = new URLSearchParams(searchParams.toString());
    const serialized = serializeColorsParam(stagedColors.current);
    if (serialized) {
      params.set("colors", serialized);
    } else {
      params.delete("colors");
    }
    const queryString = params.toString().replace(/%2C/g, ",");
    router.replace(`${pathname}${queryString ? `?${queryString}` : ""}`);
  };

  // Handle submit (Enter) or blur
  const handleZoneInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      updateZoneParam(zoneInput);
      if (inputRef.current) inputRef.current.blur();
    }
  };
  const handleZoneInputBlur = () => {
    updateZoneParam(zoneInput);
  };

  // On input change, remove spaces immediately
  const handleZoneInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const noSpaces = e.target.value.replace(/\s+/g, "");
    setZoneInput(noSpaces);
  };
  
  // Set seenSettings to true when Settings is clicked
  const handleSettingsClick = () => {
    localStorage.setItem("seenSettings", "true");
    if (onSeenSettings) onSeenSettings();
  };

  return (
    <Suspense fallback={null}>
      <Dialog onOpenChange={handleDialogOpenChange}>
        <DropdownMenuItem asChild onSelect={e => e.preventDefault()} onClick={handleSettingsClick}>
          <DialogTrigger asChild>
            <button type="button" className="w-full flex items-center gap-2">
              <SettingsIcon className="w-4 h-4" />
              Settings
              {showNewBadge && (
                <span className="ml-2 bg-blue-500 px-1.5 py-0.5 rounded text-xs font-medium text-white tracking-wider">NEW</span>
              )}
            </button>
          </DialogTrigger>
        </DropdownMenuItem>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SettingsIcon className="w-5 h-5" /> Settings
            </DialogTitle>
            <DialogDescription>
              Configure settings for your Overwarn overlay.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-6 mt-2" onSubmit={e => e.preventDefault()}>
            <div className="flex items-center gap-2">
              <Checkbox
                id="show-new-badge-checkbox"
                checked={showNewAlertBadge}
                onCheckedChange={checked => handleShowNewBadgeChange(!!checked)}
              />
              <label htmlFor="show-new-badge-checkbox" className="text-sm font-medium select-none">
                Show newly issued alerts immediately and play sound
              </label>
            </div>
            <div>
              <label htmlFor="zone-input" className="block text-sm font-medium">
                Filter by NWS API Counties/Zones (comma separated)
              </label>
              <label className="text-xs text-muted-foreground">
                Create a custom area you&apos;d like to see alerts for.
              </label>
              <Input
                id="zone-input"
                type="text"
                className="w-full rounded-md border px-3 py-2 text-sm bg-background mt-2"
                placeholder="e.g. TXC123,OKZ456"
                value={zoneInput}
                onChange={handleZoneInputChange}
                onKeyDown={handleZoneInputKeyDown}
                onBlur={handleZoneInputBlur}
                autoComplete="off"
                ref={inputRef}
              />
            </div>
            <div>
              <label htmlFor="font-select" className="block text-sm font-medium mb-1">
                Font
              </label>
              <Select
                value={font}
                onValueChange={setFont}
                disabled
              >
                <SelectTrigger className="w-full rounded-md border px-3 py-2 text-sm bg-background">
                  <SelectValue placeholder="Select font" />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="bg-muted px-1.5 py-0.5 rounded text-xs font-medium text-muted-foreground uppercase tracking-wider">Coming Soon</span>
            </div>
            <Accordion type="single" collapsible className="border rounded-md bg-muted/30 hover:bg-muted/50 focus:bg-muted/50">
              <AccordionItem value="alert-colors">
                <AccordionTrigger className="px-2 text-sm font-medium flex items-center gap-2 ml-2 hover:no-underline focus:no-underline">
                  Custom Colors
                  <span className="flex items-center gap-1 ml-auto text-muted-foreground text-xs font-medium uppercase">
                    <FlaskConical className="w-4 h-4 text-muted-foreground" />
                    Experimental
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    {ALERT_TYPES.map(type => (
                      <div
                        key={type.key}
                        className="flex items-center gap-4 pl-4 py-2 rounded-md bg-background hover:bg-muted/50 transition-colors"
                      >
                        <span className="w-44 text-sm font-semibold text-left">{type.label}</span>
                        <input
                          type="color"
                          value={stagedColors.current[type.key] || TAILWIND_TO_HEX[type.color] || "#404040"}
                          onChange={e => handleColorChange(type.key, e.target.value)}
                          className="w-8 h-8 border rounded shadow-sm"
                          aria-label={`Color for ${type.label}`}
                        />
                        <input
                          type="text"
                          value={stagedColors.current[type.key] || TAILWIND_TO_HEX[type.color] || "#404040"}
                          onChange={e => {
                            const val = e.target.value;
                            // Only update if valid hex (allow #RGB or #RRGGBB)
                            if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(val)) {
                              handleColorChange(type.key, val);
                            } else {
                              // Allow user to type, but don't update color until valid
                              stagedColors.current = { ...stagedColors.current, [type.key]: val };
                              forceRender();
                            }
                          }}
                          onBlur={e => {
                            const val = e.target.value;
                            if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(val)) {
                              // Revert to last valid color
                              stagedColors.current = { ...stagedColors.current, [type.key]: stagedColors.current[type.key] || TAILWIND_TO_HEX[type.color] || "#404040" };
                              forceRender();
                            }
                          }}
                          onKeyDown={e => {
                            if (e.key === "Enter") {
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                          className="ml-2 w-24 px-2 py-1 text-xs rounded border bg-background text-muted-foreground focus:text-foreground focus:border-primary outline-none transition-colors"
                          aria-label={`Hex code for ${type.label}`}
                          spellCheck={false}
                          maxLength={7}
                        />
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    className="mt-2 px-3 py-1 text-xs font-medium ml-4"
                    variant="outline"
                    onClick={handleResetColors}
                  >
                    Reset to Default
                  </Button>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </form>
          <DialogFooter>
            <DialogClose asChild>
              <Button
                type="button"
                className="mt-2"
                variant="default"
                onClick={() => {
                  updateZoneParam(zoneInput);
                  commitColorsToUrl();
                }}
              >
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Suspense>
  );
}
