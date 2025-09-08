// src/app/notes/Sidebar.tsx
"use client";
import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createNoteWithBlock, updateNote } from "../../notes";
import { useRouter } from "next/navigation";
import { useAuth } from "../../auth";
import { usePermissions } from "../../hooks/usePermissionsCache";
import { useNotesCache, type NoteInfo } from "../../hooks/useNotesCache";

type TreeNode = { id: string; note: NoteInfo; children: TreeNode[] };

// Natural sorting function that handles numbers properly
function naturalCompare(a: string, b: string): number {
  // Convert strings to arrays of parts (text and numbers)
  const aParts = a.match(/(\d+|\D+)/g) || [];
  const bParts = b.match(/(\d+|\D+)/g) || [];

  const maxLength = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < maxLength; i++) {
    const aPart = aParts[i] || "";
    const bPart = bParts[i] || "";

    // Check if both parts are numbers
    const aIsNumber = /^\d+$/.test(aPart);
    const bIsNumber = /^\d+$/.test(bPart);

    if (aIsNumber && bIsNumber) {
      // Compare as numbers
      const aNum = parseInt(aPart, 10);
      const bNum = parseInt(bPart, 10);
      if (aNum !== bNum) {
        return aNum - bNum;
      }
    } else {
      // Compare as strings (case-insensitive)
      const result = aPart.toLowerCase().localeCompare(bPart.toLowerCase());
      if (result !== 0) {
        return result;
      }
    }
  }

  return 0;
}

function buildTree(notes: NoteInfo[]): TreeNode[] {
  const byId = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  for (const n of notes) {
    byId.set(n.id, { id: n.id, note: n, children: [] });
  }
  for (const node of byId.values()) {
    const pid = node.note.parentId ?? null;
    if (pid && byId.has(pid)) {
      byId.get(pid)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortRec = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => naturalCompare(a.note.title, b.note.title));
    nodes.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

function TreeView({
  nodes,
  depth = 0,
  onContextMenu,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnter,
  onDragLeave,
  dragOverId,
  onClose,
  searchQuery,
}: {
  nodes: TreeNode[];
  depth?: number;
  onContextMenu: (e: React.MouseEvent, node: TreeNode) => void;
  onDragStart: (e: React.DragEvent, node: TreeNode) => void;
  onDragOver: (e: React.DragEvent, node: TreeNode) => void;
  onDrop: (e: React.DragEvent, node: TreeNode) => void;
  onDragEnter: (e: React.DragEvent, node: TreeNode) => void;
  onDragLeave: (e: React.DragEvent, node: TreeNode) => void;
  dragOverId: string | null;
  onClose?: () => void;
  searchQuery?: string;
}) {
  const highlight = useCallback(
    (text: string) => {
      const q = (searchQuery || "").trim();
      if (!q) return text;
      try {
        const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const parts = text.split(new RegExp(`(${escaped})`, "ig"));
        return parts.map((part, i) =>
          part.toLowerCase() === q.toLowerCase() ? (
            <span
              key={i}
              className="bg-yellow-500/40 dark:bg-yellow-400/30 rounded px-0.5"
            >
              {part}
            </span>
          ) : (
            <span key={i}>{part}</span>
          )
        );
      } catch {
        return text; // fallback if regex fails
      }
    },
    [searchQuery]
  );
  return (
    <ul>
      {nodes.map((n) => (
        <li
          key={n.id}
          onDragOver={(e) => onDragOver(e, n)}
          onDrop={(e) => onDrop(e, n)}
          onDragEnter={(e) => onDragEnter(e, n)}
          onDragLeave={(e) => onDragLeave(e, n)}
        >
          <div
            className="py-1 px-2 hover:opacity-80 rounded"
            style={{
              paddingLeft: `${8 + depth * 12}px`,
              backgroundColor:
                dragOverId === n.id ? "rgba(37,99,235,0.12)" : undefined,
              outline:
                dragOverId === n.id ? "2px solid rgba(37,99,235,0.35)" : "none",
              outlineOffset: 0,
            }}
            onContextMenu={(e) => onContextMenu(e, n)}
            draggable
            onDragStart={(e) => onDragStart(e, n)}
          >
            <Link
              href={`/notes/${n.id}`}
              style={{ color: "var(--foreground)" }}
              onClick={() => {
                if (onClose && window.innerWidth < 1024) {
                  onClose();
                }
              }}
            >
              {highlight(n.note.title || "(untitled)")}
            </Link>
          </div>
          {n.children.length > 0 && (
            <TreeView
              nodes={n.children}
              depth={depth + 1}
              onContextMenu={onContextMenu}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onDragEnter={onDragEnter}
              onDragLeave={onDragLeave}
              dragOverId={dragOverId}
              onClose={onClose}
              searchQuery={searchQuery}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const { notes } = useNotesCache();
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    nodeId: string;
  } | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragOverRoot, setDragOverRoot] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const { canEdit } = usePermissions(user?.email);

  const tree = useMemo(() => buildTree(notes), [notes]);

  const filteredTree = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tree;
    const filterNodes = (nodes: TreeNode[]): TreeNode[] => {
      const res: TreeNode[] = [];
      for (const n of nodes) {
        const children = filterNodes(n.children);
        if (n.note.title.toLowerCase().includes(q) || children.length) {
          res.push({ ...n, children });
        }
      }
      return res;
    };
    return filterNodes(tree);
  }, [tree, search]);

  const parentMap = useMemo(() => {
    const map = new Map<string, string | null | undefined>();
    notes.forEach((n) => map.set(n.id, n.parentId));
    return map;
  }, [notes]);

  const isInvalidDrop = useCallback(
    (dragId: string, targetId: string) => {
      if (dragId === targetId) return true;
      // If target is a descendant of dragId, disallow
      let cur: string | null | undefined = targetId;
      const seen = new Set<string>();
      while (cur) {
        if (cur === dragId) return true;
        if (seen.has(cur)) break; // safety
        seen.add(cur);
        cur = parentMap.get(cur) ?? null;
      }
      return false;
    },
    [parentMap]
  );

  const handleAddSubNote = useCallback(
    async (parentId: string) => {
      if (!user) return;

      // Check if user has edit permissions
      if (!canEdit) {
        alert("You don't have permission to create notes.");
        return;
      }

      const newId = await createNoteWithBlock(
        {
          title: "Untitled",
          createdBy: user.uid,
          visibility: "party",
          template: null,
          metadata: {},
          parentId,
          noteType: "note",
          tags: [],
          links: [],
        },
        " "
      );
  router.push(`/notes/${newId}?new=1`);
      setMenu(null);
    },
    [router, user, canEdit]
  );

  const onContextMenu = useCallback((e: React.MouseEvent, node: TreeNode) => {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY, nodeId: node.id });
  }, []);

  const onDragStart = useCallback((e: React.DragEvent, node: TreeNode) => {
    setDraggedId(node.id);
    e.dataTransfer.setData("text/plain", node.id);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const onDragOverNode = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDropOnNode = useCallback(
    async (e: React.DragEvent, node: TreeNode) => {
      e.preventDefault();
      e.stopPropagation();
      const dragId = draggedId || e.dataTransfer.getData("text/plain");
      if (!dragId) return;
      if (isInvalidDrop(dragId, node.id)) return;
      await updateNote(dragId, { parentId: node.id });
      setDraggedId(null);
      setDragOverId(null);
    },
    [draggedId, isInvalidDrop]
  );

  const onDragEnterNode = useCallback((e: React.DragEvent, node: TreeNode) => {
    e.preventDefault();
    setDragOverId(node.id);
  }, []);

  const onDragLeaveNode = useCallback((e: React.DragEvent, node: TreeNode) => {
    e.preventDefault();
    // Only clear if leaving the current node
    setDragOverId((cur) => (cur === node.id ? null : cur));
  }, []);

  const onDragOverRoot = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverRoot(true);
  }, []);

  const onDropOnRoot = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      const dragId = draggedId || e.dataTransfer.getData("text/plain");
      if (!dragId) return;
      await updateNote(dragId, { parentId: null });
      setDraggedId(null);
      setDragOverId(null);
      setDragOverRoot(false);
    },
    [draggedId]
  );

  const onDragEnterRoot = useCallback(() => setDragOverRoot(true), []);
  const onDragLeaveRoot = useCallback(() => setDragOverRoot(false), []);

  // Keyboard shortcut: Ctrl/Cmd + K focuses search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore if user is typing inside an editable field already
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        const isEditable = target instanceof HTMLElement && target.isContentEditable;
        if (tag === "INPUT" || tag === "TEXTAREA" || isEditable) {
          // Allow re-trigger even if already focused; no early return necessary
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <aside
      className="w-64 h-full overflow-y-auto"
      style={{
        backgroundColor: "var(--surface)",
        color: "var(--foreground)",
        borderRight: "1px solid var(--border)",
      }}
    >
      <div
        className="p-4 font-bold text-lg flex items-center justify-between"
        style={{
          borderBottom: "1px solid var(--border)",
          backgroundColor: dragOverRoot ? "rgba(37,99,235,0.12)" : undefined,
          outline: dragOverRoot ? "2px solid rgba(37,99,235,0.35)" : "none",
        }}
        onDragOver={onDragOverRoot}
        onDrop={onDropOnRoot}
        onDragEnter={onDragEnterRoot}
        onDragLeave={onDragLeaveRoot}
      >
        Notes
      </div>
      <div className="px-3 py-2" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="relative">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes (Ctrl+K)" // hint shortcut
            aria-label="Search notes"
            className="w-full text-sm px-2 py-1 rounded bg-transparent border"
            style={{
              borderColor: "var(--border)",
              color: "var(--foreground)",
            }}
            ref={searchRef}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-1 top-1/2 -translate-y-1/2 text-xs px-1 rounded hover:opacity-80"
              style={{ background: "var(--surface)" }}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
      </div>
      <div onMouseDown={() => menu && setMenu(null)}>
        <TreeView
          nodes={filteredTree}
          onContextMenu={onContextMenu}
          onDragStart={onDragStart}
          onDragOver={onDragOverNode}
          onDrop={onDropOnNode}
          onDragEnter={onDragEnterNode}
          onDragLeave={onDragLeaveNode}
          dragOverId={dragOverId}
          onClose={onClose}
          searchQuery={search}
        />
      </div>
      {menu && (
        <div
          style={{
            position: "fixed",
            left: menu.x,
            top: menu.y,
            background: "var(--surface)",
            color: "var(--foreground)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            zIndex: 1000,
            minWidth: 160,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            className="w-full text-left px-3 py-2 hover:opacity-80"
            onClick={() => handleAddSubNote(menu.nodeId)}
          >
            Add sub-note
          </button>
        </div>
      )}
    </aside>
  );
}
