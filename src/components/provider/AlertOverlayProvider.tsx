import { useEffect, useState, useRef, useMemo } from "react";
import { ALERT_TYPES, TAILWIND_TO_HEX } from "../../config/alertConfig";
import { parseAlerts, NWSAlertGrouped, NWSAlertProperties } from "../../utils/nwsAlertUtils";
import { applyQueryFilters, parseColorsParam } from "../../utils/queryParamUtils";
import { useSearchParams } from "next/navigation";

export type AlertDisplay = {
  label: string;
  color: string;
  headline: string;
  area: string;
  expires: string;
  geocode: NWSAlertProperties["geocode"];
  parameters: NWSAlertProperties["parameters"];
};

export function useAlertOverlay() {
  const [alerts, setAlerts] = useState<NWSAlertGrouped>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentAlert, setCurrentAlert] = useState<AlertDisplay | null>(null);
  const [scrollInfo, setScrollInfo] = useState<{ scrollDistance: number; needsScroll: boolean }>({ scrollDistance: 0, needsScroll: false });
  const [startScroll, setStartScroll] = useState(false);
  const [scrollDuration, setScrollDuration] = useState(0);
  const [bufferTime] = useState(2000); // ms
  const [displayDuration, setDisplayDuration] = useState(5000); // ms
  const transitionTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastAlertKey = useRef<string | null>(null);
  const alertsLengthRef = useRef<number>(0);
  const searchParams = useSearchParams();

  // --- Custom Color Logic ---
  // Parse user color overrides from query string
  const userColors = useMemo(() => {
    const colorsParam = searchParams.get("colors") || undefined;
    return parseColorsParam(colorsParam);
  }, [searchParams]);

  // Merge ALERT_TYPES with userColors for color assignment (hex code)
  const mergedAlertTypes = useMemo(() => {
    return ALERT_TYPES.map((type) => {
      // If user override, use that hex; otherwise, convert Tailwind to hex
      const hex = userColors[type.key] || TAILWIND_TO_HEX[type.color] || "#404040";
      return {
        ...type,
        color: hex,
        _originalColor: type.color, // keep for area bar light color
      };
    });
  }, [userColors]);

  useEffect(() => {
    let isMounted = true;
    async function fetchAlerts() {
      try {
        const res = await fetch(
          "https://api.weather.gov/alerts/active"
        );
        if (!res.ok) {
          throw new Error(`Network response was not ok: ${res.status} ${res.statusText}`);
        }
        const data = await res.json();
        if (isMounted) {
          // Parse the raw alerts
          const parsedAlerts = parseAlerts(data.features || []);
          // Apply filters based on query parameters
          const state = searchParams.get('state') || undefined;
          const wfo = searchParams.get('wfo') || undefined;
          const type = searchParams.get('type') || undefined;
          const zone = searchParams.get('zone') || undefined;
          const filteredAlerts = applyQueryFilters(parsedAlerts, { state, wfo, type, zone });
          setAlerts(filteredAlerts);
        }
      } catch (error) {
        console.error('Failed to fetch alerts:', error);
      }
    }
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [searchParams]);

  // Flatten all alerts for cycling, using mergedAlertTypes
  const allAlerts = useMemo(() => mergedAlertTypes.flatMap(({ key, label, color }) =>
    (alerts[key] || []).map((a: NWSAlertProperties) => ({
      label: (a.event.startsWith("PDS") ? "PDS " : "") +
        (a.event.includes("OBSERVED") ? "OBSERVED " : "") +
        (a.event.includes("EMERGENCY") ? "EMERGENCY " : "") +
        label,
      color, // always hex
      headline: a.headline,
      area: a.areaDesc,
      expires: a.ends,
      geocode: a.geocode,
      parameters: a.parameters,
    }))
  ), [alerts, mergedAlertTypes]);

  // Update alerts length ref when allAlerts changes
  useEffect(() => {
    alertsLengthRef.current = allAlerts.length;
  }, [allAlerts]);

  // Memoize current alert: only update if key fields change
  useEffect(() => {
    const next: typeof allAlerts[number] | null = allAlerts[currentIdx] || null;
    setCurrentAlert((prev: typeof allAlerts[number] | null) => {
      if (!prev && !next) return null;
      if (!prev || !next) return next;
      // Compare key fields
      if (
        prev.headline !== next.headline ||
        prev.area !== next.area ||
        prev.expires !== next.expires
      ) {
        return next;
      }
      return prev;
    });
  }, [allAlerts, currentIdx]);

  function getAlertKey(alert: { headline: string; area: string; expires: string } | null) {
    if (!alert) return '';
    return `${alert.headline}|${alert.area}|${alert.expires}`;
  }

  // Compute a stable key for the current alert
  const alertKey = currentAlert ? getAlertKey(currentAlert) : '';

  // When scrollInfo changes, recalculate durations
  useEffect(() => {
    const minReadingSpeed = 80; // px/sec
    let scrollDur = 0;
    let totalDisplay = 5000;
    if (scrollInfo.needsScroll && scrollInfo.scrollDistance > 0) {
      scrollDur = (scrollInfo.scrollDistance / minReadingSpeed) * 1000;
      totalDisplay = scrollDur + bufferTime * 2;
    } else {
      totalDisplay = 5000; // 5s for short lists
      scrollDur = 0;
    }
    setScrollDuration(scrollDur);
    setDisplayDuration(totalDisplay);
  }, [scrollInfo, bufferTime]);

  // Control scroll and cycling
  useEffect(() => {
    if (alertsLengthRef.current <= 1) return;
    setStartScroll(false); // reset scroll
    // Start scroll after a short delay to ensure AlertAreaBar is rendered
    const scrollStart = setTimeout(() => {
      setStartScroll(true);
    }, 50); // 50ms delay to allow DOM update
    // Advance to next alert after displayDuration
    const interval = setTimeout(() => {
      setIsTransitioning(true);
      transitionTimeout.current = setTimeout(() => {
        setCurrentIdx((idx) => (idx + 1) % alertsLengthRef.current);
        setIsTransitioning(false);
      }, 300);
    }, displayDuration);
    return () => {
      clearTimeout(scrollStart);
      clearTimeout(interval);
      if (transitionTimeout.current) clearTimeout(transitionTimeout.current);
    };
  }, [alertKey, displayDuration]);

  useEffect(() => {
    setIsTransitioning(false);
    if (transitionTimeout.current) clearTimeout(transitionTimeout.current);
  }, [currentIdx]);

  useEffect(() => {
    lastAlertKey.current = getAlertKey(allAlerts[currentIdx] || null);
  }, [currentIdx, allAlerts]);

  useEffect(() => {
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
  }, [allAlerts]);

  return {
    alert: currentAlert,
    isTransitioning,
    scrollInfo,
    setScrollInfo,
    startScroll,
    scrollDuration,
    bufferTime,
    displayDuration,
    mergedAlertTypes,
  };
} 