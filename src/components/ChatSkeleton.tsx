import React from "react";

export const ChatMessageSkeleton: React.FC = () => {
  return (
    <div className="space-y-3 p-1 animate-pulse" id="chat-messages-skeleton">
      {/* Received Message Skeleton */}
      <div className="flex items-start gap-2 max-w-[85%]">
        <div className="w-7 h-7 rounded bg-[#141E30] border border-[#1E2D4A] shrink-0" />
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2">
            <div className="h-3 w-24 bg-[#1E2D4A] rounded" />
            <div className="h-2.5 w-12 bg-[#121C2D] rounded" />
          </div>
          <div className="p-2.5 rounded bg-[#0C1322] border border-[#1E2D4A] space-y-1.5">
            <div className="h-3 w-48 bg-[#1E2D4A] rounded" />
            <div className="h-3 w-32 bg-[#141E30] rounded" />
          </div>
        </div>
      </div>

      {/* Sent Message Skeleton (Self) */}
      <div className="flex flex-col items-end max-w-[85%] ml-auto space-y-1">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-10 bg-[#121C2D] rounded" />
          <div className="h-3 w-16 bg-[#00F0FF]/20 rounded" />
        </div>
        <div className="p-2.5 rounded bg-[#1A3B5C]/50 border border-[#00F0FF]/30 space-y-1.5 w-full">
          <div className="h-3 w-40 bg-[#00F0FF]/20 rounded" />
        </div>
      </div>

      {/* Another Received Message Skeleton */}
      <div className="flex items-start gap-2 max-w-[85%]">
        <div className="w-7 h-7 rounded bg-[#141E30] border border-[#1E2D4A] shrink-0" />
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2">
            <div className="h-3 w-28 bg-[#1E2D4A] rounded" />
            <div className="h-2.5 w-12 bg-[#121C2D] rounded" />
          </div>
          <div className="p-2.5 rounded bg-[#0C1322] border border-[#1E2D4A] space-y-1.5">
            <div className="h-3 w-64 bg-[#1E2D4A] rounded" />
            <div className="h-3 w-52 bg-[#141E30] rounded" />
            <div className="h-3 w-20 bg-[#121C2D] rounded" />
          </div>
        </div>
      </div>

      {/* System / Capability Notice Skeleton */}
      <div className="mx-auto max-w-xs p-2 rounded bg-[#121C2D]/60 border border-[#1E2D4A] flex items-center justify-center gap-2">
        <div className="w-2 h-2 rounded-full bg-[#00F0FF]/40" />
        <div className="h-2.5 w-36 bg-[#1E2D4A] rounded" />
      </div>

      {/* Sent Followup Message Skeleton */}
      <div className="flex flex-col items-end max-w-[80%] ml-auto space-y-1">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-10 bg-[#121C2D] rounded" />
          <div className="h-3 w-16 bg-[#00F0FF]/20 rounded" />
        </div>
        <div className="p-2.5 rounded bg-[#1A3B5C]/50 border border-[#00F0FF]/30 space-y-1.5 w-full">
          <div className="h-3 w-56 bg-[#00F0FF]/20 rounded" />
          <div className="h-3 w-28 bg-[#00F0FF]/15 rounded" />
        </div>
      </div>
    </div>
  );
};

export const TargetChipsSkeleton: React.FC = () => {
  return (
    <div className="flex items-center gap-2 overflow-x-hidden shrink-0 animate-pulse" id="target-chips-skeleton">
      <div className="h-7 w-20 rounded bg-[#141E30] border border-[#B026FF]/30" />
      <div className="h-7 w-28 rounded bg-[#0C1322] border border-[#1E2D4A]" />
      <div className="h-7 w-24 rounded bg-[#0C1322] border border-[#1E2D4A]" />
      <div className="h-7 w-32 rounded bg-[#0C1322] border border-[#1E2D4A]" />
    </div>
  );
};
