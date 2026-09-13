import React from "react";
import {
  X,
  Radio,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Shield,
  PhoneOff,
  Signal,
  Users,
  Compass,
} from "lucide-react";
import { useVoice, type VoiceChannelType } from "../voice/VoiceContext";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  avatarName: string;
};

export const VoiceModal: React.FC<Props> = ({ isOpen, onClose, avatarName }) => {
  const {
    isConnected,
    isConnecting,
    channelType,
    channelName,
    isMuted,
    micMode,
    isPttActive,
    myVolumeLevel,
    micPermission,
    speakers,
    spatialRange,
    connectVoice,
    disconnectVoice,
    toggleMute,
    setMicMode,
    setPttActive,
    setSpeakerVolume,
    toggleMuteSpeaker,
    setSpatialRange,
  } = useVoice();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150">
      <div
        id="voice-modal-sheet"
        className="w-full max-w-md bg-[#0C1322] border-t sm:border border-[#1E2D4A] rounded-t-xl sm:rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E2D4A] bg-[#050810] shrink-0">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#00F0FF]" />
            <h2 className="font-display text-base font-bold tracking-[0.2em] text-[#00F0FF]">
              VOICE COMMUNICATOR
            </h2>
          </div>
          <button
            id="voice-modal-close"
            onClick={onClose}
            className="w-8 h-8 rounded border border-[#1E2D4A] bg-[#0C1322] text-[#64748B] hover:text-[#E2E8F0] flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4 overflow-y-auto font-mono text-xs text-[#E2E8F0]">
          {/* Connection Status Banner */}
          <div className="bg-[#050810] border border-[#1E2D4A] rounded p-3 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isConnected
                      ? "bg-[#00FF66] shadow-[0_0_8px_#00FF66]"
                      : isConnecting
                      ? "bg-[#FFEA00] animate-pulse"
                      : "bg-[#64748B]"
                  }`}
                />
                <span className="font-bold text-[11px] tracking-wider text-[#00F0FF]">
                  {isConnected
                    ? "CIRCUIT CONNECTED"
                    : isConnecting
                    ? "CONNECTING VIVOX PROTOCOL..."
                    : "VOICE OFFLINE"}
                </span>
              </div>
              <div className="text-[10px] text-[#64748B] mt-0.5">{channelName}</div>
            </div>

            {isConnected ? (
              <button
                id="modal-disconnect-voice-btn"
                onClick={disconnectVoice}
                className="px-3 py-1.5 rounded border border-[#FF1744]/40 bg-[#FF1744]/10 text-[#FF1744] hover:bg-[#FF1744]/20 font-bold tracking-wider text-[10px] flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <PhoneOff className="w-3.5 h-3.5" />
                <span>DISCONNECT</span>
              </button>
            ) : (
              <button
                id="modal-connect-voice-btn"
                onClick={() => connectVoice(channelType, channelName)}
                disabled={isConnecting}
                className="px-3 py-1.5 rounded bg-[#00F0FF] hover:bg-[#00F0FF]/90 text-[#050810] font-bold tracking-wider text-[10px] flex items-center gap-1.5 cursor-pointer transition-colors shadow-[0_0_8px_rgba(0,240,255,0.3)] disabled:opacity-50"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>CONNECT</span>
              </button>
            )}
          </div>

          {/* Voice Channel Type Switcher */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-[#64748B] uppercase tracking-widest font-bold">
              VOICE CHANNEL
            </label>
            <div className="grid grid-cols-3 gap-1.5 bg-[#050810] p-1 border border-[#1E2D4A] rounded text-[11px]">
              <button
                onClick={() => connectVoice("spatial", "Sandbox Spatial (20m)")}
                className={`py-1.5 px-2 rounded font-bold transition-colors truncate ${
                  channelType === "spatial"
                    ? "bg-[#1A3B5C] text-[#00F0FF] border border-[#00F0FF]/50"
                    : "text-[#64748B] hover:text-[#E2E8F0]"
                }`}
              >
                SPATIAL SIM
              </button>
              <button
                onClick={() => connectVoice("group", "Linkpoint Group Voice")}
                className={`py-1.5 px-2 rounded font-bold transition-colors truncate ${
                  channelType === "group"
                    ? "bg-[#1A3B5C] text-[#00F0FF] border border-[#00F0FF]/50"
                    : "text-[#64748B] hover:text-[#E2E8F0]"
                }`}
              >
                GROUP CALL
              </button>
              <button
                onClick={() => connectVoice("im", "Private IM Call")}
                className={`py-1.5 px-2 rounded font-bold transition-colors truncate ${
                  channelType === "im"
                    ? "bg-[#1A3B5C] text-[#00F0FF] border border-[#00F0FF]/50"
                    : "text-[#64748B] hover:text-[#E2E8F0]"
                }`}
              >
                1:1 IM CALL
              </button>
            </div>
          </div>

          {/* Microphone VU Meter & Input Level */}
          <div className="bg-[#050810] border border-[#1E2D4A] rounded p-3.5 space-y-3">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-[#00F0FF] tracking-wider flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5" />
                <span>MICROPHONE INPUT METER</span>
              </span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                  isMuted
                    ? "text-[#FF1744] bg-[#FF1744]/10 border border-[#FF1744]/30"
                    : myVolumeLevel > 15
                    ? "text-[#00FF66] bg-[#00FF66]/10 border border-[#00FF66]/30"
                    : "text-[#64748B]"
                }`}
              >
                {isMuted ? "MUTED" : myVolumeLevel > 15 ? "SPEAKING" : "IDLE"}
              </span>
            </div>

            {/* Dynamic VU Meter Bar */}
            <div className="space-y-1">
              <div className="w-full h-3 bg-[#0C1322] rounded overflow-hidden border border-[#1E2D4A] p-0.5 flex items-center">
                <div
                  className="h-full rounded-xs transition-all duration-75"
                  style={{
                    width: `${Math.min(100, Math.max(2, myVolumeLevel))}%`,
                    backgroundColor:
                      isMuted
                        ? "#64748B"
                        : myVolumeLevel > 75
                        ? "#FF1744"
                        : myVolumeLevel > 40
                        ? "#00FF66"
                        : "#00F0FF",
                  }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-[#64748B]">
                <span>-40 dB</span>
                <span>-20 dB</span>
                <span>-6 dB</span>
                <span>0 dB (PEAK)</span>
              </div>
            </div>

            {/* Mic Controls Row */}
            <div className="flex items-center justify-between pt-1 gap-2">
              <button
                id="voice-modal-toggle-mute"
                onClick={toggleMute}
                className={`flex-1 py-2 px-3 rounded border font-mono text-xs font-bold tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                  isMuted
                    ? "border-[#FF1744]/50 bg-[#FF1744]/20 text-[#FF1744]"
                    : "border-[#1E2D4A] bg-[#141E30] text-[#00F0FF] hover:bg-[#1A3B5C]"
                }`}
              >
                {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                <span>{isMuted ? "UNMUTE MIC" : "MUTE MIC"}</span>
              </button>

              {/* Mode Toggle: Open Mic vs PTT */}
              <button
                id="voice-modal-toggle-ptt-mode"
                onClick={() => setMicMode(micMode === "open" ? "ptt" : "open")}
                className="flex-1 py-2 px-3 rounded border border-[#1E2D4A] bg-[#141E30] text-[#E2E8F0] hover:bg-[#1A3B5C] font-mono text-xs font-bold tracking-wider text-center cursor-pointer transition-colors"
              >
                MODE: {micMode.toUpperCase()}
              </button>
            </div>

            {micMode === "ptt" && (
              <div className="pt-1">
                <button
                  onMouseDown={() => setPttActive(true)}
                  onMouseUp={() => setPttActive(false)}
                  onTouchStart={() => setPttActive(true)}
                  onTouchEnd={() => setPttActive(false)}
                  className={`w-full py-3 rounded border font-mono text-xs font-bold tracking-[0.2em] transition-all select-none cursor-pointer ${
                    isPttActive
                      ? "bg-[#00FF66] text-[#050810] border-[#00FF66] shadow-[0_0_12px_#00FF66]"
                      : "bg-[#1E2D4A] text-[#E2E8F0] border-[#2A3F66] hover:bg-[#2A3F66]"
                  }`}
                >
                  {isPttActive ? "TRANSMITTING (LIVE)" : "HOLD TO TALK (PTT)"}
                </button>
              </div>
            )}
          </div>

          {/* Spatial Range Selector (when in Spatial mode) */}
          {channelType === "spatial" && (
            <div className="space-y-1.5">
              <label className="text-[10px] text-[#64748B] uppercase tracking-widest font-bold flex items-center justify-between">
                <span>SPATIAL VOICE ATTENUATION</span>
                <span className="text-[#00F0FF]">{spatialRange.toUpperCase()}</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5 bg-[#050810] p-1 border border-[#1E2D4A] rounded text-[11px]">
                <button
                  onClick={() => setSpatialRange("whisper")}
                  className={`py-1.5 rounded font-bold transition-colors ${
                    spatialRange === "whisper"
                      ? "bg-[#1A3B5C] text-[#00F0FF] border border-[#00F0FF]/50"
                      : "text-[#64748B] hover:text-[#E2E8F0]"
                  }`}
                >
                  WHISPER (10m)
                </button>
                <button
                  onClick={() => setSpatialRange("normal")}
                  className={`py-1.5 rounded font-bold transition-colors ${
                    spatialRange === "normal"
                      ? "bg-[#1A3B5C] text-[#00F0FF] border border-[#00F0FF]/50"
                      : "text-[#64748B] hover:text-[#E2E8F0]"
                  }`}
                >
                  NORMAL (20m)
                </button>
                <button
                  onClick={() => setSpatialRange("shout")}
                  className={`py-1.5 rounded font-bold transition-colors ${
                    spatialRange === "shout"
                      ? "bg-[#1A3B5C] text-[#00F0FF] border border-[#00F0FF]/50"
                      : "text-[#64748B] hover:text-[#E2E8F0]"
                  }`}
                >
                  SHOUT (100m)
                </button>
              </div>
            </div>
          )}

          {/* Active Speakers in Channel */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] text-[#64748B] uppercase tracking-widest font-bold">
              <span>ACTIVE SPEAKERS ({speakers.length + 1})</span>
              <span>PARCEL PROXIMITY</span>
            </div>

            <div className="bg-[#050810] border border-[#1E2D4A] rounded divide-y divide-[#121C2D]">
              {/* Self */}
              <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      myVolumeLevel > 15
                        ? "bg-[#00FF66] shadow-[0_0_8px_#00FF66]"
                        : "bg-[#00F0FF]"
                    }`}
                  />
                  <div className="truncate">
                    <span className="font-bold text-[#E2E8F0]">{avatarName} (You)</span>
                    <div className="text-[10px] text-[#64748B]">Origin (0.0m)</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-[#00F0FF]">LOCAL AGENT</span>
              </div>

              {/* Other Speakers */}
              {speakers.map((spk) => (
                <div key={spk.id} className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          spk.isSpeaking && !spk.muted
                            ? "bg-[#00FF66] shadow-[0_0_8px_#00FF66]"
                            : "bg-[#64748B]"
                        }`}
                      />
                      <div className="truncate">
                        <span className="font-bold text-[#E2E8F0]">{spk.name}</span>
                        {spk.distance && (
                          <div className="text-[10px] text-[#64748B]">
                            {spk.distance}m away · {spk.isSpeaking ? "Speaking" : "Quiet"}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => toggleMuteSpeaker(spk.id)}
                      className={`w-7 h-7 rounded border flex items-center justify-center cursor-pointer transition-colors ${
                        spk.muted
                          ? "border-[#FF1744]/50 bg-[#FF1744]/20 text-[#FF1744]"
                          : "border-[#1E2D4A] bg-[#0C1322] text-[#64748B] hover:text-[#00F0FF]"
                      }`}
                      title={spk.muted ? "Unmute resident" : "Mute resident"}
                    >
                      {spk.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Volume Slider */}
                  <div className="flex items-center gap-3 pt-0.5">
                    <span className="text-[10px] text-[#64748B] w-8">VOL</span>
                    <input
                      type="range"
                      min="0"
                      max="150"
                      value={spk.muted ? 0 : spk.volume}
                      disabled={spk.muted}
                      onChange={(e) => setSpeakerVolume(spk.id, Number(e.target.value))}
                      className="flex-1 h-1.5 bg-[#0C1322] rounded appearance-none cursor-pointer accent-[#00F0FF]"
                    />
                    <span className="text-[10px] text-[#64748B] w-8 text-right">
                      {spk.muted ? "0%" : `${spk.volume}%`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
