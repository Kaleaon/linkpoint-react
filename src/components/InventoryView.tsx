import React, { useState, useEffect, useMemo } from "react";
import {
  ChevronDown,
  ChevronRight,
  Folder as FolderIcon,
  FolderOpen,
  Image as ImageIcon,
  Box,
  Shirt,
  User,
  FileCode,
  FileText,
  MapPin,
  Music,
  Activity,
  Hand,
  Trash2,
  RefreshCw,
  Shield,
  Info,
} from "lucide-react";
import { api, type InventoryFolder, type InventoryItem, type Session } from "../api";
import { ItemDetailsModal } from "./ItemDetailsModal";
import { NotecardModal } from "./NotecardModal";

type Props = {
  session: Session;
  onOpenTPVPolicy?: () => void;
};

const getFolderIcon = (type: string, isOpen: boolean) => {
  const t = type.toLowerCase();
  if (t === "root") return isOpen ? <FolderOpen className="w-4 h-4 text-[#00F0FF]" /> : <FolderIcon className="w-4 h-4 text-[#00F0FF]" />;
  if (t === "textures" || t === "texture") return <ImageIcon className="w-4 h-4 text-[#B026FF]" />;
  if (t === "objects" || t === "object") return <Box className="w-4 h-4 text-[#B026FF]" />;
  if (t === "clothing") return <Shirt className="w-4 h-4 text-[#B026FF]" />;
  if (t === "body_parts") return <User className="w-4 h-4 text-[#B026FF]" />;
  if (t === "scripts" || t === "script") return <FileCode className="w-4 h-4 text-[#B026FF]" />;
  if (t === "notecards" || t === "notecard") return <FileText className="w-4 h-4 text-[#B026FF]" />;
  if (t === "landmarks" || t === "landmark") return <MapPin className="w-4 h-4 text-[#B026FF]" />;
  if (t === "sounds" || t === "sound") return <Music className="w-4 h-4 text-[#B026FF]" />;
  if (t === "animations" || t === "animation") return <Activity className="w-4 h-4 text-[#B026FF]" />;
  if (t === "gestures" || t === "gesture") return <Hand className="w-4 h-4 text-[#B026FF]" />;
  if (t === "trash") return <Trash2 className="w-4 h-4 text-[#FF1744]" />;
  return isOpen ? <FolderOpen className="w-4 h-4 text-[#B026FF]" /> : <FolderIcon className="w-4 h-4 text-[#B026FF]" />;
};

const getItemIcon = (type: string) => {
  if (type === "texture") return <ImageIcon className="w-3.5 h-3.5 text-[#00F0FF]" />;
  if (type === "object") return <Box className="w-3.5 h-3.5 text-[#FFEA00]" />;
  if (type === "clothing") return <Shirt className="w-3.5 h-3.5 text-[#00FF66]" />;
  if (type === "script") return <FileCode className="w-3.5 h-3.5 text-[#00F0FF]" />;
  if (type === "notecard") return <FileText className="w-3.5 h-3.5 text-[#E2E8F0]" />;
  if (type === "landmark") return <MapPin className="w-3.5 h-3.5 text-[#FF1744]" />;
  if (type === "sound") return <Music className="w-3.5 h-3.5 text-[#B026FF]" />;
  if (type === "animation") return <Activity className="w-3.5 h-3.5 text-[#00FF66]" />;
  return <Box className="w-3.5 h-3.5 text-[#64748B]" />;
};

export const InventoryView: React.FC<Props> = ({ session, onOpenTPVPolicy }) => {
  const [folders, setFolders] = useState<InventoryFolder[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [editingDoc, setEditingDoc] = useState<{ id: string; type: "notecard" | "script"; title: string } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [folderList, itemList] = await Promise.all([
        api.get<InventoryFolder[]>(`/inventory?session_id=${session.session_id}`),
        api.get<InventoryItem[]>(`/inventory/items?session_id=${session.session_id}`).catch(() => [] as InventoryItem[]),
      ]);
      setFolders(folderList);
      setItems(itemList);

      // Auto expand root folders
      const roots = folderList.filter((f) => !f.parent_id).map((f) => f.id);
      const init: Record<string, boolean> = {};
      roots.forEach((r) => (init[r] = true));
      setExpanded(init);
    } catch (err: any) {
      console.warn("Inventory sync notice:", err?.message || err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [session.session_id]);

  const itemsByFolder = useMemo(() => {
    const map = new Map<string, InventoryItem[]>();
    items.forEach((it) => {
      if (!map.has(it.folder_id)) map.set(it.folder_id, []);
      map.get(it.folder_id)!.push(it);
    });
    return map;
  }, [items]);

  const flatList = useMemo(() => {
    const byParent = new Map<string | null, InventoryFolder[]>();
    folders.forEach((f) => {
      const key = f.parent_id ?? null;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(f);
    });

    byParent.forEach((arr) => arr.sort((a, b) => a.name.localeCompare(b.name)));

    const out: (
      | { kind: "folder"; data: InventoryFolder; depth: number; hasChildren: boolean; isOpen: boolean }
      | { kind: "item"; data: InventoryItem; depth: number }
    )[] = [];

    const walk = (parent: string | null, depth: number) => {
      const children = byParent.get(parent) ?? [];
      for (const c of children) {
        const subFolders = byParent.get(c.id) ?? [];
        const folderItems = itemsByFolder.get(c.id) ?? [];
        const hasChildren = subFolders.length > 0 || folderItems.length > 0;
        const isOpen = !!expanded[c.id];

        out.push({ kind: "folder", data: c, depth, hasChildren, isOpen });

        if (isOpen) {
          // Add subfolders
          if (subFolders.length > 0) walk(c.id, depth + 1);
          // Add items inside folder
          folderItems.forEach((it) => {
            out.push({ kind: "item", data: it, depth: depth + 1 });
          });
        }
      }
    };
    walk(null, 0);
    return out;
  }, [folders, itemsByFolder, expanded]);

  const toggle = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div id="inventory-screen" className="flex flex-col h-full bg-[#050810] text-[#E2E8F0] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#121C2D] bg-[#0C1322] shrink-0">
        <div>
          <h1 className="font-display text-xl font-bold tracking-[0.2em] text-[#00F0FF] leading-none">
            INVENTORY
          </h1>
          <p className="font-mono text-[10px] text-[#64748B] mt-1 tracking-wider">
            &gt; {folders.length} FOLDERS · {items.length} ASSETS · {session.avatar_name}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenTPVPolicy && (
            <button
              onClick={onOpenTPVPolicy}
              className="h-8 px-2 rounded border border-[#1E2D4A] bg-[#050810] text-[#00FF66] hover:bg-[#1A3B5C] text-[10px] font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer"
              title="Second Life Content Protection Standards"
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">TPV RULE 2</span>
            </button>
          )}

          <button
            id="inventory-refresh-btn"
            onClick={loadData}
            disabled={loading}
            className="w-8 h-8 flex items-center justify-center rounded border border-[#1E2D4A] bg-[#141E30] text-[#00F0FF] hover:bg-[#1A3B5C] transition-colors disabled:opacity-50 cursor-pointer"
            title="Reload Inventory"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* TPV Content Protection Notice Bar */}
      <div className="px-3.5 py-1.5 bg-[#080E1A] border-b border-[#1E2D4A] text-[10px] font-mono text-[#94A3B8] flex items-center justify-between shrink-0">
        <span className="flex items-center gap-1.5 truncate">
          <Shield className="w-3 h-3 text-[#00FF66] shrink-0" />
          <span className="truncate">Content Protection Enforced (Next Owner: M, C, T, Exp)</span>
        </span>
        <span className="text-[#00FF66] shrink-0 font-bold ml-2">VERIFIED</span>
      </div>

      {/* Inventory Tree */}
      <div id="inventory-list" className="flex-1 overflow-y-auto divide-y divide-[#121C2D]">
        {flatList.length === 0 ? (
          <div className="p-10 text-center text-[#64748B] font-mono text-xs">
            {loading ? "> Querying inventory skeleton..." : "> Inventory empty"}
          </div>
        ) : (
          flatList.map((entry) => {
            if (entry.kind === "folder") {
              const item = entry.data;
              return (
                <div
                  key={`folder-${item.id}`}
                  id={`folder-${item.id}`}
                  onClick={() => entry.hasChildren && toggle(item.id)}
                  style={{ paddingLeft: `${14 + entry.depth * 16}px` }}
                  className={`flex items-center gap-2 pr-4 py-2.5 transition-colors font-mono text-xs cursor-pointer select-none ${
                    entry.hasChildren ? "hover:bg-[#0C1322]" : "hover:bg-[#0C1322]/50"
                  }`}
                >
                  {/* Chevron */}
                  <span className="w-4 h-4 flex items-center justify-center shrink-0">
                    {entry.hasChildren ? (
                      entry.isOpen ? (
                        <ChevronDown className="w-3.5 h-3.5 text-[#00F0FF]" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-[#00F0FF]" />
                      )
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1E2D4A]" />
                    )}
                  </span>

                  {/* Type Icon */}
                  <span className="shrink-0">{getFolderIcon(item.type, entry.isOpen)}</span>

                  {/* Name */}
                  <span className="flex-1 truncate text-[#E2E8F0] font-medium">{item.name}</span>

                  {/* Folder Item Count Badge */}
                  {itemsByFolder.get(item.id)?.length ? (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#141E30] text-[#00F0FF] font-mono shrink-0">
                      {itemsByFolder.get(item.id)!.length}
                    </span>
                  ) : null}

                  {/* Version */}
                  <span className="text-[10px] text-[#64748B] font-mono shrink-0">v{item.version}</span>
                </div>
              );
            } else {
              const it = entry.data;
              const { modify, copy, transfer, export: canExport } = it.permissions;
              return (
                <div
                  key={`item-${it.id}`}
                  id={`item-${it.id}`}
                  onClick={() => {
                    if (it.type === "notecard" || it.type === "script") {
                      setEditingDoc({
                        id: it.id,
                        type: it.type as "notecard" | "script",
                        title: it.name,
                      });
                    } else {
                      setSelectedItem(it);
                    }
                  }}
                  style={{ paddingLeft: `${24 + entry.depth * 16}px` }}
                  className="flex items-center justify-between gap-2 pr-3 py-2 bg-[#050810]/40 hover:bg-[#0C1322] transition-colors font-mono text-xs cursor-pointer select-none group"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="shrink-0">{getItemIcon(it.type)}</span>
                    <span className="truncate text-[#E2E8F0] group-hover:text-[#00F0FF] transition-colors">
                      {it.name}
                    </span>
                  </div>

                  {/* Second Life Permissions Badges */}
                  <div className="flex items-center gap-1 shrink-0 text-[9px]">
                    <div className="flex items-center font-mono border border-[#1E2D4A] rounded px-1 py-0.2 bg-[#050810] text-[#94A3B8]">
                      <span className={modify ? "text-[#00FF66] font-bold" : "text-[#64748B]"}>M</span>
                      <span className="mx-0.5 text-[#334155]">/</span>
                      <span className={copy ? "text-[#00FF66] font-bold" : "text-[#64748B]"}>C</span>
                      <span className="mx-0.5 text-[#334155]">/</span>
                      <span className={transfer ? "text-[#00FF66] font-bold" : "text-[#64748B]"}>T</span>
                    </div>

                    {canExport && (
                      <span className="px-1 py-0.2 rounded bg-[#00F0FF]/15 text-[#00F0FF] font-bold border border-[#00F0FF]/30">
                        EXP
                      </span>
                    )}

                    <span className="text-[#64748B] group-hover:text-[#00F0FF] ml-1">
                      <Info className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            }
          })
        )}
      </div>

      {/* Item Properties Modal */}
      <ItemDetailsModal item={selectedItem} onClose={() => setSelectedItem(null)} />

      {/* Notecard & LSL Script Viewer Modal */}
      {editingDoc && (
        <NotecardModal
          session={session}
          itemId={editingDoc.id}
          itemType={editingDoc.type}
          title={editingDoc.title}
          onClose={() => setEditingDoc(null)}
        />
      )}
    </div>
  );
};
