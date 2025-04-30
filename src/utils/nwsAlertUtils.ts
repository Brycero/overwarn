// Utility functions for parsing and handling NWS alerts
import { DateTime } from "luxon";

export type NWSAlertProperties = {
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
  parameters?: {
    AWIPSidentifier?: string[];
    tornadoDetection?: string[];
  };
};

export type NWSAlertGrouped = {
  [key: string]: NWSAlertProperties[];
};

export function parseAlerts(features: { properties: NWSAlertProperties & { event: string; headline: string; areaDesc: string; ends: string; description: string; geocode?: { UGC?: string[]; SAME?: string[]; [key: string]: string[] | undefined; } } }[]): NWSAlertGrouped {
  const grouped: NWSAlertGrouped = {};
  for (const { properties } of features) {
    const event = properties.event;
    let type: string | null = null;
    if (event.includes("Tornado Warning")) {
      const isPDS = properties.description?.toUpperCase().includes("PARTICULARLY DANGEROUS SITUATION");
      const isObserved = properties.parameters?.tornadoDetection?.some(
        (val) => val.toUpperCase() === "OBSERVED"
      );
      const isEmergency = properties.description?.toUpperCase().includes("TORNADO EMERGENCY") ||
                         properties.event?.toUpperCase().includes("TORNADO EMERGENCY") ||
                         properties.headline?.toUpperCase().includes("TORNADO EMERGENCY");
      type = isEmergency ? "TOR_EMERGENCY" : "TOR";
      let prefix = "";
      if (isPDS) prefix += "PDS ";
      if (isObserved) prefix += "OBSERVED ";
      if (isEmergency) prefix += "EMERGENCY ";
      const alertProps: NWSAlertProperties = {
        event: prefix + properties.event,
        headline: prefix + properties.headline,
        areaDesc: properties.areaDesc,
        ends: properties.ends,
        description: properties.description,
        geocode: properties.geocode,
        parameters: properties.parameters,
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
      const alertProps: NWSAlertProperties = {
        event: properties.event,
        headline: properties.headline,
        areaDesc: properties.areaDesc,
        ends: properties.ends,
        description: properties.description,
        geocode: properties.geocode,
        parameters: properties.parameters,
      };
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(alertProps);
    }
  }
  return grouped;
}

const STATE_MAP: { [abbr: string]: string } = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", PR: "Puerto Rico", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming"
};

// Inverted map for lookups by full state name
const STATE_NAME_TO_ABBR: { [name: string]: string } = Object.entries(STATE_MAP).reduce(
  (acc, [abbr, name]) => ({ ...acc, [name.toLowerCase()]: abbr }), 
  {} as { [name: string]: string }
);

export function getStates(area: string, geocode?: { UGC?: string[] }) {
  const areaMatches = area.match(/,\s*([A-Z]{2})/g) || [];
  const areaAbbrs = areaMatches.map((m) => m.replace(/,\s*/, ""));
  let ugcAbbrs: string[] = [];
  if (geocode && geocode.UGC && geocode.UGC.length > 0) {
    ugcAbbrs = geocode.UGC.map((ugc) => ugc.substring(0, 2));
  }
  const allAbbrs = Array.from(new Set([...areaAbbrs, ...ugcAbbrs]));
  if (allAbbrs.length > 0) {
    const fullNames = allAbbrs.map((abbr) => STATE_MAP[abbr] || abbr);
    return fullNames.join(", ");
  }
  return "";
}

export function isZoneBased(area: string, geocode?: { UGC?: string[] }) {
  const matches = area.match(/,\s*([A-Z]{2})/g);
  return !(matches && matches.length > 0) && geocode && geocode.UGC && geocode.UGC.length > 0;
}

export function getCounties(area: string) {
  return area
    .split(';')
    .map((c) => c.trim().replace(/,\s*[A-Z]{2}$/, ''))
    .filter(Boolean)
    .join(', ');
}

export function getExpiresIn(expires: string) {
  const now = new Date();
  const end = new Date(expires);
  const diff = Math.max(0, end.getTime() - now.getTime());
  const hours = Math.floor(diff / 1000 / 60 / 60);
  const mins = Math.floor((diff / 1000 / 60) % 60);
  return `${hours > 0 ? `${hours} HR ` : ""}${mins} MIN`;
}

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
  AST: "America/Puerto_Rico",
};

export function getAlertTimezoneFromHeadline(headline: string) {
  const match = headline.match(/\b([A-Z]{2,4})\b/);
  if (match && TZ_ABBR_MAP[match[1]]) {
    return TZ_ABBR_MAP[match[1]];
  }
  return "UTC";
}

export function formatExpiresTime(expires: string, headline: string) {
  const tz = getAlertTimezoneFromHeadline(headline);
  const dt = DateTime.fromISO(expires, { zone: "utc" }).setZone(tz);
  return dt.toFormat("EEE h:mma") + " " + dt.offsetNameShort;
}

/**
 * Normalize state input to handle abbreviations and full names
 * @param state State name or abbreviation
 * @returns Normalized state abbreviation or null if invalid
 */
export function normalizeStateInput(state: string): string | null {
  const trimmed = state.trim().toUpperCase();
  
  // If it's already a valid 2-letter abbreviation
  if (/^[A-Z]{2}$/.test(trimmed) && STATE_MAP[trimmed]) {
    return trimmed;
  }
  
  // If it's a full state name, convert to abbreviation
  const stateAbbr = STATE_NAME_TO_ABBR[state.trim().toLowerCase()];
  if (stateAbbr) {
    return stateAbbr;
  }
  
  return null;
}

/**
 * Filter alerts by state(s)
 * @param alerts Grouped alerts object
 * @param states Array of state names or abbreviations
 * @returns Filtered alerts object
 */
export function filterAlertsByStates(alerts: NWSAlertGrouped, states: string[]): NWSAlertGrouped {
  if (!states.length) return alerts;
  
  // Normalize all state inputs
  const normalizedStates = states
    .map(normalizeStateInput)
    .filter((state): state is string => state !== null);
  
  if (!normalizedStates.length) return alerts;
  
  const result: NWSAlertGrouped = {};
  
  // Check each alert type
  Object.entries(alerts).forEach(([alertType, alertsList]) => {
    // Filter alerts that match any of the specified states
    const filteredAlerts = alertsList.filter(alert => {
      // Check if alert has any of the specified states
      const areaMatches = alert.areaDesc.match(/,\s*([A-Z]{2})/g) || [];
      const areaAbbrs = areaMatches.map(m => m.replace(/,\s*/, ""));
      
      // Check UGC codes if available
      let ugcAbbrs: string[] = [];
      if (alert.geocode?.UGC && alert.geocode.UGC.length > 0) {
        ugcAbbrs = alert.geocode.UGC.map(ugc => ugc.substring(0, 2));
      }
      
      const allAbbrs = Array.from(new Set([...areaAbbrs, ...ugcAbbrs]));
      
      // Return true if any of the normalized states match this alert
      return normalizedStates.some(state => allAbbrs.includes(state));
    });
    
    // Add to result if we have any alerts for this type
    if (filteredAlerts.length > 0) {
      result[alertType] = filteredAlerts;
    }
  });
  
  return result;
}

/**
 * Filter alerts by NWS office code(s)
 * @param alerts Grouped alerts object
 * @param offices Array of 3-letter NWS office codes
 * @returns Filtered alerts object
 */
export function filterAlertsByOffices(alerts: NWSAlertGrouped, offices: string[]): NWSAlertGrouped {
  if (!offices.length) return alerts;
  
  // Normalize office codes to uppercase
  const normalizedOffices = offices.map(office => office.toUpperCase());
  
  const result: NWSAlertGrouped = {};
  
  Object.entries(alerts).forEach(([alertType, alertsList]) => {
    const filteredAlerts = alertsList.filter(alert => {
      // Extract office code from AWIPSidentifier
      const awipsId = alert.parameters?.AWIPSidentifier?.[0];
      if (!awipsId) return false;
      
      // The office code is the last 3 characters, regardless of product code length
      const officeCode = awipsId.slice(-3);
      return normalizedOffices.includes(officeCode);
    });
    
    if (filteredAlerts.length > 0) {
      result[alertType] = filteredAlerts;
    }
  });
  
  return result;
}

/**
 * Filter alerts by alert type(s)
 * @param alerts Grouped alerts object
 * @param types Array of alert type keys (e.g., ["TOR", "SVR"])
 * @returns Filtered alerts object containing only the specified types
 */
export function filterAlertsByTypes(alerts: NWSAlertGrouped, types: string[]): NWSAlertGrouped {
  if (!types.length) return alerts;
  const typeSet = new Set(types);
  const result: NWSAlertGrouped = {};
  Object.entries(alerts).forEach(([alertType, alertsList]) => {
    if (typeSet.has(alertType)) {
      result[alertType] = alertsList;
    }
  });
  return result;
}

export function getCountiesWithStates(area: string) {
  return area
    .split(';')
    .map((c) => {
      const match = c.trim().match(/^(.*),\s*([A-Z]{2})$/);
      if (match) {
        const name = match[1];
        const state = match[2];
        return `${name} (${state})`;
      }
      return c.trim();
    })
    .filter(Boolean)
    .join(', ');
}