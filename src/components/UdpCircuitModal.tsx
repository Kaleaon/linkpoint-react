import React, { useState, useEffect } from "react";
import {
  Activity,
  Zap,
  RefreshCw,
  Send,
  AlertTriangle,
  CheckCircle2,
  X,
  Server,
  Cpu,
  Wifi,
  Radio,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";
import {
  getUdpCircuitStatus,
  pingUdpCircuit,
  reconnectUdpCircuit,
  sendUdpTestPacket,
  type UDPCircuitStatus,
  type Session,
} from "../api";

interface UdpCircuitModalProps {
  session?: Session | null;
  isOpen: boolean;
  onClose: () => void;
}

export const UdpCircuitModal: React.FC<UdpCircuitModalProps> = ({
  session,
  isOpen,
  onClose,
}) => {
  const [telemetry, setTelemetry] = useState<UDPCircuitStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [pinging, setPinging] = useState<boolean>(false);
  const [sendingPacket, setSendingPacket] = useState<boolean>(false);
  const [reconnecting, setReconnecting] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const fetchStatus = async () => {
    if (!session) return;
    try {
      const data = await getUdpCircuitStatus(session.session_id);
      setTelemetry(data);
    } catch (err: any) {
      console.warn("Failed to fetch UDP telemetry:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !session) return;
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [isOpen, session]);

  if (!isOpen) return null;

  const handlePing = async () => {
    if (!session) return;
    setPinging(true);
    setActionNotice(null);
    try {
      const res = await pingUdpCircuit(session.session_id);
      setActionNotice(`UDP probe acknowledged: ${res.latency_ms}ms roundtrip`);
      await fetchStatus();
    } catch (err: any) {
      setActionNotice(`Probe failed: ${err.message}`);
    } finally {
      setPinging(false);
      setTimeout(() => setActionNotice(null), 3500);
    }
  };

  const handleSendTestPacket = async () => {
    if (!session) return;
    setSendingPacket(true);
    setActionNotice(null);
    try {
      const res = await sendUdpTestPacket(session.session_id);
      setActionNotice(res.message);
      await fetchStatus();
    } catch (err: any) {
      setActionNotice(`Packet transmission failed: ${err.message}`);
    } finally {
      setSendingPacket(false);
      setTimeout(() => setActionNotice(null), 3500);
    }
  };

  const handleReconnect = async () => {
    if (!session) return;
    setReconnecting(true);
    setActionNotice(null);
    try {
      const res = await reconnectUdpCircuit(session.session_id);
      setActionNotice(`Socket rebound to port :${res.sim_port}, circuit re-initialized.`);
      await fetchStatus();
    } catch (err: any) {
      setActionNotice(`Reconnect error: ${err.message}`);
    } finally {
      setReconnecting(false);
      setTimeout(() => setActionNotice(null), 3500);
    }
  };

  const isSocketActive = telemetry?.socket_state === "bound" || telemetry?.socket_state === "active";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs font-mono select-none">
      <div className="w-full max-w-lg max-h-[85vh] flex flex-col bg-[#080D1A] border border-[#00F0FF]/50 rounded-lg shadow-[0_0_30px_rgba(0,240,255,0.2)] overflow-hidden text-[#E2E8F0]">
        {/* Header */}
        <div className="p-3 bg-[#0C1322] border-b border-[#1E2D4A] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#00F0FF] animate-pulse" />
            <div>
              <div className="text-xs font-bold text-[#00F0FF] tracking-wider flex items-center gap-2">
                <span>UDP CIRCUIT TELEMETRY</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                    isSocketActive
                      ? "bg-[#00FF66]/20 border border-[#00FF66] text-[#00FF66]"
                      : "bg-[#FF1744]/20 border border-[#FF1744] text-[#FF1744]"
                  }`}
                >
                  {telemetry?.socket_state ? telemetry.socket_state.toUpperCase() : "IDLE"}
                </span>
              </div>
              <div className="text-[10px] text-[#64748B]">
                Second Life Simulator UDP Socket Interface
              </div>
            </div>
          </div>

          <button
            id="close-udp-modal"
            onClick={onClose}
            className="p-1 rounded hover:bg-[#1E2D4A] text-[#94A3B8] hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
          {/* Target Simulator Card */}
          <div className="p-3 rounded bg-[#0C1322] border border-[#1E2D4A] space-y-2">
            <div className="text-[10px] text-[#64748B] font-bold tracking-wider flex items-center justify-between">
              <span>TARGET SIMULATOR CIRCUIT</span>
              <span className="text-[#00F0FF]">{session?.region || "Active Sim"}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded bg-[#050810] border border-[#1E2D4A]/60">
                <div className="text-[9px] text-[#64748B]">SIMULATOR ENDPOINT</div>
                <div className="font-bold text-[#00F0FF] truncate">
                  {telemetry?.sim_ip || "216.82.xxx.xxx"}:{telemetry?.sim_port || 12035}
                </div>
              </div>

              <div className="p-2 rounded bg-[#050810] border border-[#1E2D4A]/60">
                <div className="text-[9px] text-[#64748B]">CIRCUIT CODE</div>
                <div className="font-bold text-[#FFEA00] truncate">
                  {telemetry?.circuit_code || 10001}
                </div>
              </div>

              <div className="p-2 rounded bg-[#050810] border border-[#1E2D4A]/60">
                <div className="text-[9px] text-[#64748B]">LOCAL UDP SOCKET</div>
                <div className="font-bold text-[#94A3B8]">
                  0.0.0.0:{telemetry?.local_port || "Dynamic"}
                </div>
              </div>

              <div className="p-2 rounded bg-[#050810] border border-[#1E2D4A]/60">
                <div className="text-[9px] text-[#64748B]">ROUNDTRIP LATENCY</div>
                <div className="font-bold text-[#00FF66] flex items-center gap-1">
                  <Activity className="w-3 h-3 text-[#00FF66]" />
                  <span>{telemetry?.ping_ms ?? 42} ms</span>
                </div>
              </div>
            </div>
          </div>

          {/* Packet Counters */}
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2 rounded bg-[#0C1322] border border-[#1E2D4A]">
              <div className="text-[9px] text-[#64748B]">TX PACKETS</div>
              <div className="font-bold text-[#00F0FF] tabular-nums mt-0.5">
                {telemetry?.tx_packets ?? 0}
              </div>
            </div>

            <div className="p-2 rounded bg-[#0C1322] border border-[#1E2D4A]">
              <div className="text-[9px] text-[#64748B]">RX PACKETS</div>
              <div className="font-bold text-[#00FF66] tabular-nums mt-0.5">
                {telemetry?.rx_packets ?? 0}
              </div>
            </div>

            <div className="p-2 rounded bg-[#0C1322] border border-[#1E2D4A]">
              <div className="text-[9px] text-[#64748B]">PACKET LOSS</div>
              <div className="font-bold text-[#94A3B8] tabular-nums mt-0.5">
                {telemetry?.packet_loss?.toFixed(1) ?? "0.0"}%
              </div>
            </div>

            <div className="p-2 rounded bg-[#0C1322] border border-[#1E2D4A]">
              <div className="text-[9px] text-[#64748B]">TIME DILATION</div>
              <div className="font-bold text-[#FFEA00] tabular-nums mt-0.5">
                {telemetry?.time_dilation?.toFixed(3) ?? "1.000"}
              </div>
            </div>
          </div>

          {/* Action Notice */}
          {actionNotice && (
            <div className="p-2 rounded bg-[#00F0FF]/10 border border-[#00F0FF]/40 text-[#00F0FF] text-[11px] flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">&gt; {actionNotice}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              id="udp-ping-btn"
              onClick={handlePing}
              disabled={pinging || !session}
              className="py-2 px-2 rounded bg-[#141E30] hover:bg-[#1E2D4A] border border-[#1E2D4A] text-[10px] font-bold text-[#00F0FF] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
            >
              <Zap className={`w-3.5 h-3.5 ${pinging ? "animate-spin" : ""}`} />
              <span>PROBE PING</span>
            </button>

            <button
              id="udp-send-test-btn"
              onClick={handleSendTestPacket}
              disabled={sendingPacket || !session}
              className="py-2 px-2 rounded bg-[#141E30] hover:bg-[#1E2D4A] border border-[#1E2D4A] text-[10px] font-bold text-[#FFEA00] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
            >
              <Send className={`w-3.5 h-3.5 ${sendingPacket ? "animate-spin" : ""}`} />
              <span>TEST PACKET</span>
            </button>

            <button
              id="udp-reconnect-btn"
              onClick={handleReconnect}
              disabled={reconnecting || !session}
              className="py-2 px-2 rounded bg-[#00F0FF]/15 hover:bg-[#00F0FF]/25 border border-[#00F0FF]/50 text-[10px] font-bold text-[#00F0FF] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${reconnecting ? "animate-spin" : ""}`} />
              <span>REBIND SOCKET</span>
            </button>
          </div>

          {/* Recent Packet Log */}
          <div className="space-y-1.5 pt-2">
            <div className="text-[10px] text-[#64748B] font-bold flex items-center justify-between">
              <span>LIVE PACKET ACTIVITY LOG</span>
              <span>{telemetry?.recent_packets?.length ?? 0} RECORDED</span>
            </div>

            <div className="h-40 overflow-y-auto p-2 rounded bg-[#050810] border border-[#1E2D4A] space-y-1 text-[10px] font-mono scrollbar-thin">
              {telemetry?.recent_packets && telemetry.recent_packets.length > 0 ? (
                telemetry.recent_packets.map((pkt, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 py-0.5 border-b border-[#121C2D] last:border-none"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {pkt.direction === "tx" ? (
                        <span className="text-[#00F0FF] font-bold flex items-center shrink-0">
                          <ArrowUpRight className="w-3 h-3" />
                          <span>TX</span>
                        </span>
                      ) : (
                        <span className="text-[#00FF66] font-bold flex items-center shrink-0">
                          <ArrowDownRight className="w-3 h-3" />
                          <span>RX</span>
                        </span>
                      )}

                      <span className="text-[#E2E8F0] truncate">{pkt.type}</span>
                      <span className="text-[#64748B]">({pkt.size}B)</span>
                    </div>

                    <div className="text-[9px] text-[#475569] shrink-0">
                      {new Date(pkt.ts).toLocaleTimeString()}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-[#475569] text-center py-6">
                  &gt; Awaiting simulator packet activity...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
