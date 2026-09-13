import type { Session } from "./types";
import { ApiError } from "./sl/errors";

function mapPath(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (p.startsWith("/login/grid") || p === "/login") {
    return "/api/sl/login";
  }
  if (p.startsWith("/search/residents")) {
    return p.replace("/search/residents", "/api/sl/search");
  }
  if (!p.startsWith("/api/sl")) {
    return `/api/sl${p}`;
  }
  return p;
}

export const api = {
  async post<T>(path: string, body: any): Promise<T> {
    const url = mapPath(path);
    let payload = body;
    if (url === "/api/sl/login" && body && body.first && !body.username) {
      const first = String(body.first).trim();
      const last = body.last ? String(body.last).trim() : "Resident";
      payload = {
        ...body,
        username: `${first} ${last}`,
      };
    }

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload || {}),
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new ApiError(resp.status, data.error || data.message || "Request failed");
    }
    return data as T;
  },

  async get<T>(path: string): Promise<T> {
    const url = mapPath(path);
    const resp = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new ApiError(resp.status, data.error || data.message || "Request failed");
    }
    return data as T;
  },
};

export type {
  Session,
  Friend,
  Group,
  Conversation,
  SearchResult,
  CircuitStatus,
  FriendRequestIn,
  RadarAvatar,
  RadarResponse,
  UnreadEntry,
  ScopeTarget,
  ChatMessage,
  InventoryFolder,
  InventoryItem,
  ContentPermissions,
  Diagnostics,
  SLEventCategory,
  SLEventItem,
  SLEventDetail,
  UDPCircuitStatus,
  UDPPacketLog,
  TypingUser,
  TypingResponse,
  SLWorldObject,
  SLObjectShape,
  SLClickAction,
  LSLDialog,
  SLParcel,
  LindenTransaction,
  WornItem,
  OutfitPreset,
  AppearanceData,
  RealSimWorldData,
} from "./types";

const KEY = "linkpoint.session";

export async function saveSession(s: Session) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  }
}

export async function loadSession(): Promise<Session | null> {
  if (typeof window === "undefined") return null;
  const s = window.localStorage.getItem(KEY);
  return s ? JSON.parse(s) : null;
}

export async function clearSession() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(KEY);
  }
}

export async function reconnectSession(s: Session): Promise<Session> {
  const resp = await api.post<any>(`/reconnect?session_id=${s.session_id}`, {});
  const next: Session = {
    ...s,
    avatar_name: resp.avatar_name,
    agent_id: resp.agent_id,
    region: resp.region,
    login_message: resp.login_message,
  };
  await saveSession(next);
  return next;
}

// Live Events API
export async function getLiveEvents(cat: string = "0", search: string = ""): Promise<{
  categories: import("./types").SLEventCategory[];
  events: import("./types").SLEventItem[];
  fetched_at: string;
  total: number;
}> {
  const params = new URLSearchParams();
  if (cat && cat !== "0") params.set("cat", cat);
  if (search) params.set("q", search);
  const qStr = params.toString() ? `?${params.toString()}` : "";
  return api.get(`/events${qStr}`);
}

export async function getLiveEventDetail(eventId: string): Promise<import("./types").SLEventDetail> {
  return api.get(`/events/${encodeURIComponent(eventId)}`);
}

// Live UDP Circuit API
export async function getUdpCircuitStatus(sessionId: string): Promise<import("./types").UDPCircuitStatus> {
  return api.get(`/udp/status?session_id=${encodeURIComponent(sessionId)}`);
}

export async function pingUdpCircuit(sessionId: string): Promise<{
  ok: boolean;
  latency_ms: number;
  tx_packets: number;
  rx_packets: number;
}> {
  return api.post(`/udp/ping`, { session_id: sessionId });
}

export async function reconnectUdpCircuit(sessionId: string): Promise<{
  ok: boolean;
  socket_state: string;
  sim_port: number;
  circuit_code: number;
}> {
  return api.post(`/udp/reconnect`, { session_id: sessionId });
}

export async function sendUdpTestPacket(sessionId: string): Promise<{
  ok: boolean;
  message: string;
}> {
  return api.post(`/udp/send_test`, { session_id: sessionId });
}

// SL Messaging Protocol: Real-Time Typing Indicators
export async function sendTypingStatus(
  sessionId: string,
  channel: "local" | "im" | "group",
  scope: string,
  typing: boolean
): Promise<{ ok: boolean }> {
  return api.post(`/chat/typing`, {
    session_id: sessionId,
    channel,
    scope,
    typing,
  });
}

export async function getTypingStatus(
  sessionId: string,
  channel: "local" | "im" | "group",
  scope: string
): Promise<import("./types").TypingResponse> {
  return api.get(
    `/chat/typing?session_id=${encodeURIComponent(sessionId)}&channel=${encodeURIComponent(
      channel
    )}&scope=${encodeURIComponent(scope)}`
  );
}

export async function triggerMockTyping(
  sessionId: string,
  channel: "local" | "im" | "group",
  scope: string,
  senderName?: string
): Promise<{ ok: boolean; message: string }> {
  return api.post(`/chat/mock_typing`, {
    session_id: sessionId,
    channel,
    scope,
    sender_name: senderName,
  });
}
