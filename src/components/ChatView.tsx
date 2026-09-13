import React, { useState, useEffect, useRef, useMemo } from "react";
import { Send, Users, Wifi, AlertCircle, RefreshCw, ChevronRight, Radio, Keyboard } from "lucide-react";
import {
  api,
  type ChatMessage,
  type ScopeTarget,
  type Session,
  type TypingUser,
  sendTypingStatus,
  getTypingStatus,
  triggerMockTyping,
} from "../api";
import { useUnread, markRead, unreadFor, unreadForChannel } from "../unread";
import { ScopePicker } from "./ScopePicker";
import { ChatMessageSkeleton, TargetChipsSkeleton } from "./ChatSkeleton";

type Props = {
  session: Session;
  initialChannel?: "local" | "im" | "group";
  initialScope?: string;
  initialScopeName?: string;
  onNavigateToFriends: () => void;
  onOpenVoiceModal?: () => void;
  onOpenUdpInspector?: () => void;
  onSessionExpired?: () => void;
};

export const ChatView: React.FC<Props> = ({
  session,
  initialChannel = "local",
  initialScope = "local",
  initialScopeName = "Local Chat",
  onNavigateToFriends,
  onOpenVoiceModal,
  onOpenUdpInspector,
  onSessionExpired,
}) => {
  const [channel, setChannel] = useState<"local" | "im" | "group">(initialChannel);
  const [scope, setScope] = useState<string>(initialScope);
  const [scopeName, setScopeName] = useState<string>(initialScopeName);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [targets, setTargets] = useState<ScopeTarget[]>([]);
  const [targetsLoading, setTargetsLoading] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [simConnected, setSimConnected] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [typings, setTypings] = useState<TypingUser[]>([]);

  const isLocalTypingRef = useRef(false);
  const typingDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const unread = useUnread();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync props if changed externally (e.g. from Friends or Radar)
  useEffect(() => {
    if (initialChannel) setChannel(initialChannel);
    if (initialScope) setScope(initialScope);
    if (initialScopeName) setScopeName(initialScopeName);
  }, [initialChannel, initialScope, initialScopeName]);

  // Load scope targets (friends / conversations / groups)
  useEffect(() => {
    let active = true;

    async function loadTargets() {
      if (channel === "local") {
        setTargets([]);
        setScope("local");
        setScopeName("Local Chat");
        return;
      }

      try {
        setTargetsLoading(true);
        if (channel === "im") {
          const [friends, convs] = await Promise.all([
            api.get<any[]>(`/friends?session_id=${session.session_id}`),
            api.get<any[]>(`/im/conversations?session_id=${session.session_id}`),
          ]);

          const map = new Map<string, ScopeTarget>();
          // Existing convs
          for (const c of convs) {
            map.set(c.id, { id: c.id, name: c.name, kind: "im", last_ts: c.last_ts });
          }
          // Friends
          for (const f of friends) {
            const cur = map.get(f.id);
            map.set(f.id, {
              id: f.id,
              name: f.name,
              online: f.online,
              kind: "im",
              last_ts: cur?.last_ts,
            });
          }

          const sorted = Array.from(map.values()).sort((a, b) => {
            if (a.online !== b.online) return a.online ? -1 : 1;
            return a.name.localeCompare(b.name);
          });

          if (active) {
            setTargets(sorted);
            if (sorted.length > 0 && (!scope || scope === "local" || !sorted.some((s) => s.id === scope))) {
              setScope(sorted[0].id);
              setScopeName(sorted[0].name);
            }
          }

          // If any friend has an unresolved placeholder name, refresh names asynchronously
          if (friends.some((f: any) => !f.name || f.name.startsWith("Resident ("))) {
            api.post<any>(`/friends/refresh_names?session_id=${session.session_id}`, {})
              .then((res) => {
                if (active && res && Array.isArray(res.friends)) {
                  for (const f of res.friends) {
                    const existing = map.get(f.id);
                    if (existing && f.name) {
                      existing.name = f.name;
                    }
                  }
                  const updated = Array.from(map.values()).sort((a, b) => {
                    if (a.online !== b.online) return a.online ? -1 : 1;
                    return a.name.localeCompare(b.name);
                  });
                  setTargets(updated);
                  const activeTarget = updated.find((t) => t.id === scope);
                  if (activeTarget) {
                    setScopeName(activeTarget.name);
                  }
                }
              })
              .catch(() => {});
          }
        } else if (channel === "group") {
          const groups = await api.get<any[]>(`/groups?session_id=${session.session_id}`);
          const mapped: ScopeTarget[] = (groups || []).map((g) => ({
            id: g.id,
            name: g.name,
            kind: "group",
          }));

          if (active) {
            setTargets(mapped);
            if (mapped.length > 0 && (!scope || scope === "local" || !mapped.some((m) => m.id === scope))) {
              setScope(mapped[0].id);
              setScopeName(mapped[0].name);
            }
          }
        }
      } catch (err: any) {
        const isExp =
          err?.status === 404 ||
          err?.message?.includes("Session not found") ||
          err?.message?.includes("expired");
        if (isExp) {
          setSessionExpired(true);
          onSessionExpired?.();
          return;
        }
        console.warn("Targets load notice:", err?.message || err);
      } finally {
        if (active) setTargetsLoading(false);
      }
    }

    loadTargets();
    return () => {
      active = false;
    };
  }, [channel, session.session_id, onSessionExpired]);

  // Load message history for active channel + scope
  const fetchMessages = async () => {
    if (!scope || sessionExpired) return;
    try {
      setLoading(true);
      const hist = await api.get<ChatMessage[]>(
        `/chat?session_id=${session.session_id}&channel=${channel}&scope=${encodeURIComponent(
          scope
        )}`
      );
      setMessages(hist);
      setSimConnected(true);
      markRead(channel, scope);
    } catch (err: any) {
      const isExp =
        err?.status === 404 ||
        err?.message?.includes("Session not found") ||
        err?.message?.includes("expired");
      if (isExp) {
        setSimConnected(false);
        setSessionExpired(true);
        onSessionExpired?.();
        return;
      }
      console.warn("Message sync notice:", err?.message || err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionExpired) return;
    fetchMessages();
    const interval = setInterval(() => {
      if (!sessionExpired) {
        fetchMessages();
      }
    }, 3500);
    return () => clearInterval(interval);
  }, [channel, scope, session.session_id, sessionExpired]);

  // Real-time SL typing status polling for active channel and scope
  useEffect(() => {
    let active = true;
    if (sessionExpired) return;

    const pollTyping = async () => {
      if (!scope || sessionExpired) return;
      try {
        const res = await getTypingStatus(session.session_id, channel, scope);
        if (active) {
          setTypings(res.users || []);
        }
      } catch {
        // Silently tolerate background poll hiccups or session expiration
      }
    };

    pollTyping();
    const interval = setInterval(pollTyping, 2000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [channel, scope, session.session_id, sessionExpired]);

  // Clean up outgoing typing lease when changing channel or unmounting
  useEffect(() => {
    return () => {
      if (typingDebounceRef.current) {
        clearTimeout(typingDebounceRef.current);
      }
      if (isLocalTypingRef.current) {
        isLocalTypingRef.current = false;
        sendTypingStatus(session.session_id, channel, scope, false).catch(() => {});
      }
    };
  }, [channel, scope, session.session_id]);

  // Scroll to bottom on new messages or typing state change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typings.length]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setText(val);

    if (!scope) return;

    if (val.trim().length > 0) {
      if (!isLocalTypingRef.current) {
        isLocalTypingRef.current = true;
        // SL Protocol: Transmit IM_TYPING_START (dialog 4)
        sendTypingStatus(session.session_id, channel, scope, true).catch(() => {});
      }

      // Reset typing lease timeout (Second Life 4.5s idle timeout)
      if (typingDebounceRef.current) {
        clearTimeout(typingDebounceRef.current);
      }
      typingDebounceRef.current = setTimeout(() => {
        if (isLocalTypingRef.current) {
          isLocalTypingRef.current = false;
          // SL Protocol: Transmit IM_TYPING_STOP (dialog 5)
          sendTypingStatus(session.session_id, channel, scope, false).catch(() => {});
        }
      }, 4500);
    } else {
      if (isLocalTypingRef.current) {
        isLocalTypingRef.current = false;
        if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
        sendTypingStatus(session.session_id, channel, scope, false).catch(() => {});
      }
    }
  };

  const handleTriggerSimulatedTyping = async () => {
    try {
      const partnerName = channel === "im" ? scopeName : "Torley Linden";
      await triggerMockTyping(session.session_id, channel, scope, partnerName);
      const res = await getTypingStatus(session.session_id, channel, scope);
      setTypings(res.users);
    } catch (err) {
      console.error("Failed to trigger mock typing", err);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = text.trim();
    if (!clean || !scope) return;

    // Immediately cancel typing lease on send
    if (typingDebounceRef.current) {
      clearTimeout(typingDebounceRef.current);
    }
    if (isLocalTypingRef.current) {
      isLocalTypingRef.current = false;
      sendTypingStatus(session.session_id, channel, scope, false).catch(() => {});
    }

    setSendError(null);
    setText("");

    try {
      await api.post("/chat/send", {
        session_id: session.session_id,
        channel,
        scope,
        scope_name: scopeName,
        text: clean,
      });
      await fetchMessages();
    } catch (err: any) {
      const isExp =
        err?.status === 404 ||
        err?.message?.includes("Session not found") ||
        err?.message?.includes("expired");
      if (isExp) {
        setSessionExpired(true);
        setSendError("Your Second Life grid session has expired. Please reconnect.");
        onSessionExpired?.();
      } else {
        setSendError(err?.message ?? "Failed to transmit message");
      }
    }
  };

  const imUnread = useMemo(() => unreadForChannel(unread.entries, "im"), [unread.entries]);
  const groupUnread = useMemo(() => unreadForChannel(unread.entries, "group"), [unread.entries]);

  return (
    <div id="chat-screen" className="flex flex-col h-full bg-[#050810] text-[#E2E8F0] overflow-hidden">
      {/* Session Expired Reconnect Alert Banner */}
      {sessionExpired && (
        <div
          id="chat-session-expired-banner"
          className="bg-[#FF1744]/15 border-b border-[#FF1744]/40 px-4 py-2.5 flex items-center justify-between text-xs font-mono text-[#FFA8A8] shrink-0 z-20"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#FF1744] shrink-0" />
            <span>Second Life session has expired or disconnected.</span>
          </div>
          <button
            id="chat-reconnect-btn"
            type="button"
            onClick={() => onSessionExpired?.()}
            className="px-3 py-1 bg-[#FF1744] text-[#050810] font-bold rounded text-[10px] tracking-wider hover:bg-[#FF1744]/90 transition-colors flex items-center gap-1.5 cursor-pointer shadow-[0_0_8px_rgba(255,23,68,0.4)]"
          >
            <RefreshCw className="w-3 h-3" />
            <span>RECONNECT</span>
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#121C2D] bg-[#0C1322] shrink-0">
        <div className="flex flex-col min-w-0 pr-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="font-display text-lg sm:text-xl font-bold tracking-[0.2em] text-[#00F0FF] leading-none">
              COMMUNICATOR
            </h1>

            {/* Real-time Typing Status Indicator in Header */}
            {typings.length > 0 && (
              <div
                id="chat-typing-indicator"
                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#00F0FF]/15 border border-[#00F0FF]/50 text-[#00F0FF] text-[11px] font-mono tracking-wide animate-pulse shadow-[0_0_8px_rgba(0,240,255,0.3)]"
                title={`${typings.map((t) => t.name).join(", ")} is actively typing via SL protocol`}
              >
                <span className="flex items-center gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00F0FF] animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00F0FF] animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00F0FF] animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
                <span className="font-bold truncate max-w-[130px] sm:max-w-[200px]">
                  {typings.length === 1
                    ? `${typings[0].name} is typing...`
                    : `${typings.length} typing...`}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <p className="font-mono text-[10px] text-[#64748B] tracking-wider uppercase truncate max-w-[160px] sm:max-w-[220px]">
              {session.region || "GRIDLINK REGION"} // {session.avatar_name}
            </p>
            {channel !== "local" && scopeName && (
              <span className="font-mono text-[9px] text-[#00F0FF] bg-[#141E30] px-1.5 py-0.5 rounded border border-[#1E2D4A] truncate max-w-[130px]">
                ▶ {scopeName}
              </span>
            )}
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          {/* Test Typing Button */}
          <button
            id="header-mock-typing-btn"
            type="button"
            onClick={handleTriggerSimulatedTyping}
            className="h-7 px-2 rounded border border-[#1E2D4A] bg-[#141E30] text-[#64748B] hover:text-[#00F0FF] hover:border-[#00F0FF]/40 font-mono text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
            title="Simulate incoming SL typing indicator from contact"
          >
            <Keyboard className="w-3.5 h-3.5 text-[#00F0FF]" />
            <span className="hidden sm:inline">TEST TYPING</span>
          </button>

          {onOpenVoiceModal && (
            <button
              id="header-voice-btn"
              onClick={onOpenVoiceModal}
              className="h-7 px-2 rounded border border-[#1E2D4A] bg-[#141E30] text-[#00F0FF] hover:bg-[#1A3B5C] font-mono text-[10px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Voice Communicator"
            >
              <Radio className="w-3.5 h-3.5 text-[#00F0FF]" />
              <span className="hidden sm:inline">VOICE</span>
            </button>
          )}

          {/* Link Status Pill */}
          <button
            id="circuit-status-pill"
            type="button"
            onClick={onOpenUdpInspector}
            title="Inspect simulator UDP circuit & telemetry"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-mono border transition-colors cursor-pointer ${
              simConnected
                ? "border-[#00FF66]/40 bg-[#0C1322] hover:bg-[#00FF66]/10 text-[#00FF66]"
                : "border-[#FF1744]/40 bg-[#0C1322] hover:bg-[#FF1744]/10 text-[#FF1744]"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                simConnected
                  ? "bg-[#00FF66] shadow-[0_0_6px_#00FF66]"
                  : "bg-[#FF1744]"
              }`}
            />
            <span className="font-bold tracking-widest">
              {simConnected ? `GRID: ${(session.grid || "AGNI").toUpperCase()}` : "DISCONNECTED"}
            </span>
          </button>
        </div>
      </div>

      {/* Segmented Channel Switcher */}
      <div className="p-2.5 border-b border-[#121C2D] bg-[#050810] shrink-0">
        <div className="grid grid-cols-3 bg-[#0C1322] border border-[#1E2D4A] rounded p-0.5 font-mono text-xs">
          <button
            id="tab-channel-local"
            onClick={() => {
              setChannel("local");
              setScope("local");
              setScopeName("Local Chat");
            }}
            className={`py-2 rounded font-bold tracking-widest flex items-center justify-center gap-1.5 transition-all ${
              channel === "local"
                ? "bg-[#1A3B5C] text-[#00F0FF] border-b-2 border-[#00F0FF]"
                : "text-[#64748B] hover:text-[#E2E8F0]"
            }`}
          >
            <span>LOCAL</span>
          </button>

          <button
            id="tab-channel-im"
            onClick={() => {
              setChannel("im");
              if (scope === "local") {
                setScope("");
                setScopeName("");
              }
            }}
            className={`py-2 rounded font-bold tracking-widest flex items-center justify-center gap-1.5 transition-all relative ${
              channel === "im"
                ? "bg-[#1A3B5C] text-[#00F0FF] border-b-2 border-[#00F0FF]"
                : "text-[#64748B] hover:text-[#E2E8F0]"
            }`}
          >
            <span>IM</span>
            {imUnread > 0 && (
              <span
                id="im-badge"
                className="px-1.5 py-0.2 bg-[#B026FF] text-white text-[9px] font-bold rounded-full min-w-[16px] text-center"
              >
                {imUnread > 99 ? "99+" : imUnread}
              </span>
            )}
          </button>

          <button
            id="tab-channel-group"
            onClick={() => {
              setChannel("group");
              setScope("");
              setScopeName("");
            }}
            className={`py-2 rounded font-bold tracking-widest flex items-center justify-center gap-1.5 transition-all relative ${
              channel === "group"
                ? "bg-[#1A3B5C] text-[#00F0FF] border-b-2 border-[#00F0FF]"
                : "text-[#64748B] hover:text-[#E2E8F0]"
            }`}
          >
            <span>GROUP</span>
            {groupUnread > 0 && (
              <span
                id="group-badge"
                className="px-1.5 py-0.2 bg-[#B026FF] text-white text-[9px] font-bold rounded-full min-w-[16px] text-center"
              >
                {groupUnread > 99 ? "99+" : groupUnread}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Target Chips Row (for IM and Group channels) */}
      {channel !== "local" && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[#121C2D] bg-[#0C1322] overflow-x-auto no-scrollbar shrink-0">
          {/* ALL (n) Modal trigger */}
          <button
            id="scope-picker-btn"
            onClick={() => setPickerOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded border border-[#B026FF] bg-[#141E30] text-[#B026FF] hover:bg-[#B026FF]/20 text-xs font-mono font-bold shrink-0 transition-colors"
          >
            <Users className="w-3.5 h-3.5" />
            <span>ALL ({targets.length})</span>
          </button>

          {/* Quick chips or Skeleton */}
          {targetsLoading && targets.length === 0 ? (
            <TargetChipsSkeleton />
          ) : (
            targets.slice(0, 8).map((t) => {
              const active = t.id === scope;
              const badgeCount = unreadFor(unread.entries, channel, t.id);

              return (
                <button
                  key={t.id}
                  id={`target-chip-${t.id}`}
                  onClick={() => {
                    setScope(t.id);
                    setScopeName(t.name);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-mono shrink-0 transition-all ${
                    active
                      ? "border-[#00F0FF] bg-[#1A3B5C] text-[#00F0FF] font-bold shadow-[0_0_8px_rgba(0,240,255,0.2)]"
                      : "border-[#1E2D4A] bg-[#050810] text-[#B0BEC5] hover:border-[#64748B]"
                  }`}
                >
                  {t.kind === "im" ? (
                    <span
                      className={`w-2 h-2 rounded-full ${
                        t.online ? "bg-[#00FF66]" : "bg-[#64748B]"
                      }`}
                    />
                  ) : (
                    <Users className="w-3 h-3 text-[#B026FF]" />
                  )}
                  <span className="truncate max-w-[120px]">{t.name}</span>
                  {badgeCount > 0 && (
                    <span className="ml-1 px-1 py-0.2 bg-[#B026FF] text-white text-[9px] font-bold rounded-full">
                      {badgeCount}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}

      {/* Messages Stream */}
      <div id="messages-container" className="flex-1 p-3 overflow-y-auto space-y-2">
        {loading && messages.length === 0 ? (
          <ChatMessageSkeleton />
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-3">
            <p className="font-mono text-xs text-[#64748B]">
              {channel === "local"
                ? "> No local chatter within 20m. Say something!"
                : targets.length === 0
                ? "> No active conversations or online residents."
                : `> No recorded messages in ${scopeName}.`}
            </p>
            {channel === "im" && targets.length === 0 && (
              <button
                id="empty-open-friends-btn"
                onClick={onNavigateToFriends}
                className="inline-flex items-center gap-2 px-4 py-2 border border-[#00F0FF] rounded bg-[#1A3B5C] text-[#00F0FF] font-mono text-xs font-bold tracking-wider hover:bg-[#00F0FF]/20 transition-all cursor-pointer"
              >
                <span>OPEN FRIENDS ROSTER</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          messages.map((m) => {
            const isMe =
              (session.agent_id && m.sender_id === session.agent_id) ||
              m.sender === session.avatar_name;
            const isSys = m.system || m.sender === "System";
            const timeStr = new Date(m.ts).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={m.id}
                id={`chat-msg-${m.id}`}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"} w-full`}
              >
                <div
                  className={`max-w-[85%] rounded p-2.5 font-mono text-xs border ${
                    isSys
                      ? "bg-transparent border-[#FFEA00]/60 border-dashed text-[#FFEA00]"
                      : isMe
                      ? "bg-[#1A3B5C] border-[#00F0FF] text-[#E2E8F0]"
                      : "bg-[#0C1322] border-[#1E2D4A] text-[#E2E8F0]"
                  }`}
                >
                  <div className="flex items-center gap-2 text-[10px] mb-1 opacity-75">
                    <span className="text-[#64748B]">[{timeStr}]</span>
                    <span
                      className={`font-bold ${
                        isSys ? "text-[#FFEA00]" : isMe ? "text-[#00F0FF]" : "text-[#B026FF]"
                      }`}
                    >
                      {m.sender}
                    </span>
                    {m.scope_name && channel !== "local" && (
                      <span className="text-[#64748B] truncate max-w-[100px]">
                        → {m.scope_name}
                      </span>
                    )}
                  </div>
                  <div className="whitespace-pre-wrap break-words leading-relaxed text-[13px]">
                    {m.text}
                  </div>
                </div>
              </div>
            );
          })
        )}
        {/* In-stream typing indicator bubble */}
        {typings.length > 0 && (
          <div
            id="messages-typing-bubble"
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#0C1322] border border-[#00F0FF]/30 text-[#00F0FF] font-mono text-xs w-fit animate-pulse"
          >
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00F0FF] animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#00F0FF] animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#00F0FF] animate-bounce" style={{ animationDelay: "300ms" }} />
            </span>
            <span className="italic">
              {typings.map((t) => t.name).join(", ")} is typing a response...
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Send Error Toast */}
      {sendError && (
        <div className="px-4 py-1.5 bg-[#FF1744]/10 border-t border-[#FF1744] text-[#FF1744] font-mono text-[11px] flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>&gt; {sendError}</span>
        </div>
      )}

      {/* Message Compose Bar */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 p-3 bg-[#0C1322] border-t border-[#1E2D4A] shrink-0"
      >
        <input
          id="chat-input"
          ref={inputRef}
          type="text"
          value={text}
          onChange={handleInputChange}
          placeholder={
            scope
              ? `Transmit to ${channel === "local" ? "local" : scopeName}...`
              : "Select a recipient..."
          }
          disabled={!scope}
          className="flex-1 bg-[#050810] border border-[#1E2D4A] rounded px-3 py-2 text-xs font-mono text-[#E2E8F0] placeholder-[#64748B] focus:border-[#00F0FF] focus:outline-none disabled:opacity-50"
        />
        <button
          id="chat-send"
          type="submit"
          disabled={!scope || !text.trim()}
          className="w-11 h-9 rounded bg-[#00F0FF] hover:bg-[#00F0FF]/90 text-[#050810] flex items-center justify-center transition-all disabled:opacity-30 cursor-pointer shrink-0 shadow-[0_0_10px_rgba(0,240,255,0.2)]"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* Scope Picker Modal */}
      <ScopePicker
        isOpen={pickerOpen}
        title={channel === "im" ? "SELECT RESIDENT" : "SELECT GROUP"}
        targets={targets}
        selected={scope}
        onSelect={(t) => {
          setScope(t.id);
          setScopeName(t.name);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  );
};
