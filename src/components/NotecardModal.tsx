import React, { useState, useEffect } from "react";
import { FileText, FileCode, Play, Save, X, Check, AlertCircle } from "lucide-react";
import { api, type Session } from "../api";

interface Props {
  session: Session;
  itemId: string;
  itemType: "notecard" | "script";
  title: string;
  onClose: () => void;
}

export const NotecardModal: React.FC<Props> = ({ session, itemId, itemType, title, onClose }) => {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        if (itemType === "notecard") {
          const res = await api.get<{ content: string }>(
            `/inventory/notecard?session_id=${session.session_id}&id=${itemId}`
          );
          setContent(res.content || "");
        } else {
          const res = await api.get<{ code: string }>(
            `/inventory/script?session_id=${session.session_id}&id=${itemId}`
          );
          setContent(res.code || "");
        }
      } catch (e) {
        console.warn("Failed to load inventory document:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [itemId, itemType, session.session_id]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setFeedback(null);
      if (itemType === "notecard") {
        const res = await api.post<{ ok: boolean; message?: string }>("/inventory/notecard", {
          session_id: session.session_id,
          id: itemId,
          content,
        });
        setFeedback({ ok: true, message: res.message || "Notecard successfully saved." });
      } else {
        const res = await api.post<{ ok: boolean; error?: string; message?: string; bytecode_size_bytes?: number }>(
          "/inventory/script/compile",
          {
            session_id: session.session_id,
            id: itemId,
            code: content,
            running: true,
          }
        );
        if (res.ok) {
          setFeedback({
            ok: true,
            message: `${res.message} (${res.bytecode_size_bytes || 512} bytes).`,
          });
        } else {
          setFeedback({ ok: false, message: res.error || "Compilation error." });
        }
      }
    } catch (err: any) {
      setFeedback({ ok: false, message: err?.message || "Failed to save document." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg rounded-xl border border-[#00F0FF]/40 bg-[#0A101D] shadow-2xl overflow-hidden font-mono flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#050810] px-4 py-3 border-b border-[#1E2D4A] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                itemType === "script"
                  ? "bg-[#00F0FF]/20 text-[#00F0FF]"
                  : "bg-[#E2E8F0]/20 text-[#E2E8F0]"
              }`}
            >
              {itemType === "script" ? <FileCode className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-[#E2E8F0] tracking-wide truncate">
                {title}
              </h2>
              <span className="text-[10px] text-[#64748B]">
                {itemType === "script" ? "LSL Script Editor & Mono Engine" : "Second Life Text Notecard"}
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

        {/* Text Area */}
        <div className="p-4 flex-1 flex flex-col min-h-0 space-y-3">
          {loading ? (
            <div className="text-center py-12 text-xs text-[#64748B]">
              Loading document from asset server...
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 border border-[#1E2D4A] rounded-lg overflow-hidden bg-[#050B14]">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={16}
                spellCheck={false}
                placeholder={itemType === "script" ? "// Enter LSL Script code here..." : "Type notecard text..."}
                className="w-full flex-1 p-3 bg-transparent text-xs text-[#E2E8F0] font-mono outline-none resize-none leading-relaxed"
              />
            </div>
          )}

          {feedback && (
            <div
              className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                feedback.ok
                  ? "bg-[#00FF66]/10 text-[#00FF66] border border-[#00FF66]/30"
                  : "bg-[#FF1744]/10 text-[#FF1744] border border-[#FF1744]/30"
              }`}
            >
              {feedback.ok ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-[#64748B]">
              Lines: {content.split("\n").length} | Chars: {content.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-[#94A3B8] transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleSave}
                disabled={saving || loading}
                className="px-4 py-1.5 rounded-lg bg-[#00F0FF] hover:bg-[#00E5FF] text-[#050810] font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
              >
                {itemType === "script" ? <Play className="w-3.5 h-3.5 fill-current" /> : <Save className="w-3.5 h-3.5" />}
                <span>{saving ? "Processing..." : itemType === "script" ? "Save & Compile" : "Save Notecard"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
