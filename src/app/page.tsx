"use client";
import React, { useEffect, useState, useRef, Suspense, useMemo } from "react";
import { Geist } from "next/font/google";
import { ALERT_TYPES, colorMap } from "../config/alertConfig";
import { parseAlerts, NWSAlertGrouped, NWSAlertProperties, isZoneBased, getCounties } from "../utils/nwsAlertUtils";
import { applyQueryFilters } from "../utils/queryParamUtils";
import AlertExpires from "../components/alertBar/AlertExpires";
import AlertStateBar from "../components/alertBar/AlertStateBar";
import AlertTypeBar from "../components/alertBar/AlertTypeBar";
import AlertAreaBar from "../components/alertBar/AlertAreaBar";
import { useSearchParams } from "next/navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

function AlertOverlayContent() {
  const [alerts, setAlerts] = useState<NWSAlertGrouped>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastAlertKey = useRef<string | null>(null);
  const alertsLengthRef = useRef<number>(0);
  const searchParams = useSearchParams();

  useEffect(() => {
    let isMounted = true;
    async function fetchAlerts() {
      const res = await fetch(
        "https://api.weather.gov/alerts/active"
      );
      const data = await res.json();
      if (isMounted) {
        // Parse the raw alerts
        const parsedAlerts = parseAlerts(data.features || []);
        
        // Apply filters based on query parameters
        const state = searchParams.get('state') || undefined;
        const wfo = searchParams.get('wfo') || undefined;
        const filteredAlerts = applyQueryFilters(parsedAlerts, { state, wfo });
        
        setAlerts(filteredAlerts);
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

  function getAlertKey(alert: { headline: string; area: string; expires: string } | null) {
    if (!alert) return '';
    return `${alert.headline}|${alert.area}|${alert.expires}`;
  }

  useEffect(() => {
    if (alertsLengthRef.current <= 1) return;
    // Determine display duration based on county count
    const currentAlert = allAlerts[currentIdx];
    let displayDuration = 10000; // default 10s
    if (currentAlert && !isZoneBased(currentAlert.area, currentAlert.geocode)) {
      const counties = getCounties(currentAlert.area);
      const countyCount = counties.split(',').length;
      if (countyCount > 8) {
        displayDuration = 15000; // 15s for long county lists
      }
    }
    const interval = setInterval(() => {
      setIsTransitioning(true);
      transitionTimeout.current = setTimeout(() => {
        setCurrentIdx((idx) => (idx + 1) % alertsLengthRef.current);
        setIsTransitioning(false);
      }, 300);
    }, displayDuration);
    return () => {
      clearInterval(interval);
      if (transitionTimeout.current) clearTimeout(transitionTimeout.current);
    };
  }, [currentIdx, allAlerts]);

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

  const alert = allAlerts[currentIdx] || null;
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
        <AlertAreaBar area={alert ? alert.area : null} geocode={alert ? alert.geocode : undefined} isTransitioning={isTransitioning} color={alertColor.light} />
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
    <Suspense fallback={<LoadingOverlay />}>
      <AlertOverlayContent />
    </Suspense>
  );
}
