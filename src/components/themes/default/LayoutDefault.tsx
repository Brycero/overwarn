import React from "react";
import { useAlertOverlayContext } from "../../providers/AlertOverlayProvider";
import AlertExpires from "./AlertExpires";
import AlertStateBar from "./AlertStateBar";
import AlertTypeBar from "./AlertTypeBar";
import AlertAreaBar from "./AlertAreaBar";
import { Geist } from "next/font/google";
import { useSearchParams } from "next/navigation";
import { isPassiveMode } from "../../../utils/queryParamUtils";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export default function AlertOverlayLayoutDefault() {
  const {
    alert,
    isTransitioning,
    setScrollInfo,
    startScroll,
    scrollDuration,
    bufferTime,
    isCurrentAlertNew,
  } = useAlertOverlayContext();
  const searchParams = useSearchParams();
  const showNewBadge = !isPassiveMode(searchParams);

  return (
    <div className={`fixed bottom-0 left-0 w-full z-50 ${geistSans.variable}`} style={{ fontFamily: 'var(--font-geist-sans), Arial, sans-serif' }}>
      <div className="grid grid-cols-[auto_1fr] grid-rows-2 w-full min-h-[90px]">
        {/* Left Column Top: Expires in time */}
        <AlertExpires
          expires={alert ? alert.expires : null}
          isTransitioning={isTransitioning}
          isNew={isCurrentAlertNew}
          showNewBadge={showNewBadge}
        />
        {/* Right Column Top: State | Expires Time */}
        <AlertStateBar area={alert ? alert.area : null} geocode={alert ? alert.geocode : undefined} expires={alert ? alert.expires : null} headline={alert ? alert.headline : null} isTransitioning={isTransitioning} />
        {/* Left Column Bottom: Alert Type */}
        <AlertTypeBar label={alert ? alert.label : null} color={alert ? alert.color : "#404040"} isTransitioning={isTransitioning} />
        {/* Right Column Bottom: Counties or Area */}
        <AlertAreaBar
          area={alert ? alert.area : null}
          geocode={alert ? alert.geocode : undefined}
          isTransitioning={isTransitioning}
          color={alert ? alert.color : "#737373"}
          scrollDuration={scrollDuration}
          bufferTime={bufferTime}
          startScroll={startScroll}
          onMeasureScroll={setScrollInfo}
        />
      </div>
    </div>
  );
}