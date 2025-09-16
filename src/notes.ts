// src/notes.ts
import { db } from "./firebase";
import {
  collection,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
  Timestamp,
  getDocs,
  query,
  where,
  onSnapshot,
  orderBy,
  deleteDoc,
} from "firebase/firestore";
import { z } from "zod";

export const NoteSchema = z.object({
  title: z.string(),
  titleLower: z.string().optional(),
  content: z.string(),
  adminNotes: z.string().optional(), // Admin-only section
  createdBy: z.string(),
  createdAt: z.instanceof(Timestamp).optional(),
  updatedAt: z.instanceof(Timestamp).optional(),
  tags: z.array(z.string()).optional(),
  links: z.array(z.string()).optional(),
  visibility: z.string(),
  template: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  parentId: z.string().nullable().optional(),
  noteType: z.enum(["note", "folder"]).optional(),
  deleted: z.boolean().optional(),
});

export type Note = z.infer<typeof NoteSchema>;

// Normalize Firestore doc data to satisfy schema during pending writes
function normalizeNoteData(data: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...data };
  const ca = out.createdAt;
  const ua = out.updatedAt;
  if (!(ca instanceof Timestamp)) delete out.createdAt;
  if (!(ua instanceof Timestamp)) delete out.updatedAt;
  return out;
}

export async function createNote(note: Omit<Note, "createdAt" | "updatedAt">) {
  const ref = await addDoc(collection(db, "notes"), {
    ...note,
    titleLower: (note.title ?? "").toLowerCase(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    deleted: false,
  });
  return ref.id;
}

export async function updateNote(noteId: string, updates: Partial<Note>) {
  const ref = doc(db, "notes", noteId);
  const payload: Record<string, unknown> = {
    ...updates,
    updatedAt: serverTimestamp(),
  };
  if (typeof updates.title === "string") {
    payload.titleLower = updates.title.toLowerCase();
  }
  await updateDoc(ref, payload);
}

export async function getNote(noteId: string): Promise<Note | null> {
  const ref = doc(db, "notes", noteId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return NoteSchema.parse(
    normalizeNoteData(snap.data() as Record<string, unknown>)
  );
}

export function subscribeNote(
  noteId: string,
  callback: (note: Note | null) => void
) {
  const ref = doc(db, "notes", noteId);
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    const data = NoteSchema.safeParse(
      normalizeNoteData(snap.data() as Record<string, unknown>)
    );
    callback(data.success ? data.data : null);
  });
}

export async function linkNotes(noteId: string, linkedIds: string[]) {
  const ref = doc(db, "notes", noteId);
  await updateDoc(ref, {
    links: linkedIds,
    updatedAt: serverTimestamp(),
  });
}

export async function getNotesByTag(tag: string): Promise<Note[]> {
  const notesRef = collection(db, "notes");
  const q = query(notesRef, where("tags", "array-contains", tag));
  const snap = await getDocs(q);
  return snap.docs.map((doc) => NoteSchema.parse(doc.data()));
}

// Find a note by exact title and return its document ID, or null if missing
export async function getNoteIdByTitle(title: string): Promise<string | null> {
  const notesRef = collection(db, "notes");
  const qy = query(notesRef, where("title", "==", title));
  const snap = await getDocs(qy);
  if (snap.empty) return null;
  return snap.docs[0].id;
}

// Case-insensitive title lookup using derived field 'titleLower'
export async function getNoteIdByTitleCI(
  title: string
): Promise<string | null> {
  const lower = (title ?? "").toLowerCase();
  const notesRef = collection(db, "notes");
  const qy = query(notesRef, where("titleLower", "==", lower));
  const snap = await getDocs(qy);
  if (!snap.empty) return snap.docs[0].id;
  // Fallback: try exact match for legacy docs without titleLower
  return getNoteIdByTitle(title);
}

// Realtime block editing model
export const BlockSchema = z.object({
  index: z.number(),
  type: z.enum(["line"]).default("line"),
  text: z.string(),
  updatedAt: z.instanceof(Timestamp).optional(),
  updatedBy: z.string().optional(),
});

export type Block = z.infer<typeof BlockSchema> & { id?: string };

export function subscribeBlocks(
  noteId: string,
  callback: (blocks: Block[]) => void
) {
  const blocksRef = collection(db, "notes", noteId, "blocks");
  return onSnapshot(query(blocksRef, orderBy("index", "asc")), (snap) => {
    const blocks: Block[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        index: data.index ?? 0,
        type: (data.type as "line") ?? "line",
        text: data.text ?? "",
        updatedAt: data.updatedAt,
        updatedBy: data.updatedBy,
      };
    });
    callback(blocks);
  });
}

export async function createBlock(
  noteId: string,
  block: Omit<Block, "id" | "updatedAt">
) {
  const ref = await addDoc(collection(db, "notes", noteId, "blocks"), {
    ...block,
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateBlock(
  noteId: string,
  blockId: string,
  updates: Partial<Block>
) {
  const ref = doc(db, "notes", noteId, "blocks", blockId);
  await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
}

export async function deleteBlock(noteId: string, blockId: string) {
  const ref = doc(db, "notes", noteId, "blocks", blockId);
  await deleteDoc(ref);
}

export async function createNoteWithBlock(
  note: Omit<Note, "createdAt" | "updatedAt" | "content">,
  initialText = ""
) {
  const noteId = await createNote({ ...note, content: "" });
  if (initialText) {
    await createBlock(noteId, { index: 0, type: "line", text: initialText });
  }
  return noteId;
}

// --- Authorization helpers (coarse, campaign-agnostic) ---
export function parseVisibility(
  visibility: string
):
  | { kind: "party" }
  | { kind: "dm-only" }
  | { kind: "personal"; uid: string }
  | { kind: "shared"; uids: string[] }
  | { kind: "unknown" } {
  if (visibility === "party") return { kind: "party" };
  if (visibility === "dm-only") return { kind: "dm-only" };
  if (visibility.startsWith("personal:")) {
    return { kind: "personal", uid: visibility.split(":")[1] ?? "" };
  }
  if (visibility.startsWith("shared:")) {
    const rest = visibility.slice("shared:".length);
    const uids = rest
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return { kind: "shared", uids };
  }
  return { kind: "unknown" };
}

export function canRead(
  note: Note,
  userId: string | null,
  userRole?: string | null
): boolean {
  // Check if user has read permissions (admin, editor, or viewer)
  if (!userRole || !["admin", "editor", "viewer"].includes(userRole)) {
    return false;
  }

  const vis = parseVisibility(note.visibility);
  if (note.createdBy === userId) return true;
  switch (vis.kind) {
    case "party":
      return userId !== null; // any signed-in user
    case "dm-only":
      return note.createdBy === userId; // until roles are implemented
    case "personal":
      return vis.uid === userId;
    case "shared":
      return !!userId && vis.uids.includes(userId);
    default:
      return false;
  }
}

export function canEdit(
  note: Note,
  userId: string | null,
  userRole?: string | null
): boolean {
  // Check if user has edit permissions (admin or editor only)
  if (!userRole || !["admin", "editor"].includes(userRole)) {
    return false;
  }

  // Then check note-specific permissions (same as canRead for now)
  return canRead(note, userId, userRole);
}

// --- Destructive utilities ---
// Recursively delete a note, its block subcollection, and all descendant notes.
// Caution: This performs multiple sequential Firestore queries; for very deep
// hierarchies this could take time. Could be optimized with a Cloud Function or
// batched writes if needed.
// Soft-delete: mark note & descendants as deleted=true (cascades).
// Keeps data & blocks for later restore.
export async function softDeleteNoteAndDescendants(noteId: string) {
  async function markRecursive(id: string): Promise<void> {
    const childrenSnap = await getDocs(
      query(collection(db, "notes"), where("parentId", "==", id))
    );
    for (const child of childrenSnap.docs) {
      await markRecursive(child.id);
    }
    await updateDoc(doc(db, "notes", id), {
      deleted: true,
      updatedAt: serverTimestamp(),
    });
  }
  await markRecursive(noteId);
}

// (Optional future) restore a subtree
export async function restoreNoteAndDescendants(noteId: string) {
  async function restoreRecursive(id: string): Promise<void> {
    const childrenSnap = await getDocs(
      query(collection(db, "notes"), where("parentId", "==", id))
    );
    for (const child of childrenSnap.docs) {
      await restoreRecursive(child.id);
    }
    await updateDoc(doc(db, "notes", id), {
      deleted: false,
      updatedAt: serverTimestamp(),
    });
  }
  await restoreRecursive(noteId);
}
