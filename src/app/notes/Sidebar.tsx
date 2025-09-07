// src/app/notes/Sidebar.tsx
"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Note } from "../../notes";
import { db } from "../../firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { createNoteWithBlock, updateNote } from "../../notes";
import { useRouter } from "next/navigation";
import { useAuth } from "../../auth";
import { usePermissions } from "../../hooks/usePermissions";

type UINote = Note & { id: string; parentId?: string | null };
type TreeNode = { id: string; note: UINote; children: TreeNode[] };

function buildTree(notes: UINote[]): TreeNode[] {
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
    nodes.sort((a, b) => a.note.title.localeCompare(b.note.title));
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
}) {
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
                // Close sidebar on mobile when a note is selected
                if (onClose && window.innerWidth < 1024) {
                  onClose();
                }
              }}
            >
              {n.note.title || "(untitled)"}
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
            />
          )}
        </li>
      ))}
    </ul>
  );
}

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const [notes, setNotes] = useState<UINote[]>([]);
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

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "notes"), (snap) => {
      const arr: UINote[] = snap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title ?? "",
          content: data.content ?? "",
          createdBy: data.createdBy ?? "",
          visibility: data.visibility ?? "party",
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          tags: data.tags ?? [],
          links: data.links ?? [],
          template: data.template ?? null,
          metadata: data.metadata ?? {},
          parentId: data.parentId ?? null,
          noteType: data.noteType,
        };
      });
      setNotes(arr);
    });
    return () => unsub();
  }, []);

  const tree = useMemo(() => buildTree(notes), [notes]);

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
      router.push(`/notes/${newId}`);
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
      <div onMouseDown={() => menu && setMenu(null)}>
        <TreeView
          nodes={tree}
          onContextMenu={onContextMenu}
          onDragStart={onDragStart}
          onDragOver={onDragOverNode}
          onDrop={onDropOnNode}
          onDragEnter={onDragEnterNode}
          onDragLeave={onDragLeaveNode}
          dragOverId={dragOverId}
          onClose={onClose}
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
