"use client";

import { useEffect, useState, useRef, useMemo, useReducer } from "react";
import { ALERT_TYPES, TAILWIND_TO_HEX } from "@/config/alertConfig";
import {
  parseAlerts,
  NWSAlertGrouped,
  NWSAlertProperties,
} from "@/utils/nwsAlertUtils";
import {
  applyQueryFilters,
  parseColorsParam,
  isPassiveMode,
} from "@/utils/queryParamUtils";
import { useSearchParams } from "next/navigation";
import React, { createContext, useContext } from "react";

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
  alertType: string;
};

type OverlayState = {
  query: string | null;
  initialized: boolean;
  queue: AlertDisplay[];
  currentId: string | null;
  seenIds: Set<string>;
  counts: Record<string, number>;
};

type OverlayAction =
  | { type: "received"; query: string; alerts: AlertDisplay[]; counts: Record<string, number> }
  | { type: "advance"; query: string; currentId: string };

type Playback = {
  query: string;
  alertKey: string;
  displayDuration: number;
};

function createOverlayState(): OverlayState {
  return {
    query: null,
    initialized: false,
    queue: [],
    currentId: null,
    seenIds: new Set(),
    counts: {},
  };
}

function overlayReducer(state: OverlayState, action: OverlayAction): OverlayState {
  if (action.type === "advance") {
    if (state.query !== action.query || state.currentId !== action.currentId) return state;
    const index = state.queue.findIndex((alert) => alert.id === action.currentId);
    if (index < 0) return state;
    const seenIds = new Set(state.seenIds);
    seenIds.add(action.currentId);
    return {
      ...state,
      currentId: state.queue[(index + 1) % state.queue.length].id,
      seenIds,
    };
  }

  const { query, alerts, counts } = action;
  if (state.query !== query || !state.initialized) {
    return {
      query,
      initialized: alerts.length > 0,
      queue: alerts,
      currentId: alerts[0]?.id ?? null,
      seenIds: new Set(alerts.map((alert) => alert.id)),
      counts,
    };
  }

  const incoming = new Map(alerts.map((alert) => [alert.id, alert]));
  const previousIds = new Set(state.queue.map((alert) => alert.id));
  const queue = state.queue.flatMap((alert) => {
    const updated = incoming.get(alert.id);
    return updated ? [updated] : [];
  });
  const additions = alerts.filter((alert) => !previousIds.has(alert.id));
  const currentIndex = queue.findIndex((alert) => alert.id === state.currentId);
  queue.splice(currentIndex >= 0 ? currentIndex + 1 : queue.length, 0, ...additions);
  return {
    ...state,
    queue,
    currentId: incoming.has(state.currentId ?? "") ? state.currentId : queue[0]?.id ?? null,
    counts,
  };
}

function toDisplayAlerts(
  alerts: NWSAlertGrouped,
  alertTypes: { key: string; label: string; color: string }[],
): AlertDisplay[] {
  return alertTypes.flatMap(({ key, label, color }) =>
    (alerts[key] || []).map((alert) => {
      let displayLabel = label;
      let displayColor = color;
      if (alert.isEmergency) {
        if (key === "TOR") {
          displayLabel = "TORNADO EMERGENCY";
          displayColor = TAILWIND_TO_HEX["bg-fuchsia-600"] || "#c026d3";
        } else if (key === "FFW") {
          displayLabel = "FLASH FLOOD EMERGENCY";
        }
      } else if (key === "TOR") {
        if (alert.isPDS) displayLabel = "PDS " + displayLabel;
        else if (alert.isObserved) displayLabel = "OBSERVED " + displayLabel;
      }
      return {
        id: alert.id,
        label: displayLabel,
        color: displayColor,
        headline: alert.headline,
        area: alert.areaDesc,
        expires: alert.ends,
        geocode: alert.geocode,
        parameters: alert.parameters,
        isPDS: alert.isPDS,
        isObserved: alert.isObserved,
        isEmergency: alert.isEmergency,
        alertType: key,
      };
    }),
  );
}

export function useAlertOverlay() {
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const [state, dispatch] = useReducer(overlayReducer, undefined, createOverlayState);
  const [scrollInfo, setScrollInfo] = useState({ scrollDistance: 0, needsScroll: false });
  const [scrollStartedFor, setScrollStartedFor] = useState<Playback | null>(null);
  const [transitioningFor, setTransitioningFor] = useState<Playback | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const colorsParam = searchParams.get("colors") || undefined;
  const mergedAlertTypes = useMemo(() => {
    const userColors = parseColorsParam(colorsParam);
    return ALERT_TYPES.map((type) => ({
      ...type,
      color: userColors[type.key] || TAILWIND_TO_HEX[type.color] || "#404040",
      _originalColor: type.color,
    }));
  }, [colorsParam]);

  useEffect(() => {
    let isMounted = true;
    const params = new URLSearchParams(query);
    async function fetchAlerts() {
      try {
        const res = await fetch("https://api.weather.gov/alerts/active");
        if (!res.ok) throw new Error(`Network response was not ok: ${res.status} ${res.statusText}`);
        const data = await res.json();
        if (!isMounted) return;
        const parsedAlerts = parseAlerts(data.features || []);
        const counts: Record<string, number> = {};
        ALERT_TYPES.forEach((type) => {
          counts[type.key] = (parsedAlerts[type.key] || []).length;
        });
        const filteredAlerts = applyQueryFilters(parsedAlerts, {
          state: params.get("state") || undefined,
          wfo: params.get("wfo") || undefined,
          type: params.get("type") || undefined,
          zone: params.get("zone") || undefined,
        });
        dispatch({ type: "received", query, alerts: toDisplayAlerts(filteredAlerts, mergedAlertTypes), counts });
      } catch (error) {
        console.error("Failed to fetch alerts:", error);
      }
    }
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [query, mergedAlertTypes]);

  const currentAlert = state.queue.find((alert) => alert.id === state.currentId) ?? null;
  const alertKey = currentAlert?.id ?? "";
  const isCurrentAlertNew = state.query === query && currentAlert !== null && !state.seenIds.has(alertKey);
  const bufferTime = 2000;
  const scrollDuration = scrollInfo.needsScroll && scrollInfo.scrollDistance > 0
    ? (scrollInfo.scrollDistance / 80) * 1000
    : 0;
  const displayDuration = scrollDuration > 0 ? scrollDuration + bufferTime * 2 : 10000;
  const playback = useMemo(
    () => ({ query, alertKey, displayDuration }),
    [query, alertKey, displayDuration],
  );
  const startScroll = scrollStartedFor === playback;
  const isTransitioning = transitioningFor === playback;
  const hasMultipleAlerts = state.queue.length > 1;
  const passive = isPassiveMode(searchParams);

  useEffect(() => {
    if (!isCurrentAlertNew || passive) return;
    if (!audioRef.current) audioRef.current = new window.Audio("/alert-default.mp3");
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {});
  }, [isCurrentAlertNew, alertKey, passive]);

  useEffect(() => {
    if (!alertKey) return;
    const scrollStart = setTimeout(() => setScrollStartedFor(playback), 50);
    return () => clearTimeout(scrollStart);
  }, [alertKey, playback]);

  useEffect(() => {
    if (!alertKey || !hasMultipleAlerts) return;
    const transitionStart = setTimeout(() => {
      setTransitioningFor(playback);
    }, displayDuration);
    return () => clearTimeout(transitionStart);
  }, [alertKey, playback, displayDuration, hasMultipleAlerts]);

  useEffect(() => {
    if (!isTransitioning) return;
    const transitionEnd = setTimeout(() => {
      dispatch({ type: "advance", query, currentId: alertKey });
      setTransitioningFor(null);
    }, 300);
    return () => clearTimeout(transitionEnd);
  }, [isTransitioning, query, alertKey]);

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
    alertTypeCounts: state.counts,
  };
}

const AlertOverlayContext = createContext<
  ReturnType<typeof useAlertOverlay> | undefined
>(undefined);

export const AlertOverlayProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const {
    alert,
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
  } = useAlertOverlay();

  const value = useMemo(
    () => ({
      alert,
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
    }),
    [
      alert,
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
    ]
  );
  return (
    <AlertOverlayContext.Provider value={value}>
      {children}
    </AlertOverlayContext.Provider>
  );
};

export const useAlertOverlayContext = () => {
  const ctx = useContext(AlertOverlayContext);
  if (!ctx)
    throw new Error(
      "useAlertOverlayContext must be used within AlertOverlayProvider"
    );
  return ctx;
};
