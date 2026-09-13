import React from "react";

export const GroupsSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="space-y-2.5 animate-pulse" id="groups-modal-skeleton">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-3 bg-[#0C1322] border border-[#1E2D4A] rounded font-mono space-y-2"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              {/* Group icon badge */}
              <div className="w-9 h-9 rounded bg-[#141E30] border border-[#1E2D4A] shrink-0" />

              {/* Group text details */}
              <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
                <div
                  className="h-3.5 bg-[#1E2D4A] rounded"
                  style={{ width: `${Math.min(85, 45 + (i * 17) % 40)}%` }}
                />
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-16 bg-[#00F0FF]/20 rounded" />
                  <div className="w-1 h-1 rounded-full bg-[#334155]" />
                  <div className="h-2.5 w-20 bg-[#141E30] rounded" />
                </div>
              </div>
            </div>

            {/* Chat button placeholder */}
            <div className="w-16 h-7 rounded bg-[#141E30] border border-[#1E2D4A] shrink-0" />
          </div>

          {/* Secondary snippet skeleton */}
          <div className="mt-1.5 pt-1.5 border-t border-[#121C2D]/80 flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <div className="w-3 h-3 rounded bg-[#1E2D4A] shrink-0" />
              <div
                className="h-2.5 bg-[#141E30] rounded"
                style={{ width: `${Math.min(85, 45 + (i * 23) % 40)}%` }}
              />
            </div>
            <div className="w-12 h-3.5 rounded bg-[#141E30] shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
};
