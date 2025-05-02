import React from "react";

type AlertTypeBarProps = {
  label: string | null;
  color: string;
  isTransitioning: boolean;
};

export default function AlertTypeBar({ label, color, isTransitioning }: AlertTypeBarProps) {
  // Convert Tailwind classes to CSS background colors
  const getBgColor = (tailwindClass: string) => {
    switch (tailwindClass) {
      case "bg-red-600": return "#dc2626";
      case "bg-yellow-500": return "#eab308";
      case "bg-green-500": return "#22c55e";
      case "bg-blue-500": return "#3b82f6";
      case "bg-pink-500": return "#ec4899";
      case "bg-orange-500": return "#f97316";
      case "bg-purple-600": return "#9333ea";
      case "bg-neutral-700": return "#404040";
      default: return "#404040";
    }
  };

  return (
    <div 
      className={`flex items-center px-4 py-3 text-white font-extrabold text-2xl shadow row-span-1 col-span-1 drop-shadow-md whitespace-nowrap overflow-hidden text-ellipsis`} 
      style={{ 
        textShadow: '1px 1px 4px rgba(0,0,0,0.7)',
        backgroundColor: getBgColor(color),
        transition: 'background-color 0.3s'
      }}
    >
      <span className={`transition-all duration-300 inline-block ${isTransitioning && label ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
        {label || "NO ACTIVE ALERTS"}
      </span>
    </div>
  );
} 