"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { ALERT_TYPES, TAILWIND_TO_HEX } from "../../config/alertConfig";
import { parseAlerts, NWSAlertGrouped, NWSAlertProperties } from "../../utils/nwsAlertUtils";
import { applyQueryFilters, parseColorsParam, isPassiveMode } from "../../utils/queryParamUtils";
import { useSearchParams } from "next/navigation";
import React, { createContext, useContext } from "react";
import { flushSync } from "react-dom";

export type AlertDisplay = {
  id: string;
  label: string;
  color: string;
  headline: string;
  area: string;
  expires: string;
  geocode: NWSAlertProperties["geocode"];
  parameters: NWSAlertProperties["parameters"];
  isPDS?: boolean;
  isObserved?: boolean;
  isEmergency?: boolean;
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
  const newAlertsRef = useRef<Set<string>>(new Set());
  const currentPositionRef = useRef(0);

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

  function getAlertKey(alert: { id: string } | null) {
    if (!alert) return '';
    return alert.id;
  }

  // Process alerts into a flat list
  const getFlattedAlerts = () => {
    return mergedAlertTypes.flatMap(({ key, label, color }) =>
      (alerts[key] || []).map((a: NWSAlertProperties) => {
        let displayLabel = label;
        if (key === "TOR") {
          if (a.isPDS) {
            displayLabel = "PDS " + displayLabel;
          } else if (a.isObserved) {
            displayLabel = "OBSERVED " + displayLabel;
          }
        }
        
        return {
          id: a.id,
          label: displayLabel,
          color,
          headline: a.headline,
          area: a.areaDesc,
          expires: a.ends,
          geocode: a.geocode,
          parameters: a.parameters,
          isPDS: a.isPDS,
          isObserved: a.isObserved,
          isEmergency: a.isEmergency,
        };
      })
    );
  };

  // Update current position ref when currentIdx changes
  useEffect(() => {
    currentPositionRef.current = currentIdx;
  }, [currentIdx]);

  // Build and update queue with new alerts inserted after current
  useEffect(() => {
    // Get flattened alerts
    const flatAlerts = getFlattedAlerts();
    
    // Compute keys for all alerts
    const flatAlertKeys = flatAlerts.map(getAlertKey);
    
    // On first load, initialize seenAlertKeys with all current alert keys
    if (!hasInitializedSeen && flatAlertKeys.length > 0) {
      setSeenAlertKeys(new Set(flatAlertKeys));
      setHasInitializedSeen(true);
      setQueue(flatAlerts);
      return;
    }

    // Reset the newAlertsRef to ensure we're only tracking truly new alerts
    // this prevents previously seen alerts from being marked as new again
    const currentlyNew = new Set(newAlertsRef.current);

    // Find new alerts (those not in seenAlertKeys)
    const newAlerts: AlertDisplay[] = [];
    const existingAlerts: AlertDisplay[] = [];
    
    flatAlerts.forEach((alert) => {
      const key = getAlertKey(alert);
      if (!seenAlertKeys.has(key)) {
        newAlerts.push(alert);
        // Only add to newAlertsRef if it wasn't previously tracked as new
        // or it was already in the set of new alerts
        if (!currentlyNew.has(key)) {
          newAlertsRef.current.add(key);
        }
      } else {
        existingAlerts.push(alert);
      }
    });

    // Remove any alerts from newAlertsRef that are no longer in the alert feed
    const allCurrentKeys = new Set(flatAlertKeys);
    newAlertsRef.current.forEach(key => {
      if (!allCurrentKeys.has(key)) {
        newAlertsRef.current.delete(key);
      }
    });

    // If there are new alerts, insert them after current position
    if (newAlerts.length > 0 && queue.length > 0) {
      const currentPos = currentPositionRef.current; 
      const nextPosition = (currentPos + 1) % queue.length;
      
      // Create a new queue with the new alerts inserted after current position
      const updatedQueue = [...queue];
      updatedQueue.splice(nextPosition, 0, ...newAlerts);
      setQueue(updatedQueue);
    } else if (newAlerts.length > 0) {
      // If queue was empty, just add the new alerts
      setQueue([...newAlerts]);
    } else if (existingAlerts.length !== queue.length) {
      // If no new alerts but the count changed, update the queue
      setQueue([...existingAlerts]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alerts, mergedAlertTypes, hasInitializedSeen, seenAlertKeys]);

  // Update alerts length ref when queue changes
  useEffect(() => {
    alertsLengthRef.current = queue.length;
  }, [queue]);

  // Compute a stable key for the current alert
  const currentAlert = queue[currentIdx] || null;
  const alertKey = currentAlert ? getAlertKey(currentAlert) : '';
  const isCurrentAlertNew = currentAlert ? newAlertsRef.current.has(alertKey) : false;

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

  // Play sound for new alerts
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
  }, [isCurrentAlertNew, currentAlert, alertKey, searchParams]);

  // Control scroll and cycling
  useEffect(() => {
    if (alertsLengthRef.current <= 1) return;
    
    // Clear any existing transition timers to prevent overlap
    if (transitionTimeout.current) {
      clearTimeout(transitionTimeout.current);
      transitionTimeout.current = null;
    }
    
    setStartScroll(false); // reset scroll
    
    // Start scroll after a short delay to ensure AlertAreaBar is rendered
    const scrollStart = setTimeout(() => {
      setStartScroll(true);
    }, 50); // 50ms delay to allow DOM update
    
    // Advance to next alert after displayDuration
    const interval = setTimeout(() => {
      // Only transition if we're still showing the same alert
      // This prevents race conditions when the queue changes
      if (getAlertKey(queue[currentIdx] || null) === alertKey) {
        setIsTransitioning(true);
        transitionTimeout.current = setTimeout(() => {
          // Double-check we haven't already changed indices
          if (currentPositionRef.current === currentIdx) {
            // Batch mark as seen and advance index so alert is never shown twice
            if (isCurrentAlertNew && currentAlert) {
              const key = alertKey;
              flushSync(() => {
                setSeenAlertKeys(prev => new Set([...prev, key]));
                // Remove from newAlertsRef
                const newSet = new Set(newAlertsRef.current);
                newSet.delete(key);
                newAlertsRef.current = newSet;
                setCurrentIdx((idx) => (idx + 1) % alertsLengthRef.current);
              });
            } else {
              setCurrentIdx((idx) => (idx + 1) % alertsLengthRef.current);
            }
          }
        }, 300);
      }
    }, displayDuration);
    
    return () => {
      clearTimeout(scrollStart);
      clearTimeout(interval);
      if (transitionTimeout.current) clearTimeout(transitionTimeout.current);
    };
  }, [alertKey, displayDuration, queue, currentIdx, isCurrentAlertNew, currentAlert]);

  // Reset transition state when currentIdx changes
  useEffect(() => {
    // Immediately clear any existing transition timeout
    if (transitionTimeout.current) {
      clearTimeout(transitionTimeout.current);
      transitionTimeout.current = null;
    }
    
    // Set isTransitioning to false after a very brief delay to ensure smooth transition
    const resetTimeout = setTimeout(() => {
      setIsTransitioning(false);
    }, 50);
    
    return () => clearTimeout(resetTimeout);
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