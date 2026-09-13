// Domain types shared by login, local-db, router, and UI screens.
// Aligns with Linkpoint mobile communicator architecture.

export type Grid = "agni" | "aditi";

export type Session = {
  session_id: string;
  mode: "grid" | "offline";
  grid: string;
  avatar_name: string;
  agent_id?: string;
  region?: string;
  login_message?: string;
};

export type Friend = {
  id: string;
  name: string;
  online: boolean;
  can_see_me_online: boolean;
  can_see_me_map: boolean;
  can_modify_my_objects: boolean;
};

export type Group = {
  id: string;
  name: string;
  insignia_id?: string | null;
  accept_notices: boolean;
  role?: string;
  description?: string;
  member_count?: number;
  last_message?: string | null;
  last_ts?: string | null;
};

export type Conversation = {
  id: string;
  name: string;
  last_ts: string;
  last_text: string;
};

export type SearchResult = {
  id: string;
  name: string;
  username: string;
  is_friend: boolean;
};

export type CircuitStatus = {
  mode: "grid" | "offline";
  connected: boolean;
  closed?: boolean;
  can_reconnect?: boolean;
  error?: string | null;
  region_name?: string | null;
  avatar_name?: string;
  rx_packets?: number;
  tx_packets?: number;
  uptime_s?: number;
  events?: string[];
};

export type FriendRequestIn = {
  id: string;
  from_id: string;
  from_name: string;
  message: string;
  ts: string;
  status: string;
};

export type RadarAvatar = {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  distance: number | null;
  is_friend: boolean;
};

export type RadarResponse = {
  region_name: string | null;
  connected: boolean;
  my_position: number[] | null;
  updated_ago_s: number | null;
  avatars: RadarAvatar[];
};

export type UnreadEntry = {
  channel: "im" | "group";
  scope: string;
  scope_name?: string | null;
  count: number;
};

export type ScopeTarget = {
  id: string;
  name: string;
  online?: boolean;
  kind: "im" | "group";
  last_ts?: string;
};

export type ChatMessage = {
  id: string;
  session_id: string;
  channel: "local" | "im" | "group";
  scope: string;
  scope_name?: string | null;
  sender: string;
  sender_id?: string | null;
  text: string;
  ts: string;
  system?: boolean;
};

export type TypingUser = {
  id: string;
  name: string;
  channel: "local" | "im" | "group";
  scope: string;
  started_at: string;
  expires_in_ms?: number;
};

export type TypingResponse = {
  is_typing: boolean;
  users: TypingUser[];
};

export type ContentPermissions = {
  modify: boolean;
  copy: boolean;
  transfer: boolean;
  export: boolean;
};

export type InventoryItem = {
  id: string;
  folder_id: string;
  name: string;
  type: "texture" | "object" | "clothing" | "bodypart" | "script" | "notecard" | "landmark" | "sound" | "animation" | "gesture";
  creator_name: string;
  owner_name: string;
  permissions: ContentPermissions;
  created_at: string;
  description?: string;
};

export type InventoryFolder = {
  id: string;
  parent_id: string | null;
  name: string;
  type: string;
  version: number;
};

export type LoginResponse = {
  ok: boolean;
  session_id: string;
  mode: "grid" | "offline";
  grid: string;
  avatar_name: string;
  agent_id?: string | null;
  sl_session_id?: string | null;
  sim_ip?: string | null;
  sim_port?: number | null;
  region?: string | null;
  look_at?: string | null;
  seed_capability?: string | null;
  login_message?: string | null;
  friends_count: number;
  inventory_folders: number;
};

export type Diagnostics = {
  grid: string;
  login_uri: string;
  dns_ok: boolean;
  dns_ms: number;
  reachable: boolean;
  tls_ms: number;
  latency_ms: number | null;
  server_time: string | null;
  viewer_channel: string;
  viewer_version: string;
  error: string | null;
};

export type SLEventCategory = {
  id: string;
  name: string;
  count: number;
};

export type SLEventItem = {
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
};

export type SLEventDetail = {
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
};

export type UDPPacketLog = {
  direction: "tx" | "rx";
  type: string;
  size: number;
  ts: string;
  info?: string;
};

export type UDPCircuitStatus = {
  connected: boolean;
  socket_state: "bound" | "active" | "idle" | "error";
  sim_ip: string;
  sim_port: number;
  circuit_code: number;
  local_port?: number;
  rx_packets: number;
  tx_packets: number;
  bytes_sent: number;
  bytes_received: number;
  packet_loss: number;
  ping_ms: number;
  sim_fps: number;
  time_dilation: number;
  last_packet_ts: string | null;
  recent_packets: UDPPacketLog[];
};

export function nowIso(): string {
  return new Date().toISOString();
}

export type GestureCategory =
  | "greetings"
  | "reactions"
  | "celebrations"
  | "dances"
  | "custom";

export interface Gesture {
  id: string;
  name: string;
  trigger: string;
  shortcut?: string;
  active: boolean;
  favorite?: boolean;
  category: GestureCategory;
  animation: string;
  sound?: string;
  chatText: string;
  createdAt?: string;
}

export interface GestureTriggerResult {
  ok: boolean;
  gesture: Gesture;
  chatMessage?: any;
  soundPlayed?: string;
  animationPlayed?: string;
  broadcastChannel?: string;
}

export type SLObjectShape = "box" | "cylinder" | "sphere" | "torus" | "mesh" | "tree" | "seat" | "kiosk";

export type SLClickAction = "touch" | "sit" | "buy" | "pay" | "open";

export interface LSLDialog {
  id: string;
  object_id: string;
  object_name: string;
  message: string;
  buttons: string[];
  channel: number;
  expires_at: number;
}

export interface SLWorldObject {
  id: string;
  local_id?: number;
  name: string;
  owner_name: string;
  creator_name?: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  shape: SLObjectShape;
  color: string;
  texture?: string;
  click_action: SLClickAction;
  sit_target?: [number, number, number];
  price?: number;
  prims?: number;
  description?: string;
  dialog?: LSLDialog;
  hover_text?: string;
}

export type SimulatorAccessLabel = "unknown" | "trial" | "general" | "moderate" | "adult";

export interface SimulatorTerrainBandMap {
  "00": number | null;
  "01": number | null;
  "10": number | null;
  "11": number | null;
}

export interface SimulatorFlagSummary {
  value: number;
  hex: string;
  names: string[];
}

export interface SimulatorExtendedFlagSummary {
  value: string | null;
  hex: string | null;
  names: string[];
}

export interface SLSimulatorInfo {
  simName: string;
  access: {
    code: number;
    label: SimulatorAccessLabel;
  };
  ownerId: string;
  isEstateManager: boolean | null;
  waterHeightMeters: number;
  billableFactor: number | null;
  cacheId: string | null;
  regionId: string | null;
  cpuClassId: number | null;
  cpuRatio: number | null;
  coloName: string | null;
  productSku: string | null;
  productName: string | null;
  regionFlags: SimulatorFlagSummary;
  regionFlagsExtended: SimulatorExtendedFlagSummary;
  protocols: SimulatorExtendedFlagSummary;
  terrain: {
    baseTextures: [string, string, string, string];
    detailTextures: [string, string, string, string];
    startHeightsMeters: SimulatorTerrainBandMap;
    heightRangesMeters: SimulatorTerrainBandMap;
  };
  blocks: {
    regionInfo2: boolean;
    regionInfo3: boolean;
    regionInfo4: boolean;
  };
  isPartial: boolean;
}

export interface RealSimWorldData {
  regionName: string;
  simOwner: string;
  waterHeight: number;
  regionFlags: number;
  simFps: number;
  timeDilation: number;
  physicsFps: number;
  totalPrims: number;
  activeScripts: number;
  terrain: number[][]; // 64x64 elevation grid in meters decoded from UDP LayerData
  objects: SLWorldObject[];
  parcel: SLParcel;
  avatars: Array<{
    id: string;
    name: string;
    position: [number, number, number];
    distance: number;
  }>;
  simulatorInfo?: SLSimulatorInfo | null;
  balance: number;
  lastUpdated: string;
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

export interface AppearanceData {
  outfit_name: string;
  worn_items: WornItem[];
  presets: OutfitPreset[];
}
