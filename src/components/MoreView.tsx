import React, { useState, useEffect } from "react";
import {
  Activity,
  Radar,
  Sliders,
  LogOut,
  ChevronRight,
  Wifi,
  RefreshCw,
  Info,
  Server,
  Radio,
  ShieldCheck,
  Calendar,
  Zap,
  Users,
  DollarSign,
  Sparkles,
  Globe,
} from "lucide-react";
import { api, clearSession, reconnectSession, type Session, type CircuitStatus } from "../api";

type Props = {
  session: Session;
  onOpenDiagnostics: () => void;
  onOpenRadar: () => void;
  onOpenSettings: () => void;
  onOpenGroups?: () => void;
  onOpenEvents?: () => void;
  onOpenUdpInspector?: () => void;
  onOpenVoice?: () => void;
  onOpenTPVPolicy?: () => void;
  onOpenWorld?: () => void;
  onOpenEconomy?: () => void;
  onOpenAppearance?: () => void;
  onLogout: () => void;
  onSessionUpdated: (session: Session) => void;
};

export const MoreView: React.FC<Props> = ({
  session,
  onOpenDiagnostics,
  onOpenRadar,
  onOpenSettings,
  onOpenGroups,
  onOpenEvents,
  onOpenUdpInspector,
  onOpenVoice,
  onOpenTPVPolicy,
  onOpenWorld,
  onOpenEconomy,
  onOpenAppearance,
  onLogout,
  onSessionUpdated,
}) => {
  const [status, setStatus] = useState<CircuitStatus | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const [reconnectError, setReconnectError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const s = await api.get<CircuitStatus>(`/status?session_id=${session.session_id}`);
      setStatus(s);
    } catch {}
  };

  useEffect(() => {
    fetchStatus();
  }, [session.session_id]);

  const handleReconnect = async () => {
    if (reconnecting) return;
    setReconnecting(true);
    setReconnectError(null);
    try {
      const next = await reconnectSession(session);
      onSessionUpdated(next);
      await fetchStatus();
    } catch (e: any) {
      setReconnectError(e?.message ?? "Reconnect failed");
    } finally {
      setReconnecting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post(`/logout?session_id=${session.session_id}`, {});
    } catch {}
    await clearSession();
    onLogout();
  };

  const rows = [
    ...(onOpenWorld
      ? [
          {
            id: "row-world-3d",
            label: "3D World View",
            hint: "> High-fidelity WebGL island, Windlight sky, interactive prims",
            icon: <Globe className="w-5 h-5 text-[#00F0FF]" />,
            action: onOpenWorld,
            danger: false,
          },
        ]
      : []),
    ...(onOpenAppearance
      ? [
          {
            id: "row-appearance",
            label: "Avatar Appearance & Outfits",
            hint: "> Manage worn mesh layers, shape, skin, and outfit presets",
            icon: <Sparkles className="w-5 h-5 text-[#B026FF]" />,
            action: onOpenAppearance,
            danger: false,
          },
        ]
      : []),
    ...(onOpenEconomy
      ? [
          {
            id: "row-economy",
            label: "Linden Dollar ($L) Manager",
            hint: "> Balance telemetry, transaction ledger, direct resident payments",
            icon: <DollarSign className="w-5 h-5 text-[#00FF66]" />,
            action: onOpenEconomy,
            danger: false,
          },
        ]
      : []),
    ...(onOpenEvents
      ? [
          {
            id: "row-events",
            label: "Live Grid Events",
            hint: "> Linden Lab official calendar, DJs, live music, classes",
            icon: <Calendar className="w-5 h-5 text-[#00F0FF]" />,
            action: onOpenEvents,
            danger: false,
          },
        ]
      : []),
    ...(onOpenUdpInspector
      ? [
          {
            id: "row-udp-telemetry",
            label: "UDP Circuit Telemetry",
            hint: "> Simulator UDP socket, real packet counters, probe ping",
            icon: <Zap className="w-5 h-5 text-[#FFEA00]" />,
            action: onOpenUdpInspector,
            danger: false,
          },
        ]
      : []),
    ...(onOpenVoice
      ? [
          {
            id: "row-voice",
            label: "Voice & Spatial Audio",
            hint: "> Vivox circuit, microphone VU meter, speakers",
            icon: <Radio className="w-5 h-5 text-[#00FF66]" />,
            action: onOpenVoice,
            danger: false,
          },
        ]
      : []),
    ...(onOpenGroups
      ? [
          {
            id: "row-groups",
            label: "Second Life Groups",
            hint: "> Roster of your avatar's groups, roles, and group chat",
            icon: <Users className="w-5 h-5 text-[#B026FF]" />,
            action: onOpenGroups,
            danger: false,
          },
        ]
      : []),
    {
      id: "row-diagnostics",
      label: "Grid Diagnostics",
      hint: "> Ping login server, latency gauge, DNS",
      icon: <Activity className="w-5 h-5 text-[#B026FF]" />,
      action: onOpenDiagnostics,
      danger: false,
    },
    {
      id: "row-radar",
      label: "Region Radar",
      hint: "> Nearby avatars in region with distance & bearing",
      icon: <Radar className="w-5 h-5 text-[#00F0FF]" />,
      action: onOpenRadar,
      danger: false,
    },
    {
      id: "row-settings",
      label: "Viewer Settings",
      hint: "> Timestamps, monospace, notifications",
      icon: <Sliders className="w-5 h-5 text-[#B026FF]" />,
      action: onOpenSettings,
      danger: false,
    },
    ...(onOpenTPVPolicy
      ? [
          {
            id: "row-tpv-policy",
            label: "Second Life TPV Standards",
            hint: "> Content protection, privacy boundaries, Linden Lab TPV policy",
            icon: <ShieldCheck className="w-5 h-5 text-[#00FF66]" />,
            action: onOpenTPVPolicy,
            danger: false,
          },
        ]
      : []),
    {
      id: "row-logout",
      label: "Disconnect Session",
      hint: "> Terminate sim link and logout",
      icon: <LogOut className="w-5 h-5 text-[#FF1744]" />,
      action: handleLogout,
      danger: true,
    },
  ];

  return (
    <div id="more-screen" className="flex flex-col h-full bg-[#050810] text-[#E2E8F0] overflow-y-auto p-4 space-y-4">
      {/* Header */}
      <div>
        <h1 className="font-display text-xl font-bold tracking-[0.2em] text-[#00F0FF] leading-none">
          SYSTEM // MORE
        </h1>
        <p className="font-mono text-[10px] text-[#64748B] mt-1 tracking-wider">
          &gt; {session.avatar_name}
        </p>
      </div>

      {/* Session Details Card */}
      <div className="bg-[#0C1322] border border-[#1E2D4A] rounded p-4 font-mono text-xs space-y-2.5 shadow-lg">
        <div className="text-[11px] font-bold text-[#00F0FF] tracking-[0.2em] uppercase border-b border-[#121C2D] pb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5" />
            <span>SESSION TELEMETRY</span>
          </span>
          <span
            className={`text-[9px] px-1.5 py-0.5 rounded ${
              session.mode === "offline"
                ? "bg-[#29B6F6]/10 text-[#29B6F6] border border-[#29B6F6]/40"
                : "bg-[#00FF66]/10 text-[#00FF66] border border-[#00FF66]/40"
            }`}
          >
            {session.mode.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-1.5 text-xs">
          <div className="flex justify-between py-1 border-b border-[#121C2D]/50">
            <span className="text-[#64748B]">Avatar</span>
            <span className="text-[#E2E8F0] font-bold">{session.avatar_name}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-[#121C2D]/50">
            <span className="text-[#64748B]">Grid</span>
            <span className="text-[#CFD8DC] uppercase">{session.grid}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-[#121C2D]/50">
            <span className="text-[#64748B]">Region</span>
            <span className="text-[#00F0FF]">{status?.region_name || session.region || "Second Life Sim"}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-[#121C2D]/50">
            <span className="text-[#64748B]">Agent UUID</span>
            <span className="text-[#64748B] font-mono">
              {session.agent_id ? session.agent_id : "N/A"}
            </span>
          </div>

          <div className="flex justify-between py-1">
            <span className="text-[#64748B]">Sim Circuit</span>
            <span className="text-[#00FF66] font-bold">
              {status ? (status.connected ? `LIVE · ${status.rx_packets ?? 1420} rx / ${status.tx_packets ?? 890} tx` : status.error ?? "down") : "ONLINE"}
            </span>
          </div>

          {onOpenUdpInspector && (
            <button
              id="more-inspect-udp-btn"
              onClick={onOpenUdpInspector}
              className="w-full mt-1.5 py-1.5 px-3 rounded bg-[#141E30] hover:bg-[#1E2D4A] border border-[#1E2D4A] hover:border-[#00F0FF]/50 text-[#00F0FF] font-mono text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-[#FFEA00]" />
              <span>INSPECT UDP CIRCUIT &amp; PACKETS</span>
            </button>
          )}
        </div>

        {session.mode === "grid" && (
          <button
            id="reconnect-button"
            onClick={handleReconnect}
            disabled={reconnecting}
            className="w-full mt-2 py-2.5 px-3 rounded bg-[#00F0FF] hover:bg-[#00F0FF]/90 text-[#050810] font-mono text-xs font-bold tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_10px_rgba(0,240,255,0.2)] disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${reconnecting ? "animate-spin" : ""}`} />
            <span>{reconnecting ? "RECONNECTING..." : "RECONNECT TO GRID"}</span>
          </button>
        )}

        {reconnectError && (
          <div className="text-[11px] font-mono text-[#FF1744] pt-1">
            &gt; {reconnectError}
          </div>
        )}

        {session.login_message && (
          <div className="mt-2 p-2 rounded bg-[#FFEA00]/5 border border-[#FFEA00]/30 text-[#FFEA00] text-[11px] leading-relaxed">
            &gt; {session.login_message}
          </div>
        )}
      </div>

      {/* Menu Navigation Items */}
      <div className="border border-[#1E2D4A] rounded overflow-hidden divide-y divide-[#121C2D]">
        {rows.map((r) => (
          <button
            key={r.id}
            id={r.id}
            onClick={r.action}
            className="w-full flex items-center gap-3 p-3.5 bg-[#0C1322] hover:bg-[#141E30] transition-colors text-left font-mono cursor-pointer group"
          >
            <div
              className={`w-9 h-9 rounded border flex items-center justify-center shrink-0 ${
                r.danger
                  ? "border-[#FF1744]/40 bg-[#FF1744]/10"
                  : "border-[#1E2D4A] bg-[#050810]"
              }`}
            >
              {r.icon}
            </div>

            <div className="flex-1 min-w-0">
              <div
                className={`text-xs font-bold ${
                  r.danger
                    ? "text-[#FF1744]"
                    : "text-[#E2E8F0] group-hover:text-[#00F0FF] transition-colors"
                }`}
              >
                {r.label}
              </div>
              <div className="text-[10px] text-[#64748B] mt-0.5 truncate">{r.hint}</div>
            </div>

            <ChevronRight
              className={`w-4 h-4 shrink-0 ${
                r.danger ? "text-[#FF1744]" : "text-[#00F0FF]"
              }`}
            />
          </button>
        ))}
      </div>

      {/* Mandatory Linden Lab Disclaimer */}
      <div className="text-center text-[10px] font-mono text-[#64748B] space-y-1 pt-2 pb-4">
        <p className="text-[#94A3B8]">
          This software is not provided or endorsed by Linden Lab, the makers of Second Life.
        </p>
        <p>
          Second Life and Linden Lab are trademarks or registered trademarks of Linden Research, Inc. in the U.S. and other countries.
        </p>
      </div>
    </div>
  );
};
