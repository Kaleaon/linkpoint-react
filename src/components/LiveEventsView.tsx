import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Calendar,
  Radio,
  Search,
  RefreshCw,
  MapPin,
  Clock,
  ExternalLink,
  Copy,
  Check,
  User,
  DollarSign,
  Share2,
  X,
  Sparkles,
  Tag,
  Compass,
} from "lucide-react";
import {
  getLiveEvents,
  getLiveEventDetail,
  type SLEventItem,
  type SLEventCategory,
  type SLEventDetail,
  type Session,
  api,
} from "../api";

interface LiveEventsViewProps {
  session?: Session | null;
  onOpenChatWithText?: (text: string) => void;
}

export const LiveEventsView: React.FC<LiveEventsViewProps> = ({ session, onOpenChatWithText }) => {
  const [categories, setCategories] = useState<SLEventCategory[]>([]);
  const [events, setEvents] = useState<SLEventItem[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>("0");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Selected event modal/drawer
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [eventDetail, setEventDetail] = useState<SLEventDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sharedNotice, setSharedNotice] = useState<string | null>(null);

  // Real-time Second Life Time (SLT - US Pacific Time)
  const [sltTime, setSltTime] = useState<string>("");

  useEffect(() => {
    const updateSLT = () => {
      try {
        const now = new Date();
        const str = now.toLocaleTimeString("en-US", {
          timeZone: "America/Los_Angeles",
          hour12: true,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
        setSltTime(str);
      } catch {
        setSltTime(new Date().toLocaleTimeString());
      }
    };
    updateSLT();
    const interval = setInterval(updateSLT, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch events
  const loadEvents = useCallback(async (catId: string, isRefresh: boolean = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await getLiveEvents(catId, searchQuery);
      if (data && Array.isArray(data.events)) {
        setEvents(data.events);
        if (data.categories && data.categories.length > 0) {
          setCategories(data.categories);
        }
        setLastUpdated(new Date().toLocaleTimeString());
      } else {
        setEvents([]);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load events from Second Life directory.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadEvents(selectedCat);
  }, [selectedCat, loadEvents]);

  // Load event detail when an event is selected
  const handleSelectEvent = async (event: SLEventItem) => {
    setSelectedEventId(event.id);
    setDetailLoading(true);
    setEventDetail(null);
    setSharedNotice(null);

    try {
      const detail = await getLiveEventDetail(event.id);
      setEventDetail(detail);
    } catch (err) {
      // Fallback with basic event item data
      setEventDetail({
        id: event.id,
        title: event.title,
        date: event.date,
        duration: "60 minutes",
        location: event.location,
        slurl: event.slurl,
        host_name: "Event Organizer",
        host_url: "",
        cover: "FREE",
        description: "Official Second Life event. Teleport to simulator to attend.",
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCopySlurl = (slurl: string, id: string) => {
    if (!slurl) return;
    navigator.clipboard.writeText(slurl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleShareToLocalChat = async (item: SLEventItem | SLEventDetail) => {
    if (!session) return;
    const shareText = `[Event] ${item.title} - ${item.date} @ ${item.location} (${item.slurl})`;
    try {
      await api.post("/chat/send", {
        session_id: session.session_id,
        channel: "local",
        text: shareText,
      });
      setSharedNotice("Dispatched to local chat!");
      setTimeout(() => setSharedNotice(null), 3000);
      if (onOpenChatWithText) {
        onOpenChatWithText(shareText);
      }
    } catch (err: any) {
      setSharedNotice(`Share failed: ${err.message}`);
    }
  };

  // Filtered list based on client-side search input
  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return events;
    const q = searchQuery.toLowerCase().trim();
    return events.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q) ||
        e.category_name.toLowerCase().includes(q)
    );
  }, [events, searchQuery]);

  return (
    <div className="flex flex-col h-full bg-[#050810] text-[#E2E8F0] font-mono select-none overflow-hidden">
      {/* Tactical Header */}
      <div className="shrink-0 p-3 bg-[#080D1A] border-b border-[#1E2D4A]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-2.5 h-2.5 rounded-full bg-[#00F0FF] shadow-[0_0_8px_#00F0FF] shrink-0 animate-pulse" />
            <div>
              <div className="text-xs font-bold text-[#00F0FF] tracking-wider truncate flex items-center gap-2">
                <span>OFFICIAL LIVE EVENTS</span>
                <span className="text-[10px] text-[#64748B] font-normal">// GRID FEED</span>
              </div>
              <div className="text-[10px] text-[#64748B] truncate">
                Linden Lab Verified Directory
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Real-time SLT Clock */}
            <div className="px-2 py-1 rounded bg-[#0C1322] border border-[#1E2D4A] flex items-center gap-1.5 text-[10px]">
              <Clock className="w-3 h-3 text-[#FFEA00]" />
              <span className="text-[#94A3B8]">SLT:</span>
              <span className="text-[#FFEA00] font-bold tabular-nums">{sltTime || "00:00:00"}</span>
            </div>

            {/* Refresh Button */}
            <button
              id="refresh-events-btn"
              onClick={() => loadEvents(selectedCat, true)}
              disabled={refreshing || loading}
              title="Refresh Event Listings"
              className="p-1.5 rounded bg-[#0C1322] hover:bg-[#141E30] border border-[#1E2D4A] hover:border-[#00F0FF]/50 text-[#00F0FF] transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-2.5 relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#64748B]" />
          <input
            id="events-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="> Search events, performers, venues..."
            className="w-full bg-[#0C1322] border border-[#1E2D4A] focus:border-[#00F0FF] rounded pl-9 pr-8 py-1.5 text-xs text-[#E2E8F0] placeholder-[#475569] outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2 text-[#64748B] hover:text-[#E2E8F0] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Popular Categories Filter Bar */}
        <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            id="cat-btn-all"
            onClick={() => setSelectedCat("0")}
            className={`px-2.5 py-1 rounded text-[11px] font-bold tracking-wider shrink-0 transition-all cursor-pointer ${
              selectedCat === "0"
                ? "bg-[#00F0FF]/20 border border-[#00F0FF] text-[#00F0FF] shadow-[0_0_8px_rgba(0,240,255,0.2)]"
                : "bg-[#0C1322] border border-[#1E2D4A] text-[#94A3B8] hover:text-[#E2E8F0] hover:border-[#334155]"
            }`}
          >
            [ALL EVENTS]
          </button>

          {categories
            .filter((c) => c.id !== "0")
            .map((cat) => {
              const isSelected = selectedCat === cat.id;
              return (
                <button
                  key={cat.id}
                  id={`cat-btn-${cat.id}`}
                  onClick={() => setSelectedCat(cat.id)}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold tracking-wider shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
                    isSelected
                      ? "bg-[#B026FF]/20 border border-[#B026FF] text-[#B026FF] shadow-[0_0_8px_rgba(176,38,255,0.2)]"
                      : "bg-[#0C1322] border border-[#1E2D4A] text-[#94A3B8] hover:text-[#E2E8F0] hover:border-[#334155]"
                  }`}
                >
                  <span>[{cat.name.toUpperCase()}]</span>
                  {cat.count > 0 && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-[#050810] text-[#64748B]">
                      {cat.count}
                    </span>
                  )}
                </button>
              );
            })}
        </div>
      </div>

      {/* Main Events Feed */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {/* Status Bar */}
        <div className="flex items-center justify-between text-[10px] text-[#64748B] px-1">
          <div>
            &gt; LISTING {filteredEvents.length} VERIFIED {filteredEvents.length === 1 ? "EVENT" : "EVENTS"}
          </div>
          {lastUpdated && <div>UPDATED {lastUpdated}</div>}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-16 text-center space-y-3">
            <RefreshCw className="w-6 h-6 text-[#00F0FF] animate-spin mx-auto opacity-70" />
            <div className="text-xs text-[#00F0FF] font-bold tracking-wider">
              &gt; QUERYING SECOND LIFE EVENT DIRECTORY...
            </div>
            <div className="text-[10px] text-[#64748B]">
              Fetching real-time upcoming calendar from Linden Lab
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="p-4 rounded border border-[#FF1744]/40 bg-[#FF1744]/10 text-[#FF1744] text-xs space-y-2">
            <div className="font-bold flex items-center gap-1.5">
              <span>[DIRECTORY ACCESS NOTICE]</span>
            </div>
            <div className="text-[11px] leading-relaxed">{error}</div>
            <button
              onClick={() => loadEvents(selectedCat, true)}
              className="mt-2 px-3 py-1 bg-[#FF1744]/20 hover:bg-[#FF1744]/30 border border-[#FF1744] rounded text-[11px] font-bold text-white cursor-pointer"
            >
              RETRY CONNECTION
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredEvents.length === 0 && (
          <div className="py-16 text-center space-y-2 text-[#64748B]">
            <Calendar className="w-8 h-8 mx-auto opacity-30 text-[#00F0FF]" />
            <div className="text-xs text-[#94A3B8] font-bold">
              NO SCHEDULED EVENTS MATCH SPECIFIED CRITERIA
            </div>
            <div className="text-[10px]">
              Try selecting "[ALL EVENTS]" or clearing your search query.
            </div>
          </div>
        )}

        {/* Events Cards */}
        {!loading &&
          filteredEvents.map((event) => {
            const isNow = event.time_relative?.toLowerCase().includes("now");
            return (
              <div
                key={event.id}
                id={`event-card-${event.id}`}
                className="group p-3 rounded bg-[#0C1322] border border-[#1E2D4A] hover:border-[#00F0FF]/60 hover:bg-[#10192A] transition-all space-y-2 shadow-sm"
              >
                {/* Header Row: Category Pill & Time */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-[#B026FF]/40 bg-[#B026FF]/10 text-[#B026FF]">
                      {event.category_name}
                    </span>

                    {event.time_relative && (
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                          isNow
                            ? "border-[#00FF66]/50 bg-[#00FF66]/10 text-[#00FF66] animate-pulse"
                            : "border-[#00F0FF]/30 bg-[#00F0FF]/10 text-[#00F0FF]"
                        }`}
                      >
                        {event.time_relative.toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="text-[10px] text-[#FFEA00] flex items-center gap-1 font-bold">
                    <Clock className="w-3 h-3 text-[#FFEA00]/70" />
                    <span>{event.date} SLT</span>
                  </div>
                </div>

                {/* Event Title */}
                <button
                  onClick={() => handleSelectEvent(event)}
                  className="w-full text-left font-bold text-xs text-[#E2E8F0] group-hover:text-[#00F0FF] transition-colors line-clamp-2 cursor-pointer leading-snug"
                >
                  {event.title}
                </button>

                {/* Location / Sim Name */}
                <div className="flex items-center gap-1.5 text-[11px] text-[#94A3B8]">
                  <MapPin className="w-3.5 h-3.5 text-[#00F0FF] shrink-0" />
                  <span className="truncate">{event.location}</span>
                </div>

                {/* Action Buttons Row */}
                <div className="pt-1.5 border-t border-[#1E2D4A]/60 flex items-center justify-between gap-2">
                  <button
                    id={`view-details-${event.id}`}
                    onClick={() => handleSelectEvent(event)}
                    className="px-2.5 py-1 rounded bg-[#141E30] hover:bg-[#1E2D4A] border border-[#1E2D4A] text-[10px] text-[#00F0FF] font-bold tracking-wider cursor-pointer transition-colors"
                  >
                    DETAILS &amp; INFO
                  </button>

                  <div className="flex items-center gap-1.5">
                    {/* Copy SLURL */}
                    <button
                      id={`copy-slurl-${event.id}`}
                      onClick={() => handleCopySlurl(event.slurl, event.id)}
                      title="Copy Second Life Teleport URL"
                      className="px-2 py-1 rounded bg-[#080D1A] hover:bg-[#141E30] border border-[#1E2D4A] text-[10px] text-[#94A3B8] hover:text-[#00F0FF] flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {copiedId === event.id ? (
                        <>
                          <Check className="w-3 h-3 text-[#00FF66]" />
                          <span className="text-[#00FF66]">COPIED</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>SLURL</span>
                        </>
                      )}
                    </button>

                    {/* Launch Teleport in Viewer */}
                    <a
                      id={`tp-link-${event.id}`}
                      href={event.slurl}
                      className="px-2.5 py-1 rounded bg-[#00F0FF]/15 hover:bg-[#00F0FF]/25 border border-[#00F0FF]/50 text-[10px] text-[#00F0FF] font-bold tracking-wider flex items-center gap-1 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>TELEPORT</span>
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Event Details Inspection Modal */}
      {selectedEventId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-lg max-h-[85vh] flex flex-col bg-[#080D1A] border border-[#00F0FF]/40 rounded-lg shadow-[0_0_25px_rgba(0,240,255,0.15)] overflow-hidden">
            {/* Modal Header */}
            <div className="p-3 bg-[#0C1322] border-b border-[#1E2D4A] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#00F0FF] animate-pulse" />
                <span className="text-xs font-bold text-[#00F0FF] tracking-wider">
                  EVENT DOSSIER // OFFICIAL DISPATCH
                </span>
              </div>
              <button
                id="close-event-modal"
                onClick={() => setSelectedEventId(null)}
                className="p-1 rounded hover:bg-[#1E2D4A] text-[#94A3B8] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
              {detailLoading ? (
                <div className="py-12 text-center space-y-2 text-[#00F0FF]">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto" />
                  <div className="text-xs">&gt; RETRIEVING EVENT PROFILE FROM GRID...</div>
                </div>
              ) : eventDetail ? (
                <>
                  {/* Title & Date */}
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white leading-snug">
                      {eventDetail.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#FFEA00]">
                      <div className="flex items-center gap-1 font-bold">
                        <Clock className="w-3 h-3" />
                        <span>{eventDetail.date} SLT</span>
                      </div>
                      {eventDetail.duration && (
                        <span className="text-[#64748B]">· {eventDetail.duration}</span>
                      )}
                    </div>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded bg-[#0C1322] border border-[#1E2D4A] text-[11px]">
                    <div className="space-y-1">
                      <div className="text-[9px] text-[#64748B] font-bold">LOCATION / VENUE</div>
                      <div className="text-[#E2E8F0] font-medium flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#00F0FF] shrink-0" />
                        <span className="truncate">{eventDetail.location}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[9px] text-[#64748B] font-bold">HOST RESIDENT</div>
                      <div className="text-[#E2E8F0] font-medium flex items-center gap-1">
                        <User className="w-3 h-3 text-[#00FF66] shrink-0" />
                        <span className="truncate">{eventDetail.host_name || "Resident"}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[9px] text-[#64748B] font-bold">COVER FEE</div>
                      <div className="text-[#00FF66] font-bold flex items-center gap-1">
                        <DollarSign className="w-3 h-3 shrink-0" />
                        <span>{eventDetail.cover || "FREE"}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[9px] text-[#64748B] font-bold">EVENT ID</div>
                      <div className="text-[#94A3B8] font-mono">#{eventDetail.id}</div>
                    </div>
                  </div>

                  {/* Description Box */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] text-[#64748B] font-bold tracking-wider">
                      &gt; EVENT DESCRIPTION
                    </div>
                    <div className="p-3 rounded bg-[#050810] border border-[#1E2D4A] text-[#CBD5E1] text-[11px] leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {eventDetail.description}
                    </div>
                  </div>

                  {/* Notice */}
                  {sharedNotice && (
                    <div className="p-2 rounded bg-[#00FF66]/10 border border-[#00FF66]/40 text-[#00FF66] text-center font-bold text-[11px]">
                      &gt; {sharedNotice}
                    </div>
                  )}

                  {/* Teleport Actions */}
                  <div className="space-y-2 pt-2 border-t border-[#1E2D4A]">
                    <div className="text-[10px] text-[#64748B] truncate">
                      SLURL: <span className="text-[#00F0FF]">{eventDetail.slurl}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        id="modal-copy-slurl-btn"
                        onClick={() => handleCopySlurl(eventDetail.slurl, eventDetail.id)}
                        className="py-2 px-2 rounded bg-[#0C1322] hover:bg-[#141E30] border border-[#1E2D4A] text-[#94A3B8] hover:text-[#00F0FF] text-[10px] font-bold tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {copiedId === eventDetail.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#00FF66]" />
                            <span className="text-[#00FF66]">COPIED</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>COPY SLURL</span>
                          </>
                        )}
                      </button>

                      {session && (
                        <button
                          id="modal-share-chat-btn"
                          onClick={() => handleShareToLocalChat(eventDetail)}
                          className="py-2 px-2 rounded bg-[#0C1322] hover:bg-[#141E30] border border-[#1E2D4A] text-[#94A3B8] hover:text-[#FFEA00] text-[10px] font-bold tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>SHARE CHAT</span>
                        </button>
                      )}

                      <a
                        id="modal-launch-tp-btn"
                        href={eventDetail.slurl}
                        className="py-2 px-2 rounded bg-[#00F0FF] hover:bg-[#00F0FF]/90 text-[#050810] text-[10px] font-bold tracking-widest flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(0,240,255,0.3)] transition-all"
                      >
                        <Compass className="w-3.5 h-3.5" />
                        <span>TELEPORT</span>
                      </a>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
