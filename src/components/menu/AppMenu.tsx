"use client";
import React, { useState, Suspense } from "react";
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
import { Menu, Search, Clipboard, Check, Bug, Code, Settings as SettingsIcon, MoreHorizontal } from "lucide-react";
import { US_STATES } from "@/config/states";
import { ALERT_TYPES } from "@/config/alertConfig";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { NWSOffice, NWSOfficeNames } from "@/types/nwsOffices";

function formatQueryParams(params: URLSearchParams): string {
  const formattedParams = new URLSearchParams();
  
  // Get all parameters
  const entries = Array.from(params.entries());
  
  // Handle state parameter
  const stateParams = entries.filter(([key]) => key.toLowerCase() === "state");
  if (stateParams.length > 0) {
    const states = stateParams
      .map(([value]) => decodeURIComponent(value).split(","))
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
      .map(([value]) => decodeURIComponent(value).split(","))
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

function AppMenuInner({ children }: { children?: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
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
    } else {
      states.delete(stateCode.toUpperCase());
    }

    updateURL(Array.from(states), selectedOffices);
  };

  const handleAllStates = () => {
    updateURL([], selectedOffices);
  };

  const getSelectedStatesLabel = () => {
    if (selectedStates.length === 0) return "All States";
    if (selectedStates.length === 1) {
      const state = US_STATES.find(s => s.code.toUpperCase() === selectedStates[0]);
      return state ? state.name : "All States";
    }
    return `${selectedStates.length} states selected`;
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
              className="font-medium mt-1"
              onSelect={(e) => {
                e.preventDefault();
                handleAllTypes();
              }}
            >
              All Types
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {ALERT_TYPES.filter(type => type.key !== "TOR_EMERGENCY").map((type) => (
              <DropdownMenuCheckboxItem
                key={type.key}
                checked={selectedTypes.includes(type.key)}
                onCheckedChange={(checked) => handleTypeSelect(type.key, checked)}
                onSelect={(e) => e.preventDefault()}
              >
                <span className={`inline-block w-3 h-3 rounded-full mr-2 align-middle ${type.color}`}></span>
                {type.label
                  .toLowerCase()
                  .replace(/\b\w/g, (c) => c.toUpperCase())}
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
                    placeholder="Search states..."
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
                All States
              </DropdownMenuItem>
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
                  >
                    {state.name} ({state.code})
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
                  >
                    {office.name} ({office.code})
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
            <span className="font-medium">More options</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem asChild>
              <a href="https://github.com/brycero/overwarn/issues" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                <Bug className="w-4 h-4" />
                Report Issue
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href="https://github.com/brycero/overwarn" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                <Code className="w-4 h-4" />
                View GitHub
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <span className="flex items-center gap-2">
                <SettingsIcon className="w-4 h-4" />
                Settings (Coming Soon)
              </span>
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function AppMenu(props: { children?: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AppMenuInner {...props} />
    </Suspense>
  );
}
