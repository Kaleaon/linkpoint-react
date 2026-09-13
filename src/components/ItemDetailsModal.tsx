import React from "react";
import { X, Shield, Lock, Check, AlertCircle, Copy, Share2, Info, User, Calendar, Tag } from "lucide-react";
import { type InventoryItem } from "../types";

type Props = {
  item: InventoryItem | null;
  onClose: () => void;
};

export const ItemDetailsModal: React.FC<Props> = ({ item, onClose }) => {
  if (!item) return null;

  const { modify, copy, transfer, export: canExport } = item.permissions;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div
        id="item-details-modal"
        className="w-full max-w-sm bg-[#0C1322] border border-[#1E2D4A] rounded-lg shadow-2xl overflow-hidden flex flex-col font-mono text-xs text-[#E2E8F0]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E2D4A] bg-[#050810] shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Tag className="w-4 h-4 text-[#00F0FF] shrink-0" />
            <h2 className="font-display text-sm font-bold tracking-wider text-[#00F0FF] truncate">
              ITEM PROPERTIES
            </h2>
          </div>
          <button
            id="item-modal-close"
            onClick={onClose}
            className="w-7 h-7 rounded border border-[#1E2D4A] bg-[#0C1322] text-[#64748B] hover:text-[#E2E8F0] flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3.5 overflow-y-auto">
          {/* Title & Type */}
          <div className="bg-[#050810] p-3 rounded border border-[#1E2D4A] space-y-1">
            <div className="font-bold text-[#E2E8F0] text-sm break-words">{item.name}</div>
            <div className="text-[10px] text-[#00F0FF] uppercase tracking-wider flex items-center gap-1.5">
              <span>TYPE:</span>
              <span className="font-bold text-[#B026FF]">{item.type}</span>
            </div>
            {item.description && (
              <p className="text-[11px] text-[#94A3B8] pt-1 italic">{item.description}</p>
            )}
          </div>

          {/* Second Life Permissions Matrix */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-[#64748B] uppercase tracking-widest font-bold">
              <span>NEXT OWNER PERMISSIONS</span>
              <span className="text-[#00FF66] flex items-center gap-1">
                <Shield className="w-3 h-3" /> TPV RULE 2
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              <div
                className={`p-2 rounded border text-center ${
                  modify
                    ? "border-[#00FF66]/40 bg-[#00FF66]/10 text-[#00FF66]"
                    : "border-[#1E2D4A] bg-[#050810] text-[#64748B]"
                }`}
              >
                <div className="text-[9px] font-bold">MODIFY</div>
                <div className="text-xs font-bold mt-0.5">{modify ? "YES" : "NO"}</div>
              </div>

              <div
                className={`p-2 rounded border text-center ${
                  copy
                    ? "border-[#00FF66]/40 bg-[#00FF66]/10 text-[#00FF66]"
                    : "border-[#1E2D4A] bg-[#050810] text-[#64748B]"
                }`}
              >
                <div className="text-[9px] font-bold">COPY</div>
                <div className="text-xs font-bold mt-0.5">{copy ? "YES" : "NO"}</div>
              </div>

              <div
                className={`p-2 rounded border text-center ${
                  transfer
                    ? "border-[#00FF66]/40 bg-[#00FF66]/10 text-[#00FF66]"
                    : "border-[#1E2D4A] bg-[#050810] text-[#64748B]"
                }`}
              >
                <div className="text-[9px] font-bold">TRANSFER</div>
                <div className="text-xs font-bold mt-0.5">{transfer ? "YES" : "NO"}</div>
              </div>

              <div
                className={`p-2 rounded border text-center ${
                  canExport
                    ? "border-[#00F0FF]/40 bg-[#00F0FF]/10 text-[#00F0FF]"
                    : "border-[#1E2D4A] bg-[#050810] text-[#64748B]"
                }`}
              >
                <div className="text-[9px] font-bold">EXPORT</div>
                <div className="text-xs font-bold mt-0.5">{canExport ? "YES" : "NO"}</div>
              </div>
            </div>
          </div>

          {/* Provenance & Creator Info */}
          <div className="bg-[#050810] border border-[#1E2D4A] rounded p-3 space-y-2 text-[11px]">
            <div className="flex justify-between items-center">
              <span className="text-[#64748B] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#00F0FF]" /> Creator
              </span>
              <span className="font-bold text-[#E2E8F0]">{item.creator_name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#64748B] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#B026FF]" /> Owner
              </span>
              <span className="font-bold text-[#E2E8F0]">{item.owner_name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#64748B] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Date Acquired
              </span>
              <span className="text-[#94A3B8]">{item.created_at.split("T")[0]}</span>
            </div>
          </div>

          {/* Content Protection Enforcement Banner */}
          <div className="bg-[#050810] border border-[#1E2D4A] rounded p-2.5 text-[10px] space-y-1 text-[#94A3B8]">
            <div className="flex items-center gap-1 text-[#00FF66] font-bold">
              <Shield className="w-3 h-3" />
              <span>CONTENT PROTECTION ACTIVE</span>
            </div>
            <p className="leading-relaxed">
              {canExport
                ? "This asset possesses valid glTF Export permissions from the creator and can be extracted for offline rendering."
                : "External export is locked in compliance with Linden Lab TPV Policy (Section 2: Content Protection)."}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="p-3 border-t border-[#1E2D4A] bg-[#050810] flex items-center justify-between">
          <span className="text-[10px] text-[#64748B]">UUID: {item.id.slice(0, 13)}...</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded bg-[#141E30] hover:bg-[#1A3B5C] text-[#00F0FF] border border-[#1E2D4A] text-xs font-bold cursor-pointer transition-colors"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
