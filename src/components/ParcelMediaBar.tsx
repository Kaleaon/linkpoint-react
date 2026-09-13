import React, { useState, useRef, useEffect } from "react";
import { Volume2, VolumeX, Music, Shield, Play, Square, Info } from "lucide-react";
import type { SLParcel } from "../types";

interface Props {
  parcel: SLParcel | null;
  onRefresh?: () => void;
}

export const ParcelMediaBar: React.FC<Props> = ({ parcel }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [showDetails, setShowDetails] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const oscillatorNodesRef = useRef<any[]>([]);

  // Procedural ambient sound synthesis using Web Audio API (wind, ocean waves, ambient synth chord)
  const startAmbientAudio = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(volume, ctx.currentTime);
      masterGain.connect(ctx.destination);
      gainNodeRef.current = masterGain;

      // Pink noise / wave generator using buffer
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        output[i] *= 0.04;
        b6 = white * 0.115926;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      // Low pass filter for soft ocean wash
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(450, ctx.currentTime);

      // Low Frequency Oscillator for wave swell
      const lfo = ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.15, ctx.currentTime);
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(250, ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start();

      whiteNoise.connect(filter);
      filter.connect(masterGain);
      whiteNoise.start();

      // Ambient warm chord (432Hz harmonic)
      const freqs = [108, 162, 216, 324];
      const chordOscs = freqs.map((f) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(f, ctx.currentTime);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.015, ctx.currentTime);
        osc.connect(g);
        g.connect(masterGain);
        osc.start();
        return osc;
      });

      oscillatorNodesRef.current = [whiteNoise, lfo, ...chordOscs];
      setIsPlaying(true);
    } catch (e) {
      console.warn("Web Audio startup error:", e);
    }
  };

  const stopAudio = () => {
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
      gainNodeRef.current = null;
      oscillatorNodesRef.current = [];
    }
    setIsPlaying(false);
  };

  const togglePlay = () => {
    if (isPlaying) {
      stopAudio();
    } else {
      startAmbientAudio();
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (gainNodeRef.current && audioContextRef.current) {
      gainNodeRef.current.gain.setValueAtTime(isMuted ? 0 : newVol, audioContextRef.current.currentTime);
    }
  };

  const toggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (gainNodeRef.current && audioContextRef.current) {
      gainNodeRef.current.gain.setValueAtTime(nextMute ? 0 : volume, audioContextRef.current.currentTime);
    }
  };

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  if (!parcel) return null;

  return (
    <div className="bg-[#050810]/90 backdrop-blur-md border-b border-[#1E2D4A] px-3 py-1.5 flex items-center justify-between text-xs font-mono select-none">
      {/* Parcel Info */}
      <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-1.5 truncate text-left group"
        >
          <span className="w-2 h-2 rounded-full bg-[#00FF66] shrink-0 animate-pulse" />
          <span className="font-semibold text-[#E2E8F0] group-hover:text-[#00F0FF] transition-colors truncate text-xs">
            {parcel.name}
          </span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#141E30] text-[#94A3B8] border border-[#1E2D4A] shrink-0">
            {parcel.maturity}
          </span>
        </button>
      </div>

      {/* Media Streamer & Audio Controls */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1.5 bg-[#0C1322] px-2 py-1 rounded-md border border-[#1E2D4A]">
          <Music className={`w-3.5 h-3.5 ${isPlaying ? "text-[#00F0FF] animate-pulse" : "text-[#64748B]"}`} />
          <span className="text-[10px] text-[#94A3B8] hidden sm:inline">
            {isPlaying ? "Stream Active" : "Parcel Stream"}
          </span>

          <button
            onClick={togglePlay}
            className={`p-1 rounded transition-colors ${
              isPlaying
                ? "bg-[#FF1744]/20 text-[#FF1744] hover:bg-[#FF1744]/30"
                : "bg-[#00F0FF]/20 text-[#00F0FF] hover:bg-[#00F0FF]/30"
            }`}
            title={isPlaying ? "Stop stream" : "Play parcel stream"}
          >
            {isPlaying ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
          </button>

          <button
            onClick={toggleMute}
            className="p-1 text-[#94A3B8] hover:text-[#00F0FF] transition-colors"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-[#FF1744]" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="w-12 h-1 accent-[#00F0FF] bg-[#1E2D4A] rounded cursor-pointer"
            title={`Volume: ${Math.round(volume * 100)}%`}
          />
        </div>
      </div>

      {/* Parcel Details Flyout Modal */}
      {showDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-[#00F0FF]/40 bg-[#0A101D] p-4 text-xs font-mono shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-[#1E2D4A] pb-2">
              <div className="flex items-center gap-2 text-[#00F0FF] font-bold">
                <Shield className="w-4 h-4" />
                <span>Parcel Properties</span>
              </div>
              <button
                onClick={() => setShowDetails(false)}
                className="text-[#94A3B8] hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-[#94A3B8]">
              <div>
                <span className="text-[#64748B]">Parcel Name:</span>{" "}
                <span className="text-[#E2E8F0] font-semibold">{parcel.name}</span>
              </div>
              <div>
                <span className="text-[#64748B]">Region:</span>{" "}
                <span className="text-[#00F0FF]">{parcel.sim_name}</span>
              </div>
              <div>
                <span className="text-[#64748B]">Owner:</span>{" "}
                <span className="text-[#E2E8F0]">{parcel.owner_name}</span>
              </div>
              <div>
                <span className="text-[#64748B]">Area:</span>{" "}
                <span className="text-[#E2E8F0]">{parcel.area_sqm.toLocaleString()} m²</span>
              </div>
              <div>
                <span className="text-[#64748B]">Maturity:</span>{" "}
                <span className="text-[#00FF66] font-semibold">{parcel.maturity}</span>
              </div>
              <div>
                <span className="text-[#64748B]">Permissions:</span>{" "}
                <span className="text-[#E2E8F0]">
                  Fly: {parcel.allow_fly ? "Enabled" : "Restricted"} | Scripts: {parcel.allow_scripts ? "Enabled" : "Restricted"}
                </span>
              </div>
              <div className="pt-2 border-t border-[#1E2D4A]">
                <span className="text-[#64748B] block mb-1">Description:</span>
                <p className="text-[#CBD5E1] bg-[#050810] p-2.5 rounded border border-[#1E2D4A]">
                  {parcel.description}
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowDetails(false)}
                className="px-3 py-1.5 rounded bg-[#141E30] text-[#00F0FF] border border-[#00F0FF]/30 hover:bg-[#00F0FF] hover:text-black transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
