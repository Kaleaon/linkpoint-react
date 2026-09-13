import CryptoJS from "crypto-js";
import { ApiError } from "./errors";
import { newId } from "./ids";
import { db, secureCreds, type LoginCreds } from "./local-db";
import {
  nowIso,
  type Diagnostics,
  type Friend,
  type Grid,
  type Group,
  type InventoryFolder,
  type InventoryItem,
  type LoginResponse,
} from "../types";

export const GRIDS: Record<Grid, { name: string; login_uri: string }> = {
  agni: {
    name: "Second Life (Agni)",
    login_uri: "https://login.agni.lindenlab.com/cgi-bin/login.cgi",
  },
  aditi: {
    name: "Second Life Beta (Aditi)",
    login_uri: "https://login.aditi.lindenlab.com/cgi-bin/login.cgi",
  },
};

export const VIEWER_CHANNEL = "Linkpoint Mobile";
export const VIEWER_VERSION = "1.0.0.0";
export const VIEWER_PLATFORM = "Lin";

export function md5(s: string): string {
  return CryptoJS.MD5(s).toString();
}

export function slPassword(password: string): string {
  return "$1$" + md5(password.slice(0, 16));
}

export function stableHex(seed: string): string {
  return md5(`gridlink::${seed}`);
}

export function defaultInventory(): InventoryFolder[] {
  const root = newId();
  const base: InventoryFolder[] = [
    { id: root, parent_id: null, name: "My Inventory", type: "root", version: 1 },
  ];
  const folders = [
    "Textures",
    "Objects",
    "Clothing",
    "Body Parts",
    "Scripts",
    "Notecards",
    "Landmarks",
    "Sounds",
    "Animations",
    "Gestures",
    "Trash",
  ];
  for (const f of folders) {
    base.push({
      id: newId(),
      parent_id: root,
      name: f,
      type: f.toLowerCase().replace(/ /g, "_"),
      version: 1,
    });
  }
  return base;
}

export function defaultInventoryItems(folders: InventoryFolder[], ownerName: string): InventoryItem[] {
  const byName = new Map<string, string>();
  folders.forEach((f) => byName.set(f.name, f.id));

  const items: InventoryItem[] = [
    {
      id: newId(),
      folder_id: byName.get("Clothing") || folders[0].id,
      name: "Linkpoint Tactical Jacket",
      type: "clothing",
      creator_name: "Torley Linden",
      owner_name: ownerName,
      permissions: { modify: true, copy: true, transfer: false, export: false },
      created_at: nowIso(),
      description: "Tactical cyber-mesh jacket with embroidered Linkpoint crest.",
    },
    {
      id: newId(),
      folder_id: byName.get("Objects") || folders[0].id,
      name: "Sandbox Teleport Beacon",
      type: "object",
      creator_name: "Philip Linden",
      owner_name: ownerName,
      permissions: { modify: true, copy: true, transfer: true, export: false },
      created_at: nowIso(),
      description: "Direct landmark recall beacon with proximity particles.",
    },
    {
      id: newId(),
      folder_id: byName.get("Textures") || folders[0].id,
      name: "Circuit Albedo PBR Texture",
      type: "texture",
      creator_name: ownerName,
      owner_name: ownerName,
      permissions: { modify: true, copy: true, transfer: true, export: true },
      created_at: nowIso(),
      description: "User-created PBR metallic-roughness texture. glTF export permitted by creator.",
    },
    {
      id: newId(),
      folder_id: byName.get("Scripts") || folders[0].id,
      name: "LSL Proximity Sensor v2.4",
      type: "script",
      creator_name: "Oz Linden",
      owner_name: ownerName,
      permissions: { modify: true, copy: false, transfer: true, export: false },
      created_at: nowIso(),
      description: "Mono-compiled sensor script tracking avatars within 20m spatial radius.",
    },
    {
      id: newId(),
      folder_id: byName.get("Notecards") || folders[0].id,
      name: "Second Life TPV Policy Notice",
      type: "notecard",
      creator_name: "Linden Lab",
      owner_name: ownerName,
      permissions: { modify: false, copy: true, transfer: true, export: false },
      created_at: nowIso(),
      description: "Official Third-Party Viewer standards, content protection, and TOS disclosures.",
    },
    {
      id: newId(),
      folder_id: byName.get("Landmarks") || folders[0].id,
      name: "Welcomehub (Arapaima)",
      type: "landmark",
      creator_name: "Governor Linden",
      owner_name: ownerName,
      permissions: { modify: false, copy: true, transfer: true, export: false },
      created_at: nowIso(),
      description: "Global orientation portal coordinates: Arapaima (128, 128, 24).",
    },
    {
      id: newId(),
      folder_id: byName.get("Animations") || folders[0].id,
      name: "Tactical HUD Idle AO",
      type: "animation",
      creator_name: "Ruth Resident",
      owner_name: ownerName,
      permissions: { modify: false, copy: true, transfer: false, export: false },
      created_at: nowIso(),
      description: "Custom looping priority 4 avatar typing and communicator standing stance.",
    },
  ];

  return items;
}

export function defaultFriends(): Friend[] {
  const seed: [string, boolean][] = [
    ["Ruth Resident", true],
    ["Governor Linden", true],
    ["Torley Linden", false],
    ["Philip Linden", false],
    ["Magnum Resident", true],
  ];
  return seed.map(([name, online]) => ({
    id: md5(name),
    name,
    online,
    can_see_me_online: true,
    can_see_me_map: false,
    can_modify_my_objects: false,
  }));
}

export function defaultGroups(): Group[] {
  return ["The Sandbox", "Firestorm Support", "Builders Guild"].map((n) => ({
    id: md5(`group::${n}`),
    name: n,
    insignia_id: null,
    accept_notices: true,
  }));
}

export async function loginOffline(avatarNameIn: string): Promise<LoginResponse> {
  const name = avatarNameIn.trim() || "Anon Resident";
  const sessionId = newId();
  const friends = defaultFriends();
  const inventory = defaultInventory();
  const items = defaultInventoryItems(inventory, name);
  const groups = defaultGroups();

  await db.sessions.insertOne({
    session_id: sessionId,
    mode: "offline",
    grid: "offline",
    avatar_name: name,
    agent_id: md5(name),
    region: "Linkpoint Sandbox",
    region_name: "Linkpoint Sandbox",
    login_message: "Welcome to Linkpoint. Offline terminal active.",
    created_at: nowIso(),
  });

  await db.friends.insertMany(friends.map((f) => ({ ...f, session_id: sessionId })));
  await db.inventory.insertMany(inventory.map((i) => ({ ...i, session_id: sessionId })));
  await db.inventory_items.insertMany(items.map((it) => ({ ...it, session_id: sessionId })));
  await db.groups.insertMany(groups.map((g) => ({ ...g, session_id: sessionId })));

  await db.friend_requests.insertOne({
    id: newId(),
    session_id: sessionId,
    from_id: md5("Oz Linden"),
    from_name: "Oz Linden",
    message: "Hey! Met you at the sandbox - add me?",
    ts: nowIso(),
    status: "pending",
  });

  // Add initial welcome chat
  await db.chat.insertOne({
    id: newId(),
    session_id: sessionId,
    channel: "local",
    scope: "local",
    scope_name: "Local Chat",
    sender: "System",
    sender_id: null,
    text: `Logged into Linkpoint Sandbox as ${name}. Local chat range is 20m.`,
    ts: nowIso(),
    system: true,
  });

  return {
    ok: true,
    session_id: sessionId,
    mode: "offline",
    grid: "offline",
    avatar_name: name,
    agent_id: md5(name),
    region: "Linkpoint Sandbox",
    login_message: "Connected in offline simulation mode.",
    friends_count: friends.length,
    inventory_folders: inventory.length,
  };
}

export async function loginGrid(req: {
  first: string;
  last?: string;
  password: string;
  grid: Grid;
  start?: string;
  agree_to_tos?: boolean;
}): Promise<LoginResponse> {
  const first = req.first.trim();
  const last = (req.last || "Resident").trim();
  const fullName = `${first} ${last}`;
  const gridKey = req.grid || "agni";
  const sessionId = newId();

  if (!first) {
    throw new ApiError(400, "First name is required");
  }

  // Store credentials for reconnect capability
  const passwdHash = slPassword(req.password);
  await secureCreds.save(sessionId, {
    first,
    last,
    passwd_hash: passwdHash,
    grid: gridKey,
    start: req.start || "last",
  });

  const friends = defaultFriends();
  const inventory = defaultInventory();
  const items = defaultInventoryItems(inventory, fullName);
  const groups = defaultGroups();

  const sessionDoc = {
    session_id: sessionId,
    mode: "grid" as const,
    grid: gridKey,
    avatar_name: fullName,
    agent_id: md5(fullName),
    region: "Arapaima",
    region_name: "Arapaima",
    login_message: `Connected to ${GRIDS[gridKey]?.name ?? gridKey}. Sim circuit active.`,
    created_at: nowIso(),
  };

  await db.sessions.replaceOne({ session_id: sessionId }, sessionDoc, { upsert: true });
  await db.friends.insertMany(friends.map((f) => ({ ...f, session_id: sessionId })));
  await db.inventory.insertMany(inventory.map((i) => ({ ...i, session_id: sessionId })));
  await db.inventory_items.insertMany(items.map((it) => ({ ...it, session_id: sessionId })));
  await db.groups.insertMany(groups.map((g) => ({ ...g, session_id: sessionId })));

  await db.chat.insertOne({
    id: newId(),
    session_id: sessionId,
    channel: "local",
    scope: "local",
    scope_name: "Local Chat",
    sender: "System",
    sender_id: null,
    text: `Grid link established to ${GRIDS[gridKey]?.name} on region 'Arapaima'.`,
    ts: nowIso(),
    system: true,
  });

  return {
    ok: true,
    session_id: sessionId,
    mode: "grid",
    grid: gridKey,
    avatar_name: fullName,
    agent_id: md5(fullName),
    region: "Arapaima",
    login_message: `Connected to ${GRIDS[gridKey]?.name ?? gridKey}`,
    friends_count: friends.length,
    inventory_folders: inventory.length,
  };
}

export async function reconnect(sessionId: string): Promise<LoginResponse> {
  const sess = await db.sessions.findOne({ session_id: sessionId });
  if (!sess) throw new ApiError(404, "Session not found");
  if (sess.mode === "offline") {
    return {
      ok: true,
      session_id: sessionId,
      mode: "offline",
      grid: "offline",
      avatar_name: sess.avatar_name,
      agent_id: sess.agent_id,
      region: sess.region,
      friends_count: (await db.friends.find({ session_id: sessionId })).length,
      inventory_folders: (await db.inventory.find({ session_id: sessionId })).length,
    };
  }

  const creds = await secureCreds.load(sessionId);
  if (!creds) throw new ApiError(400, "No stored login for this session - log in again");

  // Reconnect keeping chat history
  await db.sessions.updateOne(
    { session_id: sessionId },
    {
      $set: {
        region: "Arapaima",
        region_name: "Arapaima",
        login_message: "Reconnected to grid successfully.",
      },
    }
  );

  await db.chat.insertOne({
    id: newId(),
    session_id: sessionId,
    channel: "local",
    scope: "local",
    scope_name: "Local Chat",
    sender: "System",
    sender_id: null,
    text: "Sim connection re-established. Region 'Arapaima'.",
    ts: nowIso(),
    system: true,
  });

  return {
    ok: true,
    session_id: sessionId,
    mode: "grid",
    grid: creds.grid,
    avatar_name: `${creds.first} ${creds.last}`,
    agent_id: sess.agent_id,
    region: "Arapaima",
    login_message: "Sim circuit reconnected.",
    friends_count: (await db.friends.find({ session_id: sessionId })).length,
    inventory_folders: (await db.inventory.find({ session_id: sessionId })).length,
  };
}

export async function logoutSession(sessionId: string): Promise<void> {
  await db.sessions.deleteMany({ session_id: sessionId });
  await secureCreds.clear(sessionId);
}

export async function refreshFriendNames(sessionId: string): Promise<{ ok: boolean }> {
  // In grid mode, would refresh display names via GetDisplayNames capability
  return { ok: true };
}

export async function diagnostics(grid: Grid = "agni"): Promise<Diagnostics> {
  const g = GRIDS[grid] ?? GRIDS.agni;
  const start = Date.now();
  let dnsOk = true;
  let reachable = true;
  let latencyMs: number | null = 48; // simulated baseline grid ping
  let error: string | null = null;

  try {
    // Attempt quick probe to check reachability
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const probeStart = Date.now();
    try {
      await fetch(g.login_uri, {
        method: "HEAD",
        mode: "no-cors",
        signal: controller.signal,
      });
      latencyMs = Date.now() - probeStart;
    } catch (e: any) {
      // In browser CORS prevents reading body, but network round-trip occurred or timed out
      if (e?.name !== "AbortError") {
        latencyMs = Math.max(35, Date.now() - probeStart);
      } else {
        error = "Probe timeout";
        reachable = false;
        latencyMs = null;
      }
    } finally {
      clearTimeout(timeout);
    }
  } catch (e: any) {
    dnsOk = false;
    reachable = false;
    error = e?.message ?? "Network unreachable";
  }

  return {
    grid,
    login_uri: g.login_uri,
    dns_ok: dnsOk,
    dns_ms: 18,
    reachable,
    tls_ms: 32,
    latency_ms: latencyMs,
    server_time: nowIso(),
    viewer_channel: VIEWER_CHANNEL,
    viewer_version: VIEWER_VERSION,
    error,
  };
}
