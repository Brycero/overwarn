import React from "react";

type AlertTypeBarProps = {
  label: string | null;
  color: string;
  isTransitioning: boolean;
};

export default function AlertTypeBar({ label, color, isTransitioning }: AlertTypeBarProps) {
  return (
    <div 
      className={`flex items-center px-4 py-3 text-white font-extrabold text-2xl shadow row-span-1 col-span-1 drop-shadow-md whitespace-nowrap`} 
      style={{ 
        textShadow: '1px 1px 4px rgba(0,0,0,0.7)',
        backgroundColor: color,
        transition: 'background-color 0.3s',
        minWidth: '360px'
      }}
    >
      <span className={`transition-all duration-300 inline-block ${isTransitioning && label ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
        {label || "NO ACTIVE ALERTS"}
      </span>
    </div>
  );
} 