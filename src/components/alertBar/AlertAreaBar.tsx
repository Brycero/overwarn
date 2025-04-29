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

  // Convert Tailwind classes to CSS background colors
  const getBgColor = (tailwindClass: string) => {
    switch (tailwindClass) {
      case "bg-red-400": return "#f87171";
      case "bg-yellow-300": return "#fde047";
      case "bg-green-300": return "#86efac";
      case "bg-blue-300": return "#93c5fd";
      case "bg-pink-300": return "#f9a8d4";
      case "bg-orange-300": return "#fdba74";
      case "bg-purple-400": return "#c084fc";
      case "bg-neutral-500": return "#737373";
      default: return "#737373";
    }
  };

  // Compute the actual scroll content string
  const scrollContent = area
    ? isZoneBased(area, geocode)
      ? area.toUpperCase()
      : `COUNTIES: ${getCounties(area).toUpperCase()}`
    : "-";

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
      let animationFrameId: number;

      function step(timestamp: number) {
        if (!container) return;
        if (!start) start = timestamp;
        const elapsed = timestamp - start;
        const progress = Math.min(elapsed / duration, 1);
        container.scrollLeft = progress * maxScroll;
        if (progress < 1) {
          animationFrameId = requestAnimationFrame(step);
        }
      }
      animationFrameId = requestAnimationFrame(step);
      // Cleanup to cancel animation if content changes mid-scroll
      return () => cancelAnimationFrame(animationFrameId);
    }
  }, [area, geocode, scrollContent]);

  return (
    <div
      ref={containerRef}
      className="alert-area-scrollbar-hide flex items-center px-6 py-3 text-white font-extrabold text-2xl shadow row-span-1 col-span-3 drop-shadow-md whitespace-nowrap overflow-hidden text-ellipsis"
      style={{ 
        textShadow: '1px 1px 4px rgba(0,0,0,0.7)', 
        overflowX: 'auto',
        backgroundColor: getBgColor(color),
        transition: 'background-color 0.3s'
      }}
    >
      <span
        ref={spanRef}
        className={`transition-all duration-300 inline-block ${isTransitioning && area ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}
        style={{ whiteSpace: 'nowrap' }}
      >
        {scrollContent}
      </span>
    </div>
  );
}