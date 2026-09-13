import React, { useState } from "react";
import { ArrowLeft, MessageSquare, Bell, Users, ShieldCheck, Check, Shield, AlertCircle, ExternalLink } from "lucide-react";
import { VIEWER_CHANNEL, VIEWER_VERSION, VIEWER_PLATFORM } from "../sl/login";

type Props = {
  onBack: () => void;
  onOpenTPVPolicy?: () => void;
};

export const SettingsView: React.FC<Props> = ({ onBack, onOpenTPVPolicy }) => {
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [monospaceChat, setMonospaceChat] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [autoAcceptFriends, setAutoAcceptFriends] = useState(false);

  return (
    <div id="settings-screen" className="flex flex-col h-full bg-[#050810] text-[#E2E8F0] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#121C2D] bg-[#0C1322] shrink-0">
        <button
          id="settings-back-btn"
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center rounded border border-[#1E2D4A] bg-[#050810] text-[#00F0FF] hover:bg-[#1A3B5C] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="font-display text-xl font-bold tracking-[0.2em] text-[#00F0FF] leading-none">
            SETTINGS
          </h1>
          <p className="font-mono text-[10px] text-[#64748B] mt-1 tracking-wider">
            &gt; Viewer preferences & protocols
          </p>
        </div>
      </div>

      <div className="p-4 space-y-5 max-w-lg mx-auto w-full font-mono text-xs">
        {/* Chat Section */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-[#00F0FF] tracking-widest uppercase flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>CHAT DISPLAY</span>
          </div>
          <div className="bg-[#0C1322] border border-[#1E2D4A] rounded divide-y divide-[#121C2D]">
            <div className="flex items-center justify-between p-3.5">
              <div>
                <div className="font-bold text-[#E2E8F0]">Show Timestamps</div>
                <div className="text-[10px] text-[#64748B] mt-0.5">Render [HH:MM] on chat lines</div>
              </div>
              <button
                id="toggle-timestamps"
                onClick={() => setShowTimestamps(!showTimestamps)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  showTimestamps ? "bg-[#00F0FF]" : "bg-[#141E30]"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-[#050810] absolute top-0.5 transition-transform ${
                    showTimestamps ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3.5">
              <div>
                <div className="font-bold text-[#E2E8F0]">Force Monospace Chat</div>
                <div className="text-[10px] text-[#64748B] mt-0.5">Terminal Space Mono typography</div>
              </div>
              <button
                id="toggle-monospace"
                onClick={() => setMonospaceChat(!monospaceChat)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  monospaceChat ? "bg-[#00F0FF]" : "bg-[#141E30]"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-[#050810] absolute top-0.5 transition-transform ${
                    monospaceChat ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-[#00F0FF] tracking-widest uppercase flex items-center gap-1.5">
            <Bell className="w-3.5 h-3.5" />
            <span>ALERTS</span>
          </div>
          <div className="bg-[#0C1322] border border-[#1E2D4A] rounded">
            <div className="flex items-center justify-between p-3.5">
              <div>
                <div className="font-bold text-[#E2E8F0]">Enable IM Notifications</div>
                <div className="text-[10px] text-[#64748B] mt-0.5">Audio/visual beep on private IMs</div>
              </div>
              <button
                id="toggle-notifications"
                onClick={() => setNotifications(!notifications)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  notifications ? "bg-[#00F0FF]" : "bg-[#141E30]"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-[#050810] absolute top-0.5 transition-transform ${
                    notifications ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Friends */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-[#00F0FF] tracking-widest uppercase flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>FRIENDSHIPS</span>
          </div>
          <div className="bg-[#0C1322] border border-[#1E2D4A] rounded">
            <div className="flex items-center justify-between p-3.5">
              <div>
                <div className="font-bold text-[#E2E8F0]">Auto-accept Friend Offers</div>
                <div className="text-[10px] text-[#64748B] mt-0.5">Automatically confirm incoming requests</div>
              </div>
              <button
                id="toggle-auto-accept"
                onClick={() => setAutoAcceptFriends(!autoAcceptFriends)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  autoAcceptFriends ? "bg-[#00F0FF]" : "bg-[#141E30]"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-[#050810] absolute top-0.5 transition-transform ${
                    autoAcceptFriends ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Second Life TPV Standards & Compliance Section */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-[#00FF66] tracking-widest uppercase flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            <span>TPV STANDARDS & POLICY (LINDEN LAB)</span>
          </div>
          <div className="bg-[#0C1322] border border-[#1E2D4A] rounded p-4 space-y-3">
            <div className="flex items-start gap-2 text-[#94A3B8] text-[11px] leading-relaxed">
              <AlertCircle className="w-4 h-4 text-[#FFEA00] shrink-0 mt-0.5" />
              <span>
                Linkpoint is built in strict adherence with the Linden Lab Official Policy on Third-Party Viewers.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="p-2 rounded bg-[#050810] border border-[#1E2D4A]">
                <span className="text-[#64748B] block">RULE 1: IDENTIFICATION</span>
                <span className="text-[#00FF66] font-bold">COMPLIANT</span>
              </div>
              <div className="p-2 rounded bg-[#050810] border border-[#1E2D4A]">
                <span className="text-[#64748B] block">RULE 2: CONTENT PROTECTION</span>
                <span className="text-[#00FF66] font-bold">ENFORCED</span>
              </div>
              <div className="p-2 rounded bg-[#050810] border border-[#1E2D4A]">
                <span className="text-[#64748B] block">RULE 3: SHARED PRIVACY</span>
                <span className="text-[#00FF66] font-bold">ENFORCED</span>
              </div>
              <div className="p-2 rounded bg-[#050810] border border-[#1E2D4A]">
                <span className="text-[#64748B] block">RULE 4: CREDENTIAL SAFETY</span>
                <span className="text-[#00FF66] font-bold">LINDEN MD5</span>
              </div>
            </div>

            {onOpenTPVPolicy && (
              <button
                id="view-tpv-policy-btn"
                onClick={onOpenTPVPolicy}
                className="w-full py-2 px-3 rounded bg-[#141E30] hover:bg-[#1A3B5C] text-[#00F0FF] border border-[#1E2D4A] text-[11px] font-bold tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#00FF66]" />
                <span>INSPECT FULL TPV POLICY & DISCLOSURES</span>
              </button>
            )}
          </div>
        </div>

        {/* Client Protocol & Identification */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-[#64748B] tracking-widest uppercase flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>VIEWER PROFILE</span>
          </div>
          <div className="bg-[#0C1322] border border-[#1E2D4A] rounded p-3.5 space-y-2 text-[11px]">
            <div className="flex justify-between">
              <span className="text-[#64748B]">Channel</span>
              <span className="text-[#00F0FF]">{VIEWER_CHANNEL}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Build Version</span>
              <span className="text-[#E2E8F0]">{VIEWER_VERSION}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Platform Code</span>
              <span className="text-[#E2E8F0]">{VIEWER_PLATFORM} (Web)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Encryption Protocol</span>
              <span className="text-[#00FF66]">TLS 1.3 / Linden $1$ MD5</span>
            </div>
          </div>
        </div>

        {/* Mandatory Linden Lab Disclaimer */}
        <div className="text-center text-[10px] text-[#64748B] space-y-1 pt-2 pb-4">
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
