import { filterAlertsByStates, filterAlertsByOffices, NWSAlertGrouped, filterAlertsByTypes, filterAlertsByZones } from './nwsAlertUtils';
import { US_STATES } from "@/config/states";

/**
 * Returns the codes for the 48 contiguous US states plus DC
 */
export function getContiguousStateCodes(): string[] {
  return US_STATES
    .filter(
      (s) =>
        !["AK", "HI", "PR", "VI", "GU", "AS", "MP"].includes(s.code.toUpperCase())
    )
    .map((s) => s.code.toUpperCase());
}

/**
 * Parses state query parameter into an array of state names/abbreviations
 * @param stateParam State parameter from URL query
 * @returns Array of state names/abbreviations
 */
export function parseStateParam(stateParam: string | string[] | undefined): string[] {
  if (!stateParam) return [];
  
  // Handle both single value and array values
  const stateValues = Array.isArray(stateParam) ? stateParam : [stateParam];
  
  // Split each value by comma if present and flatten
  const parsed = stateValues
    .flatMap(state => state.split(','))
    .map(state => state.trim().toUpperCase())
    .filter(Boolean); // Remove empty strings
  if (parsed.includes("CONT")) {
    return getContiguousStateCodes();
  }
  return parsed;
}

/**
 * Parses WFO (Weather Forecast Office) query parameter into an array of office codes
 * @param wfoParam WFO parameter from URL query
 * @returns Array of WFO codes
 */
export function parseWFOParam(wfoParam: string | string[] | undefined): string[] {
  if (!wfoParam) return [];
  
  // Handle both single value and array values
  const wfoValues = Array.isArray(wfoParam) ? wfoParam : [wfoParam];
  
  // Split each value by comma if present and flatten
  return wfoValues
    .flatMap(wfo => wfo.split(','))
    .map(wfo => wfo.trim().toUpperCase())
    .filter(wfo => wfo.length === 3); // Only accept 3-letter codes
}

/**
 * Parses alert type query parameter into an array of alert type keys
 * @param typeParam Type parameter from URL query
 * @returns Array of alert type keys
 */
export function parseTypeParam(typeParam: string | string[] | undefined): string[] {
  if (!typeParam) return [];
  const typeValues = Array.isArray(typeParam) ? typeParam : [typeParam];
  return typeValues
    .flatMap(type => type.split(','))
    .map(type => type.trim())
    .filter(Boolean);
}

/**
 * Parses zone query parameter into an array of UGC zone codes
 * @param zoneParam Zone parameter from URL query
 * @returns Array of UGC zone codes
 */
export function parseZoneParam(zoneParam: string | string[] | undefined): string[] {
  if (!zoneParam) return [];
  const zoneValues = Array.isArray(zoneParam) ? zoneParam : [zoneParam];
  return zoneValues
    .flatMap(zone => zone.split(','))
    .map(zone => zone.trim().toUpperCase())
    .filter(Boolean);
}

/**
 * Parses the 'colors' query parameter into an object mapping alert type keys to hex codes.
 * @param colorsParam The 'colors' query parameter from the URL
 * @returns Object mapping alert type keys to hex codes
 */
export function parseColorsParam(colorsParam: string | string[] | undefined): Record<string, string> {
  if (!colorsParam) return {};
  const param = Array.isArray(colorsParam) ? colorsParam[0] : colorsParam;
  if (!param) return {};
  return param.split(',').reduce((acc, pair) => {
    const [key, value] = pair.split(':');
    if (key && value && /^#[0-9A-Fa-f]{3,6}$/.test(value)) {
      acc[key] = normalizeHex(value);
    }
    return acc;
  }, {} as Record<string, string>);
}

/**
 * Serializes an object mapping alert type keys to hex codes into a 'colors' query parameter string.
 * @param colorsObj Object mapping alert type keys to hex codes
 * @returns Query parameter string (e.g., 'TOR:#3b82f6,SVR:#eab308')
 */
export function serializeColorsParam(colorsObj: Record<string, string>): string {
  return Object.entries(colorsObj)
    .filter(([, value]) => /^#[0-9A-Fa-f]{3,6}$/.test(value))
    .map(([key, value]) => `${key}:${normalizeHex(value)}`)
    .join(',');
}

/**
 * Normalizes a hex color string to 6-digit format (e.g., #123 -> #112233)
 * @param hex Hex color string
 * @returns 6-digit hex color string
 */
function normalizeHex(hex: string): string {
  if (/^#[0-9A-Fa-f]{3}$/.test(hex)) {
    // Expand 3-digit hex to 6-digit
    return '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  }
  return hex;
}

/**
 * Apply all query filters to alerts
 * @param alerts The grouped alerts to filter
 * @param params Query parameters object
 * @returns Filtered alerts
 */
export function applyQueryFilters(
  alerts: NWSAlertGrouped,
  params: {
    state?: string | string[];
    wfo?: string | string[];
    type?: string | string[];
    zone?: string | string[];
  }
): NWSAlertGrouped {
  let filteredAlerts = { ...alerts };
  
  // Apply state filter if present
  if (params.state) {
    // If 'cont' is present, only use contiguous states
    const stateValues = Array.isArray(params.state) ? params.state : [params.state];
    if (stateValues.some(v => v.split(',').map(s => s.trim().toUpperCase()).includes("CONT"))) {
      filteredAlerts = filterAlertsByStates(filteredAlerts, getContiguousStateCodes());
    } else {
      const states = parseStateParam(params.state);
      filteredAlerts = filterAlertsByStates(filteredAlerts, states);
    }
  }
  
  // Apply WFO filter if present
  if (params.wfo) {
    const wfos = parseWFOParam(params.wfo);
    filteredAlerts = filterAlertsByOffices(filteredAlerts, wfos);
  }
  
  // Apply type filter if present
  if (params.type) {
    const types = parseTypeParam(params.type);
    filteredAlerts = filterAlertsByTypes(filteredAlerts, types);
  }
  
  // Apply zone filter if present
  if (params.zone) {
    const zones = parseZoneParam(params.zone);
    filteredAlerts = filterAlertsByZones(filteredAlerts, zones);
  }
  
  return filteredAlerts;
}

/**
 * Checks if passive mode is enabled via the 'passive' query parameter.
 * @param searchParams URLSearchParams object
 * @returns true if 'passive=true' is present, false otherwise
 */
export function isPassiveMode(searchParams: URLSearchParams): boolean {
  return searchParams.get('passive') === 'true';
}

/**
 * Returns a new URLSearchParams with the 'passive' parameter set to 'true' or removed.
 * @param searchParams URLSearchParams object
 * @param enable If true, set 'passive=true'; if false, remove it
 * @returns New URLSearchParams object
 */
export function setPassiveMode(searchParams: URLSearchParams, enable: boolean): URLSearchParams {
  const params = new URLSearchParams(searchParams.toString());
  if (enable) {
    params.set('passive', 'true');
  } else {
    params.delete('passive');
  }
  return params;
} 