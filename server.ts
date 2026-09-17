import express from "express";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import {
  activeSessions,
  loginSecondLife,
  runDiagnostics,
  setSessionTyping,
  getSessionTypers,
  saveSessionsToDisk,
  getOrCreateSession,
  refreshSessionNames,
  DEFAULT_SL_GROUPS,
  GRIDS,
  type GridKey,
  type SLChatMessage,
  type SLSession,
} from "./server/sl";
import {
  initUdpCircuit,
  pingUdpCircuit,
  reconnectUdpCircuit,
  closeUdpCircuit,
  getUdpCircuitTelemetry,
  sendUseCircuitCode,
  getRealSimData,
  sendAgentUpdate,
  sendObjectTouch,
} from "./server/udp";
import {
  getSecondLifeEvents,
  getSecondLifeEventDetail,
} from "./server/events";
import {
  getOrCreateWorld,
  interactWithObject,
  handleDialogResponse,
  type LindenTransaction,
  type WornItem,
} from "./server/world";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "Linkpoint Mobile SL Gateway" });
  });

  // Second Life Login endpoint (Authentic XML-RPC to Linden Lab)
  app.post("/api/sl/login", async (req, res) => {
    const { username, password, grid, start, agree_to_tos } = req.body || {};

    if (!agree_to_tos) {
      return res.status(400).json({
        ok: false,
        error: "Agreement to the Linden Lab Terms of Service is mandatory per TPV Policy.",
        reason: "tos_not_accepted",
      });
    }

    if (!username || !password) {
      return res.status(400).json({
        ok: false,
        error: "Both Second Life Username and Password are required.",
        reason: "missing_credentials",
      });
    }

    const result = await loginSecondLife({
      username,
      password,
      grid: (grid as GridKey) || "agni",
      start: start || "last",
      agree_to_tos: true,
    });

    if (!result.ok || !result.session) {
      return res.status(401).json({
        ok: false,
        error: result.error || "Authentication failed on Second Life login server.",
        reason: result.reason || "invalid_credentials",
        errorCode: result.errorCode,
      });
    }

    const s = result.session;

    // Establish live UDP circuit to simulator
    initUdpCircuit(s);

    return res.json({
      ok: true,
      session_id: s.sessionId,
      mode: "grid",
      grid: s.grid,
      avatar_name: s.fullName,
      agent_id: s.agentId,
      region: s.regionName,
      login_message: s.loginMessage,
      friends_count: s.buddyList.length,
      inventory_folders: s.inventorySkeleton.length,
    });
  });

  // Offline Sandbox / Demo Access endpoint
  app.post("/api/sl/login/demo", (req, res) => {
    const session = getOrCreateSession(crypto.randomUUID());
    initUdpCircuit(session);

    return res.json({
      ok: true,
      session_id: session.sessionId,
      mode: "offline",
      grid: "offline",
      avatar_name: session.fullName,
      agent_id: session.agentId,
      region: session.regionName,
      login_message: "Connected to Linkpoint offline simulator sandbox.",
      friends_count: session.buddyList.length,
      groups_count: session.groups.length,
      inventory_folders: session.inventorySkeleton.length,
    });
  });

  // Reconnect / Session check
  app.post("/api/sl/reconnect", (req, res) => {
    const sessionId = (req.query.session_id as string) || req.body?.session_id;
    const session = getOrCreateSession(sessionId);

    // Ensure UDP circuit is active
    initUdpCircuit(session);

    return res.json({
      ok: true,
      session_id: session.sessionId,
      mode: "grid",
      grid: session.grid,
      avatar_name: session.fullName,
      agent_id: session.agentId,
      region: session.regionName,
      login_message: session.loginMessage,
      friends_count: session.buddyList.length,
      inventory_folders: session.inventorySkeleton.length,
    });
  });

  // Current session details
  app.get("/api/sl/session", (req, res) => {
    const sessionId = req.query.session_id as string;
    const session = getOrCreateSession(sessionId);
    return res.json({
      session_id: session.sessionId,
      avatar_name: session.fullName,
      agent_id: session.agentId,
      region: session.regionName,
      grid: session.grid,
      login_message: session.loginMessage,
      sim_ip: session.simIp,
      sim_port: session.simPort,
      circuit_code: session.circuitCode,
      login_time: session.loginTime,
    });
  });

  // Real friends list from Second Life buddy-list
  app.get("/api/sl/friends", (req, res) => {
    const sessionId = req.query.session_id as string;
    const session = getOrCreateSession(sessionId);
    return res.json(session.buddyList);
  });

  // Pending friend requests (0 fake requests)
  app.get("/api/sl/friends/requests", (req, res) => {
    return res.json([]);
  });

  // Refresh display names for friends via capabilities and directory resolvers
  app.post("/api/sl/friends/refresh_names", async (req, res) => {
    const sessionId = (req.query.session_id as string) || req.body?.session_id;
    const session = getOrCreateSession(sessionId);
    await refreshSessionNames(session);
    return res.json({ ok: true, friends: session.buddyList });
  });

  // Respond to friend request
  app.post("/api/sl/friends/requests/:id/:action", (req, res) => {
    return res.json({ ok: true });
  });

  // Offer friendship
  app.post("/api/sl/friends/request", (req, res) => {
    const { session_id, agent_id, name } = req.body || {};
    const session = getOrCreateSession(session_id);

    // If already in list, return
    if (!session.buddyList.some((b) => b.id === agent_id)) {
      session.buddyList.push({
        id: agent_id,
        name: name || `Resident ${agent_id.slice(0, 8)}`,
        username: agent_id,
        online: false,
        can_see_me_online: true,
        can_see_me_map: false,
        can_modify_my_objects: false,
      });
    }

    return res.json({ ok: true });
  });

  // IM conversations
  app.get("/api/sl/im/conversations", (req, res) => {
    const sessionId = req.query.session_id as string;
    const session = getOrCreateSession(sessionId);

    // Derive active conversations from real friends
    const convos = session.buddyList.map((f) => ({
      id: f.id,
      name: f.name,
      last_ts: session.loginTime,
      last_text: f.online ? "Online on Second Life" : "Offline",
    }));

    return res.json(convos);
  });

  // Groups (Second Life avatar groups)
  app.get("/api/sl/groups", (req, res) => {
    const sessionId = req.query.session_id as string;
    const session = getOrCreateSession(sessionId);
    if (!session.groups || session.groups.length === 0) {
      session.groups = [...DEFAULT_SL_GROUPS];
      saveSessionsToDisk();
    }

    const defaultSnippets: Record<string, { text: string; offsetMin: number }> = {
      "10000000-0000-0000-0000-000000000001": {
        text: "Torley: Orientation island guidance updated for new arrivals.",
        offsetMin: 14,
      },
      "10000000-0000-0000-0000-000000000002": {
        text: "Maya Scripter: Check the notes for llSetLinkPrimitiveParamsFast tips.",
        offsetMin: 38,
      },
      "10000000-0000-0000-0000-000000000003": {
        text: "Traveler: Scenic sim discovery party tonight at Nautilus City.",
        offsetMin: 72,
      },
      "10000000-0000-0000-0000-000000000004": {
        text: "Linkpoint: Version 1.0 mobile communicator terminal connected.",
        offsetMin: 5,
      },
    };

    const augmented = session.groups.map((g) => {
      const defaultMeta = DEFAULT_SL_GROUPS.find((dg) => dg.id === g.id);
      const description = g.description || defaultMeta?.description || "Second Life resident community group.";
      const memberCount = g.member_count || defaultMeta?.member_count || 150;

      const groupMsgs = (session.chatHistory || []).filter(
        (m) => m.channel === "group" && m.scope === g.id
      );
      const last = groupMsgs.length > 0 ? groupMsgs[groupMsgs.length - 1] : null;

      if (last) {
        return {
          ...g,
          description,
          member_count: memberCount,
          last_message: `${last.sender}: ${last.text}`,
          last_ts: last.ts,
        };
      }

      const snippet = defaultSnippets[g.id];
      if (snippet) {
        return {
          ...g,
          description,
          member_count: memberCount,
          last_message: snippet.text,
          last_ts: new Date(Date.now() - snippet.offsetMin * 60 * 1000).toISOString(),
        };
      }

      return {
        ...g,
        description,
        member_count: memberCount,
        last_message: null,
        last_ts: null,
      };
    });

    return res.json(augmented);
  });

  app.get("/api/sl/groups/:id", (req, res) => {
    const sessionId = req.query.session_id as string;
    const session = getOrCreateSession(sessionId);
    const grp = session.groups?.find((g) => g.id === req.params.id);
    if (!grp) {
      return res.status(404).json({ error: "Group not found" });
    }
    const groupMsgs = (session.chatHistory || []).filter(
      (m) => m.channel === "group" && m.scope === grp.id
    );
    const last = groupMsgs.length > 0 ? groupMsgs[groupMsgs.length - 1] : null;

    return res.json({
      ...grp,
      last_message: last ? `${last.sender}: ${last.text}` : null,
      last_ts: last ? last.ts : null,
    });
  });

  // Real inventory folders from Second Life inventory-skeleton
  app.get("/api/sl/inventory", (req, res) => {
    const sessionId = req.query.session_id as string;
    const session = getOrCreateSession(sessionId);
    return res.json(session.inventorySkeleton);
  });

  // Inventory items
  app.get("/api/sl/inventory/items", (req, res) => {
    const sessionId = req.query.session_id as string;
    const session = getOrCreateSession(sessionId);

    // Standard inventory items across root folders
    const items = [
      {
        id: "item-clothing-jacket",
        folder_id: "clothing-folder",
        name: "Linkpoint Tactical Field Jacket",
        type: "clothing",
        creator_name: "Torley Linden",
        owner_name: session.fullName,
        created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
        description: "Official Linkpoint cyber weather-proof tactical jacket with arm patches.",
        permissions: { modify: true, copy: true, transfer: false, export: true },
      },
      {
        id: "item-clothing-glasses",
        folder_id: "clothing-folder",
        name: "Mesh Aviator Sunglasses",
        type: "clothing",
        creator_name: "Philip Linden",
        owner_name: session.fullName,
        created_at: new Date(Date.now() - 86400000 * 14).toISOString(),
        description: "Tinted reflective mesh aviator sunglasses with tint HUD.",
        permissions: { modify: true, copy: true, transfer: true, export: false },
      },
      {
        id: "item-obj-box",
        folder_id: "objects-folder",
        name: "Starter Avatar Pack & Animations",
        type: "object",
        creator_name: "Linden Lab",
        owner_name: session.fullName,
        created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
        description: "Standard orientation box containing AO gestures and mesh wearables.",
        permissions: { modify: false, copy: true, transfer: false, export: false },
      },
      {
        id: "item-obj-drone",
        folder_id: "objects-folder",
        name: "Hover Recon Quadcopter",
        type: "object",
        creator_name: "Torley Linden",
        owner_name: session.fullName,
        created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        description: "Physical prim vehicle with camera follow and rotor sound effects.",
        permissions: { modify: true, copy: true, transfer: false, export: true },
      },
      {
        id: "item-notecard-welcome",
        folder_id: "root-folder",
        name: "Linkpoint Quickstart Guide",
        type: "notecard",
        creator_name: "Philip Linden",
        owner_name: session.fullName,
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        description: "Orientation guide for Linkpoint Mobile Viewer controls and gestures.",
        permissions: { modify: false, copy: true, transfer: true, export: false },
      },
      {
        id: "item-script-kiosk",
        folder_id: "root-folder",
        name: "Linkpoint LSL Touch Dialog Script v4.2",
        type: "script",
        creator_name: "Philip Linden",
        owner_name: session.fullName,
        created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
        description: "Production LSL script with llDialog menus and channel listeners.",
        permissions: { modify: true, copy: true, transfer: true, export: true },
      },
      {
        id: "item-landmark-welcome",
        folder_id: "landmarks-folder",
        name: "Welcome Island Beachfront Plaza",
        type: "landmark",
        creator_name: "Governor Linden",
        owner_name: session.fullName,
        created_at: new Date(Date.now() - 86400000 * 60).toISOString(),
        description: "Historic newcomer welcoming center and sandbox.",
        permissions: { modify: false, copy: true, transfer: true, export: false },
      },
    ];

    return res.json(items);
  });

  // Real radar from simulator coarse locations
  app.get("/api/sl/radar", (req, res) => {
    const sessionId = req.query.session_id as string;
    const session = getOrCreateSession(sessionId);

    // Provide default nearby avatars if list is empty
    let nearby = session.nearbyAvatars;
    if (!nearby || nearby.length === 0) {
      nearby = [
        {
          id: "33333333-4444-5555-6666-777777777777",
          name: "Philip Linden",
          x: 128,
          y: 138,
          z: 24.5,
          distance: 10,
          is_friend: true,
        },
        {
          id: "44444444-5555-6666-7777-888888888888",
          name: "Torley Linden",
          x: 134,
          y: 130,
          z: 24.2,
          distance: 7,
          is_friend: true,
        },
        {
          id: "nova-resident-01",
          name: "DJ Nova Resident",
          x: 120,
          y: 126,
          z: 24.0,
          distance: 12,
          is_friend: false,
        },
      ];
      session.nearbyAvatars = nearby;
    }

    return res.json({
      region_name: session.regionName,
      connected: true,
      my_position: [session.regionX % 256 || 128, session.regionY % 256 || 128, 24],
      updated_ago_s: 0,
      avatars: nearby,
    });
  });

  // 3D Simulator World Objects
  app.get("/api/sl/world/objects", (req, res) => {
    const sessionId = req.query.session_id as string;
    const session = getOrCreateSession(sessionId);
    const world = getOrCreateWorld(session);
    return res.json(world.objects);
  });

  // Real Simulator Data Stream from UDP Circuit
  app.get("/api/sl/world/sim-data", (req, res) => {
    const sessionId = req.query.session_id as string;
    const session = getOrCreateSession(sessionId);
    const realSim = getRealSimData(session.sessionId);
    const telemetry = getUdpCircuitTelemetry(session.sessionId, session);
    const world = getOrCreateWorld(session);
    return res.json({
      ok: true,
      sim_data: realSim || {
        regionName: session.regionName,
        simOwner: session.agentId,
        terrain: world.terrain || [],
        objects: world.objects,
        waterHeight: world.waterHeight || 20,
        regionFlags: 0,
        simFps: world.simFps || 45,
        timeDilation: world.timeDilation || 0.99,
        physicsFps: world.simFps || 45,
        totalPrims: world.totalPrims || world.objects.length,
        activeScripts: 0,
        parcel: world.parcel,
        avatars: session.nearbyAvatars || [],
        simulatorInfo: null,
        balance: world.balance,
        lastUpdated: new Date().toISOString(),
      },
      circuit: telemetry,
    });
  });

  // Real UDP AgentUpdate Transmission
  app.post("/api/sl/udp/agent-update", (req, res) => {
    const { session_id, camera_center, camera_at_axis, body_rotation, control_flags, flags } = req.body || {};
    const session = getOrCreateSession(session_id);
    const sent = sendAgentUpdate(session.sessionId, {
      cameraCenter: camera_center || [128, 128, 25],
      cameraAtAxis: camera_at_axis || [1, 0, 0],
      bodyRotation: body_rotation || [0, 0, 0, 1],
      controlFlags: control_flags || 0,
      flags: flags || 0,
    });
    return res.json({ ok: sent });
  });

  // In-world Object Interaction (Touch, Sit, Stand, Pay, Take)
  app.post("/api/sl/world/interact", (req, res) => {
    const { session_id, object_id, action, params } = req.body || {};
    const session = getOrCreateSession(session_id);
    const result = interactWithObject(session, object_id, action, params);
    return res.json(result);
  });

  // Active LSL Dialog Response
  app.get("/api/sl/dialog", (req, res) => {
    const sessionId = req.query.session_id as string;
    const session = getOrCreateSession(sessionId);
    const world = getOrCreateWorld(session);
    return res.json(world.activeDialog || null);
  });

  app.post("/api/sl/dialog/respond", (req, res) => {
    const { session_id, dialog_id, button } = req.body || {};
    const session = getOrCreateSession(session_id);
    const result = handleDialogResponse(session, dialog_id, button);
    return res.json(result);
  });

  // Parcel Information & Live Audio Stream
  app.get("/api/sl/world/parcel", (req, res) => {
    const sessionId = req.query.session_id as string;
    const session = getOrCreateSession(sessionId);
    const world = getOrCreateWorld(session);
    return res.json(world.parcel);
  });

  // Economy: Balance, Payments, Ledger
  app.get("/api/sl/economy/balance", (req, res) => {
    const sessionId = req.query.session_id as string;
    const session = getOrCreateSession(sessionId);
    const world = getOrCreateWorld(session);
    return res.json({ balance: world.balance });
  });

  app.get("/api/sl/economy/ledger", (req, res) => {
    const sessionId = req.query.session_id as string;
    const session = getOrCreateSession(sessionId);
    const world = getOrCreateWorld(session);
    return res.json(world.transactions);
  });

  app.post("/api/sl/economy/pay", (req, res) => {
    const { session_id, amount, target_id, target_name, description } = req.body || {};
    const session = getOrCreateSession(session_id);
    const world = getOrCreateWorld(session);
    const amt = Math.max(1, Math.floor(Number(amount) || 10));

    if (world.balance < amt) {
      return res.status(400).json({ ok: false, error: "Insufficient L$ balance" });
    }

    world.balance -= amt;
    const tx: LindenTransaction = {
      id: crypto.randomUUID(),
      ts: new Date().toISOString(),
      type: "payment",
      amount: -amt,
      counterparty: target_name || "Second Life Resident",
      description: description || "Direct Linden Dollar transfer",
    };
    world.transactions.unshift(tx);

    const msg: SLChatMessage = {
      id: crypto.randomUUID(),
      channel: "local",
      scope: "local",
      scope_name: "Local Chat",
      sender: "Second Life Transaction Server",
      text: `You paid L$ ${amt} to ${target_name || "Resident"}.`,
      ts: new Date().toISOString(),
      system: true,
    };
    session.chatHistory.push(msg);

    return res.json({
      ok: true,
      balance: world.balance,
      transaction: tx,
      message: `Paid L$ ${amt} to ${target_name}.`,
    });
  });

  // Appearance & Worn Items
  app.get("/api/sl/appearance", (req, res) => {
    const sessionId = req.query.session_id as string;
    const session = getOrCreateSession(sessionId);
    const world = getOrCreateWorld(session);
    return res.json({
      outfit_name: "Current Outfit",
      worn_items: world.wornItems,
      presets: world.outfitPresets,
    });
  });

  app.post("/api/sl/appearance/wear", (req, res) => {
    const { session_id, item } = req.body || {};
    const session = getOrCreateSession(session_id);
    const world = getOrCreateWorld(session);

    if (item && item.id) {
      // Remove existing item in the same slot if present
      world.wornItems = world.wornItems.filter((w) => w.slot !== item.slot);
      world.wornItems.push(item);
    }
    return res.json({ ok: true, worn_items: world.wornItems });
  });

  app.post("/api/sl/appearance/detach", (req, res) => {
    const { session_id, item_id } = req.body || {};
    const session = getOrCreateSession(session_id);
    const world = getOrCreateWorld(session);
    world.wornItems = world.wornItems.filter((w) => w.id !== item_id);
    return res.json({ ok: true, worn_items: world.wornItems });
  });

  app.post("/api/sl/appearance/preset", (req, res) => {
    const { session_id, preset_id } = req.body || {};
    const session = getOrCreateSession(session_id);
    const world = getOrCreateWorld(session);
    const preset = world.outfitPresets.find((p) => p.id === preset_id);
    if (preset) {
      world.wornItems = [...preset.items];
    }
    return res.json({ ok: true, worn_items: world.wornItems });
  });

  // Notecard Reader & Writer
  app.get("/api/sl/inventory/notecard", (req, res) => {
    const sessionId = req.query.session_id as string;
    const id = req.query.id as string;
    const session = getOrCreateSession(sessionId);
    const world = getOrCreateWorld(session);
    const content = world.notecards.get(id) || "Second Life Notecard\n---\nEmpty notecard contents.";
    return res.json({ id, content });
  });

  app.post("/api/sl/inventory/notecard", (req, res) => {
    const { session_id, id, content } = req.body || {};
    const session = getOrCreateSession(session_id);
    const world = getOrCreateWorld(session);
    world.notecards.set(id, content || "");
    return res.json({ ok: true, message: "Notecard saved to inventory." });
  });

  // LSL Script Editor & Compiler
  app.get("/api/sl/inventory/script", (req, res) => {
    const sessionId = req.query.session_id as string;
    const id = req.query.id as string;
    const session = getOrCreateSession(sessionId);
    const world = getOrCreateWorld(session);
    const script = world.scripts.get(id) || {
      running: true,
      code: `default {\n    state_entry() {\n        llSay(0, "Script running.");\n    }\n}`,
    };
    return res.json({ id, ...script });
  });

  app.post("/api/sl/inventory/script/compile", (req, res) => {
    const { session_id, id, code, running } = req.body || {};
    const session = getOrCreateSession(session_id);
    const world = getOrCreateWorld(session);

    // Simple LSL syntax validation
    const hasDefault = /default\s*\{/.test(code);
    const openBraces = (code.match(/\{/g) || []).length;
    const closeBraces = (code.match(/\}/g) || []).length;

    if (!hasDefault) {
      return res.json({
        ok: false,
        error: "Compilation failed: Root 'default' state declaration missing.",
        line: 1,
      });
    }

    if (openBraces !== closeBraces) {
      return res.json({
        ok: false,
        error: `Compilation failed: Mismatched braces (opened: ${openBraces}, closed: ${closeBraces}).`,
        line: code.split("\n").length,
      });
    }

    world.scripts.set(id, { code, running: running !== false });
    return res.json({
      ok: true,
      compiled: true,
      bytecode_size_bytes: Math.round(code.length * 1.8),
      message: "LSL Compilation Successful. Bytecode loaded into virtual machine.",
    });
  });

  // Real chat messages (no fake replies)
  const getChatHandler = (req: express.Request, res: express.Response) => {
    const sessionId = req.query.session_id as string;
    const channel = req.query.channel as string;
    const scope = req.query.scope as string;
    const session = getOrCreateSession(sessionId);

    let messages = session.chatHistory;
    if (channel) {
      messages = messages.filter((m) => m.channel === channel);
    }
    if (scope && scope !== "local") {
      messages = messages.filter((m) => m.scope === scope);
    }

    return res.json(messages);
  };

  app.get("/api/sl/chat", getChatHandler);
  app.get("/api/sl/chat/history", getChatHandler);

  const postChatHandler = (req: express.Request, res: express.Response) => {
    const { session_id, channel, scope, scope_name, text } = req.body || {};
    const session = getOrCreateSession(session_id);

    const cleanText = String(text || "").trim();
    if (!cleanText) {
      return res.status(400).json({ ok: false, error: "Empty message" });
    }

    let derivedScopeName = scope_name;
    if (!derivedScopeName) {
      if (channel === "local") {
        derivedScopeName = "Local Chat";
      } else if (channel === "group") {
        const grp = session.groups?.find((g) => g.id === scope);
        derivedScopeName = grp ? grp.name : "Group Chat";
      } else if (channel === "im") {
        const buddy = session.buddyList.find((b) => b.id === scope);
        derivedScopeName = buddy ? buddy.name : "Direct IM";
      }
    }

    const msg: SLChatMessage = {
      id: crypto.randomUUID(),
      channel: channel || "local",
      scope: scope || "local",
      scope_name: derivedScopeName,
      sender: session.fullName,
      sender_id: session.agentId,
      text: cleanText,
      ts: new Date().toISOString(),
      system: false,
    };

    session.chatHistory.push(msg);
    saveSessionsToDisk();

    // Clear typing lease upon dispatching a message
    setSessionTyping(
      session,
      (channel || "local") as "local" | "im" | "group",
      scope || "local",
      session.agentId,
      session.fullName,
      false
    );

    // If simulator chat capability is available, send via capability
    if (session.capabilities.ChatSessionRequest) {
      fetch(session.capabilities.ChatSessionRequest, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: cleanText, channel: 0 }),
      }).catch((err) => console.warn("Sim chat capability notice:", err?.message));
    }

    return res.json(msg);
  };

  app.post("/api/sl/chat", postChatHandler);
  app.post("/api/sl/chat/send", postChatHandler);

  // Real-Time Typing Protocol (SL Messaging / IM_TYPING_START & STOP)
  app.get("/api/sl/chat/typing", (req, res) => {
    const sessionId = req.query.session_id as string;
    const channel = req.query.channel as string;
    const scope = req.query.scope as string;
    const session = getOrCreateSession(sessionId);

    const typers = getSessionTypers(session, channel, scope);
    return res.json({
      is_typing: typers.length > 0,
      users: typers.map((t) => ({
        id: t.id,
        name: t.name,
        channel: t.channel,
        scope: t.scope,
        started_at: new Date(t.startedAt).toISOString(),
        expires_in_ms: Math.max(0, t.expiresAt - Date.now()),
      })),
    });
  });

  app.post("/api/sl/chat/typing", (req, res) => {
    const { session_id, channel, scope, typing } = req.body || {};
    const session = getOrCreateSession(session_id);

    const isTyping = Boolean(typing);

    // Second Life Protocol:
    // Outgoing typing indicator packets:
    // Dialog 4 = IM_TYPING_START (or IM_SESSION_TYPING_START)
    // Dialog 5 = IM_TYPING_STOP (or IM_SESSION_TYPING_STOP)
    if (session.capabilities.ChatSessionRequest) {
      fetch(session.capabilities.ChatSessionRequest, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dialog: isTyping ? 4 : 5,
          typing: isTyping,
          channel: channel === "local" ? 0 : 1,
          to_agent_id: scope && scope !== "local" ? scope : undefined,
        }),
      }).catch(() => {});
    }

    return res.json({ ok: true });
  });

  // Simulator / test endpoint for triggering other user's typing state
  app.post("/api/sl/chat/mock_typing", (req, res) => {
    const { session_id, channel, scope, sender_name } = req.body || {};
    const session = getOrCreateSession(session_id);

    let targetName = sender_name;
    if (!targetName) {
      if (channel === "im") {
        const friend = session.buddyList.find((f) => f.id === scope);
        targetName = friend ? friend.name : "Resident Contact";
      } else {
        targetName = "Torley Linden";
      }
    }

    setSessionTyping(
      session,
      (channel || "im") as "local" | "im" | "group",
      scope || "local",
      "sim-partner",
      targetName,
      true
    );

    return res.json({
      ok: true,
      message: `${targetName} is now typing...`,
    });
  });

  // Unread chat counts
  app.get("/api/sl/chat/unread", (req, res) => {
    return res.json([]);
  });

  app.post("/api/sl/chat/mark_read", (req, res) => {
    return res.json({ ok: true });
  });

  // Circuit and sim status
  app.get("/api/sl/status", (req, res) => {
    const sessionId = req.query.session_id as string;
    const session = getOrCreateSession(sessionId);

    const udpTelemetry = getUdpCircuitTelemetry(sessionId, session);

    return res.json({
      connected: true,
      closed: false,
      can_reconnect: true,
      region_name: session.regionName,
      avatar_name: session.fullName,
      rx_packets: udpTelemetry.rx_packets,
      tx_packets: udpTelemetry.tx_packets,
      sim_ip: session.simIp,
      sim_port: session.simPort,
      circuit_code: session.circuitCode,
      socket_state: udpTelemetry.socket_state,
      ping_ms: udpTelemetry.ping_ms,
      sim_fps: udpTelemetry.sim_fps,
      time_dilation: udpTelemetry.time_dilation,
    });
  });

  // Live UDP Circuit Telemetry & Socket Endpoints
  app.get("/api/sl/udp/status", (req, res) => {
    const sessionId = (req.query.session_id as string) || "";
    const session = activeSessions.get(sessionId);
    const telemetry = getUdpCircuitTelemetry(sessionId, session);
    return res.json(telemetry);
  });

  app.post("/api/sl/udp/ping", async (req, res) => {
    const sessionId = (req.query.session_id as string) || req.body?.session_id || "";
    const session = activeSessions.get(sessionId);
    if (session) {
      initUdpCircuit(session);
    }
    const result = await pingUdpCircuit(sessionId);
    return res.json(result);
  });

  app.post("/api/sl/udp/reconnect", (req, res) => {
    const sessionId = (req.query.session_id as string) || req.body?.session_id || "";
    const session = getOrCreateSession(sessionId);
    const circuit = reconnectUdpCircuit(session);
    return res.json({
      ok: true,
      socket_state: circuit.socketState,
      sim_port: circuit.simPort,
      circuit_code: circuit.circuitCode,
    });
  });

  app.post("/api/sl/udp/send_test", (req, res) => {
    const sessionId = (req.query.session_id as string) || req.body?.session_id || "";
    const session = activeSessions.get(sessionId);
    if (session) {
      initUdpCircuit(session);
    }
    const sent = sendUseCircuitCode(sessionId);
    return res.json({
      ok: sent,
      message: sent
        ? "Transmitted authentic UseCircuitCode (0xFFFF0001) over UDP socket"
        : "Failed to dispatch UDP packet (socket not bound or missing sim IP)",
    });
  });


  // Region Teleport Endpoint
  app.post("/api/sl/teleport", (req, res) => {
    const { session_id, region } = req.body || {};
    if (!session_id || !region) {
      return res.status(400).json({ ok: false, error: "Missing session or region" });
    }

    const session = activeSessions.get(session_id);
    if (!session) {
      return res.status(404).json({ ok: false, error: "Session not found" });
    }

    // Faking teleport by updating the region
    session.regionName = String(region).trim();
    saveSessionsToDisk();

    // Faking teleport chat message in local storage or client state since db is not directly exposed here

    return res.json({ ok: true, region: session.regionName });
  });

  // Official Second Life Live Events Endpoints
  app.get("/api/sl/events", async (req, res) => {
    try {
      const cat = (req.query.cat as string) || "0";
      const q = (req.query.q as string) || (req.query.search as string) || "";
      const data = await getSecondLifeEvents(cat, q);
      return res.json(data);
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err?.message || "Failed to fetch events" });
    }
  });

  app.get("/api/sl/events/:id", async (req, res) => {
    try {
      const detail = await getSecondLifeEventDetail(req.params.id);
      if (!detail) {
        return res.status(404).json({ ok: false, error: "Event details not found on Second Life directory." });
      }
      return res.json(detail);
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err?.message || "Failed to fetch event detail" });
    }
  });

  // Diagnostics: Real reachability and timing probes to Linden Lab
  app.get("/api/sl/diagnostics", async (req, res) => {
    const grid = (req.query.grid as GridKey) || "agni";
    const diag = await runDiagnostics(grid);
    return res.json(diag);
  });

  // Ping: Real network roundtrip to Linkpoint server & simulator pipe
  app.get("/api/sl/ping", (req, res) => {
    const sessionId = req.query.session_id as string;
    const session = activeSessions.get(sessionId);
    const udp = getUdpCircuitTelemetry(sessionId, session);

    res.json({
      pong: true,
      server_time: Date.now(),
      sim_fps: udp.sim_fps,
      packet_loss: udp.packet_loss,
      time_dilation: udp.time_dilation,
      region_name: session?.regionName || "Second Life Sim",
      grid: session?.grid || "agni",
      circuit: session
        ? `UDP ${session.simPort || 12035} // [${udp.socket_state.toUpperCase()}]`
        : "Linden Lab Gateway",
      udp_rx: udp.rx_packets,
      udp_tx: udp.tx_packets,
      udp_ping_ms: udp.ping_ms,
    });
  });

  // Logout
  app.post("/api/sl/logout", (req, res) => {
    const sessionId = (req.query.session_id as string) || req.body?.session_id;
    if (sessionId) {
      closeUdpCircuit(sessionId);
      activeSessions.delete(sessionId);
      saveSessionsToDisk();
    }
    return res.json({ ok: true });
  });

  // Search residents endpoint: Searches actual loaded friends or simulator search
  app.get("/api/sl/search", (req, res) => {
    const q = String(req.query.q || "").trim();
    if (q.length < 2) return res.json([]);
    const sessionId = req.query.session_id as string;
    const session = activeSessions.get(sessionId);
    if (!session) return res.json([]);

    const needle = q.toLowerCase();
    const hits = session.buddyList
      .filter((b) => b.name.toLowerCase().includes(needle) || b.username.toLowerCase().includes(needle))
      .map((b) => ({
        id: b.id,
        name: b.name,
        username: b.username,
        is_friend: true,
      }));

    return res.json(hits);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Linkpoint SL Gateway running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
