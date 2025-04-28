import { filterAlertsByStates, filterAlertsByOffices, NWSAlertGrouped } from './nwsAlertUtils';

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
  
  return filteredAlerts;
} 