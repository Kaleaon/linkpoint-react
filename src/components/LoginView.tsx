import React, { useState } from "react";
import { Hexagon, Power, Loader2, AlertTriangle, ShieldCheck, Globe, Lock, User, MapPin } from "lucide-react";
import { api, saveSession, type Session } from "../api";
import { LatencyIndicator } from "./LatencyIndicator";

type Props = {
  onLoginSuccess: (session: Session) => void;
  onOpenTPVPolicy?: () => void;
};

export const LoginView: React.FC<Props> = ({ onLoginSuccess, onOpenTPVPolicy }) => {
  const [grid, setGrid] = useState<"agni" | "aditi">("agni");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [startLocation, setStartLocation] = useState<"last" | "home" | "custom">("last");
  const [customRegion, setCustomRegion] = useState("");
  const [agreeTos, setAgreeTos] = useState(true);
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);
  const [savedUsername, setSavedUsername] = useState<string | null>(null);

  React.useEffect(() => {
    const saved = localStorage.getItem("saved_username");
    if (saved) {
      setSavedUsername(saved);
      setUsername(saved);
    }
  }, []);


  const connect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUser = username.trim();
    if (!cleanUser) {
      setError("Please enter your Second Life avatar username.");
      return;
    }

    if (!password) {
      setError("Please enter your Second Life account password.");
      return;
    }

    if (!agreeTos) {
      setError("You must review and agree to the Linden Lab Terms of Service to connect to Second Life.");
      return;
    }

    setBusy(true);
    setStatusMsg("AUTHENTICATING WITH LINDEN LAB XML-RPC...");

    try {
      const startParam =
        startLocation === "custom" && customRegion.trim()
          ? `uri:${customRegion.trim()}&128&128&24`
          : startLocation;

      const resp = await api.post<any>("/login", {
        username: cleanUser,
        password,
        grid,
        start: startParam,
        agree_to_tos: true,
      });

      setStatusMsg("CONNECTING TO SIMULATOR SEED CAPABILITY...");

      const s: Session = {
        session_id: resp.session_id,
        mode: "grid",
        grid: resp.grid,
        avatar_name: resp.avatar_name,
        agent_id: resp.agent_id,
        region: resp.region,
        login_message: resp.login_message,
      };


      if (rememberMe) {
        localStorage.setItem("saved_username", username.trim());
      } else {
        localStorage.removeItem("saved_username");
      }

      await saveSession(s);

      onLoginSuccess(s);
    } catch (err: any) {
      const msg = err?.detail || err?.message || String(err);
      setError(msg);
    } finally {
      setBusy(false);
      setStatusMsg("");
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setBusy(true);
    setStatusMsg("INITIALIZING DEMO SANDBOX SESSION...");

    try {
      const resp = await api.post<any>("/login/demo", {});
      const s: Session = {
        session_id: resp.session_id,
        mode: "offline",
        grid: resp.grid,
        avatar_name: resp.avatar_name,
        agent_id: resp.agent_id,
        region: resp.region,
        login_message: resp.login_message,
      };


      if (rememberMe) {
        localStorage.setItem("saved_username", username.trim());
      } else {
        localStorage.removeItem("saved_username");
      }

      await saveSession(s);

      onLoginSuccess(s);
    } catch (err: any) {
      const msg = err?.detail || err?.message || String(err);
      setError(msg);
    } finally {
      setBusy(false);
      setStatusMsg("");
    }
  };

  return (
    <div id="login-screen" className="relative min-h-screen w-full flex items-center justify-center p-4 bg-[#050810] overflow-y-auto">
      {/* Real Connection Latency Indicator HUD in Top-Right Corner */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
        <LatencyIndicator />
      </div>

      {/* Background Atmosphere */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <img
          src="/assets/app-image.png"
          alt="Linkpoint Atmosphere"
          className="w-full h-[460px] object-cover opacity-20 filter blur-[1px]"
          onError={(e) => {
            (e.target as HTMLElement).style.display = "none";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#050810]/40 via-[#050810]/85 to-[#050810]" />
      </div>

      <div className="relative z-10 w-full max-w-md my-8">
        {/* Brand Header */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-3 justify-center mb-1">
            <Hexagon className="w-8 h-8 text-[#00F0FF] animate-pulse" />
            <h1 className="font-display text-4xl font-bold tracking-[0.25em] text-[#00F0FF]">
              LINKPOINT
            </h1>
          </div>
          <p className="font-mono text-xs text-[#64748B] tracking-[0.2em]">
            SECONDLIFE COMMUNICATOR // AUTHENTIC GRID CLIENT
          </p>
          <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-0.5 rounded-full bg-[#00FF66]/10 border border-[#00FF66]/30 text-[10px] font-mono text-[#00FF66]">
            <ShieldCheck className="w-3 h-3" />
            <span>0 SPOOFING // OFFICIAL LINDEN LAB XML-RPC LOGIN</span>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-[#0C1322] border border-[#1E2D4A] rounded-lg p-6 shadow-2xl backdrop-blur-md">
          <form onSubmit={connect} className="space-y-4">
            {/* Grid Server Target */}
            <div>
              <label className="block text-[11px] font-mono tracking-widest text-[#00F0FF] mb-1.5 uppercase flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                <span>Second Life Grid</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  id="grid-agni"
                  type="button"
                  onClick={() => setGrid("agni")}
                  className={`py-2 px-3 border rounded text-xs font-mono transition-all text-center cursor-pointer ${
                    grid === "agni"
                      ? "border-[#00F0FF] bg-[#1A3B5C] text-[#00F0FF] font-bold"
                      : "border-[#1E2D4A] bg-[#141E30] text-[#B0BEC5] hover:border-[#64748B]"
                  }`}
                >
                  Agni (Main Grid)
                </button>
                <button
                  id="grid-aditi"
                  type="button"
                  onClick={() => setGrid("aditi")}
                  className={`py-2 px-3 border rounded text-xs font-mono transition-all text-center cursor-pointer ${
                    grid === "aditi"
                      ? "border-[#00F0FF] bg-[#1A3B5C] text-[#00F0FF] font-bold"
                      : "border-[#1E2D4A] bg-[#141E30] text-[#B0BEC5] hover:border-[#64748B]"
                  }`}
                >
                  Aditi (Beta Grid)
                </button>
              </div>
            </div>

            {/* Avatar Username */}
            <div>
              <label className="block text-[11px] font-mono tracking-widest text-[#00F0FF] mb-1.5 uppercase flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                <span>Avatar Username</span>
              </label>
              <input
                id="input-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. philip.linden or torley"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                className="w-full bg-[#050810] border border-[#1E2D4A] rounded px-3 py-2.5 text-xs font-mono text-[#E2E8F0] placeholder-[#64748B] focus:border-[#00F0FF] focus:outline-none"
                required
              />
              <p className="mt-1 text-[10px] text-[#64748B] font-mono leading-tight">
                Single-word usernames use "Resident" as last name automatically. Legacy accounts can enter "First Last".
              </p>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-mono tracking-widest text-[#00F0FF] mb-1.5 uppercase flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>Second Life Password</span>
              </label>
              <input
                id="input-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#050810] border border-[#1E2D4A] rounded px-3 py-2.5 text-xs font-mono text-[#E2E8F0] placeholder-[#64748B] focus:border-[#00F0FF] focus:outline-none"
                required
              />
              <div className="flex items-center gap-1.5 mt-1 text-[10px] text-[#64748B] font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-[#00FF66]" />
                <span>Encrypted on wire via TLS // Linden MD5 $1$ authentication</span>
              </div>
            </div>

            {/* Start Location */}
            <div>
              <label className="block text-[11px] font-mono tracking-widest text-[#00F0FF] mb-1.5 uppercase flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                <span>Start Location</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5 font-mono text-[11px]">
                <button
                  type="button"
                  onClick={() => setStartLocation("last")}
                  className={`py-1.5 px-2 border rounded transition-all text-center cursor-pointer ${
                    startLocation === "last"
                      ? "border-[#00F0FF] bg-[#1A3B5C] text-[#00F0FF] font-bold"
                      : "border-[#1E2D4A] bg-[#141E30] text-[#94A3B8]"
                  }`}
                >
                  Last Location
                </button>
                <button
                  type="button"
                  onClick={() => setStartLocation("home")}
                  className={`py-1.5 px-2 border rounded transition-all text-center cursor-pointer ${
                    startLocation === "home"
                      ? "border-[#00F0FF] bg-[#1A3B5C] text-[#00F0FF] font-bold"
                      : "border-[#1E2D4A] bg-[#141E30] text-[#94A3B8]"
                  }`}
                >
                  Home
                </button>
                <button
                  type="button"
                  onClick={() => setStartLocation("custom")}
                  className={`py-1.5 px-2 border rounded transition-all text-center cursor-pointer ${
                    startLocation === "custom"
                      ? "border-[#00F0FF] bg-[#1A3B5C] text-[#00F0FF] font-bold"
                      : "border-[#1E2D4A] bg-[#141E30] text-[#94A3B8]"
                  }`}
                >
                  Custom Region
                </button>
              </div>
              {startLocation === "custom" && (
                <input
                  id="input-custom-region"
                  type="text"
                  value={customRegion}
                  onChange={(e) => setCustomRegion(e.target.value)}
                  placeholder="Region name (e.g. Arapaima)"
                  className="mt-2 w-full bg-[#050810] border border-[#1E2D4A] rounded px-3 py-1.5 text-xs font-mono text-[#E2E8F0] placeholder-[#64748B] focus:border-[#00F0FF] focus:outline-none"
                />
              )}
            </div>

                        {/* Remember Me */}
            <div className="pt-1 flex items-start gap-2">
              <input
                id="remember-me-checkbox"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="mt-0.5 rounded border-[#1E2D4A] bg-[#050810] text-[#00F0FF] focus:ring-0 focus:outline-none cursor-pointer"
              />
              <label htmlFor="remember-me-checkbox" className="text-[10px] text-[#94A3B8] font-mono leading-tight cursor-pointer">
                Remember username for easy reconnect
              </label>
            </div>

            {/* Linden Lab TOS Agreement */}
            <div className="pt-1 flex items-start gap-2">
              <input
                id="agree-tos-checkbox"
                type="checkbox"
                checked={agreeTos}
                onChange={(e) => setAgreeTos(e.target.checked)}
                className="mt-0.5 rounded border-[#1E2D4A] bg-[#050810] text-[#00F0FF] focus:ring-0 focus:outline-none cursor-pointer"
              />
              <label htmlFor="agree-tos-checkbox" className="text-[10px] text-[#94A3B8] font-mono leading-tight cursor-pointer">
                I agree to the <span className="text-[#00F0FF]">Second Life Terms of Service (TOS)</span> and authenticate directly with Linden Lab.
              </label>
            </div>

            {/* Error Message with Linden Lab details */}
            {error && (
              <div
                id="login-error"
                className="p-3 rounded bg-[#FF1744]/10 border border-[#FF1744] text-[#FF1744] font-mono text-xs flex items-start gap-2.5 whitespace-pre-line"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold tracking-wider mb-0.5">AUTHENTICATION ERROR</div>
                  <div className="text-[11px] text-[#FFA8A8]">{error}</div>
                </div>
              </div>
            )}

                        {/* Quick Reconnect Button */}
            {savedUsername && (
              <button
                id="quick-reconnect-button"
                type="button"
                onClick={() => {
                   setUsername(savedUsername);
                   document.getElementById("input-password")?.focus();
                }}
                disabled={busy}
                className="w-full mt-2 py-2 px-4 rounded bg-[#00FF66]/20 border border-[#00FF66]/40 hover:bg-[#00FF66]/30 text-[#00FF66] font-mono text-xs font-bold tracking-[0.1em] flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-[0_0_10px_rgba(0,255,102,0.1)]"
              >
                <Power className="w-4 h-4" />
                <span>RECONNECT AS {savedUsername.toUpperCase()}</span>
              </button>
            )}

            {/* Submit Button */}
            <button
              id="connect-button"
              type="submit"
              disabled={busy}
              className="w-full mt-2 py-3 px-4 rounded bg-[#00F0FF] hover:bg-[#00F0FF]/90 text-[#050810] font-mono text-xs font-bold tracking-[0.2em] flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-[0_0_15px_rgba(0,240,255,0.3)]"
            >
              {busy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{statusMsg || "CONNECTING TO GRID..."}</span>
                </>
              ) : (
                <>
                  <Power className="w-4 h-4" />
                  <span>CONNECT TO SECOND LIFE</span>
                </>
              )}
            </button>

            {/* Offline Sandbox / Demo Button */}
            <button
              id="demo-sandbox-button"
              type="button"
              onClick={handleDemoLogin}
              disabled={busy}
              className="w-full mt-2 py-2 px-3 rounded bg-[#141E30] hover:bg-[#1E2D4A] border border-[#1E2D4A] hover:border-[#00F0FF]/50 text-[#94A3B8] hover:text-[#00F0FF] font-mono text-[11px] font-bold tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-[#00F0FF]" />
              <span>EXPLORE OFFLINE SIMULATOR / DEMO</span>
            </button>
          </form>

          {/* TPV Standards Disclosure Trigger */}
          {onOpenTPVPolicy && (
            <div className="mt-4 pt-3 border-t border-[#1E2D4A] flex justify-center">
              <button
                type="button"
                id="tpv-standards-link"
                onClick={onOpenTPVPolicy}
                className="text-[10px] font-mono text-[#00FF66] hover:text-[#00F0FF] flex items-center gap-1.5 transition-colors cursor-pointer py-1"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Linden Lab Third-Party Viewer Policy &amp; Compliance</span>
              </button>
            </div>
          )}
        </div>

        {/* Mandatory Linden Lab Trademark and Disclaimer */}
        <div className="mt-4 px-2 text-center text-[10px] font-mono text-[#64748B] space-y-1">
          <p className="text-[#94A3B8]">
            This software is not provided or endorsed by Linden Lab, the makers of Second Life.
          </p>
          <p>
            Second Life and Linden Lab are trademarks or registered trademarks of Linden Research, Inc. in the U.S. and other countries.
          </p>
        </div>
      </div>
    </div>
  );
};
