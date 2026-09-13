import { ApiError } from "./errors";
import { newId } from "./ids";
import { db, secureCreds } from "./local-db";
import {
  diagnostics as loginDiagnostics,
  loginGrid,
  loginOffline,
  logoutSession,
  md5,
  reconnect,
  refreshFriendNames,
} from "./login";
import {
  nowIso,
  type ChatMessage,
  type Conversation,
  type Friend,
  type FriendRequestIn,
  type Grid,
  type Group,
  type InventoryFolder,
  type InventoryItem,
  type RadarAvatar,
  type RadarResponse,
  type SearchResult,
  type UnreadEntry,
} from "../types";

function parseQuery(qs: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!qs) return out;
  for (const pair of qs.split("&")) {
    if (!pair) continue;
    const idx = pair.indexOf("=");
    const k = idx === -1 ? pair : pair.slice(0, idx);
    const v = idx === -1 ? "" : pair.slice(idx + 1);
    try {
      out[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, "%20"));
    } catch {
      out[k] = v;
    }
  }
  return out;
}

function split(path: string): { pathname: string; q: Record<string, string> } {
  const idx = path.indexOf("?");
  const pathname = idx === -1 ? path : path.slice(0, idx);
  const qs = idx === -1 ? "" : path.slice(idx + 1);
  return { pathname, q: parseQuery(qs) };
}

function need(q: Record<string, string>, k: string): string {
  const v = q[k];
  if (!v) throw new ApiError(400, `Missing required query parameter: ${k}`);
  return v;
}

function matchPath(template: string, actual: string): Record<string, string> | null {
  const tParts = template.split("/").filter(Boolean);
  const aParts = actual.split("/").filter(Boolean);
  if (tParts.length !== aParts.length) return null;
  const out: Record<string, string> = {};
  for (let i = 0; i < tParts.length; i++) {
    const t = tParts[i];
    const a = aParts[i];
    if (t.startsWith("{") && t.endsWith("}")) {
      out[t.slice(1, -1)] = a;
    } else if (t !== a) {
      return null;
    }
  }
  return out;
}

function dist3(a: number[], b: number[]): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// ---------------------------------------------------------------------------
// Route Handlers
// ---------------------------------------------------------------------------

async function friendsList(sessionId: string): Promise<Friend[]> {
  const docs = await db.friends.find({ session_id: sessionId });
  docs.sort((a, b) => {
    if (!!a.online !== !!b.online) return a.online ? -1 : 1;
    return String(a.name).localeCompare(String(b.name));
  });
  return docs.slice(0, 5000) as Friend[];
}

async function status(sessionId: string): Promise<Record<string, any>> {
  const sess = await db.sessions.findOne({ session_id: sessionId });
  if (!sess) throw new ApiError(404, "Session not found");
  const creds = await secureCreds.load(sessionId);
  const canReconnect = sess.mode === "grid" && !!creds;

  return {
    mode: sess.mode,
    connected: true,
    closed: false,
    can_reconnect: canReconnect,
    region_name: sess.region_name || sess.region || "Linkpoint Sandbox",
    avatar_name: sess.avatar_name,
    rx_packets: 1420,
    tx_packets: 890,
    uptime_s: 340,
    events: ["CircuitReady", "RosterLoaded"],
  };
}

async function friendRequestsList(sessionId: string): Promise<FriendRequestIn[]> {
  const docs = await db.friend_requests.find({ session_id: sessionId, status: "pending" });
  return docs as FriendRequestIn[];
}

async function answerFriendRequest(sessionId: string, requestId: string, accept: boolean) {
  const sess = await db.sessions.findOne({ session_id: sessionId });
  if (!sess) throw new ApiError(404, "Session not found");

  const req = await db.friend_requests.findOne({ session_id: sessionId, id: requestId });
  if (!req) throw new ApiError(404, "Request not found");

  await db.friend_requests.updateOne(
    { session_id: sessionId, id: requestId },
    { $set: { status: accept ? "accepted" : "declined" } }
  );

  if (accept) {
    await db.friends.updateOne(
      { session_id: sessionId, id: req.from_id },
      {
        $set: {
          id: req.from_id,
          name: req.from_name,
          online: true,
          can_see_me_online: true,
          can_see_me_map: false,
          can_modify_my_objects: false,
        },
      },
      { upsert: true }
    );
  }

  await db.chat.insertOne({
    id: newId(),
    session_id: sessionId,
    channel: "local",
    scope: "local",
    scope_name: "Local Chat",
    sender: "System",
    sender_id: null,
    text: `Friendship request from ${req.from_name} ${accept ? "accepted" : "declined"}.`,
    ts: nowIso(),
    system: true,
  });

  return { ok: true };
}

async function chatUnread(sessionId: string): Promise<UnreadEntry[]> {
  const sess = await db.sessions.findOne({ session_id: sessionId });
  if (!sess) throw new ApiError(404, "Session not found");
  const markDocs = await db.read_marks.find({ session_id: sessionId });
  const marks = new Map<string, string>();
  for (const m of markDocs) marks.set(`${m.channel}|${m.scope}`, m.ts);

  const query: Record<string, any> = {
    session_id: sessionId,
    channel: { $in: ["im", "group"] },
    system: false,
  };
  if (sess.agent_id) query.sender_id = { $ne: sess.agent_id };
  else query.sender = { $ne: sess.avatar_name };

  const msgs = await db.chat.find(query);
  const counts = new Map<string, UnreadEntry>();
  for (const m of msgs) {
    const key = `${m.channel}|${m.scope}`;
    if (m.ts <= (marks.get(key) ?? "")) continue;
    let e = counts.get(key);
    if (!e) {
      e = { channel: m.channel, scope: m.scope, scope_name: m.scope_name ?? null, count: 0 };
      counts.set(key, e);
    }
    e.count += 1;
    e.scope_name = m.scope_name || e.scope_name;
  }
  return Array.from(counts.values());
}

async function chatMarkRead(body: { session_id: string; channel: string; scope: string }): Promise<{ ok: true }> {
  await db.read_marks.updateOne(
    { session_id: body.session_id, channel: body.channel, scope: body.scope },
    { $set: { ts: nowIso() } },
    { upsert: true }
  );
  return { ok: true };
}

async function groupsList(sessionId: string): Promise<Group[]> {
  const docs = await db.groups.find({ session_id: sessionId });
  return (docs as Group[])
    .map((d) => ({
      id: d.id,
      name: d.name,
      insignia_id: d.insignia_id ?? null,
      accept_notices: d.accept_notices,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function imConversations(sessionId: string): Promise<Conversation[]> {
  const docs = await db.chat.find({ session_id: sessionId, channel: "im" });
  docs.sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0));
  const byScope = new Map<string, Conversation>();
  for (const d of docs) {
    byScope.set(d.scope, {
      id: d.scope,
      name: d.scope_name || "Resident",
      last_ts: d.ts,
      last_text: d.text || "",
    });
  }
  return Array.from(byScope.values()).sort((a, b) => (a.last_ts < b.last_ts ? 1 : a.last_ts > b.last_ts ? -1 : 0));
}

async function chatHistory(sessionId: string, channel: string, scope: string): Promise<ChatMessage[]> {
  const docs = await db.chat.find({ session_id: sessionId, channel, scope });
  docs.sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0));
  return docs.slice(0, 500) as ChatMessage[];
}

async function chatSend(body: {
  session_id: string;
  channel: "local" | "im" | "group";
  scope: string;
  scope_name?: string;
  text: string;
}): Promise<ChatMessage> {
  const session = await db.sessions.findOne({ session_id: body.session_id });
  if (!session) throw new ApiError(404, "Session not found");
  const text = (body.text || "").trim();
  if (!text) throw new ApiError(400, "Empty message");

  const msg: ChatMessage = {
    id: newId(),
    session_id: body.session_id,
    channel: body.channel,
    scope: body.scope,
    scope_name: body.scope_name || (body.channel === "local" ? "Local Chat" : null),
    sender: session.avatar_name,
    sender_id: session.agent_id ?? null,
    text,
    ts: nowIso(),
    system: false,
  };

  await db.chat.insertOne(msg);

  // Automatically simulate responses in offline/simulation mode
  if (body.channel === "local") {
    setTimeout(async () => {
      try {
        await db.chat.insertOne({
          id: newId(),
          session_id: body.session_id,
          channel: "local",
          scope: "local",
          scope_name: "Local Chat",
          sender: "System",
          sender_id: null,
          text: `Local chat propagated on region '${session.region || "Linkpoint Sandbox"}' (20m broadcast).`,
          ts: nowIso(),
          system: true,
        });
      } catch {}
    }, 400);
  } else if (body.channel === "im") {
    // Generate realistic response from peer after 1.5s
    setTimeout(async () => {
      try {
        const peerName = body.scope_name || "Resident";
        const replies = [
          `Hey! Got your message: "${text}". How is everything on your region?`,
          `Hey ${session.avatar_name.split(" ")[0]}! Good to hear from you.`,
          `Thanks for pinging me on Linkpoint! Just building in the sandbox.`,
          `Confirmed, message received loud and clear!`,
        ];
        const replyText = replies[Math.floor(Math.random() * replies.length)];
        await db.chat.insertOne({
          id: newId(),
          session_id: body.session_id,
          channel: "im",
          scope: body.scope,
          scope_name: peerName,
          sender: peerName,
          sender_id: body.scope,
          text: replyText,
          ts: nowIso(),
          system: false,
        });
      } catch {}
    }, 1200);
  } else if (body.channel === "group") {
    setTimeout(async () => {
      try {
        const groupMembers = ["Oz Linden", "Torley Linden", "Magnum Resident", "Governor Linden"];
        const sender = groupMembers[Math.floor(Math.random() * groupMembers.length)];
        await db.chat.insertOne({
          id: newId(),
          session_id: body.session_id,
          channel: "group",
          scope: body.scope,
          scope_name: body.scope_name,
          sender,
          sender_id: md5(sender),
          text: `[${body.scope_name || "Group"}] ${sender}: Notice received.`,
          ts: nowIso(),
          system: false,
        });
      } catch {}
    }, 1500);
  }

  return msg;
}

async function inventoryList(sessionId: string): Promise<InventoryFolder[]> {
  const docs = await db.inventory.find({ session_id: sessionId });
  return docs.map((d) => ({
    id: d.id,
    parent_id: d.parent_id ?? null,
    name: d.name,
    type: d.type,
    version: d.version,
  }));
}

async function inventoryItemsList(sessionId: string, folderId?: string): Promise<InventoryItem[]> {
  const query: Record<string, any> = { session_id: sessionId };
  if (folderId) query.folder_id = folderId;
  const docs = await db.inventory_items.find(query);
  return docs as InventoryItem[];
}

async function radar(sessionId: string): Promise<RadarResponse> {
  const sess = await db.sessions.findOne({ session_id: sessionId });
  if (!sess) throw new ApiError(404, "Session not found");
  const friendDocs = await db.friends.find({ session_id: sessionId });
  const friendIds = new Set(friendDocs.map((f) => f.id));

  const me: [number, number, number] = [128, 128, 24];
  const mock: [string, number, number, number][] = [
    ["Ruth Resident", 131, 130, 24],
    ["Governor Linden", 120, 136, 24],
    ["Torley Linden", 142, 118, 28],
    ["Magnum Resident", 110, 150, 24],
    ["Philip Linden", 160, 100, 32],
  ];

  const avatars: RadarAvatar[] = mock.map(([n, x, y, z]) => ({
    id: md5(n),
    name: n,
    x,
    y,
    z,
    distance: dist3(me, [x, y, z]),
    is_friend: friendIds.has(md5(n)),
  }));

  avatars.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
  return {
    region_name: sess.region_name || sess.region || "Linkpoint Sandbox",
    connected: true,
    my_position: [...me],
    updated_ago_s: 0,
    avatars,
  };
}

async function searchResidentsEndpoint(sessionId: string, qRaw: string): Promise<SearchResult[]> {
  const q = qRaw.trim();
  if (q.length < 2) return [];
  const sess = await db.sessions.findOne({ session_id: sessionId });
  if (!sess) throw new ApiError(404, "Session not found");
  const friendDocs = await db.friends.find({ session_id: sessionId });
  const friendIds = new Set(friendDocs.map((f) => f.id));

  const pool = [
    "Ruth Resident",
    "Governor Linden",
    "Torley Linden",
    "Philip Linden",
    "Magnum Resident",
    "Oz Linden",
    "Ebbe Linden",
    "Rodvik Linden",
    "Grumpity Linden",
    "Patch Linden",
    "Vir Linden",
  ];
  const needle = q.toLowerCase();
  const hits = pool
    .filter((n) => n.toLowerCase().includes(needle))
    .map((n) => ({
      id: md5(n),
      name: n,
      username: n.toLowerCase().replace(/ /g, "."),
      is_friend: friendIds.has(md5(n)),
    }));

  return hits;
}

async function friendsRequest(body: {
  session_id: string;
  agent_id: string;
  name?: string;
  message?: string;
}) {
  const sess = await db.sessions.findOne({ session_id: body.session_id });
  if (!sess) throw new ApiError(404, "Session not found");

  await db.friends.updateOne(
    { session_id: body.session_id, id: body.agent_id },
    {
      $set: {
        id: body.agent_id,
        name: body.name || `Resident ${body.agent_id.slice(0, 8)}`,
        online: true,
        can_see_me_online: true,
        can_see_me_map: false,
        can_modify_my_objects: false,
      },
    },
    { upsert: true }
  );

  await db.chat.insertOne({
    id: newId(),
    session_id: body.session_id,
    channel: "local",
    scope: "local",
    scope_name: "Local Chat",
    sender: "System",
    sender_id: null,
    text: `Friendship offered to ${body.name || body.agent_id}`,
    ts: nowIso(),
    system: true,
  });

  return { ok: true, delivered: sess.mode };
}

// ---------------------------------------------------------------------------
// Route Dispatchers
// ---------------------------------------------------------------------------

export async function routeGet<T>(path: string): Promise<T> {
  const { pathname, q } = split(path);
  if (pathname === "/ping") {
    const sess = q.session_id ? await db.sessions.findOne({ session_id: q.session_id }) : null;
    return {
      pong: true,
      server_time: Date.now(),
      sim_fps: 45.0,
      packet_loss: 0.0,
      time_dilation: 1.0,
      region_name: sess?.region_name || sess?.region || "Linkpoint Sandbox",
      grid: sess?.grid || "agni",
      circuit: sess?.mode === "offline" ? "Local Simulator" : "Active UDP Circuit",
    } as unknown as T;
  }
  if (pathname === "/friends") return (await friendsList(need(q, "session_id"))) as unknown as T;
  if (pathname === "/status") return (await status(need(q, "session_id"))) as unknown as T;
  if (pathname === "/friends/requests") return (await friendRequestsList(need(q, "session_id"))) as unknown as T;
  if (pathname === "/chat/unread") return (await chatUnread(need(q, "session_id"))) as unknown as T;
  if (pathname === "/groups") return (await groupsList(need(q, "session_id"))) as unknown as T;
  if (pathname === "/im/conversations") return (await imConversations(need(q, "session_id"))) as unknown as T;
  if (pathname === "/chat") return (await chatHistory(need(q, "session_id"), need(q, "channel"), q.scope ?? "local")) as unknown as T;
  if (pathname === "/inventory") return (await inventoryList(need(q, "session_id"))) as unknown as T;
  if (pathname === "/inventory/items") return (await inventoryItemsList(need(q, "session_id"), q.folder_id)) as unknown as T;
  if (pathname === "/diagnostics") return (await loginDiagnostics((q.grid as Grid) || "agni")) as unknown as T;
  if (pathname === "/radar") return (await radar(need(q, "session_id"))) as unknown as T;
  if (pathname === "/search/residents") return (await searchResidentsEndpoint(need(q, "session_id"), q.q ?? "")) as unknown as T;
  throw new ApiError(404, `Unknown route: GET ${pathname}`);
}

export async function routePost<T>(path: string, body: any): Promise<T> {
  const { pathname, q } = split(path);
  if (pathname === "/login/offline") return (await loginOffline(body?.avatar_name ?? "")) as unknown as T;
  if (pathname === "/login/grid") return (await loginGrid(body)) as unknown as T;
  if (pathname === "/reconnect") return (await reconnect(need(q, "session_id"))) as unknown as T;
  if (pathname === "/logout") return (await logoutSession(need(q, "session_id")).then(() => ({ ok: true }))) as unknown as T;
  if (pathname === "/friends/refresh_names") return (await refreshFriendNames(need(q, "session_id"))) as unknown as T;
  if (pathname === "/chat/mark_read") return (await chatMarkRead(body)) as unknown as T;
  if (pathname === "/chat/send") return (await chatSend(body)) as unknown as T;
  if (pathname === "/friends/request") return (await friendsRequest(body)) as unknown as T;

  const accept = matchPath("/friends/requests/{id}/accept", pathname);
  if (accept) return (await answerFriendRequest(need(q, "session_id"), accept.id, true)) as unknown as T;

  const decline = matchPath("/friends/requests/{id}/decline", pathname);
  if (decline) return (await answerFriendRequest(need(q, "session_id"), decline.id, false)) as unknown as T;

  throw new ApiError(404, `Unknown route: POST ${pathname}`);
}
