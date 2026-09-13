import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Search, UserPlus, Check, MessageSquare, Loader2, AlertCircle } from "lucide-react";
import { api, type SearchResult, type Session } from "../api";

type Props = {
  session: Session;
  onBack: () => void;
  onOpenIm: (id: string, name: string) => void;
};

type RowState = "idle" | "sending" | "sent" | "error";

export const SearchView: React.FC<Props> = ({ session, onBack, onOpenIm }) => {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [rowState, setRowState] = useState<Record<string, RowState>>({});
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performSearch = async (term: string) => {
    const needle = term.trim();
    if (needle.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }

    setSearching(true);
    setError(null);
    try {
      const res = await api.get<SearchResult[]>(
        `/search/residents?session_id=${session.session_id}&q=${encodeURIComponent(needle)}`
      );
      setResults(res);
      setSearched(true);
    } catch (e: any) {
      setError(e?.message ?? "Search failed");
    } finally {
      setSearching(false);
    }
  };

  const handleInputChange = (val: string) => {
    setQ(val);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => performSearch(val), 400);
  };

  const addFriend = async (r: SearchResult) => {
    setRowState((s) => ({ ...s, [r.id]: "sending" }));
    try {
      await api.post("/friends/request", {
        session_id: session.session_id,
        agent_id: r.id,
        name: r.name,
        message: `Greetings from ${session.avatar_name} on Linkpoint!`,
      });
      setRowState((s) => ({ ...s, [r.id]: "sent" }));
    } catch (e) {
      setRowState((s) => ({ ...s, [r.id]: "error" }));
    }
  };

  return (
    <div id="search-screen" className="flex flex-col h-full bg-[#050810] text-[#E2E8F0] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#121C2D] bg-[#0C1322] shrink-0">
        <button
          id="search-back-btn"
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center rounded border border-[#1E2D4A] bg-[#050810] text-[#00F0FF] hover:bg-[#1A3B5C] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="font-display text-xl font-bold tracking-[0.2em] text-[#00F0FF] leading-none">
            FIND RESIDENTS
          </h1>
          <p className="font-mono text-[10px] text-[#64748B] mt-1 tracking-wider">
            &gt; Search Second Life residents directory
          </p>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="p-3 bg-[#0C1322] border-b border-[#1E2D4A]">
        <div className="flex items-center gap-2 px-3 py-2 bg-[#050810] border border-[#1E2D4A] rounded text-xs font-mono">
          <Search className="w-4 h-4 text-[#64748B]" />
          <input
            id="search-input"
            type="text"
            value={q}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Search avatar name (min 2 characters)..."
            className="flex-1 bg-transparent text-[#E2E8F0] placeholder-[#64748B] outline-none font-mono text-xs"
            autoFocus
          />
          {searching && <Loader2 className="w-4 h-4 text-[#00F0FF] animate-spin" />}
        </div>
      </div>

      {/* Results */}
      <div id="search-results-list" className="flex-1 overflow-y-auto divide-y divide-[#121C2D]">
        {error ? (
          <div className="p-8 text-center text-[#FF1744] font-mono text-xs flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>&gt; {error}</span>
          </div>
        ) : q.trim().length < 2 ? (
          <div className="p-10 text-center text-[#64748B] font-mono text-xs">
            &gt; Type at least 2 letters to search resident directory
          </div>
        ) : searched && results.length === 0 ? (
          <div className="p-10 text-center text-[#64748B] font-mono text-xs">
            &gt; No residents matching "{q}" found
          </div>
        ) : (
          results.map((r) => {
            const state = rowState[r.id] || "idle";

            return (
              <div
                key={r.id}
                id={`search-resident-${r.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-[#0C1322] transition-colors"
              >
                <div className="min-w-0 flex-1 pr-3">
                  <div className="font-mono text-xs font-bold text-[#E2E8F0] truncate">{r.name}</div>
                  <div className="font-mono text-[10px] text-[#64748B] mt-0.5 truncate">
                    @{r.username} · {r.id.slice(0, 8)}
                  </div>
                </div>

                <div>
                  {r.is_friend ? (
                    <button
                      onClick={() => onOpenIm(r.id, r.name)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#00F0FF] bg-[#1A3B5C] text-[#00F0FF] hover:bg-[#00F0FF]/20 font-mono text-xs font-bold transition-all cursor-pointer shadow-[0_0_6px_rgba(0,240,255,0.2)]"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>IM</span>
                    </button>
                  ) : state === "sent" ? (
                    <span className="flex items-center gap-1 px-3 py-1.5 rounded bg-[#00FF66]/10 text-[#00FF66] border border-[#00FF66]/40 font-mono text-xs font-bold">
                      <Check className="w-3.5 h-3.5" />
                      <span>SENT</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => addFriend(r)}
                      disabled={state === "sending"}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#00F0FF] hover:bg-[#00F0FF]/90 text-[#050810] font-mono text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-[0_0_6px_rgba(0,240,255,0.3)]"
                    >
                      {state === "sending" ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <UserPlus className="w-3.5 h-3.5" />
                      )}
                      <span>ADD</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
