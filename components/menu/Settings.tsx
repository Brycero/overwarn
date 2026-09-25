"use client";

import React, { useState, useEffect, useRef, Suspense, useReducer } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Settings as SettingsIcon } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  onSeenSettings,
  showNewBadge,
}: {
  onSeenSettings?: () => void;
  showNewBadge?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  const [, forceRender] = useReducer((x) => x + 1, 0);

  const zoneParam = searchParams.get("zone") || "";
  const [zoneInput, setZoneInput] = useState(zoneParam);

  const colorsParam = searchParams.get("colors") || undefined;
  const stagedColors = useRef<Record<string, string>>(parseColorsParam(colorsParam));

  const handleDialogOpenChange = (open: boolean) => {
    if (open) {
      stagedColors.current = parseColorsParam(searchParams.get("colors") || undefined);
    }
    forceRender();
  };

  useEffect(() => {
    setZoneInput(zoneParam);
  }, [zoneParam]);

  const [showNewAlertBadge, setShowNewAlertBadge] = useState(() => !isPassiveMode(searchParams));
  useEffect(() => {
    setShowNewAlertBadge(!isPassiveMode(searchParams));
  }, [searchParams]);

  const handleShowNewBadgeChange = (checked: boolean) => {
    setShowNewAlertBadge(checked);
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
    stagedColors.current = { ...stagedColors.current, [key]: hex };
    forceRender();
  };

  const handleResetColors = () => {
    stagedColors.current = {};
    forceRender();
  };

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

  const handleSaveAndClose = () => {
    updateZoneParam(zoneInput);
    commitColorsToUrl();
  };

  const handleZoneInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      updateZoneParam(zoneInput);
      inputRef.current?.blur();
    }
  };

  const handleZoneInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setZoneInput(e.target.value.replace(/\s+/g, ""));
  };

  const handleSettingsClick = () => {
    localStorage.setItem("seenSettings", "true");
    onSeenSettings?.();
  };

  const getHexForType = (key: string, fallbackColor: string) =>
    stagedColors.current[key] || TAILWIND_TO_HEX[fallbackColor] || "#404040";

  return (
    <Suspense fallback={null}>
      <Dialog onOpenChange={handleDialogOpenChange}>
        <DialogTrigger
          nativeButton={false}
          render={
            <DropdownMenuItem
              closeOnClick={false}
              onClick={handleSettingsClick}
              nativeButton={false}
            />
          }
        >
          <SettingsIcon />
          Settings
          {showNewBadge && <Badge className="ml-auto">NEW</Badge>}
        </DialogTrigger>
        <DialogContent className="flex max-h-[90vh] flex-col gap-4 overflow-hidden sm:max-w-xl">
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
                  ref={inputRef}
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
                              value={hex}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(val)) {
                                  handleColorChange(type.key, val);
                                } else {
                                  stagedColors.current = {
                                    ...stagedColors.current,
                                    [type.key]: val,
                                  };
                                  forceRender();
                                }
                              }}
                              onBlur={(e) => {
                                const val = e.target.value;
                                if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(val)) {
                                  stagedColors.current = {
                                    ...stagedColors.current,
                                    [type.key]: getHexForType(type.key, type.color),
                                  };
                                  forceRender();
                                }
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
        </DialogContent>
      </Dialog>
    </Suspense>
  );
}
