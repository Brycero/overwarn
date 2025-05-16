"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { ALERT_TYPES, TAILWIND_TO_HEX } from "../../config/alertConfig";
import { parseAlerts, NWSAlertGrouped, NWSAlertProperties } from "../../utils/nwsAlertUtils";
import { applyQueryFilters, parseColorsParam, isPassiveMode } from "../../utils/queryParamUtils";
import { useSearchParams } from "next/navigation";
import React, { createContext, useContext } from "react";

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
  const [queue, setQueue] = useState<AlertDisplay[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [scrollInfo, setScrollInfo] = useState<{ scrollDistance: number; needsScroll: boolean }>({ scrollDistance: 0, needsScroll: false });
  const [startScroll, setStartScroll] = useState(false);
  const [scrollDuration, setScrollDuration] = useState(0);
  const [bufferTime] = useState(2000); // ms
  const [displayDuration, setDisplayDuration] = useState(10000); // ms
  const transitionTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastAlertKey = useRef<string | null>(null);
  const alertsLengthRef = useRef<number>(0);
  const searchParams = useSearchParams();
  const [seenAlertKeys, setSeenAlertKeys] = useState<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [hasInitializedSeen, setHasInitializedSeen] = useState(false);
  const [alertTypeCounts, setAlertTypeCounts] = useState<{ [key: string]: number }>({});

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
          // Compute counts for each alert type (before filtering)
          const counts: { [key: string]: number } = {};
          ALERT_TYPES.forEach(type => {
            counts[type.key] = (parsedAlerts[type.key] || []).length;
          });
          setAlertTypeCounts(counts);
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

  function getAlertKey(alert: { headline: string; area: string; expires: string } | null) {
    if (!alert) return '';
    return `${alert.headline}|${alert.area}|${alert.expires}`;
  }

  // Step 2: Build new queue with isNew property and insert new alerts after currentIdx
  useEffect(() => {
    // Flatten all alerts for cycling, using mergedAlertTypes
    const flatAlerts: AlertDisplay[] = mergedAlertTypes.flatMap(({ key, label, color }) =>
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
    );

    // Compute keys for all alerts
    const flatAlertKeys = flatAlerts.map(getAlertKey);

    // On first load, initialize seenAlertKeys with all current alert keys
    if (!hasInitializedSeen && flatAlertKeys.length > 0) {
      setSeenAlertKeys(new Set(flatAlertKeys));
      setHasInitializedSeen(true);
      setQueue(flatAlerts);
      return;
    }

    // Partition alerts into new and seen
    const newAlerts: AlertDisplay[] = [];
    const seenAlerts: AlertDisplay[] = [];
    flatAlerts.forEach((alert, i) => {
      const key = flatAlertKeys[i];
      if (!seenAlertKeys.has(key)) {
        newAlerts.push(alert);
      } else {
        seenAlerts.push(alert);
      }
    });

    // Stack all new alerts at the beginning of the queue
    setQueue([...newAlerts, ...seenAlerts]);
  }, [alerts, mergedAlertTypes, hasInitializedSeen, seenAlertKeys]);

  // Update alerts length ref when queue changes
  useEffect(() => {
    alertsLengthRef.current = queue.length;
  }, [queue]);

  // Compute a stable key for the current alert
  const currentAlert = queue[currentIdx] || null;
  const alertKey = currentAlert ? getAlertKey(currentAlert) : '';
  const isCurrentAlertNew = currentAlert && !seenAlertKeys.has(alertKey);

  // When scrollInfo changes, recalculate durations
  useEffect(() => {
    const minReadingSpeed = 80; // px/sec
    let scrollDur = 0;
    let totalDisplay = 10000;
    if (scrollInfo.needsScroll && scrollInfo.scrollDistance > 0) {
      scrollDur = (scrollInfo.scrollDistance / minReadingSpeed) * 1000;
      totalDisplay = scrollDur + bufferTime * 2;
    } else {
      totalDisplay = 10000; // 10s for short lists
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
    lastAlertKey.current = getAlertKey(queue[currentIdx] || null);
  }, [currentIdx, queue]);

  useEffect(() => {
    if (queue.length === 0) {
      setCurrentIdx(0);
      return;
    }
    if (lastAlertKey.current) {
      const idx = queue.findIndex(a => getAlertKey(a) === lastAlertKey.current);
      setCurrentIdx(idx >= 0 ? idx : 0);
    } else {
      setCurrentIdx(0);
    }
  }, [queue]);

  // Play sound and mark as seen for new alerts
  useEffect(() => {
    if (!isCurrentAlertNew || !currentAlert) return;
    const passive = isPassiveMode(searchParams);
    if (!passive) {
      if (!audioRef.current) {
        audioRef.current = new window.Audio("/alert-default.mp3");
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
    // Mark as seen after displayDuration
    const timeout = setTimeout(() => {
      setSeenAlertKeys(prev => new Set(prev).add(alertKey));
    }, displayDuration);
    return () => clearTimeout(timeout);
  }, [isCurrentAlertNew, currentAlert, alertKey, displayDuration, searchParams]);

  // Reset queue index to 0 when filters (searchParams) change
  useEffect(() => {
    setCurrentIdx(0);
  }, [searchParams]);

  return {
    alert: currentAlert,
    isCurrentAlertNew,
    isTransitioning,
    scrollInfo,
    setScrollInfo,
    startScroll,
    scrollDuration,
    bufferTime,
    displayDuration,
    mergedAlertTypes,
    alertTypeCounts,
  };
}

const AlertOverlayContext = createContext<ReturnType<typeof useAlertOverlay> | undefined>(undefined);

export const AlertOverlayProvider = ({ children }: { children: React.ReactNode }) => {
  const value = useAlertOverlay();
  return (
    <AlertOverlayContext.Provider value={value}>
      {children}
    </AlertOverlayContext.Provider>
  );
};

export const useAlertOverlayContext = () => {
  const ctx = useContext(AlertOverlayContext);
  if (!ctx) throw new Error("useAlertOverlayContext must be used within AlertOverlayProvider");
  return ctx;
}; 