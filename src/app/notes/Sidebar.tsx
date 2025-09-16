// src/app/notes/Sidebar.tsx
"use client";
import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createNoteWithBlock,
  updateNote,
  softDeleteNoteAndDescendants,
} from "../../notes";
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
  duplicateKeys,
  expanded,
  toggleExpand,
  searchActive,
  pathname,
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
  duplicateKeys: Set<string>;
  expanded: Set<string>;
  toggleExpand: (id: string) => void;
  searchActive: boolean;
  pathname: string;
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
      {nodes.map((n) => {
        const rawTitle = n.note.title || "(untitled)";
        const key = rawTitle.trim().toLowerCase();
        const isDuplicate = duplicateKeys.has(key) && rawTitle !== "(untitled)";
        const hasChildren = n.children.length > 0;
        const isCollapsed = hasChildren && !expanded.has(n.id) && !searchActive;
        return (
          <li
            key={n.id}
            onDragOver={(e) => onDragOver(e, n)}
            onDrop={(e) => onDrop(e, n)}
            onDragEnter={(e) => onDragEnter(e, n)}
            onDragLeave={(e) => onDragLeave(e, n)}
          >
            <div
              className="py-1 px-2 rounded group flex items-center gap-1 transition-colors"
              style={{
                paddingLeft: `${8 + depth * 12}px`,
                backgroundColor:
                  dragOverId === n.id ? "var(--accent-bg)" : undefined,
                outline:
                  dragOverId === n.id
                    ? "2px solid var(--accent-bg-strong)"
                    : "none",
                outlineOffset: 0,
              }}
              onContextMenu={(e) => onContextMenu(e, n)}
              draggable
              onDragStart={(e) => onDragStart(e, n)}
            >
              {hasChildren && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(n.id);
                  }}
                  aria-label={
                    isCollapsed ? "Expand section" : "Collapse section"
                  }
                  className="w-4 h-4 flex items-center justify-center text-xs select-none text-[11px] rounded focus-visible:outline-none"
                  style={{
                    color: "var(--muted)",
                    transform: !isCollapsed ? "rotate(90deg)" : "rotate(0deg)",
                    transition: "transform 0.15s ease",
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleExpand(n.id);
                    }
                  }}
                >
                  ▶
                </button>
              )}
              <Link
                href={`/notes/${n.id}`}
                style={{ color: "var(--foreground)", position: "relative" }}
                onClick={() => {
                  if (onClose && window.innerWidth < 1024) {
                    onClose();
                  }
                }}
                className={`${isDuplicate ? "relative" : ""} ${
                  pathname === "/notes/" + n.id ? "note-active" : ""
                }`}
              >
                {highlight(rawTitle)}
                {isDuplicate && (
                  <span
                    className="ml-1 hidden md:inline badge-dup"
                    title="Duplicate title"
                  >
                    dup
                  </span>
                )}
              </Link>
              {isDuplicate && (
                <span
                  className="md:hidden text-red-500 text-xs"
                  title="Duplicate title"
                >
                  •
                </span>
              )}
            </div>
            {hasChildren && !isCollapsed && (
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
                duplicateKeys={duplicateKeys}
                expanded={expanded}
                toggleExpand={toggleExpand}
                searchActive={searchActive}
                pathname={pathname}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname() || "";
  const { notes } = useNotesCache();
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [parentIds, setParentIds] = useState<string[]>([]);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    nodeId: string;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
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

  const searchActive = search.trim().length > 0;

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(
          "sidebarExpanded",
          JSON.stringify(Array.from(next))
        );
      } catch {}
      return next;
    });
  }, []);

  // Collect parent ids whenever tree changes
  useEffect(() => {
    const p: string[] = [];
    const traverse = (nodes: TreeNode[]) => {
      for (const n of nodes) {
        if (n.children.length > 0) {
          p.push(n.id);
          traverse(n.children);
        }
      }
    };
    traverse(tree);
    setParentIds(p);
  }, [tree]);

  // Load persisted expanded state (new) or migrate old collapsed state
  useEffect(() => {
    try {
      const rawNew = localStorage.getItem("sidebarExpanded");
      if (rawNew) {
        const arr: unknown = JSON.parse(rawNew);
        if (Array.isArray(arr)) {
          setExpanded(new Set(arr.filter((x) => typeof x === "string")));
          return;
        }
      }
      // Migration path: invert old collapsed set if present
      const rawOld = localStorage.getItem("sidebarCollapsed");
      if (rawOld) {
        const arr: unknown = JSON.parse(rawOld);
        if (Array.isArray(arr)) {
          const collapsedOld = new Set(
            arr.filter((x) => typeof x === "string") as string[]
          );
          // expanded = allParents - collapsedOld
          const expandedDerived = parentIds.filter(
            (id) => !collapsedOld.has(id)
          );
          setExpanded(new Set(expandedDerived));
          localStorage.setItem(
            "sidebarExpanded",
            JSON.stringify(expandedDerived)
          );
        }
      }
    } catch {}
  }, [parentIds]);

  // Expand/Collapse All handlers
  const expandAll = useCallback(() => {
    setExpanded(new Set(parentIds));
    try {
      localStorage.setItem("sidebarExpanded", JSON.stringify(parentIds));
    } catch {}
  }, [parentIds]);

  const collapseAll = useCallback(() => {
    setExpanded(new Set());
    try {
      localStorage.setItem("sidebarExpanded", JSON.stringify([]));
    } catch {}
  }, []);

  // Detect duplicate titles (case-insensitive, trimmed) excluding empty titles
  const duplicateTitleKeys = useMemo(() => {
    const counts = new Map<string, number>();
    notes.forEach((n) => {
      const key = (n.title || "").trim().toLowerCase();
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return new Set(
      Array.from(counts.entries())
        .filter(([, c]) => c > 1)
        .map(([k]) => k)
    );
  }, [notes]);

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

  // Close context menu on outside click / escape
  useEffect(() => {
    if (!menu) return;
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenu(null);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null);
    };
    window.addEventListener("mousedown", handle);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("mousedown", handle);
      window.removeEventListener("keydown", handleKey);
    };
  }, [menu]);

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
        const isEditable =
          target instanceof HTMLElement && target.isContentEditable;
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
      className="w-64 h-full overflow-y-auto panel"
      style={{
        background:
          "linear-gradient(145deg,var(--surface) 0%, var(--surface-muted) 100%)",
        color: "var(--foreground)",
        borderRight: "1px solid var(--border)",
      }}
    >
      <div
        className="p-4 font-semibold text-sm tracking-wide flex items-center justify-between uppercase"
        style={{
          borderBottom: "1px solid var(--border)",
          backgroundColor: dragOverRoot ? "var(--accent-bg)" : "transparent",
          outline: dragOverRoot ? "2px solid var(--accent-bg-strong)" : "none",
        }}
        onDragOver={onDragOverRoot}
        onDrop={onDropOnRoot}
        onDragEnter={onDragEnterRoot}
        onDragLeave={onDragLeaveRoot}
      >
        <span>Notes</span>
        <button
          onClick={() =>
            expanded.size < parentIds.length ? expandAll() : collapseAll()
          }
          className="text-[10px] px-2 py-1 rounded border uppercase tracking-wide"
          style={{
            background: "var(--surface-secondary)",
            borderColor: "var(--border)",
            color: "var(--muted)",
          }}
          aria-label={
            expanded.size < parentIds.length
              ? "Expand all sections"
              : "Collapse all sections"
          }
        >
          {expanded.size < parentIds.length ? "Expand All" : "Collapse All"}
        </button>
      </div>
      <div
        className="px-3 py-2"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="relative">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes (Ctrl+K)" // hint shortcut
            aria-label="Search notes"
            className="w-full text-sm px-2 py-1 rounded border bg-transparent focus-visible:outline-none"
            style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
            ref={searchRef}
          />
          {duplicateTitleKeys.size > 0 && (
            <div className="mt-2 text-[11px] text-red-500 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
              {duplicateTitleKeys.size} duplicate title
              {duplicateTitleKeys.size > 1 ? " groups" : " group"} detected
            </div>
          )}
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-1 top-1/2 -translate-y-1/2 text-xs px-1 rounded hover:opacity-80"
              style={{ background: "var(--surface-secondary)" }}
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
          duplicateKeys={duplicateTitleKeys}
          expanded={expanded}
          toggleExpand={toggleExpand}
          searchActive={searchActive}
          pathname={pathname}
        />
      </div>
      {menu && (
        <div
          ref={menuRef}
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
            minWidth: 200,
            padding: 4,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            className="w-full text-left px-3 py-2 rounded hover:bg-[var(--surface-secondary)] text-sm"
            onClick={() => handleAddSubNote(menu.nodeId)}
          >
            ➕ Add sub-note
          </button>
          <button
            className="w-full text-left px-3 py-2 rounded hover:bg-[var(--surface-secondary)] text-sm text-red-600"
            onClick={async () => {
              if (!confirm("Move this note (and children) to trash?")) return;
              await softDeleteNoteAndDescendants(menu.nodeId);
              setMenu(null);
            }}
          >
            🗑️ Trash note
          </button>
          <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wide text-[var(--muted)] border-t border-[var(--border)] mt-1">
            Tip: Drag a note into the top bar to make it a root.
          </div>
        </div>
      )}
    </aside>
  );
}
