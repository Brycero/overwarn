import React, { useRef, useEffect } from "react";
import { isZoneBased, getCounties } from "../../utils/nwsAlertUtils";

type AlertAreaBarProps = {
  area: string | null;
  geocode?: { UGC?: string[] };
  isTransitioning: boolean;
  color: string;
};

export default function AlertAreaBar({ area, geocode, isTransitioning, color }: AlertAreaBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const content = spanRef.current;
    if (!container || !content) return;

    // Reset scroll position
    container.scrollLeft = 0;

    // Check for overflow
    if (content.scrollWidth > container.clientWidth) {
      let start: number | null = null;
      // Determine scroll duration based on county count
      let duration = 10000; // 10 seconds default
      if (area && !isZoneBased(area, geocode)) {
        const counties = getCounties(area);
        const countyCount = counties.split(',').length;
        if (countyCount > 8) {
          duration = 15000; // 15 seconds for long county lists
        }
      }
      const maxScroll = container.scrollWidth - container.clientWidth;

      function step(timestamp: number) {
        if (!container) return;
        if (!start) start = timestamp;
        const elapsed = timestamp - start;
        const progress = Math.min(elapsed / duration, 1);
        container.scrollLeft = progress * maxScroll;
        if (progress < 1) {
          requestAnimationFrame(step);
        }
      }
      requestAnimationFrame(step);
    }
  }, [area]);

  return (
    <div
      ref={containerRef}
      className={`${color} alert-area-scrollbar-hide transition-colors duration-300 flex items-center px-6 py-3 text-white font-extrabold text-2xl shadow row-span-1 col-span-3 drop-shadow-md whitespace-nowrap overflow-hidden text-ellipsis`}
      style={{ textShadow: '1px 1px 4px rgba(0,0,0,0.7)', overflowX: 'auto' }}
    >
      <span
        ref={spanRef}
        className={`transition-all duration-300 inline-block ${isTransitioning && area ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}
        style={{ whiteSpace: 'nowrap' }}
      >
        {area ? (
          isZoneBased(area, geocode)
            ? area.toUpperCase()
            : `COUNTIES: ${getCounties(area).toUpperCase()}`
        ) : "-"}
      </span>
    </div>
  );
} 