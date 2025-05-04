import { filterAlertsByStates, filterAlertsByOffices, NWSAlertGrouped, filterAlertsByTypes, filterAlertsByZones } from './nwsAlertUtils';

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
  return stateValues
    .flatMap(state => state.split(','))
    .map(state => state.trim())
    .filter(Boolean); // Remove empty strings
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
    const states = parseStateParam(params.state);
    filteredAlerts = filterAlertsByStates(filteredAlerts, states);
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