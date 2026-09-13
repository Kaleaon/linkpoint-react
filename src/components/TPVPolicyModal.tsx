import React from "react";
import { X, ShieldCheck, Lock, Eye, FileText, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { VIEWER_CHANNEL, VIEWER_VERSION, VIEWER_PLATFORM } from "../sl/login";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export const TPVPolicyModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div
        id="tpv-policy-modal"
        className="w-full max-w-lg bg-[#0C1322] border border-[#1E2D4A] rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E2D4A] bg-[#050810] shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#00FF66]" />
            <h2 className="font-display text-base font-bold tracking-[0.2em] text-[#00F0FF]">
              SECOND LIFE® TPV STANDARDS
            </h2>
          </div>
          <button
            id="tpv-modal-close"
            onClick={onClose}
            className="w-8 h-8 rounded border border-[#1E2D4A] bg-[#0C1322] text-[#64748B] hover:text-[#E2E8F0] flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4 overflow-y-auto font-mono text-xs text-[#E2E8F0]">
          {/* Mandatory Linden Lab Disclaimer Banner */}
          <div className="bg-[#FFEA00]/10 border border-[#FFEA00]/40 rounded p-3 text-[11px] space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-[#FFEA00] tracking-wider">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>MANDATORY TPV POLICY NOTICE</span>
            </div>
            <p className="text-[#E2E8F0] leading-relaxed">
              <strong>This software is not provided or endorsed by Linden Lab, the makers of Second Life.</strong>
            </p>
            <p className="text-[10px] text-[#94A3B8] leading-relaxed">
              Second Life and Linden Lab are trademarks or registered trademarks of Linden Research, Inc. in the U.S. and other countries. No trademark infringement is intended.
            </p>
          </div>

          {/* Viewer Identification (Section 1) */}
          <div className="bg-[#050810] border border-[#1E2D4A] rounded p-3 space-y-2">
            <div className="text-[11px] font-bold text-[#00F0FF] tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#00FF66]" />
              <span>1. ACCURATE IDENTIFICATION (TPV RULE 1)</span>
            </div>
            <p className="text-[10px] text-[#94A3B8] leading-relaxed">
              Linkpoint uniquely and accurately identifies its software channel, version, and platform on all Linden Lab login and capability endpoints. It does not spoof official viewer tokens.
            </p>
            <div className="grid grid-cols-3 gap-2 pt-1 text-[10px]">
              <div className="bg-[#0C1322] p-2 rounded border border-[#1E2D4A]">
                <span className="text-[#64748B] block">CHANNEL</span>
                <span className="text-[#00F0FF] font-bold">{VIEWER_CHANNEL}</span>
              </div>
              <div className="bg-[#0C1322] p-2 rounded border border-[#1E2D4A]">
                <span className="text-[#64748B] block">VERSION</span>
                <span className="text-[#E2E8F0] font-bold">{VIEWER_VERSION}</span>
              </div>
              <div className="bg-[#0C1322] p-2 rounded border border-[#1E2D4A]">
                <span className="text-[#64748B] block">PLATFORM</span>
                <span className="text-[#E2E8F0] font-bold">{VIEWER_PLATFORM} (Web)</span>
              </div>
            </div>
          </div>

          {/* Content Protection & Anti-Copybot (Section 2) */}
          <div className="bg-[#050810] border border-[#1E2D4A] rounded p-3 space-y-2">
            <div className="text-[11px] font-bold text-[#00F0FF] tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#00FF66]" />
              <span>2. CONTENT PROTECTION (TPV RULE 2)</span>
            </div>
            <p className="text-[10px] text-[#94A3B8] leading-relaxed">
              Linkpoint strictly enforces the Second Life Intellectual Property & Content Permission system:
            </p>
            <ul className="list-disc pl-4 space-y-1 text-[10px] text-[#CBD5E1]">
              <li>
                <strong>Permission Enforcement</strong>: All inventory assets enforce <strong>Modify (M)</strong>, <strong>Copy (C)</strong>, and <strong>Transfer (T)</strong> flags.
              </li>
              <li>
                <strong>Export Protection</strong>: External asset extraction or saving is strictly blocked unless the item was created by the logged-in resident and carries the explicit <strong>Export</strong> flag.
              </li>
              <li>
                <strong>Anti-Copybot Guarantee</strong>: Contains zero mesh ripping, texture ripping, or unauthorized reproduction capabilities.
              </li>
            </ul>
          </div>

          {/* Privacy & Shared Experience (Section 3) */}
          <div className="bg-[#050810] border border-[#1E2D4A] rounded p-3 space-y-2">
            <div className="text-[11px] font-bold text-[#00F0FF] tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#00FF66]" />
              <span>3. PRIVACY & SHARED EXPERIENCE (TPV RULE 3)</span>
            </div>
            <ul className="list-disc pl-4 space-y-1 text-[10px] text-[#CBD5E1]">
              <li>
                <strong>Spatial Sound & Chat Bounds</strong>: Local chat broadcast is bounded to simulator proximity (20m local, 100m shout, 10m whisper). No global eavesdropping.
              </li>
              <li>
                <strong>Voice Transparency</strong>: Active voice transmission always broadcasts a glowing status indicator and microphone VU meter to prevent hidden wiretapping.
              </li>
              <li>
                <strong>Region Radar</strong>: Only displays resident positions legitimately broadcast by simulator CoarseLocationUpdate packets within the current region.
              </li>
            </ul>
          </div>

          {/* Credential Security & Terms (Section 4) */}
          <div className="bg-[#050810] border border-[#1E2D4A] rounded p-3 space-y-2">
            <div className="text-[11px] font-bold text-[#00F0FF] tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#00FF66]" />
              <span>4. CREDENTIAL PRIVACY (TPV RULE 4)</span>
            </div>
            <ul className="list-disc pl-4 space-y-1 text-[10px] text-[#CBD5E1]">
              <li>
                <strong>No Plaintext Password Storage</strong>: Resident passwords are never stored in plaintext on disk or in browser storage.
              </li>
              <li>
                <strong>Linden MD5 Hashing</strong>: Passwords are converted to <code className="text-[#00FF66]">$1$MD5</code> hash strings before transmission.
              </li>
              <li>
                <strong>Direct Linden Endpoints</strong>: Credential payloads are addressed strictly to official Linden Lab XML-RPC endpoints (<code className="text-[#00F0FF]">login.agni.lindenlab.com</code> / <code className="text-[#00F0FF]">login.aditi.lindenlab.com</code>). Zero third-party proxy interceptors.
              </li>
            </ul>
          </div>

          {/* Links to Official Documentation */}
          <div className="pt-1 flex flex-col sm:flex-row gap-2">
            <a
              href="https://wiki.secondlife.com/wiki/Linden_Lab_Official:Policy_on_Third-Party_Viewers"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2 px-3 rounded border border-[#1E2D4A] bg-[#050810] hover:bg-[#141E30] text-[#00F0FF] text-[10px] font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Linden Lab TPV Policy</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://www.lindenlab.com/legal/second-life-terms-and-conditions"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2 px-3 rounded border border-[#1E2D4A] bg-[#050810] hover:bg-[#141E30] text-[#64748B] hover:text-[#E2E8F0] text-[10px] font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Second Life Terms of Service</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#1E2D4A] bg-[#050810] flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-[#00F0FF] hover:bg-[#00F0FF]/90 text-[#050810] font-mono text-xs font-bold tracking-wider cursor-pointer transition-colors"
          >
            CONFIRM & ACKNOWLEDGE
          </button>
        </div>
      </div>
    </div>
  );
};
