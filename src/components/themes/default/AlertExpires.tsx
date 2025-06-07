import React from "react";
import { getExpiresIn } from "../../../utils/nwsAlertUtils";

type AlertExpiresProps = {
  expires: string | null;
  isTransitioning: boolean;
  isNew?: boolean;
  showNewBadge?: boolean;
};

export default function AlertExpires({ expires, isTransitioning, isNew, showNewBadge }: AlertExpiresProps) {
  return (
    <div 
      className="flex items-center px-4 py-2 text-white font-bold text-xl shadow row-span-1 col-span-1 drop-shadow-md whitespace-nowrap overflow-hidden text-ellipsis" 
      style={{ 
        textShadow: '1px 1px 4px rgba(0,0,0,0.7)',
        backgroundColor: '#171717',
        borderTop: '1px solid #404040'
      }}
    >
      <span className={`flex items-center transition-all duration-300 ${isTransitioning && expires ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
        {isNew && showNewBadge && (
          <span className="bg-yellow-400 text-black font-extrabold rounded px-2 py-0.5 mr-3 border border-yellow-600" style={{letterSpacing: '0.05em'}}>
            NEW
          </span>
        )}
        {expires ? `EXPIRES IN ${getExpiresIn(expires)}` : ''}
      </span>
    </div>
  );
} 