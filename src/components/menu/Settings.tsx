import React, { useState, useEffect, useRef, Suspense } from "react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "../ui/dialog";
import { Settings as SettingsIcon } from "lucide-react";
import { DropdownMenuItem } from "../ui/dropdown-menu";
import { Input } from "../ui/input";
import { Checkbox } from "../ui/checkbox";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "../ui/select";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

const FONT_OPTIONS = [
  { label: "Default", value: "default" },
  { label: "Serif", value: "serif" },
  { label: "Monospace", value: "monospace" },
];

export function SettingsDialog() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize from current query param
  const zoneParam = searchParams.get("zone") || "";
  const [zoneInput, setZoneInput] = useState(zoneParam);
  const [showAlerts, setShowAlerts] = useState(false);
  const [font, setFont] = useState(FONT_OPTIONS[0].value);

  // Keep input in sync with query param if it changes externally
  useEffect(() => {
    setZoneInput(zoneParam);
  }, [zoneParam]);

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

  return (
    <Suspense fallback={null}>
      <Dialog>
        <DropdownMenuItem asChild onSelect={e => e.preventDefault()} disabled>
          <DialogTrigger asChild>
            <button type="button" className="w-full flex items-center gap-2">
              <SettingsIcon className="w-4 h-4" />
              Settings
              <span className="ml-2 bg-muted px-1.5 py-0.5 rounded text-xs font-medium text-muted-foreground tracking-wider">Coming Soon</span>
            </button>
          </DialogTrigger>
        </DropdownMenuItem>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SettingsIcon className="w-5 h-5" /> Settings
            </DialogTitle>
            <DialogDescription>
              Advanced settings for your Overwarn overlay.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-6 mt-2" onSubmit={e => e.preventDefault()}>
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
                placeholder="e.g. TXC123, OKZ456"
                value={zoneInput}
                onChange={handleZoneInputChange}
                onKeyDown={handleZoneInputKeyDown}
                onBlur={handleZoneInputBlur}
                autoComplete="off"
                ref={inputRef}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="show-alerts-checkbox"
                checked={showAlerts}
                onCheckedChange={checked => setShowAlerts(!!checked)}
              />
              <label htmlFor="show-alerts-checkbox" className="text-sm font-medium select-none">
                Show new alerts immediately
              </label>
              <span className="ml-2 bg-muted px-1.5 py-0.5 rounded text-xs font-medium text-muted-foreground uppercase tracking-wider">Coming Soon</span>
            </div>
            <div>
              <label htmlFor="font-select" className="block text-sm font-medium mb-1">
                Font
              </label>
              <Select
                value={font}
                onValueChange={setFont}
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
              <span className="ml-2 bg-muted px-1.5 py-0.5 rounded text-xs font-medium text-muted-foreground uppercase tracking-wider">Coming Soon</span>
            </div>
          </form>
          <DialogFooter>
            <DialogClose asChild>
              <button type="button" className="mt-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                Close
              </button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Suspense>
  );
}
