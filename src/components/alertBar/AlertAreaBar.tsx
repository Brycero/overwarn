import React, { useRef, useEffect, useMemo, useImperativeHandle, forwardRef } from "react";
import { isZoneBased, getCounties, getStates, getCountiesWithStates } from "../../utils/nwsAlertUtils";
import { colorMap, TAILWIND_TO_HEX } from "../../config/alertConfig";

// Utility to lighten a hex color by a given percent (0-100)
function lightenHexColor(hex: string, percent = 20): string {
  hex = hex.replace('#', '');
  if (hex.length === 3) {
    hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  }
  if (hex.length !== 6) return '#' + hex;
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, parseInt(hex.substring(0,2),16) + amt);
  const G = Math.min(255, parseInt(hex.substring(2,4),16) + amt);
  const B = Math.min(255, parseInt(hex.substring(4,6),16) + amt);
  return `#${R.toString(16).padStart(2,'0')}${G.toString(16).padStart(2,'0')}${B.toString(16).padStart(2,'0')}`;
}

function getLightAreaBarColor(color: string): string {
  // If color matches a Tailwind hex, use the mapped light color
  const tailwindEntry = Object.entries(TAILWIND_TO_HEX).find(([, hex]) => hex.toLowerCase() === color.toLowerCase());
  if (tailwindEntry) {
    // Find the base class (e.g. bg-red-600) and get its light variant from colorMap
    const baseClass = tailwindEntry[0];
    const lightClass = colorMap[baseClass]?.light;
    if (lightClass && TAILWIND_TO_HEX[lightClass]) {
      return TAILWIND_TO_HEX[lightClass];
    }
  }
  // Otherwise, lighten the custom hex by 20%
  return lightenHexColor(color, 20);
}

type AlertAreaBarProps = {
  area: string | null;
  geocode?: { UGC?: string[] };
  isTransitioning: boolean;
  color: string;
  scrollDuration: number; // ms
  bufferTime: number; // ms
  startScroll: boolean;
  onMeasureScroll?: (info: { scrollDistance: number; needsScroll: boolean }) => void;
};

const AlertAreaBar = forwardRef<HTMLDivElement, AlertAreaBarProps>(function AlertAreaBar({
  area, geocode, isTransitioning, color, scrollDuration, bufferTime, startScroll, onMeasureScroll
}, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const spanRef = useRef<HTMLSpanElement>(null);

  // Compute the actual scroll content string, memoized to avoid unnecessary recalculation
  const { scrollContent } = useMemo(() => {
    let label = "COUNTIES";
    let scrollContent = "";
    if (area && !isZoneBased(area, geocode)) {
      const statesStr = getStates(area, geocode);
      const statesArr = statesStr.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
      const hasLouisiana = statesArr.includes("louisiana");
      if (statesArr.length === 1) {
        if (hasLouisiana) {
          label = "PARISHES";
        } else {
          label = "COUNTIES";
        }
        scrollContent = `${label}: ${getCounties(area).toUpperCase()}`;
      } else if (statesArr.length > 1) {
        label = hasLouisiana ? "COUNTIES/PARISHES" : "COUNTIES";
        scrollContent = `${label}: ${getCountiesWithStates(area).toUpperCase()}`;
      }
    } else if (area) {
      scrollContent = area.toUpperCase();
    }
    return { label, scrollContent };
  }, [area, geocode]);

  // Use getLightAreaBarColor for the background
  const bgColor = useMemo(() => getLightAreaBarColor(color), [color]);

  // Expose measureScroll to parent after render
  useEffect(() => {
    const container = containerRef.current;
    const content = spanRef.current;
    if (!container || !content) return;
    // Account for container horizontal padding
    const style = window.getComputedStyle(container);
    const paddingLeft = parseFloat(style.paddingLeft) || 0;
    const paddingRight = parseFloat(style.paddingRight) || 0;
    const totalPadding = paddingLeft + paddingRight;
    const scrollDistance = content.scrollWidth - (container.clientWidth - totalPadding);
    const needsScroll = content.scrollWidth > container.clientWidth;
    if (onMeasureScroll) {
      onMeasureScroll({ scrollDistance, needsScroll });
    }
  }, [area, geocode, scrollContent, onMeasureScroll]);

  // Scroll animation controlled by parent
  useEffect(() => {
    const container = containerRef.current;
    const content = spanRef.current;
    if (!container || !content) return;
    // Always reset scroll position
    container.scrollLeft = 0;
    let animationFrameId: number;
    let start: number | null = null;
    let scrollDistance = 0;
    // Account for container horizontal padding
    const style = window.getComputedStyle(container);
    const paddingLeft = parseFloat(style.paddingLeft) || 0;
    const paddingRight = parseFloat(style.paddingRight) || 0;
    const totalPadding = paddingLeft + paddingRight;
    scrollDistance = content.scrollWidth - (container.clientWidth - totalPadding);
    if (!startScroll || scrollDistance <= 0) return;
    // Start scroll after bufferTime
    const scrollStartTimeout = setTimeout(() => {
      function step(timestamp: number) {
        if (!container) return;
        if (!start) start = timestamp;
        const elapsed = timestamp - start;
        const progress = Math.min(elapsed / scrollDuration, 1);
        container.scrollLeft = progress * scrollDistance;
        if (progress < 1) {
          animationFrameId = requestAnimationFrame(step);
        }
      }
      animationFrameId = requestAnimationFrame(step);
    }, bufferTime);
    // Cleanup
    return () => {
      clearTimeout(scrollStartTimeout);
      cancelAnimationFrame(animationFrameId);
    };
  }, [area, geocode, scrollContent, startScroll, scrollDuration, bufferTime]);

  useImperativeHandle(ref, () => containerRef.current as HTMLDivElement);

  return (
    <div
      ref={containerRef}
      className="alert-area-scrollbar-hide flex items-center px-6 py-3 text-white font-extrabold text-2xl shadow row-span-1 col-span-3 drop-shadow-md whitespace-nowrap overflow-hidden text-ellipsis"
      style={{ 
        textShadow: '1px 1px 4px rgba(0,0,0,0.7)', 
        overflowX: 'auto',
        backgroundColor: bgColor,
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
});

export default AlertAreaBar;