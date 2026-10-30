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
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Menu, Search, Clipboard, Check, Bug, Code, MoreHorizontal, Info, Settings as SettingsIcon } from "lucide-react";
import { US_STATES } from "@/types/states";
import { ALERT_TYPES } from "@/config/alertConfig";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { NWSOffice, NWSOfficeNames } from "@/types/nwsOffices";
import { SettingsDialog } from "@/components/menu/Settings";
import { useAlertOverlayContext } from "@/components/providers/AlertOverlayProvider";
import { AboutDialog } from "@/components/menu/About";

function formatQueryParams(params: URLSearchParams): string {
  const formattedParams = new URLSearchParams();
  
  // Get all parameters
  const entries = Array.from(params.entries());
  
  // Handle state parameter
  const stateParams = entries.filter(([key]) => key.toLowerCase() === "state");
  if (stateParams.length > 0) {
    const states = stateParams
      .map(([, value]) => value.split(","))
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
      .map(([, value]) => value.split(","))
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
  
  return formattedParams.toString().replace(/%2C/g, ",");
}

function AppMenuInner({ children, setAboutOpen, setSettingsOpen }: {
  children?: React.ReactNode;
  setAboutOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { alertTypeCounts } = useAlertOverlayContext();
  
  // State filter params
  const stateParam = searchParams.get("state");
  const selectedStates = stateParam 
    ? stateParam
        .split(",")
        .map(state => state.toUpperCase())
    : [];
  const [stateSearch, setStateSearch] = useState("");
  
  // NWS Office filter params
  const wfoParam = searchParams.get("wfo");
  const selectedOffices = wfoParam 
    ? wfoParam
        .split(",")
        .map(office => office.toUpperCase())
    : [];
  const [officeSearch, setOfficeSearch] = useState("");

  const [copied, setCopied] = useState(false);

  // Alert Type filter params
  const typeParam = searchParams.get("type");
  const selectedTypes = typeParam
    ? typeParam
        .split(",")
        .map((type) => type)
    : [];

  const updateFilters = (filters: { state?: string[]; wfo?: string[]; type?: string[] }) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, values] of Object.entries(filters)) {
      for (const existingKey of Array.from(params.keys())) {
        if (existingKey.toLowerCase() === key) params.delete(existingKey);
      }
      if (values.length > 0) params.set(key, values.join(","));
    }
    const queryString = params.toString().replace(/%2C/g, ",");
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
    updateFilters({ state: Array.from(states) });
  };

  const handleAllStates = () => {
    updateFilters({ state: [] });
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

    updateFilters({ wfo: Array.from(offices) });
  };

  const handleAllOffices = () => {
    updateFilters({ wfo: [] });
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
    updateFilters({ type: Array.from(types) });
  };

  const handleAllTypes = () => {
    updateFilters({ type: [] });
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

  // Calculate total count for 'All Alerts'
  const allAlertsCount = ALERT_TYPES
    .reduce((sum, type) => sum + (alertTypeCounts[type.key] || 0), 0);

  const shareUrl = `https://overwarn.mirra.tv${pathname}${searchParams.toString() ? `?${formatQueryParams(searchParams)}` : ""}`;

  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      console.error("Failed to copy using clipboard API:", err);
    }
  };

  return (
    <DropdownMenu modal={false}>
      {children && React.isValidElement(children) ? (
        <DropdownMenuTrigger render={children} nativeButton />
      ) : (
        <DropdownMenuTrigger
          nativeButton
          render={<button type="button" aria-label="Open menu" />}
        >
          <Menu className="size-8" />
        </DropdownMenuTrigger>
      )}
      <DropdownMenuContent className="w-75" sideOffset={8} align="start">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="py-2 text-center text-lg font-bold text-foreground">
            <div className="flex items-center justify-center gap-2">
              Overwarn
              <Badge variant="secondary" className="uppercase tracking-wider">
                Beta
              </Badge>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
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
              onClick={() => handleAllTypes()}
            >
              <span>All Alerts</span>
              {allAlertsCount > 0 && (
                <span className="ml-2 bg-primary/10 text-primary text-xs font-semibold px-2 py-0.5 rounded-full min-w-[1.5em] text-center">
                  {allAlertsCount}
                </span>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {ALERT_TYPES.map((type) => (
              <DropdownMenuCheckboxItem
                key={type.key}
                checked={selectedTypes.includes(type.key)}
                onCheckedChange={(checked) => handleTypeSelect(type.key, checked)}
                closeOnClick={false}
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
            <DropdownMenuSubContent className="max-h-100 overflow-y-auto">
              <div className="px-2 py-1.5 sticky top-0 bg-popover z-10 border-b">
                <div className="flex items-center px-2 bg-muted rounded-md">
                  <Search className="h-3.5 w-3.5 text-muted-foreground mr-2" />
                  <input
                    type="text"
                    placeholder="Search states/territories..."
                    tabIndex={-1}
                    className="flex h-9 w-full rounded-md bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground"
                    value={stateSearch}
                    onChange={(e) => handleSearchChange(e, setStateSearch)}
                    onKeyDown={handleSearchKeyDown}
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      e.currentTarget.focus();
                    }}
                  />
                </div>
              </div>
              <DropdownMenuItem
                className="font-medium mt-1"
                onClick={() => handleAllStates()}
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
                    updateFilters({ state: ["CONT"] });
                  } else {
                    // Deselect 'cont', show all states
                    updateFilters({ state: [] });
                  }
                }}
                closeOnClick={false}
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
                    closeOnClick={false}
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
            <DropdownMenuSubContent className="max-h-100 overflow-y-auto">
              <div className="px-2 py-1.5 sticky top-0 bg-popover z-10 border-b">
                <div className="flex items-center px-2 bg-muted rounded-md">
                  <Search className="h-3.5 w-3.5 text-muted-foreground mr-2" />
                  <input
                    type="text"
                    placeholder="Search offices..."
                    tabIndex={-1}
                    className="flex h-9 w-full rounded-md bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground"
                    value={officeSearch}
                    onChange={(e) => handleSearchChange(e, setOfficeSearch)}
                    onKeyDown={handleSearchKeyDown}
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      e.currentTarget.focus();
                    }}
                  />
                </div>
              </div>
              <DropdownMenuItem
                className="font-medium mt-1"
                onClick={() => handleAllOffices()}
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
                    closeOnClick={false}
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
        
        <DropdownMenuGroup>
          <div className="flex flex-col gap-1.5 px-1.5 py-1 text-sm">
            <div className="flex flex-col items-start">
              <span className="font-medium">Add to Streaming Software</span>
              <span className="text-sm text-muted-foreground">
                Use a browser source in OBS, Streamlabs, or other popular streaming software.
              </span>
            </div>
            <div className="flex h-9 items-center gap-1 rounded-md bg-muted px-2">
              <span
                className="min-w-0 flex-1 truncate font-mono text-muted-foreground"
                aria-label="Shareable page URL"
              >
                {shareUrl}
              </span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={copied ? "Copied" : "Copy to clipboard"}
                        onClick={(e) => {
                          e.stopPropagation();
                          void copyShareUrl();
                        }}
                      />
                    }
                  >
                    {copied ? <Check /> : <Clipboard />}
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{copied ? "Copied!" : "Copy to clipboard"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="w-full flex items-center gap-2"
          onClick={() => setSettingsOpen(true)}
        >
          <SettingsIcon />
          <span className="font-medium">Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="w-full flex items-center gap-2">
            <MoreHorizontal />
            <span className="font-medium">More Options</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => setAboutOpen(true)}>
              <Info />
              <span>About</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              render={
                <a
                  href="https://github.com/brycero/overwarn/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                />
              }
              nativeButton={false}
            >
              <Bug />
              Report Issue
            </DropdownMenuItem>
            <DropdownMenuItem
              render={
                <a
                  href="https://github.com/brycero/overwarn"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                />
              }
              nativeButton={false}
            >
              <Code />
              View on GitHub
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function AppMenu(props: { children?: React.ReactNode }) {
  const [aboutOpen, setAboutOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  return (
    <Suspense fallback={null}>
      <AppMenuInner {...props} setAboutOpen={setAboutOpen} setSettingsOpen={setSettingsOpen} />
      <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </Suspense>
  );
}
