"use client";
import React, { useEffect, useState, useRef } from "react";
import { Geist } from "next/font/google";
import { DateTime } from "luxon";

const ALERT_TYPES = [
  { key: "TOR", label: "TORNADO WARNING", color: "bg-red-600" },
  { key: "TOR_EMERGENCY", label: "TORNADO EMERGENCY", color: "bg-purple-600" },
  { key: "SVR", label: "SEVERE T-STORM WARNING", color: "bg-yellow-500" },
  { key: "FFW", label: "FLASH FLOOD WARNING", color: "bg-green-500" },
  { key: "WSW", label: "WINTER STORM WARNING", color: "bg-blue-500" },
  { key: "TOA", label: "TORNADO WATCH", color: "bg-pink-500" },
  { key: "SVA", label: "SEVERE T-STORM WATCH", color: "bg-orange-500" },
];

type NWSAlertProperties = {
  event: string;
  headline: string;
  areaDesc: string;
  ends: string;
  description: string;
  geocode?: {
    UGC?: string[];
    SAME?: string[];
    [key: string]: string[] | undefined;
  };
};

type NWSAlertGrouped = {
  [key: string]: NWSAlertProperties[];
};

function parseAlerts(features: { properties: NWSAlertProperties & { event: string; headline: string; areaDesc: string; ends: string; description: string; geocode?: { UGC?: string[]; SAME?: string[]; [key: string]: string[] | undefined; } } }[]): NWSAlertGrouped {
  // Only keep relevant alerts and group by type
  const grouped: NWSAlertGrouped = {};
  for (const { properties } of features) {
    const event = properties.event;
    let type: string | null = null;
    if (event.includes("Tornado Warning")) {
      // Check for PDS, OBSERVED, and EMERGENCY
      const isPDS = properties.description?.toUpperCase().includes("PARTICULARLY DANGEROUS SITUATION");
      const isObserved = properties.description?.toUpperCase().includes("OBSERVED") || 
                        properties.event?.toUpperCase().includes("OBSERVED") ||
                        properties.headline?.toUpperCase().includes("OBSERVED");
      const isEmergency = properties.description?.toUpperCase().includes("TORNADO EMERGENCY") ||
                         properties.event?.toUpperCase().includes("TORNADO EMERGENCY") ||
                         properties.headline?.toUpperCase().includes("TORNADO EMERGENCY");
      
      // Set type based on emergency status
      type = isEmergency ? "TOR_EMERGENCY" : "TOR";
      
      // Build prefix based on conditions
      let prefix = "";
      if (isPDS) prefix += "PDS ";
      if (isObserved) prefix += "OBSERVED ";
      if (isEmergency) prefix += "EMERGENCY ";
      
      // Attach geocode if present
      const alertProps: NWSAlertProperties = {
        event: prefix + properties.event,
        headline: prefix + properties.headline,
        areaDesc: properties.areaDesc,
        ends: properties.ends,
        description: properties.description,
        geocode: properties.geocode,
      };
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(alertProps);
    }
    else if (event.includes("Severe Thunderstorm Warning")) type = "SVR";
    else if (event.includes("Flash Flood Warning")) type = "FFW";
    else if (event.includes("Winter Storm Warning")) type = "WSW";
    else if (event.includes("Tornado Watch")) type = "TOA";
    else if (event.includes("Severe Thunderstorm Watch")) type = "SVA";
    
    if (type && !event.includes("Tornado Warning")) {
      // Handle non-tornado warnings normally
      const alertProps: NWSAlertProperties = {
        event: properties.event,
        headline: properties.headline,
        areaDesc: properties.areaDesc,
        ends: properties.ends,
        description: properties.description,
        geocode: properties.geocode,
      };
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(alertProps);
    }
  }
  return grouped;
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export default function LiveAlertOverlay() {
  const [alerts, setAlerts] = useState<NWSAlertGrouped>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimeout = useRef<NodeJS.Timeout | null>(null);
  // Store the last shown alert's unique key
  const lastAlertKey = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchAlerts() {
      const res = await fetch(
        "https://api.weather.gov/alerts/active"
      );
      const data = await res.json();
      if (isMounted) setAlerts(parseAlerts(data.features || []));
    }
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Flatten all alerts for cycling
  const allAlerts = ALERT_TYPES.flatMap(({ key, label, color }) =>
    (alerts[key] || []).map((a: NWSAlertProperties) => ({
      label: (a.event.startsWith("PDS") ? "PDS " : "") + 
             (a.event.includes("OBSERVED") ? "OBSERVED " : "") + 
             (a.event.includes("EMERGENCY") ? "EMERGENCY " : "") + 
             label,
      color,
      headline: a.headline,
      area: a.areaDesc,
      expires: a.ends,
      geocode: a.geocode,
    }))
  );

  // Helper to get a unique key for an alert
  function getAlertKey(alert: { headline: string; area: string; expires: string } | null) {
    if (!alert) return '';
    return `${alert.headline}|${alert.area}|${alert.expires}`;
  }

  // Cycle through alerts every 10 seconds, with animation
  useEffect(() => {
    if (allAlerts.length <= 1) return;
    const interval = setInterval(() => {
      setIsTransitioning(true);
      // Wait for animation out, then switch alert
      transitionTimeout.current = setTimeout(() => {
        setCurrentIdx((idx) => (idx + 1) % allAlerts.length);
        setIsTransitioning(false);
      }, 300); // match animation duration
    }, 10000);
    return () => {
      clearInterval(interval);
      if (transitionTimeout.current) clearTimeout(transitionTimeout.current);
    };
  }, [allAlerts.length]);

  // When alert index changes manually (e.g. on fetch), reset transition
  useEffect(() => {
    setIsTransitioning(false);
    if (transitionTimeout.current) clearTimeout(transitionTimeout.current);
  }, [currentIdx]);

  // When alerts update, try to keep the same alert in view
  useEffect(() => {
    // Save the key of the current alert before alerts update
    lastAlertKey.current = getAlertKey(allAlerts[currentIdx] || null);
  }, [currentIdx, allAlerts]);

  // Extracted dependency for useEffect
  const allAlertKeys = allAlerts.map(getAlertKey);

  useEffect(() => {
    // When alerts change, try to find the previous alert in the new list
    if (allAlerts.length === 0) {
      setCurrentIdx(0);
      return;
    }
    if (lastAlertKey.current) {
      const idx = allAlerts.findIndex(a => getAlertKey(a) === lastAlertKey.current);
      setCurrentIdx(idx >= 0 ? idx : 0);
    } else {
      setCurrentIdx(0);
    }
  }, [allAlerts, allAlerts.length, allAlertKeys]);

  // Helper to get time remaining
  function getExpiresIn(expires: string) {
    const now = new Date();
    const end = new Date(expires);
    const diff = Math.max(0, end.getTime() - now.getTime());
    const hours = Math.floor(diff / 1000 / 60 / 60);
    const mins = Math.floor((diff / 1000 / 60) % 60);
    return `${hours > 0 ? `${hours} HR ` : ""}${mins} MIN`;
  }

  // Helper to get state(s) from area string (NWS API doesn't always provide a state field)
  const STATE_MAP: { [abbr: string]: string } = {
    AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming"
  };
  function getStates(area: string, geocode?: { UGC?: string[] }) {
    // Extract state abbreviations from area string
    const areaMatches = area.match(/,\s*([A-Z]{2})/g) || [];
    const areaAbbrs = areaMatches.map((m) => m.replace(/,\s*/, ""));
    // Extract state abbreviations from all UGC codes
    let ugcAbbrs: string[] = [];
    if (geocode && geocode.UGC && geocode.UGC.length > 0) {
      ugcAbbrs = geocode.UGC.map((ugc) => ugc.substring(0, 2));
    }
    // Combine and deduplicate
    const allAbbrs = Array.from(new Set([...areaAbbrs, ...ugcAbbrs]));
    if (allAbbrs.length > 0) {
      const fullNames = allAbbrs.map((abbr) => STATE_MAP[abbr] || abbr);
      return fullNames.join(", ");
    }
    return "";
  }

  // Helper to determine if alert is zone-based (state from UGC)
  function isZoneBased(area: string, geocode?: { UGC?: string[] }) {
    const matches = area.match(/,\s*([A-Z]{2})/g);
    return !(matches && matches.length > 0) && geocode && geocode.UGC && geocode.UGC.length > 0;
  }

  // Helper to get counties only (no state abbreviations)
  function getCounties(area: string) {
    // Split by semicolon, trim, and remove trailing ', XX'
    return area
      .split(';')
      .map((c) => c.trim().replace(/,\s*[A-Z]{2}$/, ''))
      .filter(Boolean)
      .join(', ');
  }

  // Helper to get the primary timezone for an alert (by headline)
  function getAlertTimezoneFromHeadline(headline: string) {
    // Map common timezone abbreviations to IANA timezones
    const TZ_ABBR_MAP: { [abbr: string]: string } = {
      CDT: "America/Chicago",
      CST: "America/Chicago",
      MDT: "America/Denver",
      MST: "America/Denver",
      EDT: "America/New_York",
      EST: "America/New_York",
      PDT: "America/Los_Angeles",
      PST: "America/Los_Angeles",
      AKDT: "America/Anchorage",
      AKST: "America/Anchorage",
      HST: "Pacific/Honolulu",
      HAST: "Pacific/Honolulu",
      HDT: "Pacific/Honolulu",
    };
    // Try to find a timezone abbreviation in the headline
    const match = headline.match(/\b([A-Z]{2,4})\b/);
    if (match && TZ_ABBR_MAP[match[1]]) {
      return TZ_ABBR_MAP[match[1]];
    }
    // Default to UTC if not found
    return "UTC";
  }

  // Helper to format expires time in alert's timezone (using headline)
  function formatExpiresTime(expires: string, headline: string) {
    const tz = getAlertTimezoneFromHeadline(headline);
    const dt = DateTime.fromISO(expires, { zone: "utc" }).setZone(tz);
    return dt.toFormat("MMM dd, hh:mm a") + " " + dt.offsetNameShort;
  }

  const alert = allAlerts[currentIdx] || null;

  // Colors for severe thunderstorm watch example
  const colorMap: { [key: string]: { base: string; light: string } } = {
    "bg-red-600": { base: "bg-red-600", light: "bg-red-400" },
    "bg-yellow-500": { base: "bg-yellow-500", light: "bg-yellow-300" },
    "bg-green-500": { base: "bg-green-500", light: "bg-green-300" },
    "bg-blue-500": { base: "bg-blue-500", light: "bg-blue-300" },
    "bg-pink-500": { base: "bg-pink-500", light: "bg-pink-300" },
    "bg-orange-500": { base: "bg-orange-500", light: "bg-orange-300" },
    "bg-purple-600": { base: "bg-purple-600", light: "bg-purple-400" },
    // fallback
    "default": { base: "bg-neutral-700", light: "bg-neutral-500" },
  };
  const alertColor = alert ? colorMap[alert.color] || colorMap["default"] : colorMap["default"];

  return (
    <div className={`fixed bottom-0 left-0 w-full z-50 ${geistSans.variable}`} style={{ fontFamily: 'var(--font-geist-sans), Arial, sans-serif' }}>
      <div className="grid grid-cols-4 grid-rows-2 w-full min-h-[90px]">
        {/* Top Left: Expires in time */}
        <div className={`bg-neutral-900 border-t border-neutral-700 flex items-center px-4 py-2 text-white font-bold text-xl shadow row-span-1 col-span-1 drop-shadow-md whitespace-nowrap overflow-hidden text-ellipsis`} style={{ textShadow: '1px 1px 4px rgba(0,0,0,0.7)' }}>
          <span className={`transition-all duration-300 inline-block ${isTransitioning && alert ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>EXPIRES IN {alert ? getExpiresIn(alert.expires) : "-"}</span>
        </div>
        {/* Top Right: State | Expires Time */}
        <div className="bg-[#4a3238] border-t border-neutral-700 flex items-center justify-start px-6 py-2 text-white font-bold text-xl shadow row-span-1 col-span-3 drop-shadow-md uppercase whitespace-nowrap overflow-hidden text-ellipsis" style={{ textShadow: '1px 1px 4px rgba(0,0,0,0.7)' }}>
          <span className={`transition-all duration-300 inline-block ${isTransitioning && alert ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>{alert ? `${getStates(alert.area, alert.geocode)} | EXPIRES: ${formatExpiresTime(alert.expires, alert.headline)}` : "-"}</span>
        </div>
        {/* Bottom Left: Alert Type */}
        <div className={`${alertColor.base} transition-colors duration-300 flex items-center px-4 py-3 text-white font-extrabold text-2xl shadow row-span-1 col-span-1 drop-shadow-md whitespace-nowrap overflow-hidden text-ellipsis`} style={{ textShadow: '1px 1px 4px rgba(0,0,0,0.7)' }}>
          <span className={`transition-all duration-300 inline-block ${isTransitioning && alert ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>{alert ? alert.label : "NO ALERT"}</span>
        </div>
        {/* Bottom Right: Counties or Area */}
        <div className={`${alertColor.light} transition-colors duration-300 flex items-center px-6 py-3 text-white font-extrabold text-2xl shadow row-span-1 col-span-3 drop-shadow-md whitespace-nowrap overflow-hidden text-ellipsis`} style={{ textShadow: '1px 1px 4px rgba(0,0,0,0.7)' }}>
          <span className={`transition-all duration-300 inline-block ${isTransitioning && alert ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>{alert ? (
            isZoneBased(alert.area, alert.geocode)
              ? alert.area.toUpperCase()
              : `COUNTIES: ${getCounties(alert.area).toUpperCase()}`
          ) : "-"}</span>
        </div>
      </div>
    </div>
  );
}
