import crypto from "crypto";
import type { SLSession, SLChatMessage } from "./sl";
import { getRealSimData, sendObjectTouch } from "./udp";

export interface SLWorldObject {
  id: string;
  local_id?: number;
  name: string;
  owner_name: string;
  creator_name: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  shape: "box" | "cylinder" | "sphere" | "torus" | "mesh" | "tree" | "seat" | "kiosk";
  color: string;
  texture?: string;
  click_action: "touch" | "sit" | "buy" | "pay" | "open";
  sit_target?: [number, number, number];
  price?: number;
  prims: number;
  description: string;
  dialog?: {
    id: string;
    object_id: string;
    object_name: string;
    message: string;
    buttons: string[];
    channel: number;
    expires_at: number;
  };
  hover_text?: string;
}

export interface SLParcel {
  name: string;
  sim_name: string;
  description: string;
  music_url: string;
  media_url?: string;
  owner_name: string;
  maturity: "General" | "Moderate" | "Adult";
  allow_fly: boolean;
  allow_scripts: boolean;
  area_sqm: number;
}

export interface LindenTransaction {
  id: string;
  ts: string;
  type: "payment" | "tip" | "purchase" | "stipend";
  amount: number;
  counterparty: string;
  description: string;
}

export interface WornItem {
  id: string;
  name: string;
  type: "bodypart" | "clothing" | "attachment";
  slot: string;
  color?: string;
}

export interface OutfitPreset {
  id: string;
  name: string;
  items: WornItem[];
}

export interface WorldState {
  objects: SLWorldObject[];
  parcel: SLParcel;
  balance: number;
  transactions: LindenTransaction[];
  wornItems: WornItem[];
  outfitPresets: OutfitPreset[];
  activeDialog: any | null;
  sittingOnObjectId: string | null;
  notecards: Map<string, string>;
  scripts: Map<string, { code: string; running: boolean }>;
  terrain?: number[][];
  waterHeight?: number;
  simFps?: number;
  timeDilation?: number;
  totalPrims?: number;
}

const worldStore = new Map<string, WorldState>();

function createDefaultWorld(simName = "Welcome Island"): WorldState {
  const objects: SLWorldObject[] = [
    {
      id: "obj-kiosk-01",
      name: "Linkpoint Welcome & Teleport Kiosk",
      owner_name: "Philip Linden",
      creator_name: "Linden Lab",
      position: [128, 134, 24.5],
      rotation: [0, 0, 0],
      scale: [1.8, 0.4, 2.4],
      shape: "kiosk",
      color: "#00F0FF",
      click_action: "touch",
      prims: 5,
      description: "Interactive newcomer terminal running Linkpoint LSL Dialog Engine v4.2",
      hover_text: "LINKPOINT TERMINAL\n[Touch for Menu]",
      dialog: {
        id: "dlg-kiosk-01",
        object_id: "obj-kiosk-01",
        object_name: "Linkpoint Welcome & Teleport Kiosk",
        message: "Second Life Grid Terminal initialized. Please select an operational command:",
        buttons: ["Teleport Hub", "Help Notecard", "Free Starter Box", "Grid Status", "Sound FX", "Dismiss"],
        channel: -98231,
        expires_at: Date.now() + 60000,
      },
    },
    {
      id: "obj-couch-01",
      name: "Cyber Lounge Sofa",
      owner_name: "Torley Linden",
      creator_name: "Linden Research",
      position: [122, 132, 24.2],
      rotation: [0, 0, 0.2],
      scale: [2.6, 1.2, 0.9],
      shape: "seat",
      color: "#6B21A8",
      click_action: "sit",
      sit_target: [122, 132, 24.8],
      prims: 8,
      description: "Low-prim ergonomic leather couch with built-in AO sitting animations.",
      hover_text: "CYBER LOUNGE\n[Click to Sit]",
    },
    {
      id: "obj-chair-02",
      name: "Futuristic Armchair",
      owner_name: "Torley Linden",
      creator_name: "Linden Research",
      position: [134, 132, 24.2],
      rotation: [0, 0, -0.3],
      scale: [1.2, 1.2, 0.9],
      shape: "seat",
      color: "#0369A1",
      click_action: "sit",
      sit_target: [134, 132, 24.8],
      prims: 4,
      description: "Single-seat padded chair with Linden sit-target offset.",
      hover_text: "[Sit Here]",
    },
    {
      id: "obj-fire-01",
      name: "Interactive Plaza Campfire",
      owner_name: "Ebbe Linden",
      creator_name: "Linden Lab",
      position: [128, 126, 24.1],
      rotation: [0, 0, 0],
      scale: [1.6, 1.6, 0.8],
      shape: "cylinder",
      color: "#FF5722",
      click_action: "touch",
      prims: 6,
      description: "Ambient particle fire with custom audio loop and light emitter.",
      hover_text: "COZY PLAZA FIRE\n[Touch to toggle embers]",
    },
    {
      id: "obj-tree-01",
      name: "Mainland Palm Tree",
      owner_name: "Governor Linden",
      creator_name: "Linden Lab",
      position: [118, 140, 24.0],
      rotation: [0, 0.1, 0.5],
      scale: [2.0, 2.0, 7.5],
      shape: "tree",
      color: "#15803D",
      click_action: "touch",
      prims: 2,
      description: "Procedural sculpted palm tree with gentle wind flexi-prims.",
    },
    {
      id: "obj-tree-02",
      name: "Mainland Palm Tree (East)",
      owner_name: "Governor Linden",
      creator_name: "Linden Lab",
      position: [138, 140, 24.0],
      rotation: [0, -0.1, -0.4],
      scale: [2.2, 2.2, 8.0],
      shape: "tree",
      color: "#166534",
      click_action: "touch",
      prims: 2,
      description: "Procedural sculpted palm tree framing the shoreline.",
    },
    {
      id: "obj-vendor-01",
      name: "Retro Mesh Avatar Vendor",
      owner_name: "Torley Linden",
      creator_name: "Torley Linden",
      position: [132, 136, 24.4],
      rotation: [0, 0, 0.1],
      scale: [1.4, 0.3, 2.2],
      shape: "box",
      color: "#B026FF",
      click_action: "pay",
      price: 50,
      prims: 12,
      description: "Hi-poly mesh avatar body suit with PBR textures. Pay L$ 50 to purchase.",
      hover_text: "MESH SUIT VENDOR\n[L$ 50 - Touch to Buy / Pay]",
    },
    {
      id: "obj-portal-01",
      name: "Blake Sea Teleport Arch",
      owner_name: "Philip Linden",
      creator_name: "Linden Lab",
      position: [128, 144, 24.0],
      rotation: [0, 0, 0],
      scale: [3.2, 0.6, 3.8],
      shape: "torus",
      color: "#00E5FF",
      click_action: "touch",
      prims: 7,
      description: "Direct teleporter arch to the open waters of the Blake Sea continent.",
      hover_text: "BLAKE SEA PORTAL\n[Step through or Touch]",
    },
  ];

  const parcel: SLParcel = {
    name: `${simName} Beachfront Plaza & Sandbox`,
    sim_name: simName,
    description: "Public recreation area, scripting sandbox, and newcomer welcome hub. Voice and building enabled.",
    music_url: "https://streaming.shoutcast.com/chillout-lounge-live",
    owner_name: "Governor Linden",
    maturity: "General",
    allow_fly: true,
    allow_scripts: true,
    area_sqm: 4096,
  };

  const wornItems: WornItem[] = [
    { id: "worn-skin", name: "Default Mesh Skin (Natural Tone)", type: "bodypart", slot: "Skin", color: "#E0AC69" },
    { id: "worn-shape", name: "Modern Athletic Avatar Shape", type: "bodypart", slot: "Shape" },
    { id: "worn-eyes", name: "Deep Cyan Mesh Eyes", type: "bodypart", slot: "Eyes", color: "#00F0FF" },
    { id: "worn-hair", name: "Sculpted Cyber Shag Hair", type: "attachment", slot: "Hair / Head", color: "#1E293B" },
    { id: "worn-jacket", name: "Linkpoint Tactical Field Jacket", type: "clothing", slot: "Upper Body", color: "#0F172A" },
    { id: "worn-pants", name: "Dark Denim Cargo Pants", type: "clothing", slot: "Lower Body", color: "#1E293B" },
    { id: "worn-shoes", name: "Mesh High-Top Sneakers", type: "attachment", slot: "Feet", color: "#00F0FF" },
    { id: "worn-hud", name: "Linkpoint Communicator HUD v2.5", type: "attachment", slot: "Screen Top-Left" },
  ];

  const outfitPresets: OutfitPreset[] = [
    {
      id: "outfit-casual",
      name: "Casual Explorer",
      items: [...wornItems],
    },
    {
      id: "outfit-cyber",
      name: "Cyberpunk Mesh",
      items: [
        { id: "worn-skin-2", name: "Synthetic Chrome Skin", type: "bodypart", slot: "Skin", color: "#94A3B8" },
        { id: "worn-shape", name: "Modern Athletic Avatar Shape", type: "bodypart", slot: "Shape" },
        { id: "worn-eyes-2", name: "Neon Purple HUD Eyes", type: "bodypart", slot: "Eyes", color: "#B026FF" },
        { id: "worn-hair-2", name: "Neon Spiked Mesh Wig", type: "attachment", slot: "Hair / Head", color: "#00F0FF" },
        { id: "worn-jacket-2", name: "LED Armored Trenchcoat", type: "clothing", slot: "Upper Body", color: "#111827" },
        { id: "worn-pants-2", name: "Reflective Cyber Pants", type: "clothing", slot: "Lower Body", color: "#030712" },
        { id: "worn-shoes-2", name: "Exo-Boots with Thrusters", type: "attachment", slot: "Feet", color: "#B026FF" },
        { id: "worn-hud", name: "Linkpoint Communicator HUD v2.5", type: "attachment", slot: "Screen Top-Left" },
      ],
    },
    {
      id: "outfit-formal",
      name: "Formal Evening",
      items: [
        { id: "worn-skin", name: "Default Mesh Skin (Natural Tone)", type: "bodypart", slot: "Skin", color: "#E0AC69" },
        { id: "worn-shape", name: "Modern Athletic Avatar Shape", type: "bodypart", slot: "Shape" },
        { id: "worn-eyes", name: "Deep Cyan Mesh Eyes", type: "bodypart", slot: "Eyes", color: "#00F0FF" },
        { id: "worn-hair-3", name: "Classy Side-Part Hair", type: "attachment", slot: "Hair / Head", color: "#451A03" },
        { id: "worn-jacket-3", name: "Velvet Dinner Jacket & Silk Shirt", type: "clothing", slot: "Upper Body", color: "#1E1B4B" },
        { id: "worn-pants-3", name: "Tailored Formal Trousers", type: "clothing", slot: "Lower Body", color: "#0F172A" },
        { id: "worn-shoes-3", name: "Polished Italian Leather Loafers", type: "attachment", slot: "Feet", color: "#000000" },
      ],
    },
  ];

  const transactions: LindenTransaction[] = [
    {
      id: "tx-001",
      ts: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
      type: "stipend",
      amount: 300,
      counterparty: "Linden Lab",
      description: "Weekly Premium Membership Stipend",
    },
    {
      id: "tx-002",
      ts: new Date(Date.now() - 3600000 * 18).toISOString(),
      type: "tip",
      amount: 100,
      counterparty: "DJ Nova Resident",
      description: "Tip Jar at Beachfront Club",
    },
    {
      id: "tx-003",
      ts: new Date(Date.now() - 3600000 * 5).toISOString(),
      type: "purchase",
      amount: -150,
      counterparty: "Aviar Mesh Marketplace",
      description: "Linkpoint Tactical Aviator Sunglasses",
    },
  ];

  const notecards = new Map<string, string>();
  notecards.set(
    "item-notecard-welcome",
    `=== WELCOME TO SECOND LIFE ON LINKPOINT MOBILE ===\n\n` +
      `Thank you for using the Linkpoint High-Fidelity Mobile Viewer.\n\n` +
      `CONTROLS & SHORTCUTS:\n` +
      `• Touch / Click any 3D prim in-world to inspect or trigger its LSL scripts.\n` +
      `• Sit on couches or chairs to trigger Linden sit-targets.\n` +
      `• Walk or Fly with the virtual D-Pad and elevation triggers.\n` +
      `• Open the bottom tabs to chat on Local, IM, or Groups with real residents.\n\n` +
      `GRID POLICY:\n` +
      `This viewer operates under the Linden Lab Third-Party Viewer (TPV) policy.`
  );

  const scripts = new Map<string, { code: string; running: boolean }>();
  scripts.set("item-script-kiosk", {
    running: true,
    code: `// Linkpoint LSL Touch Dialog Script v4.2
integer DIALOG_CHANNEL = -98231;
integer gListener;

default {
    state_entry() {
        llSetText("LINKPOINT TERMINAL\\n[Touch for Menu]", <0.0, 0.94, 1.0>, 1.0);
    }

    touch_start(integer total_number) {
        key avatarKey = llDetectedKey(0);
        string avatarName = llDetectedName(0);
        llPlaySound("ed096417-8e6f-4db7-8499-138be789f2d1", 1.0);
        
        gListener = llListen(DIALOG_CHANNEL, "", avatarKey, "");
        llDialog(avatarKey, "Second Life Grid Terminal initialized. Please select an operational command:", 
                 ["Teleport Hub", "Help Notecard", "Free Starter Box", "Grid Status", "Sound FX", "Dismiss"], 
                 DIALOG_CHANNEL);
        llSetTimerEvent(60.0);
    }

    listen(integer channel, string name, key id, string message) {
        if (message == "Help Notecard") {
            llGiveInventory(id, "Linkpoint Quickstart Guide");
        } else if (message == "Sound FX") {
            llTriggerSound("d425330f-b40b-426b-873b-5a0ec7b99c07", 1.0);
            llWhisper(0, "Chime sound triggered!");
        } else if (message == "Grid Status") {
            llSay(0, "Sim Region: " + llGetRegionName() + " | Sim FPS: 45.0 | Dilation: 1.00");
        }
        llListenRemove(gListener);
        llSetTimerEvent(0.0);
    }

    timer() {
        llListenRemove(gListener);
        llSetTimerEvent(0.0);
    }
}`,
  });

  return {
    objects,
    parcel,
    balance: 1250,
    transactions,
    wornItems,
    outfitPresets,
    activeDialog: null,
    sittingOnObjectId: null,
    notecards,
    scripts,
  };
}

export function getOrCreateWorld(session: SLSession): WorldState {
  let world = worldStore.get(session.sessionId);
  if (!world) {
    world = createDefaultWorld(session.regionName || "Welcome Island");
    worldStore.set(session.sessionId, world);
  }

  // Synchronize directly with real simulator data decoded from UDP circuit
  const realSim = getRealSimData(session.sessionId);
  if (realSim) {
    world.parcel.sim_name = realSim.regionName;
    world.parcel.name = realSim.parcel.name;
    world.parcel.description = realSim.parcel.description;
    world.parcel.music_url = realSim.parcel.musicUrl;
    world.parcel.media_url = realSim.parcel.mediaUrl;
    world.parcel.area_sqm = realSim.parcel.area;
    world.parcel.allow_fly = realSim.parcel.flags.allowFly;
    world.parcel.allow_scripts = realSim.parcel.flags.allowScripts;

    if (realSim.objects && realSim.objects.length > 0) {
      world.objects = realSim.objects.map((ro) => {
        const hexColor = `#${Math.round(ro.color[0] * 255).toString(16).padStart(2, "0")}${Math.round(ro.color[1] * 255).toString(16).padStart(2, "0")}${Math.round(ro.color[2] * 255).toString(16).padStart(2, "0")}`;
        return {
          id: ro.fullId || `obj-${ro.localId}`,
          local_id: ro.localId,
          name: ro.name,
          owner_name: session.fullName,
          creator_name: "Second Life Simulator",
          position: ro.position,
          rotation: [ro.rotation[0], ro.rotation[1], ro.rotation[2]],
          scale: ro.scale,
          shape: (ro.shape as any) || "box",
          color: hexColor,
          click_action: (ro.clickAction === 1 ? "sit" : "touch") as any,
          sit_target: [ro.position[0], ro.position[1], ro.position[2] + 0.5],
          prims: 1,
          description: `Second Life Prim #${ro.localId} via UDP circuit`,
          hover_text: ro.hoverText,
        };
      });
    }

    world.terrain = realSim.terrain;
    world.waterHeight = realSim.waterHeight;
    world.simFps = realSim.simFps;
    world.timeDilation = realSim.timeDilation;
    world.totalPrims = realSim.totalPrims;
    world.balance = realSim.balance;
  }

  return world;
}

export function interactWithObject(
  session: SLSession,
  objectId: string,
  action: "touch" | "sit" | "stand" | "take" | "buy" | "pay",
  params?: any
) {
  const world = getOrCreateWorld(session);
  const obj = world.objects.find((o) => o.id === objectId);

  if (action === "stand") {
    world.sittingOnObjectId = null;
    const msg: SLChatMessage = {
      id: crypto.randomUUID(),
      channel: "local",
      scope: "local",
      scope_name: "Local Chat",
      sender: "Second Life Simulator",
      text: `${session.fullName} stood up.`,
      ts: new Date().toISOString(),
      system: true,
    };
    session.chatHistory.push(msg);
    return { ok: true, action: "stand", message: "You stood up." };
  }

  if (!obj) {
    return { ok: false, error: "Object not found in simulator" };
  }

  if (action === "sit") {
    world.sittingOnObjectId = obj.id;
    const sitPos = obj.sit_target || [obj.position[0], obj.position[1], obj.position[2] + 0.6];
    const msg: SLChatMessage = {
      id: crypto.randomUUID(),
      channel: "local",
      scope: "local",
      scope_name: "Local Chat",
      sender: "Second Life Simulator",
      text: `${session.fullName} sits on ${obj.name}.`,
      ts: new Date().toISOString(),
      system: true,
    };
    session.chatHistory.push(msg);
    return {
      ok: true,
      action: "sit",
      sittingOnObjectId: obj.id,
      position: sitPos,
      message: `You sat down on ${obj.name}.`,
    };
  }

  if (action === "touch") {
    // Send authentic ObjectTouch UDP packet
    if (obj.local_id) {
      sendObjectTouch(session.sessionId, obj.local_id);
    }

    let triggeredDialog = null;
    if (obj.dialog) {
      triggeredDialog = {
        ...obj.dialog,
        id: crypto.randomUUID(),
        expires_at: Date.now() + 60000,
      };
      world.activeDialog = triggeredDialog;
    }

    const touchReply = `${obj.name}: [LSL script triggered by ${session.fullName}]`;
    const msg: SLChatMessage = {
      id: crypto.randomUUID(),
      channel: "local",
      scope: "local",
      scope_name: "Local Chat",
      sender: obj.name,
      text: touchReply,
      ts: new Date().toISOString(),
      system: false,
    };
    session.chatHistory.push(msg);

    return {
      ok: true,
      action: "touch",
      dialog: triggeredDialog,
      feedback: `Touched "${obj.name}". Script event received.`,
    };
  }

  if (action === "pay" || action === "buy") {
    const amount = Number(params?.amount || obj.price || 10);
    if (world.balance < amount) {
      return { ok: false, error: "Insufficient L$ balance" };
    }
    world.balance -= amount;
    const tx: LindenTransaction = {
      id: crypto.randomUUID(),
      ts: new Date().toISOString(),
      type: action === "buy" ? "purchase" : "payment",
      amount: -amount,
      counterparty: obj.owner_name,
      description: `Payment for ${obj.name}`,
    };
    world.transactions.unshift(tx);

    const msg: SLChatMessage = {
      id: crypto.randomUUID(),
      channel: "local",
      scope: "local",
      scope_name: "Local Chat",
      sender: "Second Life Transaction Server",
      text: `You paid L$ ${amount} to ${obj.owner_name} for ${obj.name}.`,
      ts: new Date().toISOString(),
      system: true,
    };
    session.chatHistory.push(msg);

    return {
      ok: true,
      action,
      balance: world.balance,
      transaction: tx,
      message: `Successfully paid L$ ${amount} to ${obj.owner_name}.`,
    };
  }

  if (action === "take") {
    const msg: SLChatMessage = {
      id: crypto.randomUUID(),
      channel: "local",
      scope: "local",
      scope_name: "Local Chat",
      sender: "Second Life Inventory Server",
      text: `A copy of "${obj.name}" has been placed into your Inventory Objects folder.`,
      ts: new Date().toISOString(),
      system: true,
    };
    session.chatHistory.push(msg);

    return {
      ok: true,
      action: "take",
      message: `Object "${obj.name}" copied to inventory.`,
    };
  }

  return { ok: true };
}

export function handleDialogResponse(session: SLSession, dialogId: string, button: string) {
  const world = getOrCreateWorld(session);
  const dialog = world.activeDialog;
  world.activeDialog = null;

  const msg: SLChatMessage = {
    id: crypto.randomUUID(),
    channel: "local",
    scope: "local",
    scope_name: "Local Chat",
    sender: session.fullName,
    text: `[Dialog response]: "${button}"`,
    ts: new Date().toISOString(),
    system: false,
  };
  session.chatHistory.push(msg);

  let replyText = "";
  if (button === "Help Notecard") {
    replyText = `${dialog?.object_name || "Object"}: Delivered notecard 'Linkpoint Quickstart Guide' to your inventory.`;
  } else if (button === "Grid Status") {
    replyText = `${dialog?.object_name || "Object"}: Simulator Region: ${session.regionName} | Status: OPERATIONAL | Sim FPS: 45.0 | Dilation: 1.00`;
  } else if (button === "Free Starter Box") {
    replyText = `${dialog?.object_name || "Object"}: Added 'Starter Avatar Pack & Animations' to Objects folder.`;
  } else if (button === "Sound FX") {
    replyText = `${dialog?.object_name || "Object"}: *Chime* Sound played.`;
  } else {
    replyText = `${dialog?.object_name || "Object"}: Executed command "${button}".`;
  }

  const replyMsg: SLChatMessage = {
    id: crypto.randomUUID(),
    channel: "local",
    scope: "local",
    scope_name: "Local Chat",
    sender: dialog?.object_name || "LSL Script",
    text: replyText,
    ts: new Date().toISOString(),
    system: false,
  };
  session.chatHistory.push(replyMsg);

  return { ok: true, button, reply: replyText };
}
