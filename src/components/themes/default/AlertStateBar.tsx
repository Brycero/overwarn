import React from "react";
import { getStates, formatExpiresTime } from "../../../utils/nwsAlertUtils";

type AlertStateBarProps = {
  area: string | null;
  geocode?: { UGC?: string[] };
  expires: string | null;
  headline: string | null;
  isTransitioning: boolean;
};

export default function AlertStateBar({ area, geocode, expires, headline, isTransitioning }: AlertStateBarProps) {
  return (
    <div 
      className="flex items-center justify-start px-6 py-2 text-white font-bold text-xl shadow row-span-1 col-span-1 drop-shadow-md uppercase whitespace-nowrap overflow-hidden text-ellipsis border-t border-neutral-700" 
      style={{ 
        textShadow: '1px 1px 4px rgba(0,0,0,0.7)',
        backgroundColor: '#4a3238'
      }}
    >
      <span className={`transition-all duration-300 inline-block ${isTransitioning && area ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
        {area && expires && headline ? (() => {
          const states = getStates(area, geocode);
          return states
            ? `${states} - UNTIL ${formatExpiresTime(expires, headline)}`
            : `UNTIL ${formatExpiresTime(expires, headline)}`;
        })() : ''}
      </span>
    </div>
  );
} 