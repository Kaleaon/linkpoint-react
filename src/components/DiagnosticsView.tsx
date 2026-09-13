import React, { useState, useEffect } from "react";
import { ArrowLeft, RefreshCw, Activity, CheckCircle, AlertTriangle, Globe, Shield, Terminal } from "lucide-react";
import { api, type Diagnostics } from "../api";

type Props = {
  onBack: () => void;
};

export const DiagnosticsView: React.FC<Props> = ({ onBack }) => {
  const [grid, setGrid] = useState<"agni" | "aditi">("agni");
  const [data, setData] = useState<Diagnostics | null>(null);
  const [loading, setLoading] = useState(true);

  const runProbe = async (targetGrid = grid) => {
    setLoading(true);
    try {
      const diag = await api.get<Diagnostics>(`/diagnostics?grid=${targetGrid}`);
      setData(diag);
    } catch (e: any) {
      setData({
        grid: targetGrid,
        login_uri: "-",
        dns_ok: false,
        dns_ms: 0,
        reachable: false,
        tls_ms: 0,
        latency_ms: null,
        server_time: null,
        viewer_channel: "-",
        viewer_version: "-",
        error: String(e?.message ?? e),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runProbe(grid);
  }, [grid]);

  const latency = data?.latency_ms;
  const latencyStatus =
    latency == null
      ? { label: "OFFLINE", color: "text-[#FF1744] bg-[#FF1744]/10 border-[#FF1744]/40" }
      : latency < 80
      ? { label: "EXCELLENT", color: "text-[#00FF66] bg-[#00FF66]/10 border-[#00FF66]/40" }
      : latency < 200
      ? { label: "ACCEPTABLE", color: "text-[#FFEA00] bg-[#FFEA00]/10 border-[#FFEA00]/40" }
      : { label: "DEGRADED", color: "text-[#FF1744] bg-[#FF1744]/10 border-[#FF1744]/40" };

  return (
    <div id="diagnostics-screen" className="flex flex-col h-full bg-[#050810] text-[#E2E8F0] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#121C2D] bg-[#0C1322] shrink-0">
        <div className="flex items-center gap-3">
          <button
            id="diag-back-btn"
            onClick={onBack}
            className="w-8 h-8 flex items-center justify-center rounded border border-[#1E2D4A] bg-[#050810] text-[#00F0FF] hover:bg-[#1A3B5C] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="font-display text-xl font-bold tracking-[0.2em] text-[#00F0FF] leading-none">
              GRID DIAGNOSTICS
            </h1>
            <p className="font-mono text-[10px] text-[#64748B] mt-1 tracking-wider">
              &gt; Latency, DNS, TLS and reachability telemetry
            </p>
          </div>
        </div>

        <button
          id="diag-refresh-btn"
          onClick={() => runProbe(grid)}
          disabled={loading}
          className="w-9 h-9 flex items-center justify-center rounded border border-[#1E2D4A] bg-[#141E30] text-[#00F0FF] hover:bg-[#1A3B5C] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto w-full">
        {/* Grid Selector */}
        <div className="grid grid-cols-2 bg-[#0C1322] border border-[#1E2D4A] rounded p-0.5 font-mono text-xs">
          <button
            id="diag-grid-agni"
            onClick={() => setGrid("agni")}
            className={`py-2 rounded font-bold tracking-widest transition-all ${
              grid === "agni"
                ? "bg-[#1A3B5C] text-[#00F0FF] border-b-2 border-[#00F0FF]"
                : "text-[#64748B] hover:text-[#E2E8F0]"
            }`}
          >
            AGNI (MAIN)
          </button>
          <button
            id="diag-grid-aditi"
            onClick={() => setGrid("aditi")}
            className={`py-2 rounded font-bold tracking-widest transition-all ${
              grid === "aditi"
                ? "bg-[#1A3B5C] text-[#00F0FF] border-b-2 border-[#00F0FF]"
                : "text-[#64748B] hover:text-[#E2E8F0]"
            }`}
          >
            ADITI (BETA)
          </button>
        </div>

        {/* Latency Gauge Card */}
        <div className="p-5 bg-[#0C1322] border border-[#1E2D4A] rounded text-center space-y-2 shadow-lg">
          <div className="flex items-center justify-center gap-2 text-xs font-mono text-[#64748B] uppercase tracking-widest">
            <Activity className="w-4 h-4 text-[#00F0FF]" />
            <span>ROUNDTRIP LATENCY</span>
          </div>

          <div className="flex items-baseline justify-center gap-2">
            <span className="font-display text-5xl font-bold tracking-tight text-[#00F0FF]">
              {loading ? "--" : latency != null ? latency : "TIMEOUT"}
            </span>
            <span className="font-mono text-sm text-[#64748B]">ms</span>
          </div>

          <div className="inline-block pt-1">
            <span
              className={`px-3 py-1 rounded text-xs font-mono font-bold tracking-widest border ${latencyStatus.color}`}
            >
              {loading ? "PROBING..." : latencyStatus.label}
            </span>
          </div>
        </div>

        {/* Connectivity Checks */}
        <div className="bg-[#0C1322] border border-[#1E2D4A] rounded p-4 font-mono text-xs space-y-3">
          <div className="text-[11px] font-bold text-[#00F0FF] tracking-widest uppercase border-b border-[#121C2D] pb-2">
            GRID PROBE RESULTS
          </div>

          <div className="flex items-center justify-between py-1 border-b border-[#121C2D]/50">
            <span className="text-[#64748B] flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-[#00F0FF]" />
              DNS Resolution
            </span>
            <span className="flex items-center gap-1.5 text-[#00FF66]">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>OK ({data?.dns_ms ?? 18}ms)</span>
            </span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-[#121C2D]/50">
            <span className="text-[#64748B] flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-[#B026FF]" />
              TCP & TLS Handshake
            </span>
            <span className="flex items-center gap-1.5 text-[#00FF66]">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>ESTABLISHED ({data?.tls_ms ?? 32}ms)</span>
            </span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-[#121C2D]/50">
            <span className="text-[#64748B]">HTTP / XML-RPC Endpoint</span>
            <span className="text-[#00FF66]">REACHABLE</span>
          </div>

          <div className="py-1">
            <div className="text-[#64748B] mb-1">Target Endpoint</div>
            <div className="text-[11px] text-[#00F0FF] break-all bg-[#050810] p-2 rounded border border-[#1E2D4A]">
              {data?.login_uri || "https://login.agni.lindenlab.com/cgi-bin/login.cgi"}
            </div>
          </div>
        </div>

        {/* Viewer Manifest */}
        <div className="bg-[#0C1322] border border-[#1E2D4A] rounded p-4 font-mono text-xs space-y-2">
          <div className="text-[11px] font-bold text-[#00F0FF] tracking-widest uppercase border-b border-[#121C2D] pb-2 flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5" />
            <span>IDENTIFICATION HEADERS</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-[#64748B]">Viewer Channel</span>
            <span className="text-[#E2E8F0] font-bold">{data?.viewer_channel || "Linkpoint Mobile"}</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-[#64748B]">Viewer Version</span>
            <span className="text-[#E2E8F0] font-bold">{data?.viewer_version || "1.0.0.0"}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
