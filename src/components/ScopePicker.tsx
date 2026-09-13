import React, { useMemo, useState } from "react";
import { X, Search, Check, Users } from "lucide-react";
import type { ScopeTarget } from "../types";

type Props = {
  isOpen: boolean;
  title: string;
  targets: ScopeTarget[];
  selected?: string;
  onSelect: (t: ScopeTarget) => void;
  onClose: () => void;
};

export const ScopePicker: React.FC<Props> = ({
  isOpen,
  title,
  targets,
  selected,
  onSelect,
  onClose,
}) => {
  const [q, setQ] = useState("");

  const data = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? targets.filter((t) => t.name.toLowerCase().includes(needle)) : targets;
  }, [q, targets]);

  if (!isOpen) return null;

  return (
    <div
      id="scope-picker-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div
        id="scope-picker-panel"
        className="w-full max-w-md bg-[#050810] border border-[#1E2D4A] rounded-lg shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#121C2D]">
          <h2 className="font-display text-lg font-bold tracking-[0.2em] text-[#00F0FF]">
            {title}
          </h2>
          <button
            id="picker-close-btn"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center text-[#64748B] hover:text-[#00F0FF] rounded hover:bg-[#0C1322] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-[#121C2D] bg-[#0C1322]">
          <div className="flex items-center gap-2 px-3 py-2 bg-[#050810] border border-[#1E2D4A] rounded text-xs font-mono">
            <Search className="w-4 h-4 text-[#64748B]" />
            <input
              id="picker-search-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Filter ${targets.length} channels...`}
              className="flex-1 bg-transparent text-[#E2E8F0] placeholder-[#64748B] outline-none font-mono text-xs"
              autoFocus
            />
            {q && (
              <button onClick={() => setQ("")} className="text-[#64748B] hover:text-[#E2E8F0]">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#121C2D]">
          {data.length === 0 ? (
            <div className="p-8 text-center text-[#64748B] font-mono text-xs">
              &gt; No matching channels found
            </div>
          ) : (
            data.map((item) => {
              const active = item.id === selected;
              return (
                <button
                  key={item.id}
                  id={`picker-item-${item.id}`}
                  onClick={() => {
                    onSelect(item);
                    onClose();
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors font-mono text-xs ${
                    active
                      ? "bg-[#1A3B5C] text-[#00F0FF]"
                      : "hover:bg-[#0C1322] text-[#E2E8F0]"
                  }`}
                >
                  {item.kind === "im" ? (
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        item.online ? "bg-[#00FF66] shadow-[0_0_6px_#00FF66]" : "bg-[#64748B]"
                      }`}
                    />
                  ) : (
                    <Users
                      className={`w-4 h-4 shrink-0 ${
                        active ? "text-[#00F0FF]" : "text-[#B026FF]"
                      }`}
                    />
                  )}
                  <span className="flex-1 truncate">{item.name}</span>
                  {active && <Check className="w-4 h-4 text-[#00F0FF] shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
