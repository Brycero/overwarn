import React, { useRef, useEffect, useMemo, useImperativeHandle, forwardRef } from "react";
import { isZoneBased, getCounties, getStates, getCountiesWithStates } from "../../utils/nwsAlertUtils";

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
});

export default AlertAreaBar;