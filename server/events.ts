/**
 * Official Second Life Events Fetcher & Parser
 * Pulls authentic real-time event listings directly from Linden Lab:
 * - https://secondlife.com/events/upcoming.php
 * - https://secondlife.com/events/embedEvent.php?id={id}
 */

export interface SLEventCategory {
  id: string;
  name: string;
  count: number;
}

export interface SLEventItem {
  id: string;
  category_id: string;
  category_name: string;
  date: string;
  title: string;
  slurl: string;
  location: string;
  time_relative?: string;
  host_name?: string;
  cover?: string;
}

export interface SLEventDetail {
  id: string;
  title: string;
  date: string;
  duration: string;
  location: string;
  slurl: string;
  host_name: string;
  host_url: string;
  cover: string;
  description: string;
}

// In-memory cache for speed and resilience
interface CacheEntry<T> {
  data: T;
  expires: number;
}

const eventsCache = new Map<string, CacheEntry<{ categories: SLEventCategory[]; events: SLEventItem[] }>>();
const eventDetailCache = new Map<string, CacheEntry<SLEventDetail>>();

function decodeHtmlEntities(str: string): string {
  if (!str) return "";
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

/**
 * Standard known Second Life event category lookup table
 */
export const POPULAR_SL_CATEGORIES: Record<string, string> = {
  "0": "All Categories",
  "20": "Live Music",
  "30": "Live DJ",
  "23": "Nightlife/Entertainment",
  "26": "Education",
  "24": "Games/Contests",
  "18": "Discussion",
  "27": "Arts and Culture",
  "28": "Charity/Support",
  "31": "Spirituality",
  "22": "Commercial",
  "19": "Sports",
  "25": "Pageants",
  "29": "Miscellaneous",
};

/**
 * Calculates a human-readable relative SLT timeframe
 */
function computeRelativeTime(dateStr: string): string {
  try {
    // dateStr format e.g. "09/12 10:00 AM"
    // Second Life runs on US Pacific Time (PT / SLT)
    const match = dateStr.match(/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return "Upcoming";

    const [, month, day, hoursStr, minsStr, ampm] = match;
    let hour = parseInt(hoursStr, 10);
    const minute = parseInt(minsStr, 10);
    if (ampm.toUpperCase() === "PM" && hour < 12) hour += 12;
    if (ampm.toUpperCase() === "AM" && hour === 12) hour = 0;

    // Current SLT time (America/Los_Angeles)
    const now = new Date();
    const sltString = now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" });
    const nowSLT = new Date(sltString);

    const eventDate = new Date(nowSLT.getFullYear(), parseInt(month, 10) - 1, parseInt(day, 10), hour, minute);
    const diffMs = eventDate.getTime() - nowSLT.getTime();
    const diffMins = Math.round(diffMs / 60000);

    if (diffMins < -90) return "Concluded";
    if (diffMins < 0) return "Happening Now";
    if (diffMins < 60) return `In ${diffMins} min`;
    const diffHours = Math.round(diffMins / 60);
    if (diffHours < 24) return `In ${diffHours} hr`;
    const diffDays = Math.round(diffHours / 24);
    return `In ${diffDays} day${diffDays > 1 ? "s" : ""}`;
  } catch {
    return "Upcoming";
  }
}

/**
 * Fetches official upcoming events from Linden Lab with optional category filter
 */
export async function getSecondLifeEvents(
  categoryId: string = "0",
  searchQuery: string = ""
): Promise<{ categories: SLEventCategory[]; events: SLEventItem[]; fetched_at: string; total: number }> {
  const cacheKey = `cat_${categoryId}`;
  const now = Date.now();

  let cached = eventsCache.get(cacheKey);
  if (!cached || cached.expires < now) {
    try {
      let url = "https://secondlife.com/events/upcoming.php?lang=en-US&per_page=45";
      if (categoryId && categoryId !== "0" && categoryId !== "all") {
        url += `&cat=${encodeURIComponent(categoryId)}`;
      }

      const resp = await fetch(url, {
        headers: {
          "User-Agent": "Linkpoint-Mobile/1.0 (SL Events Parser; +https://secondlife.com)",
          Accept: "text/html,application/xhtml+xml",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!resp.ok) {
        throw new Error(`Second Life Events server HTTP ${resp.status}`);
      }

      const html = await resp.text();

      // 1. Parse categories from dropdown
      const categories: SLEventCategory[] = [];
      const catMap = new Map<string, string>();
      const catRegex = /<option\s+value="(\d+)"[^>]*>([^<]+)<\/option>/gi;
      let cm;
      while ((cm = catRegex.exec(html)) !== null) {
        const id = cm[1];
        const raw = cm[2].trim();
        const countMatch = raw.match(/^(.*?)\s*\((\d+)\)$/);
        const name = countMatch ? countMatch[1].trim() : raw;
        const count = countMatch ? parseInt(countMatch[2], 10) : 0;
        categories.push({ id, name, count });
        catMap.set(id, name);
      }

      // Ensure standard categories exist if dropdown was sparse
      if (categories.length === 0) {
        for (const [id, name] of Object.entries(POPULAR_SL_CATEGORIES)) {
          categories.push({ id, name, count: 0 });
          catMap.set(id, name);
        }
      }

      // 2. Parse events rows
      const events: SLEventItem[] = [];
      const trRegex = /<tr\s+data-event-id="(\d+)"\s+data-category-id="(\d+)">([\s\S]*?)<\/tr>/gi;
      let trM;
      while ((trM = trRegex.exec(html)) !== null) {
        const eventId = trM[1];
        const catId = trM[2];
        const inner = trM[3];

        const dateMatch = inner.match(/<td class="event_date">([^<]+)<\/td>/i);
        const linkMatch = inner.match(/<a class="event-link"[^>]*>([\s\S]*?)<\/(?:a|td)>/i);
        const slurlMatch = inner.match(/href="(secondlife:\/\/\/[^"]+)"[^>]*>([\s\S]*?)<\/(?:a|td)>/i);

        const date = dateMatch ? dateMatch[1].trim() : "";
        const title = decodeHtmlEntities(linkMatch ? linkMatch[1] : "Untitled Event");
        const slurl = slurlMatch ? slurlMatch[1] : "";
        const location = decodeHtmlEntities(slurlMatch ? slurlMatch[2] : "");
        const category_name = catMap.get(catId) || POPULAR_SL_CATEGORIES[catId] || "Community";

        events.push({
          id: eventId,
          category_id: catId,
          category_name,
          date,
          title,
          slurl,
          location,
          time_relative: computeRelativeTime(date),
        });
      }

      cached = {
        data: { categories, events },
        expires: now + 2 * 60 * 1000, // 2 minutes cache
      };
      eventsCache.set(cacheKey, cached);
    } catch (err: any) {
      console.warn("Error fetching official Second Life events:", err?.message || err);
      // If cached data is available even if expired, reuse it
      if (!cached) {
        return {
          categories: Object.entries(POPULAR_SL_CATEGORIES).map(([id, name]) => ({ id, name, count: 0 })),
          events: [],
          fetched_at: new Date().toISOString(),
          total: 0,
        };
      }
    }
  }

  let filtered = cached.data.events;
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q) ||
        e.category_name.toLowerCase().includes(q)
    );
  }

  return {
    categories: cached.data.categories,
    events: filtered,
    fetched_at: new Date().toISOString(),
    total: filtered.length,
  };
}

/**
 * Fetches full details for an individual Second Life event
 */
export async function getSecondLifeEventDetail(eventId: string): Promise<SLEventDetail | null> {
  const now = Date.now();
  const cached = eventDetailCache.get(eventId);
  if (cached && cached.expires > now) {
    return cached.data;
  }

  try {
    const url = `https://secondlife.com/events/embedEvent.php?id=${encodeURIComponent(eventId)}`;
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Linkpoint-Mobile/1.0 (SL Events Parser; +https://secondlife.com)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!resp.ok) return null;
    const html = await resp.text();

    const titleMatch = html.match(/<h4><a[^>]*>([\s\S]*?)<\/a><\/h4>/i);
    const dateMatch = html.match(/<div class="quiet">[\s\r\n]*([^<]+)<br>/i);
    const durationMatch = html.match(/(\d+\s*minutes|\d+\s*hours)/i);
    const hostMatch = html.match(/Hosted by <a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
    const coverMatch = html.match(/Cover:\s*([^<\r\n]+)/i);
    const descMatch = html.match(/<div class="event_desc">([\s\S]*?)<\/div>/i);
    const slurlMatch = html.match(/<a href="(secondlife:\/\/\/[^"]+)">([\s\S]*?)<\/a>/i);

    const detail: SLEventDetail = {
      id: eventId,
      title: decodeHtmlEntities(titleMatch ? titleMatch[1] : "Second Life Event"),
      date: dateMatch ? dateMatch[1].trim() : "",
      duration: durationMatch ? durationMatch[1].trim() : "60 minutes",
      location: decodeHtmlEntities(slurlMatch ? slurlMatch[2] : ""),
      slurl: slurlMatch ? slurlMatch[1] : "",
      host_name: decodeHtmlEntities(hostMatch ? hostMatch[2] : "Resident"),
      host_url: hostMatch ? hostMatch[1] : "",
      cover: coverMatch ? coverMatch[1].trim() : "FREE",
      description: decodeHtmlEntities(descMatch ? descMatch[1] : "No description provided for this event."),
    };

    eventDetailCache.set(eventId, {
      data: detail,
      expires: now + 10 * 60 * 1000, // 10 minutes cache
    });

    return detail;
  } catch (err: any) {
    console.warn(`Error fetching event detail ${eventId}:`, err?.message);
    return null;
  }
}
