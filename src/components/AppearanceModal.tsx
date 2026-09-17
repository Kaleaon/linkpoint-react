import React, { useState, useEffect } from "react";
import { User, Sparkles, X, Check, Shirt, Shield, Scissors, Palette } from "lucide-react";
import { api, type AppearanceData, type WornItem, type OutfitPreset, type Session } from "../api";

interface Props {
  session: Session;
  onClose: () => void;
  onAppearanceUpdated?: (items: WornItem[]) => void;
}

export const AppearanceModal: React.FC<Props> = ({ session, onClose, onAppearanceUpdated }) => {
  const [data, setData] = useState<AppearanceData | null>(null);
  const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"worn" | "presets" | "skins">("worn");
  const [savingPreset, setSavingPreset] = useState<string | null>(null);
  const [previewTheme, setPreviewTheme] = useState<{name: string, bg: string, text: string, border: string, msgBg: string, msgText: string}>({
    name: "Cyber Blue", bg: "#0C1322", text: "#00F0FF", border: "#1E2D4A", msgBg: "#050810", msgText: "#E2E8F0"
  });

  const skinThemes = [
    { name: "Cyber Blue", bg: "#0C1322", text: "#00F0FF", border: "#1E2D4A", msgBg: "#050810", msgText: "#E2E8F0" },
    { name: "Matrix Green", bg: "#051105", text: "#00FF66", border: "#003311", msgBg: "#020802", msgText: "#A3D4A3" },
    { name: "Neon Pink", bg: "#1A051A", text: "#FF00FF", border: "#4D004D", msgBg: "#0D020D", msgText: "#FFB3FF" },
    { name: "Solar Orange", bg: "#1A0D00", text: "#FFAA00", border: "#4D2600", msgBg: "#0D0600", msgText: "#FFD480" }
  ];

  const fetchAppearance = async () => {
    try {
      setLoading(true);
      const res = await api.get<AppearanceData>(`/appearance?session_id=${session.session_id}`);
      setData(res);
      if (onAppearanceUpdated) {
        onAppearanceUpdated(res.worn_items);
      }
    } catch (e) {
      console.warn("Appearance fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppearance();
  }, [session.session_id]);

  const handleApplyPreset = async (preset: OutfitPreset) => {
    try {
      setSavingPreset(preset.id);
      const res = await api.post<{ ok: boolean; worn_items: WornItem[] }>("/appearance/preset", {
        session_id: session.session_id,
        preset_id: preset.id,
      });
      if (res.ok && data) {
        setData({
          ...data,
          outfit_name: preset.name,
          worn_items: res.worn_items,
        });
        if (onAppearanceUpdated) {
          onAppearanceUpdated(res.worn_items);
        }
      }
    } catch (e) {
      console.warn("Failed to apply preset:", e);
    } finally {
      setSavingPreset(null);
    }
  };

  const handleDetach = async (itemId: string) => {
    try {
      const res = await api.post<{ ok: boolean; worn_items: WornItem[] }>("/appearance/detach", {
        session_id: session.session_id,
        item_id: itemId,
      });
      if (res.ok && data) {
        setData({
          ...data,
          worn_items: res.worn_items,
        });
        if (onAppearanceUpdated) {
          onAppearanceUpdated(res.worn_items);
        }
      }
    } catch (e) {
      console.warn("Failed to detach item:", e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md rounded-xl border border-[#00F0FF]/40 bg-[#0A101D] shadow-2xl overflow-hidden font-mono flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#050810] px-4 py-3 border-b border-[#1E2D4A] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#B026FF]/20 flex items-center justify-center text-[#B026FF]">
              <Shirt className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#E2E8F0] tracking-wide">
                Appearance & Outfits
              </h2>
              <span className="text-[10px] text-[#64748B]">
                Avatar Wearables & Mesh Attachments
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#94A3B8] hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-[#1E2D4A] bg-[#0A101D]">
          <button
            onClick={() => setActiveTab("worn")}
            className={`flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === "worn"
                ? "border-[#00F0FF] text-[#00F0FF] bg-[#141E30]/40"
                : "border-transparent text-[#64748B] hover:text-[#94A3B8]"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Currently Worn ({data?.worn_items?.length || 0})</span>
          </button>
                    <button
            onClick={() => setActiveTab("presets")}
            className={`flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === "presets"
                ? "border-[#B026FF] text-[#B026FF] bg-[#141E30]/40"
                : "border-transparent text-[#64748B] hover:text-[#94A3B8]"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Outfit Presets ({data?.presets?.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab("skins")}
            className={`flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === "skins"
                ? "border-[#00FF66] text-[#00FF66] bg-[#141E30]/40"
                : "border-transparent text-[#64748B] hover:text-[#94A3B8]"
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Skins Preview</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2">
          {loading ? (
            <div className="text-center py-8 text-xs text-[#64748B]">
              Loading avatar appearance data...
            </div>
          ) : activeTab === "worn" ? (
            <div className="space-y-1.5">
              {data?.worn_items.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-lg bg-[#050810] border border-[#1E2D4A] flex items-center justify-between text-xs hover:border-[#00F0FF]/30 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      className="w-3 h-3 rounded-full shrink-0 border border-white/20"
                      style={{ backgroundColor: item.color || "#00F0FF" }}
                    />
                    <div className="min-w-0">
                      <div className="text-[#E2E8F0] font-medium truncate">
                        {item.name}
                      </div>
                      <div className="text-[10px] text-[#64748B]">
                        Slot: <span className="text-[#00F0FF]">{item.slot}</span> • Type: {item.type}
                      </div>
                    </div>
                  </div>

                  {item.type !== "bodypart" ? (
                    <button
                      onClick={() => handleDetach(item.id)}
                      className="text-[10px] text-[#FF1744] hover:bg-[#FF1744]/10 border border-[#FF1744]/30 px-2 py-1 rounded transition-colors"
                    >
                      Detach
                    </button>
                  ) : (
                    <span className="text-[9px] text-[#64748B] uppercase px-1.5 py-0.5 rounded bg-white/5">
                      Base Part
                    </span>
                  )}
                </div>
              ))}
            </div>
                    ) : activeTab === "skins" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {skinThemes.map((theme) => (
                  <button
                    key={theme.name}
                    onClick={() => setPreviewTheme(theme)}
                    style={{ borderColor: theme.border, backgroundColor: theme.bg }}
                    className={`p-2 rounded-lg border-2 flex items-center gap-2 transition-all ${
                      previewTheme.name === theme.name ? "ring-2 ring-white/20" : "opacity-70 hover:opacity-100"
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: theme.text }} />
                    <span style={{ color: theme.text }} className="text-xs font-bold">{theme.name}</span>
                  </button>
                ))}
              </div>

              <div className="mt-4 p-3 rounded-lg border" style={{ backgroundColor: previewTheme.bg, borderColor: previewTheme.border }}>
                <div className="text-xs font-bold mb-2 pb-1 border-b" style={{ color: previewTheme.text, borderColor: previewTheme.border }}>
                  MOCK CHAT PREVIEW
                </div>
                <div className="space-y-2 font-mono text-[11px]">
                  <div className="p-2 rounded" style={{ backgroundColor: previewTheme.msgBg }}>
                    <span className="opacity-50 mr-2" style={{ color: previewTheme.msgText }}>[10:42]</span>
                    <span className="font-bold mr-1" style={{ color: previewTheme.text }}>Philip Linden:</span>
                    <span style={{ color: previewTheme.msgText }}>Welcome to Linkpoint!</span>
                  </div>
                  <div className="p-2 rounded" style={{ backgroundColor: previewTheme.msgBg }}>
                    <span className="opacity-50 mr-2" style={{ color: previewTheme.msgText }}>[10:43]</span>
                    <span className="font-bold mr-1" style={{ color: previewTheme.text }}>Torley Linden:</span>
                    <span style={{ color: previewTheme.msgText }}>Loving this new skin theme.</span>
                  </div>
                  <div className="p-2 rounded border border-dashed" style={{ backgroundColor: previewTheme.bg, borderColor: previewTheme.border }}>
                    <span className="opacity-50" style={{ color: previewTheme.text }}>&gt; Type message here...</span>
                  </div>
                </div>
              </div>

              <button
                className="w-full py-2 rounded-lg text-xs font-bold transition-opacity hover:opacity-90 cursor-pointer"
                style={{ backgroundColor: previewTheme.text, color: previewTheme.msgBg }}
              >
                Apply {previewTheme.name} Theme (Demo)
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {data?.presets.map((preset) => {
                const isActive = data.outfit_name === preset.name;
                return (
                  <div
                    key={preset.id}
                    className={`p-3 rounded-xl border transition-all ${
                      isActive
                        ? "bg-[#141E30] border-[#00F0FF] shadow-lg shadow-[#00F0FF]/10"
                        : "bg-[#050810] border-[#1E2D4A] hover:border-[#B026FF]/40"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Sparkles
                          className={`w-4 h-4 ${
                            isActive ? "text-[#00F0FF]" : "text-[#B026FF]"
                          }`}
                        />
                        <span className="text-xs font-bold text-[#E2E8F0]">
                          {preset.name}
                        </span>
                      </div>
                      {isActive && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00FF66]/20 text-[#00FF66] font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3" /> Active
                        </span>
                      )}
                    </div>

                    <div className="text-[10px] text-[#94A3B8] mb-3">
                      Includes: {preset.items.map((it) => it.name).slice(0, 3).join(", ")}
                      {preset.items.length > 3 ? ` and ${preset.items.length - 3} more` : ""}
                    </div>

                    {!isActive && (
                      <button
                        onClick={() => handleApplyPreset(preset)}
                        disabled={savingPreset === preset.id}
                        className="w-full py-1.5 rounded-lg bg-[#B026FF]/20 hover:bg-[#B026FF] text-[#B026FF] hover:text-white border border-[#B026FF]/40 text-xs font-bold transition-all disabled:opacity-50"
                      >
                        {savingPreset === preset.id ? "Wearing..." : "Wear Outfit"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
