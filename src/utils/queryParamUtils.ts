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