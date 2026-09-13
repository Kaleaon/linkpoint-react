import React, { useState, useEffect } from "react";
import { MessageSquare, Users, FolderTree, Menu, Calendar, Globe, Sparkles, DollarSign } from "lucide-react";
import { loadSession, clearSession, api, type Session } from "./api";
import { useUnread } from "./unread";
import { useHaptic } from "./hooks/useHaptic";
import { VoiceProvider, useVoice } from "./voice/VoiceContext";
import { VoiceBar } from "./components/VoiceBar";
import { VoiceModal } from "./components/VoiceModal";
import { TPVPolicyModal } from "./components/TPVPolicyModal";
import { LatencyIndicator } from "./components/LatencyIndicator";
import { LoginView } from "./components/LoginView";
import { ChatView } from "./components/ChatView";
import { FriendsView } from "./components/FriendsView";
import { LiveEventsView } from "./components/LiveEventsView";
import { InventoryView } from "./components/InventoryView";
import { MoreView } from "./components/MoreView";
import { RadarView } from "./components/RadarView";
import { DiagnosticsView } from "./components/DiagnosticsView";
import { SearchView } from "./components/SearchView";
import { SettingsView } from "./components/SettingsView";
import { UdpCircuitModal } from "./components/UdpCircuitModal";
import { GroupsModal } from "./components/GroupsModal";
import { World3DView } from "./components/World3DView";
import { ParcelMediaBar } from "./components/ParcelMediaBar";
import { EconomyModal } from "./components/EconomyModal";
import { AppearanceModal } from "./components/AppearanceModal";

export type Tab = "world" | "chat" | "friends" | "events" | "inventory" | "more";
export type SubScreen = "none" | "radar" | "diagnostics" | "search" | "settings";

function MainCommunicator({
  session,
  onLogout,
  onSessionUpdated,
  onOpenTPVPolicy,
  onSessionExpired,
}: {
  session: Session;
  onLogout: () => void;
  onSessionUpdated: (session: Session) => void;
  onOpenTPVPolicy: () => void;
  onSessionExpired?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("world");
  const [subScreen, setSubScreen] = useState<SubScreen>("none");
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isUdpModalOpen, setIsUdpModalOpen] = useState(false);
  const [isGroupsModalOpen, setIsGroupsModalOpen] = useState(false);
  const [isEconomyModalOpen, setIsEconomyModalOpen] = useState(false);
  const [isAppearanceModalOpen, setIsAppearanceModalOpen] = useState(false);

  // Chat target state if navigating from Friends, Groups, or Radar
  const [chatTarget, setChatTarget] = useState<{
    channel: "local" | "im" | "group";
    scope: string;
    scopeName: string;
  }>({
    channel: "local",
    scope: "local",
    scopeName: "Local Chat",
  });

  const unread = useUnread();
  const haptic = useHaptic();
  const voice = useVoice();

  const handleOpenIm = (friendId: string, friendName: string) => {
    setChatTarget({
      channel: "im",
      scope: friendId,
      scopeName: friendName,
    });
    setSubScreen("none");
    setActiveTab("chat");
  };

  const handleOpenGroupChat = (groupId: string, groupName: string) => {
    setChatTarget({
      channel: "group",
      scope: groupId,
      scopeName: groupName,
    });
    setSubScreen("none");
    setActiveTab("chat");
  };

  const handleStartVoiceCall = (friendId: string, friendName: string) => {
    voice.connectVoice("im", `${friendName} (1:1 Call)`);
    setIsVoiceModalOpen(true);
  };

  return (
    <div className="flex justify-center min-h-screen bg-[#020408] text-[#E2E8F0]">
      {/* Device frame container for tactical terminal mobile experience */}
      <div className="w-full max-w-md h-screen flex flex-col bg-[#050810] border-x border-[#1E2D4A] shadow-2xl relative overflow-hidden">
        {/* Terminal Frame Top Bar with Subtle Latency Indicator in Top-Right Corner */}
        <div
          id="terminal-frame-header"
          className="h-7 px-3 bg-[#020408] border-b border-[#121C2D] flex items-center justify-between text-[10px] font-mono text-[#64748B] shrink-0 z-30 select-none"
        >
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00F0FF] animate-pulse" />
            <span className="font-bold tracking-widest text-[#00F0FF]">LINKPOINT</span>
            <span className="text-[#334155]">/</span>
            <span className="text-[#94A3B8] uppercase text-[9px]">
              {session.mode === "offline" ? "OFFLINE SIM" : (session.grid || "AGNI")}
            </span>
          </div>

          {/* Connection Latency Indicator (Ping ms) */}
          <LatencyIndicator
            session={session}
            onOpenUdpInspector={() => setIsUdpModalOpen(true)}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden relative">
          {subScreen === "radar" ? (
            <RadarView
              session={session}
              onBack={() => setSubScreen("none")}
              onOpenIm={handleOpenIm}
            />
          ) : subScreen === "diagnostics" ? (
            <DiagnosticsView onBack={() => setSubScreen("none")} />
          ) : subScreen === "search" ? (
            <SearchView
              session={session}
              onBack={() => setSubScreen("none")}
              onOpenIm={handleOpenIm}
            />
          ) : subScreen === "settings" ? (
            <SettingsView onBack={() => setSubScreen("none")} onOpenTPVPolicy={onOpenTPVPolicy} />
          ) : activeTab === "world" ? (
            <div className="flex flex-col h-full overflow-hidden">
              <ParcelMediaBar session={session} />
              <div className="flex-1 min-h-0">
                <World3DView
                  session={session}
                  onOpenEconomy={() => setIsEconomyModalOpen(true)}
                  onOpenAppearance={() => setIsAppearanceModalOpen(true)}
                  onOpenEvents={() => {
                    setSubScreen("none");
                    setActiveTab("events");
                  }}
                />
              </div>
            </div>
          ) : activeTab === "chat" ? (
            <ChatView
              session={session}
              initialChannel={chatTarget.channel}
              initialScope={chatTarget.scope}
              initialScopeName={chatTarget.scopeName}
              onNavigateToFriends={() => setActiveTab("friends")}
              onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
              onOpenUdpInspector={() => setIsUdpModalOpen(true)}
              onSessionExpired={onSessionExpired || onLogout}
            />
          ) : activeTab === "friends" ? (
            <FriendsView
              session={session}
              onOpenIm={handleOpenIm}
              onOpenSearch={() => setSubScreen("search")}
              onStartVoiceCall={handleStartVoiceCall}
            />
          ) : activeTab === "events" ? (
            <LiveEventsView
              session={session}
              onOpenChatWithText={() => {
                setChatTarget({
                  channel: "local",
                  scope: "local",
                  scopeName: "Local Chat",
                });
                setActiveTab("chat");
              }}
            />
          ) : activeTab === "inventory" ? (
            <InventoryView session={session} onOpenTPVPolicy={onOpenTPVPolicy} />
          ) : (
            <MoreView
              session={session}
              onOpenDiagnostics={() => setSubScreen("diagnostics")}
              onOpenRadar={() => setSubScreen("radar")}
              onOpenSettings={() => setSubScreen("settings")}
              onOpenGroups={() => setIsGroupsModalOpen(true)}
              onOpenEvents={() => {
                setSubScreen("none");
                setActiveTab("events");
              }}
              onOpenUdpInspector={() => setIsUdpModalOpen(true)}
              onOpenVoice={() => setIsVoiceModalOpen(true)}
              onOpenTPVPolicy={onOpenTPVPolicy}
              onOpenWorld={() => {
                setSubScreen("none");
                setActiveTab("world");
              }}
              onOpenEconomy={() => setIsEconomyModalOpen(true)}
              onOpenAppearance={() => setIsAppearanceModalOpen(true)}
              onLogout={onLogout}
              onSessionUpdated={onSessionUpdated}
            />
          )}
        </div>

        {/* Voice Floating Tactical Bar (renders whenever voice is active/negotiating) */}
        <VoiceBar onOpenVoiceModal={() => setIsVoiceModalOpen(true)} />

        {/* Bottom Tab Navigation */}
        <div
          id="bottom-tab-bar"
          className="flex items-center justify-around h-16 bg-[#0C1322] border-t border-[#1E2D4A] px-1 shrink-0 z-20"
        >
          {/* 3D World Tab */}
          <button
            id="tab-btn-world"
            onClick={() => {
              haptic.trigger("selection");
              setSubScreen("none");
              setActiveTab("world");
            }}
            className={`flex flex-col items-center justify-center flex-1 py-1 font-mono transition-all active:scale-95 relative cursor-pointer ${
              activeTab === "world" && subScreen === "none"
                ? "text-[#00F0FF]"
                : "text-[#64748B] hover:text-[#E2E8F0]"
            }`}
          >
            <Globe className="w-5 h-5" />
            <span className="text-[9px] font-bold tracking-widest mt-1">WORLD</span>
            {activeTab === "world" && subScreen === "none" && (
              <span className="absolute bottom-0 w-8 h-0.5 bg-[#00F0FF] rounded-t shadow-[0_0_6px_#00F0FF]" />
            )}
          </button>

          {/* Chat Tab */}
          <button
            id="tab-btn-chat"
            onClick={() => {
              haptic.trigger("selection");
              setSubScreen("none");
              setActiveTab("chat");
            }}
            className={`flex flex-col items-center justify-center flex-1 py-1 font-mono transition-all active:scale-95 relative cursor-pointer ${
              activeTab === "chat" && subScreen === "none"
                ? "text-[#00F0FF]"
                : "text-[#64748B] hover:text-[#E2E8F0]"
            }`}
          >
            <div className="relative">
              <MessageSquare className="w-5 h-5" />
              {unread.total > 0 && (
                <span
                  id="tab-chat-unread-badge"
                  className="absolute -top-1.5 -right-2.5 px-1 py-0.2 bg-[#B026FF] text-white text-[9px] font-bold rounded-full min-w-[15px] text-center"
                >
                  {unread.total > 99 ? "99+" : unread.total}
                </span>
              )}
            </div>
            <span className="text-[9px] font-bold tracking-widest mt-1">CHAT</span>
            {activeTab === "chat" && subScreen === "none" && (
              <span className="absolute bottom-0 w-8 h-0.5 bg-[#00F0FF] rounded-t shadow-[0_0_6px_#00F0FF]" />
            )}
          </button>

          {/* Friends Tab */}
          <button
            id="tab-btn-friends"
            onClick={() => {
              haptic.trigger("selection");
              setSubScreen("none");
              setActiveTab("friends");
            }}
            className={`flex flex-col items-center justify-center flex-1 py-1 font-mono transition-all active:scale-95 relative cursor-pointer ${
              activeTab === "friends" && subScreen === "none"
                ? "text-[#00F0FF]"
                : "text-[#64748B] hover:text-[#E2E8F0]"
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[9px] font-bold tracking-widest mt-1">FRIENDS</span>
            {activeTab === "friends" && subScreen === "none" && (
              <span className="absolute bottom-0 w-8 h-0.5 bg-[#00F0FF] rounded-t shadow-[0_0_6px_#00F0FF]" />
            )}
          </button>

          {/* Live Events Tab */}
          <button
            id="tab-btn-events"
            onClick={() => {
              haptic.trigger("selection");
              setSubScreen("none");
              setActiveTab("events");
            }}
            className={`flex flex-col items-center justify-center flex-1 py-1 font-mono transition-all active:scale-95 relative cursor-pointer ${
              activeTab === "events" && subScreen === "none"
                ? "text-[#00F0FF]"
                : "text-[#64748B] hover:text-[#E2E8F0]"
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-[9px] font-bold tracking-widest mt-1">EVENTS</span>
            {activeTab === "events" && subScreen === "none" && (
              <span className="absolute bottom-0 w-8 h-0.5 bg-[#00F0FF] rounded-t shadow-[0_0_6px_#00F0FF]" />
            )}
          </button>

          {/* Inventory Tab */}
          <button
            id="tab-btn-inventory"
            onClick={() => {
              haptic.trigger("selection");
              setSubScreen("none");
              setActiveTab("inventory");
            }}
            className={`flex flex-col items-center justify-center flex-1 py-1 font-mono transition-all active:scale-95 relative cursor-pointer ${
              activeTab === "inventory" && subScreen === "none"
                ? "text-[#00F0FF]"
                : "text-[#64748B] hover:text-[#E2E8F0]"
            }`}
          >
            <FolderTree className="w-5 h-5" />
            <span className="text-[9px] font-bold tracking-widest mt-1">ITEMS</span>
            {activeTab === "inventory" && subScreen === "none" && (
              <span className="absolute bottom-0 w-8 h-0.5 bg-[#00F0FF] rounded-t shadow-[0_0_6px_#00F0FF]" />
            )}
          </button>

          {/* More Tab */}
          <button
            id="tab-btn-more"
            onClick={() => {
              haptic.trigger("selection");
              setSubScreen("none");
              setActiveTab("more");
            }}
            className={`flex flex-col items-center justify-center flex-1 py-1 font-mono transition-all active:scale-95 relative cursor-pointer ${
              activeTab === "more" || subScreen !== "none"
                ? "text-[#00F0FF]"
                : "text-[#64748B] hover:text-[#E2E8F0]"
            }`}
          >
            <Menu className="w-5 h-5" />
            <span className="text-[9px] font-bold tracking-widest mt-1">MORE</span>
            {(activeTab === "more" || subScreen !== "none") && (
              <span className="absolute bottom-0 w-8 h-0.5 bg-[#00F0FF] rounded-t shadow-[0_0_6px_#00F0FF]" />
            )}
          </button>
        </div>

        {/* Full Voice Communicator & Active Speakers Modal */}
        <VoiceModal
          isOpen={isVoiceModalOpen}
          onClose={() => setIsVoiceModalOpen(false)}
          avatarName={session.avatar_name}
        />

        {/* Second Life Groups Modal */}
        <GroupsModal
          isOpen={isGroupsModalOpen}
          onClose={() => setIsGroupsModalOpen(false)}
          session={session}
          onOpenGroupChat={handleOpenGroupChat}
        />

        {/* Second Life Direct Simulator UDP Circuit Inspector */}
        <UdpCircuitModal
          session={session}
          isOpen={isUdpModalOpen}
          onClose={() => setIsUdpModalOpen(false)}
        />

        {/* Linden Dollar Economy Modal */}
        {isEconomyModalOpen && (
          <EconomyModal
            session={session}
            onClose={() => setIsEconomyModalOpen(false)}
          />
        )}

        {/* Avatar Appearance & Outfits Modal */}
        {isAppearanceModalOpen && (
          <AppearanceModal
            session={session}
            onClose={() => setIsAppearanceModalOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [isTPVPolicyOpen, setIsTPVPolicyOpen] = useState(false);

  const handleSessionExpired = async () => {
    await clearSession();
    setSession(null);
  };

  useEffect(() => {
    let active = true;

    async function verifyStoredSession() {
      try {
        const s = await loadSession();
        if (!s) {
          if (active) setLoadingSession(false);
          return;
        }

        // Verify with server that this session is still active, with timeout guard
        try {
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Session check timeout")), 4000)
          );
          const checkPromise = api.get<{ session_id?: string; avatar_name?: string }>(
            `/session?session_id=${encodeURIComponent(s.session_id)}`
          );

          const check = (await Promise.race([checkPromise, timeoutPromise])) as any;
          if (active) {
            if (check && check.session_id) {
              setSession({
                ...s,
                avatar_name: check.avatar_name || s.avatar_name,
              });
            } else {
              setSession(s);
            }
          }
        } catch (verr: any) {
          const errMsg = String(verr?.message || verr);
          console.warn("Session check warning:", errMsg);
          if (verr?.status === 404 || errMsg.includes("Session not found")) {
            await clearSession();
            if (active) setSession(null);
          } else {
            // Keep local cached session rather than hanging or logging out
            if (active) setSession(s);
          }
        }
      } catch (err) {
        console.warn("Session load error:", err);
      } finally {
        if (active) setLoadingSession(false);
      }
    }

    verifyStoredSession();
    return () => {
      active = false;
    };
  }, []);

  if (loadingSession) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#050810] text-[#00F0FF] font-mono text-xs">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#00F0FF] border-t-transparent rounded-full animate-spin" />
          <span className="tracking-[0.2em]">INITIALIZING GRIDLINK...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {!session ? (
        <LoginView
          onLoginSuccess={(s) => setSession(s)}
          onOpenTPVPolicy={() => setIsTPVPolicyOpen(true)}
        />
      ) : (
        <VoiceProvider>
          <MainCommunicator
            session={session}
            onLogout={handleSessionExpired}
            onSessionExpired={handleSessionExpired}
            onSessionUpdated={(s) => setSession(s)}
            onOpenTPVPolicy={() => setIsTPVPolicyOpen(true)}
          />
        </VoiceProvider>
      )}

      {/* Second Life Official TPV Policy & Compliance Standards Modal */}
      <TPVPolicyModal
        isOpen={isTPVPolicyOpen}
        onClose={() => setIsTPVPolicyOpen(false)}
      />
    </>
  );
}
