"use client";

import React, { useState, Suspense, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuCheckboxItem,
} from "../ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { Menu, Search, Clipboard, Check, Bug, Code, MoreHorizontal, Info } from "lucide-react";
import { US_STATES } from "@/config/states";
import { ALERT_TYPES } from "@/config/alertConfig";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { NWSOffice, NWSOfficeNames } from "@/types/nwsOffices";
import { SettingsDialog } from "./Settings";
import { useAlertOverlayContext } from "../providers/AlertOverlayProvider";
import { AboutDialog } from "./About";

function formatQueryParams(params: URLSearchParams): string {
  const formattedParams = new URLSearchParams();
  
  // Get all parameters
  const entries = Array.from(params.entries());
  
  // Handle state parameter
  const stateParams = entries.filter(([key]) => key.toLowerCase() === "state");
  if (stateParams.length > 0) {
    const states = stateParams
      .map(([, value]) => decodeURIComponent(value).split(","))
      .flat()
      .filter(Boolean);
    if (states.length > 0) {
      formattedParams.set("state", states.join(","));
    }
  }
  
  // Handle wfo parameter
  const wfoParams = entries.filter(([key]) => key.toLowerCase() === "wfo");
  if (wfoParams.length > 0) {
    const offices = wfoParams
      .map(([, value]) => decodeURIComponent(value).split(","))
      .flat()
      .filter(Boolean);
    if (offices.length > 0) {
      formattedParams.set("wfo", offices.join(","));
    }
  }
  
  // Add all other parameters
  entries
    .filter(([key]) => !["state", "wfo"].includes(key.toLowerCase()))
    .forEach(([key, value]) => formattedParams.append(key, value));
  
  return decodeURIComponent(formattedParams.toString());
}

function AppMenuInner({ children, setAboutOpen }: { children?: React.ReactNode, setAboutOpen: React.Dispatch<React.SetStateAction<boolean>> }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { alertTypeCounts } = useAlertOverlayContext();
  
  // State filter params
  const stateParam = searchParams.get("state");
  const selectedStates = stateParam 
    ? decodeURIComponent(stateParam)
        .split(",")
        .map(state => state.toUpperCase())
    : [];
  const [stateSearch, setStateSearch] = useState("");
  
  // NWS Office filter params
  const wfoParam = searchParams.get("wfo");
  const selectedOffices = wfoParam 
    ? decodeURIComponent(wfoParam)
        .split(",")
        .map(office => office.toUpperCase())
    : [];
  const [officeSearch, setOfficeSearch] = useState("");

  const [copied, setCopied] = useState(false);

  // Alert Type filter params
  const typeParam = searchParams.get("type");
  const selectedTypes = typeParam
    ? decodeURIComponent(typeParam)
        .split(",")
        .map((type) => type)
    : [];

  const [showNewCircle, setShowNewCircle] = useState(true);

  const updateURL = (newStates: string[], newOffices: string[]) => {
    const params = new URLSearchParams(searchParams.toString());
    const otherParams = Array.from(params.entries())
      .filter(([key]) => key.toLowerCase() !== "state" && key.toLowerCase() !== "wfo")
      .map(([key, value]) => `${key}=${value}`);
    
    const stateParam = newStates.length > 0 ? `state=${newStates.join(",")}` : "";
    const wfoParam = newOffices.length > 0 ? `wfo=${newOffices.join(",")}` : "";
    
    const queryString = [
      ...(stateParam ? [stateParam] : []), 
      ...(wfoParam ? [wfoParam] : []), 
      ...otherParams
    ].join("&");
    
    router.replace(`${pathname}${queryString ? `?${queryString}` : ""}`);
  };

  // State filter handlers
  const handleStateSelect = (stateCode: string, checked: boolean) => {
    const states = new Set(selectedStates);
    if (checked) {
      states.add(stateCode.toUpperCase());
      states.delete("CONT"); // Deselect 'cont' if any other state is selected
    } else {
      states.delete(stateCode.toUpperCase());
    }
    updateURL(Array.from(states), selectedOffices);
  };

  const handleAllStates = () => {
    updateURL([], selectedOffices);
  };

  const getSelectedStatesLabel = () => {
    if (selectedStates.length === 0) return "All States/Territories";
    if (selectedStates.length === 1) {
      if (selectedStates[0] === "CONT") return "Lower 48 States";
      const state = US_STATES.find(s => s.code.toUpperCase() === selectedStates[0]);
      return state ? state.name : "All States/Territories";
    }
    return `${selectedStates.length} states/territories selected`;
  };

  const filteredStates = stateSearch.trim() === ""
    ? US_STATES
    : US_STATES.filter(state => 
        state.name.toLowerCase().includes(stateSearch.toLowerCase()) ||
        state.code.toLowerCase().includes(stateSearch.toLowerCase())
      );

  // NWS Office filter handlers
  const handleOfficeSelect = (officeCode: string, checked: boolean) => {
    const offices = new Set(selectedOffices);
    
    if (checked) {
      offices.add(officeCode.toUpperCase());
    } else {
      offices.delete(officeCode.toUpperCase());
    }

    updateURL(selectedStates, Array.from(offices));
  };

  const handleAllOffices = () => {
    updateURL(selectedStates, []);
  };

  const getSelectedOfficesLabel = () => {
    if (selectedOffices.length === 0) return "All Offices";
    if (selectedOffices.length === 1) {
      return NWSOfficeNames[selectedOffices[0].toUpperCase() as NWSOffice] || "All Offices";
    }
    return `${selectedOffices.length} offices selected`;
  };

  // Convert the NWSOfficeNames object to an array for filtering
  const NWS_OFFICES = Object.entries(NWSOfficeNames)
    .filter(([code]) => code !== 'All')
    .map(([code, name]) => ({ code, name }));

  const filteredOffices = officeSearch.trim() === ""
    ? NWS_OFFICES
    : NWS_OFFICES.filter(office => 
        office.name.toLowerCase().includes(officeSearch.toLowerCase()) ||
        office.code.toLowerCase().includes(officeSearch.toLowerCase())
      );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string>>) => {
    e.preventDefault();
    e.stopPropagation();
    setter(e.target.value);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
  };

  // Alert Type filter handlers
  const handleTypeSelect = (typeKey: string, checked: boolean) => {
    const types = new Set(selectedTypes);
    if (checked) {
      types.add(typeKey);
    } else {
      types.delete(typeKey);
    }
    updateURLWithTypes(Array.from(types));
  };

  const handleAllTypes = () => {
    updateURLWithTypes([]);
  };

  const getSelectedTypesLabel = () => {
    if (selectedTypes.length === 0) return "All Types";
    if (selectedTypes.length === 1) {
      const type = ALERT_TYPES.find((t) => t.key === selectedTypes[0]);
      return type
        ? type.label.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
        : "All Types";
    }
    return `${selectedTypes.length} types selected`;
  };

  // Update URL with all filters
  const updateURLWithTypes = (newTypes: string[]) => {
    const params = new URLSearchParams(searchParams.toString());
    const otherParams = Array.from(params.entries())
      .filter(
        ([key]) =>
          key.toLowerCase() !== "state" &&
          key.toLowerCase() !== "wfo" &&
          key.toLowerCase() !== "type"
      )
      .map(([key, value]) => `${key}=${value}`);
    const stateParam = selectedStates.length > 0 ? `state=${selectedStates.join(",")}` : "";
    const wfoParam = selectedOffices.length > 0 ? `wfo=${selectedOffices.join(",")}` : "";
    const typeParam = newTypes.length > 0 ? `type=${newTypes.join(",")}` : "";
    const queryString = [
      ...(stateParam ? [stateParam] : []),
      ...(wfoParam ? [wfoParam] : []),
      ...(typeParam ? [typeParam] : []),
      ...otherParams,
    ].join("&");
    router.replace(`${pathname}${queryString ? `?${queryString}` : ""}`);
  };

  // Calculate total count for 'All Alerts' (excluding TOR_EMERGENCY)
  const allAlertsCount = ALERT_TYPES.filter(type => type.key !== "TOR_EMERGENCY")
    .reduce((sum, type) => sum + (alertTypeCounts[type.key] || 0), 0);

  // The useEffect that sets showNewCircle based on seenSettings in localStorage on mount is still needed, but remove any redundant comments or code about hiding the circle elsewhere.
  useEffect(() => {
    const seenSettings = localStorage.getItem("seenSettings");
    if (seenSettings) {
      setShowNewCircle(false);
    }
  }, []);

  const handleSeenSettings = () => setShowNewCircle(false);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        {children ? children : <button aria-label="Open menu"><Menu className="w-8 h-8" /></button>}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[300px]" sideOffset={8} align="start">
        <DropdownMenuLabel className="text-lg font-bold text-center py-2">
          <div className="flex items-center justify-center gap-2">
            Overwarn
            <span className="bg-muted px-1.5 py-0.5 rounded text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Beta
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="w-full">
            <div className="flex flex-col items-start">
              <span className="font-medium">Filter by Alert Type</span>
              <span className="text-sm text-muted-foreground">{getSelectedTypesLabel()}</span>
            </div>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem
              className="font-medium mt-1 flex items-center justify-between"
              onSelect={(e) => {
                e.preventDefault();
                handleAllTypes();
              }}
            >
              <span>All Alerts</span>
              {allAlertsCount > 0 && (
                <span className="ml-2 bg-primary/10 text-primary text-xs font-semibold px-2 py-0.5 rounded-full min-w-[1.5em] text-center">
                  {allAlertsCount}
                </span>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {ALERT_TYPES.filter(type => type.key !== "TOR_EMERGENCY").map((type) => (
              <DropdownMenuCheckboxItem
                key={type.key}
                checked={selectedTypes.includes(type.key)}
                onCheckedChange={(checked) => handleTypeSelect(type.key, checked)}
                onSelect={(e) => e.preventDefault()}
                className="flex items-center justify-between"
              >
                <span className="flex items-center">
                  <span className={`inline-block w-3 h-3 rounded-full mr-2 align-middle ${type.color}`}></span>
                  {type.label
                    .toLowerCase()
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
                </span>
                {alertTypeCounts[type.key] > 0 && (
                  <span className="ml-2 bg-primary/10 text-primary text-xs font-semibold px-2 py-0.5 rounded-full min-w-[1.5em] text-center">
                    {alertTypeCounts[type.key]}
                  </span>
                )}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="w-full">
              <div className="flex flex-col items-start">
                <span className="font-medium">Filter by State</span>
                <span className="text-sm text-muted-foreground">{getSelectedStatesLabel()}</span>
              </div>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-[400px] overflow-y-auto">
              <div className="px-2 py-1.5 sticky top-0 bg-popover z-10 border-b">
                <div className="flex items-center px-2 bg-muted rounded-md">
                  <Search className="h-3.5 w-3.5 text-muted-foreground mr-2" />
                  <input
                    type="text"
                    placeholder="Search states/territories..."
                    className="flex h-9 w-full rounded-md bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground"
                    value={stateSearch}
                    onChange={(e) => handleSearchChange(e, setStateSearch)}
                    onKeyDown={handleSearchKeyDown}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
              <DropdownMenuItem 
                className="font-medium mt-1" 
                onSelect={(e) => {
                  e.preventDefault();
                  handleAllStates();
                }}
              >
                All States/Territories
              </DropdownMenuItem>
              {/* Contiguous US option */}
              <DropdownMenuCheckboxItem
                className="font-medium"
                checked={selectedStates.length === 1 && selectedStates[0] === "CONT"}
                onCheckedChange={(checked) => {
                  if (checked) {
                    // Set only 'cont' as the state param
                    updateURL(["CONT"], selectedOffices);
                  } else {
                    // Deselect 'cont', show all states
                    updateURL([], selectedOffices);
                  }
                }}
                onSelect={e => e.preventDefault()}
              >
                Lower 48 States
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              {filteredStates.length === 0 ? (
                <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                  No states found
                </div>
              ) : (
                filteredStates.map(state => (
                  <DropdownMenuCheckboxItem
                    key={state.code}
                    checked={selectedStates.includes(state.code.toUpperCase())}
                    onCheckedChange={(checked) => handleStateSelect(state.code, checked)}
                    onSelect={(e) => e.preventDefault()}
                    className="flex items-center justify-between"
                  >
                    <span>{state.name}</span>
                    <span className="ml-2 bg-primary/10 text-primary text-xs font-semibold px-2 py-0.5 rounded-full min-w-[2.5em] text-center">
                      {state.code}
                    </span>
                  </DropdownMenuCheckboxItem>
                ))
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="w-full">
              <div className="flex flex-col items-start">
                <span className="font-medium">Filter by NWS Office</span>
                <span className="text-sm text-muted-foreground">{getSelectedOfficesLabel()}</span>
              </div>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-[400px] overflow-y-auto">
              <div className="px-2 py-1.5 sticky top-0 bg-popover z-10 border-b">
                <div className="flex items-center px-2 bg-muted rounded-md">
                  <Search className="h-3.5 w-3.5 text-muted-foreground mr-2" />
                  <input
                    type="text"
                    placeholder="Search offices..."
                    className="flex h-9 w-full rounded-md bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground"
                    value={officeSearch}
                    onChange={(e) => handleSearchChange(e, setOfficeSearch)}
                    onKeyDown={handleSearchKeyDown}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
              <DropdownMenuItem 
                className="font-medium mt-1" 
                onSelect={(e) => {
                  e.preventDefault();
                  handleAllOffices();
                }}
              >
                All Offices
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {filteredOffices.length === 0 ? (
                <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                  No offices found
                </div>
              ) : (
                filteredOffices.map(office => (
                  <DropdownMenuCheckboxItem
                    key={office.code}
                    checked={selectedOffices.includes(office.code.toUpperCase())}
                    onCheckedChange={(checked) => handleOfficeSelect(office.code, checked)}
                    onSelect={(e) => e.preventDefault()}
                    className="flex items-center justify-between"
                  >
                    <span>{office.name}</span>
                    <span className="ml-2 bg-primary/10 text-primary text-xs font-semibold px-2 py-0.5 rounded-full min-w-[2.5em] text-center">
                      {office.code}
                    </span>
                  </DropdownMenuCheckboxItem>
                ))
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuGroup>
        
        <DropdownMenuSeparator />
        
        {/* Copy Link Section */}
        <DropdownMenuLabel className="flex flex-col pt-2 pb-1">
          <span className="font-medium">Add to Streaming Software</span>
          <span className="text-xs text-muted-foreground">Use a browser source in OBS, Streamlabs, or other popular streaming software.</span>
        </DropdownMenuLabel>
        <div className="px-2 pb-2">
          <div className="flex items-center gap-2 bg-muted p-2 rounded-md">
            <input
              type="text"
              readOnly
              className="flex-1 text-xs bg-transparent border-none outline-none font-mono"
              value={`https://overwarn.mirra.tv${pathname}${searchParams.toString() ? `?${formatQueryParams(searchParams)}` : ''}`}
              aria-label="Shareable page URL"
              onFocus={e => e.target.select()}
            />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center justify-center text-xs font-medium h-8 w-8 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    onClick={async () => {
                      const url = `https://overwarn.mirra.tv${pathname}${searchParams.toString() ? `?${formatQueryParams(searchParams)}` : ''}`;
                      try {
                        await navigator.clipboard.writeText(url);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1200);
                      } catch (err) {
                        console.error('Failed to copy using clipboard API:', err);
                      }
                    }}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{copied ? 'Copied!' : 'Copy to clipboard'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        {/* More Options Section */}
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="w-full flex items-center gap-2">
            <MoreHorizontal className="w-4 h-4" />
            <span className="font-medium">More Options</span>
            <span
              id="new-circle"
              className={`ml-0.5 w-2 h-2 bg-blue-500 rounded-full ${!showNewCircle ? "hidden" : ""}`}
            />
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onSelect={() => setAboutOpen(true)}>
              <Info className="w-4 h-4" />
              <span>About</span>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href="https://github.com/brycero/overwarn/issues" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                <Bug className="w-4 h-4" />
                Report Issue
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href="https://github.com/brycero/overwarn" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                <Code className="w-4 h-4" />
                View on GitHub
              </a>
            </DropdownMenuItem>
            <SettingsDialog onSeenSettings={handleSeenSettings} showNewBadge={showNewCircle} />
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function AppMenu(props: { children?: React.ReactNode }) {
  const [aboutOpen, setAboutOpen] = React.useState(false);
  return (
    <Suspense fallback={null}>
      <AppMenuInner {...props} setAboutOpen={setAboutOpen} />
      <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
    </Suspense>
  );
}
