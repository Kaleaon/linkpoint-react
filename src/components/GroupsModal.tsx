import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Users,
  MessageSquare,
  Bell,
  BellOff,
  Shield,
  RefreshCw,
  Clock,
  Search,
  ChevronDown,
  ChevronUp,
  Info,
  Hash,
} from "lucide-react";
import { api, type Session, type Group } from "../api";
import { GroupsSkeleton } from "./GroupsSkeleton";

function formatLastActive(ts?: string | null): string {
  if (!ts) return "";
  try {
    const diffMs = Date.now() - new Date(ts).getTime();
    if (diffMs < 0 || diffMs < 45 * 1000) return "just now";
    const mins = Math.floor(diffMs / (60 * 1000));
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

type Props = {
  isOpen: boolean;
  onClose: () => void;
  session: Session;
  onOpenGroupChat: (groupId: string, groupName: string) => void;
};

export const GroupsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  session,
  onOpenGroupChat,
}) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);

  const loadGroups = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<Group[]>(`/groups?session_id=${session.session_id}`);
      setGroups(data || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load groups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadGroups();
    } else {
      setSearchQuery("");
      setExpandedGroupId(null);
    }
  }, [isOpen, session.session_id]);

  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => g.name.toLowerCase().includes(q));
  }, [groups, searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      id="groups-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div
        id="groups-modal-panel"
        className="w-full max-w-md bg-[#050810] border border-[#1E2D4A] rounded-lg shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#121C2D] bg-[#0C1322]">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#B026FF]" />
            <div>
              <h2 className="font-display text-lg font-bold tracking-[0.2em] text-[#00F0FF]">
                MY GROUPS
              </h2>
              <p className="font-mono text-[10px] text-[#64748B] tracking-wider">
                {searchQuery.trim()
                  ? `${filteredGroups.length} OF ${groups.length} GROUPS`
                  : `${groups.length} SECOND LIFE GROUPS`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              id="groups-refresh-btn"
              onClick={loadGroups}
              disabled={loading}
              className="w-8 h-8 flex items-center justify-center text-[#64748B] hover:text-[#00F0FF] rounded hover:bg-[#141E30] transition-colors cursor-pointer"
              title="Refresh groups list"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              id="groups-close-btn"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-[#64748B] hover:text-[#00F0FF] rounded hover:bg-[#141E30] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Input Bar */}
        <div className="px-3 py-2 border-b border-[#121C2D] bg-[#0A101C]">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 pointer-events-none" />
            <input
              id="groups-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search groups by name..."
              className="w-full pl-9 pr-8 py-1.5 bg-[#050810] border border-[#1E2D4A] rounded text-xs font-mono text-[#E2E8F0] placeholder-[#64748B] focus:outline-none focus:border-[#00F0FF] transition-colors"
            />
            {searchQuery && (
              <button
                id="groups-search-clear-btn"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 text-[#64748B] hover:text-[#00F0FF] p-1 cursor-pointer transition-colors"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#121C2D] p-3 space-y-2.5">
          {error && (
            <div className="p-3 bg-[#FF1744]/10 border border-[#FF1744]/40 rounded text-xs font-mono text-[#FFA8A8]">
              {error}
            </div>
          )}

          {loading && groups.length === 0 ? (
            <GroupsSkeleton count={4} />
          ) : groups.length === 0 ? (
            <div className="p-8 text-center text-[#64748B] font-mono text-xs">
              &gt; No Second Life groups found for this avatar.
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <p className="text-[#64748B] font-mono text-xs">
                &gt; No groups matching &ldquo;{searchQuery}&rdquo;.
              </p>
              <button
                id="groups-clear-search-btn"
                onClick={() => setSearchQuery("")}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#141E30] hover:bg-[#1E2D4A] border border-[#1E2D4A] text-[#00F0FF] font-mono text-[11px] rounded transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
                <span>Clear search filter</span>
              </button>
            </div>
          ) : (
            filteredGroups.map((grp) => {
              const isExpanded = expandedGroupId === grp.id;

              return (
                <div
                  key={grp.id}
                  id={`group-card-${grp.id}`}
                  className={`p-3 bg-[#0C1322] border rounded transition-all font-mono space-y-2 ${
                    isExpanded
                      ? "border-[#00F0FF]/80 shadow-[0_0_12px_rgba(0,240,255,0.15)] bg-[#0C1527]"
                      : "border-[#1E2D4A] hover:border-[#00F0FF]/40"
                  }`}
                >
                  <div
                    className="flex items-start justify-between gap-2 cursor-pointer"
                    onClick={() => setExpandedGroupId(isExpanded ? null : grp.id)}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded bg-[#141E30] border border-[#1E2D4A] flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4 text-[#B026FF]" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xs font-bold text-[#E2E8F0] truncate flex items-center gap-1.5">
                          <span>{grp.name}</span>
                        </h3>
                        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-0.5 text-[10px] text-[#64748B]">
                          <span className="flex items-center gap-1 text-[#00F0FF]">
                            <Shield className="w-3 h-3" />
                            <span>{(grp as any).role || "Member"}</span>
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            {grp.accept_notices ? (
                              <>
                                <Bell className="w-3 h-3 text-[#00FF66]" />
                                <span className="text-[#00FF66]">Notices ON</span>
                              </>
                            ) : (
                              <>
                                <BellOff className="w-3 h-3 text-[#64748B]" />
                                <span>Notices Muted</span>
                              </>
                            )}
                          </span>
                          <span>•</span>
                          <button
                            type="button"
                            id={`group-toggle-btn-${grp.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedGroupId(isExpanded ? null : grp.id);
                            }}
                            className="text-[#00F0FF] hover:underline flex items-center gap-0.5 font-bold cursor-pointer transition-colors"
                          >
                            <span>{isExpanded ? "Hide Details" : "View Details"}</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <button
                      id={`group-chat-btn-${grp.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenGroupChat(grp.id, grp.name);
                        onClose();
                      }}
                      className="px-2.5 py-1.5 rounded bg-[#1A3B5C] hover:bg-[#00F0FF] text-[#00F0FF] hover:text-[#050810] font-bold text-[11px] flex items-center gap-1.5 transition-all shrink-0 cursor-pointer shadow-sm"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>CHAT</span>
                    </button>
                  </div>

                  {/* Secondary text line: snippet of last message & active timestamp */}
                  <div
                    className="mt-2 pt-2 border-t border-[#121C2D]/80 flex items-center justify-between gap-2 min-w-0 text-[11px] cursor-pointer"
                    onClick={() => setExpandedGroupId(isExpanded ? null : grp.id)}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1 text-[#94A3B8] font-mono">
                      <MessageSquare className="w-3 h-3 text-[#00F0FF]/70 shrink-0" />
                      <span className="truncate text-[10.5px]">
                        {grp.last_message || "No recent group chatter recorded"}
                      </span>
                    </div>
                    {grp.last_ts && (
                      <span
                        className="text-[10px] text-[#64748B] shrink-0 font-mono flex items-center gap-1 bg-[#141E30] px-1.5 py-0.5 rounded border border-[#1E2D4A]/60"
                        title={new Date(grp.last_ts).toLocaleString()}
                      >
                        <Clock className="w-2.5 h-2.5 text-[#00F0FF]/70" />
                        <span>{formatLastActive(grp.last_ts)}</span>
                      </span>
                    )}
                  </div>

                  {/* Expandable 'View Details' Section */}
                  {isExpanded && (
                    <div
                      id={`group-details-${grp.id}`}
                      className="mt-2.5 pt-2.5 border-t border-[#1E2D4A] space-y-2.5 bg-[#050914] p-3 rounded border border-[#1E2D4A]/80"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Metric Badges: Member Count & Role */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#141E30] border border-[#00F0FF]/30 text-[#00F0FF]">
                          <Users className="w-3.5 h-3.5 text-[#00F0FF]" />
                          <span className="font-bold">
                            {(grp.member_count ?? 150).toLocaleString()} Members
                          </span>
                        </div>
                        <div className="text-[10px] text-[#94A3B8] font-mono flex items-center gap-1">
                          <Shield className="w-3 h-3 text-[#00F0FF]" />
                          <span>Role:</span>
                          <span className="font-bold text-[#E2E8F0]">
                            {(grp as any).role || "Member"}
                          </span>
                        </div>
                      </div>

                      {/* Group Description / Charter */}
                      <div className="space-y-1">
                        <div className="text-[10px] text-[#64748B] tracking-wider uppercase font-bold flex items-center gap-1">
                          <Info className="w-3 h-3 text-[#00F0FF]" />
                          <span>Group Description &amp; Charter</span>
                        </div>
                        <p className="text-[11px] text-[#CBD5E1] leading-relaxed bg-[#0A101C] p-2.5 rounded border border-[#1E2D4A] select-text">
                          {grp.description ||
                            "Official Second Life community group for discussions, notices, and collaborative events."}
                        </p>
                      </div>

                      {/* UUID & Quick Action Footer */}
                      <div className="flex items-center justify-between pt-1.5 text-[10px] text-[#64748B] font-mono border-t border-[#121C2D]">
                        <span className="truncate max-w-[220px] select-all" title={grp.id}>
                          UUID: {grp.id}
                        </span>
                        <button
                          type="button"
                          id={`group-details-chat-btn-${grp.id}`}
                          onClick={() => {
                            onOpenGroupChat(grp.id, grp.name);
                            onClose();
                          }}
                          className="text-[#00F0FF] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>OPEN CHAT &gt;</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
