"use client";
import { useEffect, useRef, useState } from "react";
import { useMemo } from "react";
import {
  Note,
  Block,
  subscribeBlocks,
  subscribeNote,
  updateBlock,
  createBlock,
  deleteBlock,
  updateNote,
} from "../notes";
import { useAuth } from "../auth";
import { Markdown } from "./Markdown";
import { usePermissions } from "../hooks/usePermissionsCache";

export default function NoteEditorClient({ noteId }: { noteId: string }) {
  const [note, setNote] = useState<Note | null>(null);
  const { user, loading: authLoading } = useAuth();
  const {
    canEdit: canUserEdit,
    isAdmin,
    loading: permissionsLoading,
  } = usePermissions(user?.email);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [editorText, setEditorText] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [mode, setMode] = useState<"view" | "edit">("view");
  const titleInputRef = useRef<HTMLInputElement>(null);
  const newNoteFlagRef = useRef(false);
  // Detect ?new=1 to auto enter edit mode then clean URL
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") === "1") {
      newNoteFlagRef.current = true;
      setMode("edit");
      // Remove the query param without a navigation
      const path = window.location.pathname;
      window.history.replaceState({}, "", path);
    }
  }, []);
  const typingRef = useRef(false);
  const adminTypingRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const adminSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorTextRef = useRef("");
  const adminNotesRef = useRef("");
  const blocksRef = useRef<Block[]>([]);
  const titleTypingRef = useRef(false);
  const noteLoadedRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const adminTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Subscribe to note metadata (title, etc.)
  useEffect(() => {
    if (!noteId) return;
    const unsub = subscribeNote(noteId, (n) => {
      setNote(n);
      if (!noteLoadedRef.current) {
        setLoading(false);
        noteLoadedRef.current = true;
      }
      if (n && !titleTypingRef.current) {
        setTitle(n.title ?? "");
      }
      // Initialize admin notes if user is admin and not currently typing
      if (n && !adminTypingRef.current && isAdmin) {
        setAdminNotes(n.adminNotes ?? "");
        adminNotesRef.current = n.adminNotes ?? "";
      }
    });
    return () => unsub();
  }, [noteId, isAdmin]);

  // Subscribe to blocks for realtime updates
  useEffect(() => {
    if (!noteId) return;
    const unsub = subscribeBlocks(noteId, (b) => {
      blocksRef.current = b;
      const joined = b.map((x) => x.text).join("\n");

      // Always update on initial load, then preserve cursor during subsequent updates
      const isInitialLoad =
        !noteLoadedRef.current || editorTextRef.current === "";

      if (isInitialLoad) {
        // Initial load - always update
        editorTextRef.current = joined;
        setEditorText(joined);
      } else {
        // Subsequent updates - preserve cursor position when updating text
        const preserveCursor = () => {
          const textarea = textareaRef.current;

          // Only update if not actively typing AND text actually changed
          if (!typingRef.current && joined !== editorTextRef.current) {
            editorTextRef.current = joined;
            setEditorText(joined);

            // Restore cursor position after React re-renders
            if (textarea) {
              const start = textarea.selectionStart;
              const end = textarea.selectionEnd;
              requestAnimationFrame(() => {
                if (textarea) {
                  textarea.setSelectionRange(
                    Math.min(start, joined.length),
                    Math.min(end, joined.length)
                  );
                }
              });
            }
          }
        };

        preserveCursor();
      }
    });
    return () => unsub();
  }, [noteId]);

  // Debounced save of text -> blocks reconciliation
  const scheduleSave = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!noteId) return;

      // Capture current state before async operation
      const currentText = editorTextRef.current;
      const lines = currentText.split("\n");
      const currentBlocks = blocksRef.current;
      const ops: Array<Promise<unknown>> = [];

      // Update existing and create missing blocks
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const block = currentBlocks[i];
        if (block) {
          if (block.text !== line || block.index !== i) {
            ops.push(updateBlock(noteId, block.id!, { text: line, index: i }));
          }
        } else {
          // Don't persist trailing extra blank line
          if (line.length > 0 || i < lines.length - 1) {
            ops.push(
              createBlock(noteId, { index: i, type: "line", text: line })
            );
          }
        }
      }

      // Delete extra blocks beyond current lines
      for (let i = lines.length; i < currentBlocks.length; i++) {
        const block = currentBlocks[i];
        if (block?.id) ops.push(deleteBlock(noteId, block.id));
      }

      try {
        await Promise.all(ops);
      } catch (error) {
        console.error("Save error:", error);
        // On error, don't reset typing flag to prevent remote overwrite
        return;
      }

      // Only reset typing flag if the text hasn't changed during the save
      if (editorTextRef.current === currentText) {
        // Still give a small delay to ensure all keystrokes are captured
        setTimeout(() => {
          if (editorTextRef.current === currentText) {
            typingRef.current = false;
          }
        }, 50);
      }
    }, 300);
  };

  // Admin notes save function
  const scheduleAdminSave = () => {
    if (adminSaveTimer.current) clearTimeout(adminSaveTimer.current);
    adminSaveTimer.current = setTimeout(() => {
      const currentAdminNotes = adminNotesRef.current;
      if (currentAdminNotes !== (note?.adminNotes ?? "")) {
        updateNote(noteId, { adminNotes: currentAdminNotes });
      }
    }, 300);
  };

  const canCurrentUserEdit = useMemo(() => {
    // Use server-side permissions
    return canUserEdit;
  }, [canUserEdit]);
  const markdown = editorText;

  // Focus logic after note loads if it was a new note (must be before returns for hook order)
  useEffect(() => {
    if (!note || !newNoteFlagRef.current) return;
    if (titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
    const t = setTimeout(() => {
      if (mode === "edit" && textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 120);
    newNoteFlagRef.current = false;
    return () => clearTimeout(t);
  }, [note, mode]);

  if (loading || authLoading || permissionsLoading)
    return <div>Loading...</div>;
  if (!note) return <div>Note not found.</div>;

  return (
    <div
      className=" mx-auto p-4 rounded shadow"
      style={{ backgroundColor: "var(--surface)", color: "var(--foreground)" }}
    >
  <input
        value={title}
        onChange={(e) => {
          if (!canCurrentUserEdit) return;
          const v = e.target.value;
          setTitle(v);
          if (titleSaveTimer.current) clearTimeout(titleSaveTimer.current);
          titleSaveTimer.current = setTimeout(() => {
            if (v !== (note?.title ?? "")) {
              updateNote(noteId, { title: v });
            }
          }, 300);
        }}
        onFocus={() => {
          titleTypingRef.current = true;
        }}
        onBlur={() => {
          titleTypingRef.current = false;
        }}
        placeholder="Title"
        readOnly={!canCurrentUserEdit || mode !== "edit"}
        aria-readonly={!canCurrentUserEdit || mode !== "edit"}
        disabled={!canCurrentUserEdit && mode !== "edit"}
  className="w-full text-2xl font-bold mb-3 bg-transparent outline-none"
        style={{
          color: "var(--foreground)",
          borderBottom:
            mode === "edit" && canCurrentUserEdit
              ? "1px solid var(--border)"
              : "none",
        }}
  ref={titleInputRef}
      />
      {/* Toolbar */}
      {canCurrentUserEdit ? (
        <div className="mb-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setMode((m) => (m === "view" ? "edit" : "view"))}
            className="px-3 py-1 border rounded text-sm"
            style={{
              backgroundColor: "var(--background)",
              color: "var(--foreground)",
              borderColor: "var(--border)",
            }}
          >
            {mode === "view" ? "Edit" : "Done"}
          </button>
        </div>
      ) : null}

      {/* Content */}
      {mode === "edit" && canCurrentUserEdit ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <textarea
            ref={textareaRef}
            value={editorText}
            onChange={(e) => {
              typingRef.current = true;
              const val = e.target.value;
              editorTextRef.current = val;
              setEditorText(val);
              scheduleSave();
            }}
            onFocus={() => {
              typingRef.current = true;
            }}
            onBlur={() => {
              // Give a small delay before allowing remote updates to prevent losing final keystrokes
              setTimeout(() => {
                typingRef.current = false;
              }, 100);
            }}
            rows={20}
            className="w-full p-3 border rounded font-mono text-sm"
            style={{
              backgroundColor: "var(--background)",
              color: "var(--foreground)",
              borderColor: "var(--border)",
              lineHeight: "1.5",
            }}
            placeholder="Start typing markdown..."
          />
          <div
            className="w-full p-3 border rounded overflow-auto prose dark:prose-invert"
            style={{
              backgroundColor: "var(--background)",
              color: "var(--foreground)",
              borderColor: "var(--border)",
              lineHeight: "1.6",
            }}
          >
            <Markdown markdown={markdown} />
          </div>
        </div>
      ) : (
        <div
          className="w-full p-3 border rounded overflow-auto prose dark:prose-invert mb-4"
          style={{
            backgroundColor: "var(--background)",
            color: "var(--foreground)",
            borderColor: "var(--border)",
            lineHeight: "1.6",
          }}
        >
          <Markdown markdown={markdown} />
        </div>
      )}

      {/* Admin Notes Section - Only visible to admins */}
      {isAdmin && (mode === "edit" || adminNotes) && (
        <div
          className="mt-6 p-4 border rounded"
          style={{
            backgroundColor: "var(--surface)",
            borderColor: "var(--border)",
            borderLeft: "4px solid #dc2626",
          }}
        >
          <h3 className="text-lg font-semibold mb-2 text-red-600 dark:text-red-400">
            🔒 DM Notes
          </h3>
          <p className="text-sm mb-3 opacity-75">
            This section is only visible to administrators and will not appear
            to regular users.
          </p>

          {mode === "edit" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <textarea
                ref={adminTextareaRef}
                value={adminNotes}
                onChange={(e) => {
                  adminTypingRef.current = true;
                  const val = e.target.value;
                  adminNotesRef.current = val;
                  setAdminNotes(val);
                  scheduleAdminSave();
                }}
                onFocus={() => {
                  adminTypingRef.current = true;
                }}
                onBlur={() => {
                  setTimeout(() => {
                    adminTypingRef.current = false;
                  }, 100);
                }}
                rows={8}
                className="w-full p-3 border rounded font-mono text-sm"
                style={{
                  backgroundColor: "var(--background)",
                  color: "var(--foreground)",
                  borderColor: "var(--border)",
                  lineHeight: "1.5",
                }}
                placeholder="Admin-only notes (markdown supported)..."
              />
              <div
                className="w-full p-3 border rounded overflow-auto prose dark:prose-invert"
                style={{
                  backgroundColor: "var(--background)",
                  color: "var(--foreground)",
                  borderColor: "var(--border)",
                  lineHeight: "1.6",
                }}
              >
                <Markdown markdown={adminNotes} />
              </div>
            </div>
          ) : (
            <div
              className="w-full p-3 border rounded overflow-auto prose dark:prose-invert"
              style={{
                backgroundColor: "var(--background)",
                color: "var(--foreground)",
                borderColor: "var(--border)",
                lineHeight: "1.6",
              }}
            >
              <Markdown markdown={adminNotes} />
            </div>
          )}
        </div>
      )}

      {note.tags && (
        <div className="mb-2" style={{ color: "var(--foreground)" }}>
          <span className="font-semibold">Tags:</span> {note.tags.join(", ")}
        </div>
      )}
      {note.links && note.links.length > 0 && (
        <div style={{ color: "var(--foreground)" }}>
          <span className="font-semibold">Links:</span> {note.links.join(", ")}
        </div>
      )}
    </div>
  );
}
