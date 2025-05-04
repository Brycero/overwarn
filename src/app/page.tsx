"use client";
import React, { useEffect, useState, useRef, Suspense, useMemo } from "react";
import { Geist } from "next/font/google";
import { ALERT_TYPES, colorMap } from "../config/alertConfig";
import { parseAlerts, NWSAlertGrouped, NWSAlertProperties } from "../utils/nwsAlertUtils";
import { applyQueryFilters } from "../utils/queryParamUtils";
import AlertExpires from "../components/alertBar/AlertExpires";
import AlertStateBar from "../components/alertBar/AlertStateBar";
import AlertTypeBar from "../components/alertBar/AlertTypeBar";
import AlertAreaBar from "../components/alertBar/AlertAreaBar";
import { useSearchParams } from "next/navigation";
import { Menu } from "lucide-react";
import AppMenu from "../components/menu/AppMenu";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Type for the alert objects used in the overlay display
type AlertDisplay = {
  label: string;
  color: string;
  headline: string;
  area: string;
  expires: string;
  geocode: NWSAlertProperties["geocode"];
  parameters: NWSAlertProperties["parameters"];
};

function AlertOverlayContent() {
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

  // Flatten all alerts for cycling
  const allAlerts = useMemo(() => ALERT_TYPES.flatMap(({ key, label, color }) =>
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
      parameters: a.parameters,
    }))
  ), [alerts]);

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

  const alert = currentAlert;
  const alertColor = alert ? colorMap[alert.color] || colorMap["default"] : colorMap["default"];

  return (
    <div className={`fixed bottom-0 left-0 w-full z-50 ${geistSans.variable}`} style={{ fontFamily: 'var(--font-geist-sans), Arial, sans-serif' }}>
      <div className="grid grid-cols-4 grid-rows-2 w-full min-h-[90px]">
        {/* Top Left: Expires in time */}
        <AlertExpires expires={alert ? alert.expires : null} isTransitioning={isTransitioning} />
        {/* Top Right: State | Expires Time */}
        <AlertStateBar area={alert ? alert.area : null} geocode={alert ? alert.geocode : undefined} expires={alert ? alert.expires : null} headline={alert ? alert.headline : null} isTransitioning={isTransitioning} />
        {/* Bottom Left: Alert Type */}
        <AlertTypeBar label={alert ? alert.label : null} color={alertColor.base} isTransitioning={isTransitioning} />
        {/* Bottom Right: Counties or Area */}
        <AlertAreaBar
          area={alert ? alert.area : null}
          geocode={alert ? alert.geocode : undefined}
          isTransitioning={isTransitioning}
          color={alertColor.light}
          scrollDuration={scrollDuration}
          bufferTime={bufferTime}
          startScroll={startScroll}
          onMeasureScroll={setScrollInfo}
        />
      </div>
    </div>
  );
}

// Loading component for Suspense fallback
function LoadingOverlay() {
  return (
    <div className={`fixed bottom-0 left-0 w-full z-50 ${geistSans.variable}`}>
      <div className="grid grid-cols-4 grid-rows-2 w-full min-h-[90px] bg-gray-800 animate-pulse">
        <div className="col-span-1 row-span-1"></div>
        <div className="col-span-3 row-span-1"></div>
        <div className="col-span-1 row-span-1"></div>
        <div className="col-span-3 row-span-1"></div>
      </div>
    </div>
  );
}

export default function LiveAlertOverlay() {
  return (
    <div className="group min-h-screen w-full fixed inset-0">
      <div className="fixed top-4 left-4 z-50">
        <AppMenu>
          <button
            aria-label="Open menu"
            className="opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 transition-opacity duration-300 bg-black/50 p-1 rounded-md"
          >
            <Menu className="w-8 h-8 text-white" />
          </button>
        </AppMenu>
      </div>
      <Suspense fallback={<LoadingOverlay />}>
        <AlertOverlayContent />
      </Suspense>
    </div>
  );
}
