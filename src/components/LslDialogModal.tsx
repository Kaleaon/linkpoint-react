import React, { useEffect, useState } from "react";
import { MessageSquare, X, Clock, Radio } from "lucide-react";
import type { LSLDialog } from "../types";

interface Props {
  dialog: LSLDialog | null;
  onRespond: (dialogId: string, button: string) => void;
  onDismiss: () => void;
}

export const LslDialogModal: React.FC<Props> = ({ dialog, onRespond, onDismiss }) => {
  if (!dialog) return null;

  const [timeLeft, setTimeLeft] = useState(
    Math.max(0, Math.floor((dialog.expires_at - Date.now()) / 1000))
  );

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.floor((dialog.expires_at - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        onDismiss();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [dialog.expires_at, onDismiss]);

  // Second Life standard dialog buttons are displayed in rows of 3, usually bottom-to-top or top-to-bottom
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-sm rounded-xl border border-[#00F0FF]/50 bg-[#0A101D] shadow-[0_0_30px_rgba(0,240,255,0.25)] overflow-hidden font-mono">
        {/* Header - Second Life Blue Dialog Style */}
        <div className="bg-gradient-to-r from-[#003B73] via-[#00529B] to-[#0070BA] px-4 py-2.5 flex items-center justify-between text-white border-b border-[#00F0FF]/30">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#00F0FF] animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Script Dialog
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-[10px] text-cyan-200 bg-black/30 px-2 py-0.5 rounded">
              <Clock className="w-3 h-3" />
              <span>{timeLeft}s</span>
            </div>
            <button
              onClick={onDismiss}
              className="p-1 text-white/70 hover:text-white transition-colors"
              title="Ignore / Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dialog Content */}
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs text-[#00F0FF]">
            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
            <span className="font-semibold truncate">{dialog.object_name}</span>
          </div>

          <div className="p-3 rounded-lg bg-[#050B14] border border-[#1E2D4A] text-xs text-[#E2E8F0] leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
            {dialog.message}
          </div>

          {/* Buttons Matrix (3 columns) */}
          <div className="pt-1">
            <div className="text-[10px] text-[#64748B] mb-2 uppercase tracking-wide">
              Select Response (Channel {dialog.channel}):
            </div>
            <div className="grid grid-cols-3 gap-2">
              {dialog.buttons.map((btn, index) => (
                <button
                  key={`${btn}-${index}`}
                  onClick={() => onRespond(dialog.id, btn)}
                  className="px-2 py-2.5 text-xs font-semibold rounded-lg bg-[#141E30] hover:bg-[#00F0FF] text-[#00F0FF] hover:text-[#050810] border border-[#00F0FF]/40 hover:border-[#00F0FF] transition-all duration-150 truncate active:scale-95 shadow-sm"
                  title={btn}
                >
                  {btn}
                </button>
              ))}
            </div>
          </div>

          {/* Dismiss button */}
          <div className="pt-2 border-t border-[#1E2D4A]/60 flex justify-end">
            <button
              onClick={onDismiss}
              className="text-xs text-[#94A3B8] hover:text-white px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 transition-colors"
            >
              Ignore Dialog
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
