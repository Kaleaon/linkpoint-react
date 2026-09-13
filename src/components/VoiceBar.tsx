import React from "react";
import { Mic, MicOff, Volume2, Radio, PhoneOff, ChevronUp } from "lucide-react";
import { useVoice } from "../voice/VoiceContext";

type Props = {
  onOpenVoiceModal: () => void;
};

export const VoiceBar: React.FC<Props> = ({ onOpenVoiceModal }) => {
  const {
    isConnected,
    isConnecting,
    channelName,
    channelType,
    isMuted,
    micMode,
    isPttActive,
    myVolumeLevel,
    speakers,
    toggleMute,
    setPttActive,
    disconnectVoice,
  } = useVoice();

  if (!isConnected && !isConnecting) {
    return null;
  }

  const activeSpeaker = speakers.find((s) => s.isSpeaking && !s.muted);
  const isSelfSpeaking = myVolumeLevel > 15;

  return (
    <div
      id="voice-active-bar"
      className="bg-[#0C1322] border-t border-[#1E2D4A] px-3 py-2 flex items-center justify-between font-mono text-xs z-30 shrink-0 shadow-[0_-4px_12px_rgba(0,0,0,0.4)]"
    >
      {/* Left: Channel and Speaker Indicator */}
      <div
        onClick={onOpenVoiceModal}
        className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer group"
      >
        {/* Pulsing Voice Dot */}
        <div className="relative flex items-center justify-center shrink-0">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isConnecting
                ? "bg-[#FFEA00] animate-pulse"
                : isSelfSpeaking || activeSpeaker
                ? "bg-[#00FF66] shadow-[0_0_8px_#00FF66]"
                : "bg-[#00F0FF]"
            }`}
          />
          {(isSelfSpeaking || activeSpeaker) && (
            <span className="absolute w-5 h-5 rounded-full border border-[#00FF66] animate-ping opacity-75" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#E2E8F0] group-hover:text-[#00F0FF] transition-colors truncate">
            <Radio className="w-3.5 h-3.5 text-[#00F0FF] shrink-0" />
            <span className="truncate">{channelName}</span>
            <ChevronUp className="w-3 h-3 text-[#64748B] shrink-0 group-hover:text-[#00F0FF]" />
          </div>

          <div className="text-[10px] text-[#64748B] truncate mt-0.5 flex items-center gap-1">
            {isConnecting ? (
              <span className="text-[#FFEA00]">Negotiating voice circuit...</span>
            ) : isSelfSpeaking ? (
              <span className="text-[#00FF66] font-bold">TRANSMITTING VOICE</span>
            ) : activeSpeaker ? (
              <span className="text-[#00FF66]">{activeSpeaker.name} speaking...</span>
            ) : (
              <span>
                {channelType === "spatial" ? "Spatial 20m" : "Channel"} · {speakers.length + 1} online
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Quick Controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* PTT Button if in PTT Mode */}
        {micMode === "ptt" && (
          <button
            id="voice-ptt-button"
            onMouseDown={() => setPttActive(true)}
            onMouseUp={() => setPttActive(false)}
            onTouchStart={() => setPttActive(true)}
            onTouchEnd={() => setPttActive(false)}
            className={`px-3 py-1.5 rounded font-mono text-[10px] font-bold tracking-wider select-none transition-all ${
              isPttActive
                ? "bg-[#00FF66] text-[#050810] shadow-[0_0_10px_#00FF66]"
                : "bg-[#1E2D4A] text-[#E2E8F0] hover:bg-[#2A3F66]"
            }`}
          >
            {isPttActive ? "LIVE" : "PTT"}
          </button>
        )}

        {/* Mic Mute Toggle */}
        <button
          id="voice-mute-toggle"
          onClick={toggleMute}
          className={`w-8 h-8 rounded border flex items-center justify-center transition-all cursor-pointer ${
            isMuted
              ? "border-[#FF1744]/50 bg-[#FF1744]/20 text-[#FF1744]"
              : isSelfSpeaking
              ? "border-[#00FF66] bg-[#00FF66]/20 text-[#00FF66] shadow-[0_0_8px_rgba(0,255,102,0.3)]"
              : "border-[#1E2D4A] bg-[#050810] text-[#00F0FF] hover:bg-[#1A3B5C]"
          }`}
          title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
        >
          {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        {/* Disconnect Voice */}
        <button
          id="voice-disconnect-btn"
          onClick={disconnectVoice}
          className="w-8 h-8 rounded border border-[#FF1744]/40 bg-[#050810] text-[#FF1744] hover:bg-[#FF1744]/20 flex items-center justify-center transition-colors cursor-pointer"
          title="Disconnect Voice"
        >
          <PhoneOff className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
