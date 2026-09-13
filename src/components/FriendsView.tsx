import React, { useState, useEffect } from "react";
import {
  UserPlus,
  RefreshCw,
  Eye,
  MapPin,
  Pencil,
  MessageSquare,
  Phone,
  Check,
  X,
  Clock,
  Search,
} from "lucide-react";
import { api, type Friend, type FriendRequestIn, type Session } from "../api";

type Props = {
  session: Session;
  onOpenIm: (friendId: string, friendName: string) => void;
  onOpenSearch: () => void;
  onStartVoiceCall?: (friendId: string, friendName: string) => void;
};

export const FriendsView: React.FC<Props> = ({
  session,
  onOpenIm,
  onOpenSearch,
  onStartVoiceCall,
}) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequestIn[]>([]);
  const [filter, setFilter] = useState<"all" | "online">("all");
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [answering, setAnswering] = useState<Record<string, boolean>>({});
  const [requestError, setRequestError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date>(new Date());

  const loadData = async () => {
    try {
      setLoading(true);
      const [fList, reqs] = await Promise.all([
        api.get<Friend[]>(`/friends?session_id=${session.session_id}`),
        api.get<FriendRequestIn[]>(`/friends/requests?session_id=${session.session_id}`),
      ]);
      setFriends(fList || []);
      setRequests(reqs || []);
      setLastSync(new Date());

      // If any friends have unresolved placeholder names, trigger name refresh automatically
      if (Array.isArray(fList) && fList.some((f) => !f.name || f.name.startsWith("Resident ("))) {
        refreshNames();
      }
    } catch (err: any) {
      console.warn("Friends sync notice:", err?.message || err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [session.session_id]);

  const refreshNames = async () => {
    try {
      setResolving(true);
      await api.post(`/friends/refresh_names?session_id=${session.session_id}`, {});
      await loadData();
    } catch (err) {
      console.error("Refresh names error", err);
    } finally {
      setResolving(false);
    }
  };

  const handleAnswer = async (req: FriendRequestIn, accept: boolean) => {
    setAnswering((p) => ({ ...p, [req.id]: true }));
    setRequestError(null);
    try {
      await api.post(
        `/friends/requests/${req.id}/${accept ? "accept" : "decline"}?session_id=${
          session.session_id
        }`,
        {}
      );
      await loadData();
    } catch (err: any) {
      setRequestError(err?.message ?? "Failed to respond to offer");
    } finally {
      setAnswering((p) => ({ ...p, [req.id]: false }));
    }
  };

  const onlineCount = friends.filter((f) => f.online).length;
  const filteredFriends = friends.filter((f) => (filter === "online" ? f.online : true));

  return (
    <div id="friends-screen" className="flex flex-col h-full bg-[#050810] text-[#E2E8F0] overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#121C2D] bg-[#0C1322] shrink-0">
        <div>
          <h1 className="font-display text-xl font-bold tracking-[0.2em] text-[#00F0FF] leading-none">
            FRIENDS
          </h1>
          <p className="font-mono text-[10px] text-[#64748B] mt-1 tracking-wider">
            {onlineCount}/{friends.length} ONLINE · SYNC {lastSync.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            id="friends-search-btn"
            onClick={onOpenSearch}
            className="w-9 h-9 flex items-center justify-center rounded border border-[#1E2D4A] bg-[#141E30] text-[#00F0FF] hover:bg-[#1A3B5C] transition-colors"
            title="Find Residents"
          >
            <UserPlus className="w-4 h-4" />
          </button>
          <button
            id="refresh-names"
            onClick={refreshNames}
            disabled={resolving || loading}
            className="w-9 h-9 flex items-center justify-center rounded border border-[#1E2D4A] bg-[#141E30] text-[#00F0FF] hover:bg-[#1A3B5C] transition-colors disabled:opacity-50"
            title="Refresh Names"
          >
            <RefreshCw className={`w-4 h-4 ${resolving || loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="p-2.5 border-b border-[#121C2D] bg-[#050810] shrink-0">
        <div className="grid grid-cols-2 bg-[#0C1322] border border-[#1E2D4A] rounded p-0.5 font-mono text-xs">
          <button
            id="filter-all"
            onClick={() => setFilter("all")}
            className={`py-1.5 rounded font-bold tracking-widest transition-all ${
              filter === "all"
                ? "bg-[#1A3B5C] text-[#00F0FF] border-b-2 border-[#00F0FF]"
                : "text-[#64748B] hover:text-[#E2E8F0]"
            }`}
          >
            ALL ({friends.length})
          </button>
          <button
            id="filter-online"
            onClick={() => setFilter("online")}
            className={`py-1.5 rounded font-bold tracking-widest transition-all ${
              filter === "online"
                ? "bg-[#1A3B5C] text-[#00F0FF] border-b-2 border-[#00F0FF]"
                : "text-[#64748B] hover:text-[#E2E8F0]"
            }`}
          >
            ONLINE ({onlineCount})
          </button>
        </div>
      </div>

      {/* Main List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#121C2D]">
        {/* Pending Friendship Offers */}
        {requests.length > 0 && (
          <div id="friend-requests" className="p-3 bg-[#0C1322]/60 space-y-2 border-b border-[#B026FF]/30">
            <div className="font-mono text-[11px] font-bold text-[#B026FF] tracking-[0.2em] uppercase flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5" />
              <span>Friendship Offers ({requests.length})</span>
            </div>

            {requests.map((r) => (
              <div
                key={r.id}
                id={`request-${r.id}`}
                className="p-3 bg-[#141E30] border border-[#B026FF] rounded space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#E2E8F0]">{r.from_name}</span>
                  <span className="font-mono text-[10px] text-[#64748B]">
                    {new Date(r.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                {r.message && (
                  <p className="font-mono text-xs text-[#B0BEC5] italic bg-[#050810]/50 p-2 rounded border border-[#1E2D4A]">
                    "{r.message}"
                  </p>
                )}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    id={`decline-${r.id}`}
                    onClick={() => handleAnswer(r, false)}
                    disabled={answering[r.id]}
                    className="px-3 py-1.5 rounded border border-[#FF1744] text-[#FF1744] hover:bg-[#FF1744]/10 font-mono text-xs font-bold tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>DECLINE</span>
                  </button>
                  <button
                    id={`accept-${r.id}`}
                    onClick={() => handleAnswer(r, true)}
                    disabled={answering[r.id]}
                    className="px-3 py-1.5 rounded bg-[#00F0FF] hover:bg-[#00F0FF]/90 text-[#050810] font-mono text-xs font-bold tracking-wider flex items-center gap-1 cursor-pointer transition-colors shadow-[0_0_8px_rgba(0,240,255,0.3)]"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>ACCEPT</span>
                  </button>
                </div>
              </div>
            ))}

            {requestError && (
              <div className="text-[11px] font-mono text-[#FF1744]">&gt; {requestError}</div>
            )}
          </div>
        )}

        {/* Friends Roster */}
        {filteredFriends.length === 0 ? (
          <div className="p-10 text-center text-[#64748B] font-mono text-xs">
            {loading ? "> Synchronizing roster..." : "> No friends in this filter"}
          </div>
        ) : (
          filteredFriends.map((item) => (
            <div
              key={item.id}
              id={`friend-${item.id}`}
              onClick={() => onOpenIm(item.id, item.name)}
              className="flex items-center gap-3 px-4 py-3 hover:bg-[#0C1322] transition-colors cursor-pointer group"
            >
              {/* Online indicator dot */}
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  item.online
                    ? "bg-[#00FF66] shadow-[0_0_6px_#00FF66]"
                    : "bg-[#64748B]"
                }`}
              />

              {/* Friend Info */}
              <div className="flex-1 min-w-0">
                <div className="font-mono text-xs font-bold text-[#E2E8F0] group-hover:text-[#00F0FF] transition-colors truncate">
                  {item.name}
                </div>
                <div className="font-mono text-[10px] text-[#64748B] tracking-wider mt-0.5 truncate">
                  {item.online ? "ONLINE" : "OFFLINE"} · ID {item.id.slice(0, 8)}
                </div>
              </div>

              {/* Second Life Rights badges */}
              <div className="flex items-center gap-1.5 text-[#B026FF] shrink-0 opacity-70 group-hover:opacity-100">
                {item.can_see_me_online && <Eye className="w-3.5 h-3.5" title="Can see me online" />}
                {item.can_see_me_map && <MapPin className="w-3.5 h-3.5" title="Can map me" />}
                {item.can_modify_my_objects && (
                  <Pencil className="w-3.5 h-3.5" title="Can modify my objects" />
                )}
              </div>

              {/* Actions: Voice Call & Start IM */}
              <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                {onStartVoiceCall && (
                  <button
                    type="button"
                    onClick={() => onStartVoiceCall(item.id, item.name)}
                    className="w-8 h-8 rounded border border-[#1E2D4A] bg-[#050810] text-[#00FF66] hover:border-[#00FF66] hover:bg-[#00FF66]/10 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                    title={`Voice Call ${item.name}`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onOpenIm(item.id, item.name)}
                  className="w-8 h-8 rounded border border-[#1E2D4A] bg-[#050810] text-[#00F0FF] hover:border-[#00F0FF] hover:bg-[#00F0FF]/10 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                  title={`Send IM to ${item.name}`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
