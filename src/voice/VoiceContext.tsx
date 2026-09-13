import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { triggerHaptic } from "../hooks/useHaptic";

export type VoiceChannelType = "spatial" | "group" | "im";

export type VoiceSpeaker = {
  id: string;
  name: string;
  isSelf?: boolean;
  isSpeaking: boolean;
  volume: number; // 0 to 100
  muted: boolean;
  distance?: number; // in meters for spatial voice
  avatarUrl?: string;
};

export type VoiceState = {
  isConnected: boolean;
  isConnecting: boolean;
  channelType: VoiceChannelType;
  channelName: string;
  isMuted: boolean;
  micMode: "open" | "ptt";
  isPttActive: boolean;
  myVolumeLevel: number; // 0 to 100 (live from real microphone analyser)
  micPermission: "prompt" | "granted" | "denied";
  speakers: VoiceSpeaker[];
  spatialRange: "whisper" | "normal" | "shout";
  connectVoice: (channelType?: VoiceChannelType, name?: string) => Promise<void>;
  disconnectVoice: () => void;
  toggleMute: () => void;
  setMicMode: (mode: "open" | "ptt") => void;
  setPttActive: (active: boolean) => void;
  setSpeakerVolume: (id: string, volume: number) => void;
  toggleMuteSpeaker: (id: string) => void;
  setSpatialRange: (range: "whisper" | "normal" | "shout") => void;
};

const VoiceContext = createContext<VoiceState | null>(null);

const DEFAULT_SPEAKERS: VoiceSpeaker[] = [
  {
    id: "oz-linden",
    name: "Oz Linden",
    isSpeaking: false,
    volume: 85,
    muted: false,
    distance: 6.5,
  },
  {
    id: "torley-linden",
    name: "Torley Linden",
    isSpeaking: true,
    volume: 90,
    muted: false,
    distance: 12.3,
  },
  {
    id: "philip-linden",
    name: "Philip Linden",
    isSpeaking: false,
    volume: 80,
    muted: false,
    distance: 18.9,
  },
];

export const VoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [channelType, setChannelType] = useState<VoiceChannelType>("spatial");
  const [channelName, setChannelName] = useState("Sandbox Spatial");
  const [isMuted, setIsMuted] = useState(false);
  const [micMode, setMicMode] = useState<"open" | "ptt">("open");
  const [isPttActive, setIsPttActiveState] = useState(false);
  const [myVolumeLevel, setMyVolumeLevel] = useState(0);
  const [micPermission, setMicPermission] = useState<"prompt" | "granted" | "denied">("prompt");
  const [speakers, setSpeakers] = useState<VoiceSpeaker[]>(DEFAULT_SPEAKERS);
  const [spatialRange, setSpatialRange] = useState<"whisper" | "normal" | "shout">("normal");

  // Web Audio refs for real microphone stream
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const simIntervalRef = useRef<number | null>(null);

  // Clean up audio nodes
  const cleanupAudio = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setMyVolumeLevel(0);
  };

  const startMicrophone = async () => {
    try {
      cleanupAudio();
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMicPermission("denied");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;
      setMicPermission("granted");

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        // Normalize roughly to 0 - 100
        const normalized = Math.min(100, Math.round((avg / 128) * 100));

        // If muted or in PTT mode and not pressing PTT, signal is 0
        setMyVolumeLevel((prev) => {
          return normalized;
        });

        animFrameRef.current = requestAnimationFrame(updateVolume);
      };

      updateVolume();
    } catch (err: any) {
      console.warn("Microphone access denied or unavailable, using fallback:", err);
      setMicPermission("denied");
    }
  };

  const connectVoice = async (type: VoiceChannelType = "spatial", name = "Sandbox Spatial") => {
    setIsConnecting(true);
    triggerHaptic("light");
    setChannelType(type);
    setChannelName(name);

    // Request actual microphone
    await startMicrophone();

    // Small delay to simulate Vivox / WebRTC channel negotiation
    setTimeout(() => {
      setIsConnecting(false);
      setIsConnected(true);
      triggerHaptic("success");
    }, 600);
  };

  const disconnectVoice = () => {
    triggerHaptic("medium");
    setIsConnected(false);
    setIsConnecting(false);
    cleanupAudio();
  };

  const toggleMute = () => {
    triggerHaptic("selection");
    setIsMuted((prev) => {
      const next = !prev;
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getAudioTracks().forEach((t) => {
          t.enabled = !next;
        });
      }
      return next;
    });
  };

  const setPttActive = (active: boolean) => {
    setIsPttActiveState(active);
    triggerHaptic("light");
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = active;
      });
    }
  };

  const setSpeakerVolume = (id: string, volume: number) => {
    setSpeakers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, volume: Math.max(0, Math.min(150, volume)) } : s))
    );
  };

  const toggleMuteSpeaker = (id: string) => {
    triggerHaptic("selection");
    setSpeakers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, muted: !s.muted } : s))
    );
  };

  // Simulate active speaker chatter in Second Life voice channel
  useEffect(() => {
    if (!isConnected) return;

    simIntervalRef.current = window.setInterval(() => {
      setSpeakers((prev) =>
        prev.map((speaker) => {
          // Torley talks often, Oz occasionally, Philip rarely
          const chance = speaker.id === "torley-linden" ? 0.4 : speaker.id === "oz-linden" ? 0.25 : 0.15;
          const isSpeaking = Math.random() < chance;
          return { ...speaker, isSpeaking };
        })
      );
    }, 3000);

    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, [isConnected]);

  useEffect(() => {
    return () => {
      cleanupAudio();
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, []);

  return (
    <VoiceContext.Provider
      value={{
        isConnected,
        isConnecting,
        channelType,
        channelName,
        isMuted,
        micMode,
        isPttActive,
        myVolumeLevel: isMuted || (micMode === "ptt" && !isPttActive) ? 0 : myVolumeLevel,
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
      }}
    >
      {children}
    </VoiceContext.Provider>
  );
};

export function useVoice() {
  const ctx = useContext(VoiceContext);
  if (!ctx) throw new Error("useVoice must be used within a VoiceProvider");
  return ctx;
}
