import React, { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Radar as RadarIcon, RefreshCw, MessageSquare, Compass, UserCheck } from "lucide-react";
import { api, type RadarAvatar, type RadarResponse, type Session } from "../api";

type Props = {
  session: Session;
  onBack: () => void;
  onOpenIm: (id: string, name: string) => void;
};

const NEAR_M = 20; // Second Life local chat range
const SHOUT_M = 100;

function bearing(from: number[] | null, a: RadarAvatar): string {
  if (!from) return "--";
  const dx = a.x - from[0];
  const dy = a.y - from[1];
  if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return "here";
  const deg = (Math.atan2(dx, dy) * 180) / Math.PI; // 0 = north (+y)
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(((deg + 360) % 360) / 45) % 8];
}

export const RadarView: React.FC<Props> = ({ session, onBack, onOpenIm }) => {
  const [radar, setRadar] = useState<RadarResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRadar = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await api.get<RadarResponse>(`/radar?session_id=${session.session_id}`);
      setRadar(data);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Radar unavailable");
    } finally {
      setLoading(false);
    }
  }, [session.session_id]);

  useEffect(() => {
    loadRadar(false);
    const timer = setInterval(() => loadRadar(true), 5000);
    return () => clearInterval(timer);
  }, [loadRadar]);

  const avatars = radar?.avatars ?? [];
  const inChat = avatars.filter((a) => a.distance != null && a.distance <= NEAR_M).length;

  return (
    <div id="radar-screen" className="flex flex-col h-full bg-[#050810] text-[#E2E8F0] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#121C2D] bg-[#0C1322] shrink-0">
        <div className="flex items-center gap-3">
          <button
            id="radar-back-btn"
            onClick={onBack}
            className="w-8 h-8 flex items-center justify-center rounded border border-[#1E2D4A] bg-[#050810] text-[#00F0FF] hover:bg-[#1A3B5C] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="font-display text-xl font-bold tracking-[0.2em] text-[#00F0FF] leading-none">
              RADAR // SCANNER
            </h1>
            <p className="font-mono text-[10px] text-[#64748B] mt-1 tracking-wider">
              {radar?.region_name || session.region || "Second Life Sim"} · {avatars.length} AVATARS ({inChat} IN CHAT RANGE)
            </p>
          </div>
        </div>

        <button
          id="radar-refresh-btn"
          onClick={() => loadRadar(false)}
          disabled={loading}
          className="w-9 h-9 flex items-center justify-center rounded border border-[#1E2D4A] bg-[#141E30] text-[#00F0FF] hover:bg-[#1A3B5C] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Sweep Scanner Banner */}
      <div className="px-4 py-2.5 bg-[#0C1322]/80 border-b border-[#1E2D4A] flex items-center justify-between font-mono text-xs">
        <div className="flex items-center gap-2 text-[#00F0FF]">
          <RadarIcon className="w-4 h-4 animate-spin text-[#00F0FF]" style={{ animationDuration: "4s" }} />
          <span className="text-[11px] font-bold tracking-widest">ACTIVE PROXIMITY SWEEP</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-[#64748B]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#00FF66]" />
            &lt; 20m (Chat)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#FFEA00]" />
            &lt; 100m (Shout)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#00F0FF]" />
            &gt; 100m
          </span>
        </div>
      </div>

      {/* Avatars List */}
      <div id="radar-list" className="flex-1 overflow-y-auto divide-y divide-[#121C2D]">
        {error ? (
          <div className="p-8 text-center text-[#FF1744] font-mono text-xs">
            &gt; {error}
          </div>
        ) : avatars.length === 0 ? (
          <div className="p-10 text-center text-[#64748B] font-mono text-xs">
            {loading ? "> Sweeping region coords..." : "> No avatars detected in sim sector"}
          </div>
        ) : (
          avatars.map((item) => {
            const dist = item.distance != null ? Math.round(item.distance) : null;
            const distColor =
              dist != null && dist <= NEAR_M
                ? "text-[#00FF66] border-[#00FF66]/40 bg-[#00FF66]/10"
                : dist != null && dist <= SHOUT_M
                ? "text-[#FFEA00] border-[#FFEA00]/40 bg-[#FFEA00]/10"
                : "text-[#00F0FF] border-[#00F0FF]/40 bg-[#00F0FF]/10";

            const bDir = bearing(radar?.my_position ?? null, item);

            return (
              <div
                key={item.id}
                id={`radar-avatar-${item.id}`}
                onClick={() => onOpenIm(item.id, item.name)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-[#0C1322] transition-colors cursor-pointer group"
              >
                {/* Distance Badge */}
                <div
                  className={`w-14 py-1 text-center font-mono text-xs font-bold rounded border ${distColor} shrink-0`}
                >
                  {dist != null ? `${dist}m` : "--"}
                </div>

                {/* Bearing */}
                <div className="flex items-center gap-1 text-[#64748B] font-mono text-xs w-9 shrink-0">
                  <Compass className="w-3.5 h-3.5" />
                  <span>{bDir}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#E2E8F0] group-hover:text-[#00F0FF] transition-colors truncate">
                      {item.name}
                    </span>
                    {item.is_friend && (
                      <span className="px-1.5 py-0.2 bg-[#B026FF]/20 text-[#B026FF] border border-[#B026FF]/40 rounded text-[9px] font-mono font-bold flex items-center gap-1">
                        <UserCheck className="w-2.5 h-2.5" />
                        <span>FRIEND</span>
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-[10px] text-[#64748B] tracking-wider mt-0.5">
                    &lt;{item.x.toFixed(1)}, {item.y.toFixed(1)}, {item.z.toFixed(1)}&gt;
                  </div>
                </div>

                {/* Start IM icon button */}
                <button
                  type="button"
                  className="w-8 h-8 rounded border border-[#1E2D4A] bg-[#050810] text-[#00F0FF] flex items-center justify-center group-hover:border-[#00F0FF] transition-colors shrink-0"
                  title={`Start IM with ${item.name}`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
