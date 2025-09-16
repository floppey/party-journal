"use client";
import { useEffect, useRef, useState, useCallback } from "react";
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
import { useNotesCache } from "../hooks/useNotesCache";

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
  const { notes } = useNotesCache();

  // Debounced save of text -> blocks reconciliation (defined early for stable callback refs)
  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!noteId) return;
      const currentText = editorTextRef.current;
      const lines = currentText.split("\n");
      const currentBlocks = blocksRef.current;
      const ops: Array<Promise<unknown>> = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const block = currentBlocks[i];
        if (block) {
          if (block.text !== line || block.index !== i) {
            ops.push(updateBlock(noteId, block.id!, { text: line, index: i }));
          }
        } else {
          if (line.length > 0 || i < lines.length - 1) {
            ops.push(
              createBlock(noteId, { index: i, type: "line", text: line })
            );
          }
        }
      }
      for (let i = lines.length; i < currentBlocks.length; i++) {
        const block = currentBlocks[i];
        if (block?.id) ops.push(deleteBlock(noteId, block.id));
      }
      try {
        await Promise.all(ops);
      } catch (error) {
        console.error("Save error:", error);
        return;
      }
      if (editorTextRef.current === currentText) {
        setTimeout(() => {
          if (editorTextRef.current === currentText) {
            typingRef.current = false;
          }
        }, 50);
      }
    }, 300);
  }, [noteId]);

  // [[ link suggestions state
  const [linkQuery, setLinkQuery] = useState("");
  const [linkStart, setLinkStart] = useState<number | null>(null); // index where the [[ began
  const [showLinkMenu, setShowLinkMenu] = useState(false);
  const [linkIndex, setLinkIndex] = useState(0); // highlighted suggestion
  const [linkPos, setLinkPos] = useState<{ left: number; top: number }>({
    left: 0,
    top: 0,
  });

  const MAX_SUGGESTIONS = 12;

  const filteredLinkSuggestions = useMemo(() => {
    if (!showLinkMenu || linkQuery.length < 2) return [];
    const q = linkQuery.toLowerCase();
    const prefixes: typeof notes = [];
    const contains: typeof notes = [];
    for (const n of notes) {
      if (n.id === noteId) continue; // don't link to self
      const titleLower = (n.title || "").toLowerCase();
      if (titleLower.startsWith(q)) prefixes.push(n);
      else if (titleLower.includes(q)) contains.push(n);
    }
    prefixes.sort((a, b) => a.title.localeCompare(b.title));
    contains.sort((a, b) => a.title.localeCompare(b.title));
    return [...prefixes, ...contains].slice(0, MAX_SUGGESTIONS);
  }, [notes, linkQuery, showLinkMenu, noteId]);

  // Helper: detect active [[ query
  // Compute caret (selectionStart) viewport coordinates for popup placement
  const computeCaretViewportPos = (el: HTMLTextAreaElement, sel: number) => {
    const style = window.getComputedStyle(el);
    // Mirror element
    const div = document.createElement("div");
    const props = [
      "boxSizing",
      "width",
      "paddingTop",
      "paddingRight",
      "paddingBottom",
      "paddingLeft",
      "borderTopWidth",
      "borderRightWidth",
      "borderBottomWidth",
      "borderLeftWidth",
      "fontStyle",
      "fontVariant",
      "fontWeight",
      "fontStretch",
      "fontSize",
      "lineHeight",
      "fontFamily",
      "textAlign",
      "textTransform",
      "textIndent",
      "letterSpacing",
      "wordSpacing",
      "whiteSpace",
      "overflowWrap",
    ];
    props.forEach((p) => {
      // @ts-expect-error dynamic style copy
      div.style[p] = style[p];
    });
    div.style.position = "absolute";
    div.style.visibility = "hidden";
    div.style.whiteSpace = "pre-wrap";
    div.style.wordWrap = "break-word";
    // Account for current scroll by adjusting content offset later
    const textBefore = el.value.substring(0, sel);
    // Add zero-width space to ensure span has box
    div.textContent = textBefore.replace(/\n$/, "\n\u200b");
    const span = document.createElement("span");
    span.textContent = "\u200b";
    div.appendChild(span);
    const taRect = el.getBoundingClientRect();
    // Position mirror at textarea top-left so measurements map to viewport
    div.style.top = taRect.top + "px";
    div.style.left = taRect.left + "px";
    document.body.appendChild(div);
    const spanRect = span.getBoundingClientRect();
    document.body.removeChild(div);
    // Adjust for textarea internal scroll
    const left = spanRect.left - el.scrollLeft;
    const top = spanRect.bottom - el.scrollTop + 4; // gap below caret
    // Clamp within viewport horizontal bounds
    const clampedLeft = Math.min(Math.max(8, left), window.innerWidth - 280);
    const clampedTop = Math.min(top, window.innerHeight - 100);
    return { left: clampedLeft, top: clampedTop };
  };

  const detectLinkTrigger = useCallback(() => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    const cursor = el.selectionStart;
    const text = el.value;
    // Find last occurrence of [[ before cursor
    const prefix = text.slice(0, cursor);
    const lastOpen = prefix.lastIndexOf("[[");
    if (lastOpen === -1) {
      setShowLinkMenu(false);
      setLinkStart(null);
      return;
    }
    // Ensure there is no closing ]] between lastOpen and cursor
    const after = prefix.slice(lastOpen + 2);
    if (after.includes("]]")) {
      setShowLinkMenu(false);
      setLinkStart(null);
      return;
    }
    // Extract query (allow letters, numbers, spaces, dashes, apostrophes)
    const query = after; // we can further trim leading spaces
    // Stop if newline encountered
    if (query.includes("\n")) {
      setShowLinkMenu(false);
      setLinkStart(null);
      return;
    }
    const trimmed = query.trimStart();
    const leadingSpaces = query.length - trimmed.length;
    // If user added space right after [[ but nothing else, don't show yet
    const effectiveQuery = trimmed;
    if (effectiveQuery.length >= 2) {
      setLinkQuery(effectiveQuery);
      setLinkStart(lastOpen + 2 + leadingSpaces);
      setShowLinkMenu(true);
      setLinkIndex(0);
      try {
        setLinkPos(computeCaretViewportPos(el, cursor));
      } catch {}
    } else {
      // Keep tracking but hide until 2 chars
      setLinkQuery(effectiveQuery);
      setLinkStart(lastOpen + 2 + leadingSpaces);
      setShowLinkMenu(false);
    }
  }, []);

  const insertLinkAtCursor = useCallback(
    (titleToInsert: string) => {
      if (!textareaRef.current || linkStart == null) return;
      const el = textareaRef.current;
      const cursor = el.selectionStart;
      const text = el.value;
      // Need actual position of the initial [[ sequence
      const openIdx = text.lastIndexOf("[[", linkStart);
      if (openIdx === -1) return;
      const after = text.slice(cursor);
      const insertion = `[[${titleToInsert}]]`;
      const newValue = text.slice(0, openIdx) + insertion + after;
      el.value = newValue;
      setEditorText(newValue);
      editorTextRef.current = newValue;
      const newCursor = openIdx + insertion.length;
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(newCursor, newCursor);
      });
      // cleanup
      setShowLinkMenu(false);
      setLinkStart(null);
      setLinkQuery("");
      scheduleSave();
    },
    [linkStart, scheduleSave]
  );

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
      className="mx-auto p-5 panel panel-elevated"
      style={{ color: "var(--foreground)" }}
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
        className="w-full text-2xl font-bold mb-3 bg-transparent outline-none border-b"
        style={{
          color: "var(--foreground)",
          borderColor:
            mode === "edit" && canCurrentUserEdit
              ? "var(--border)"
              : "transparent",
        }}
        ref={titleInputRef}
      />
      {/* Toolbar */}
      {canCurrentUserEdit ? (
        <div className="mb-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setMode((m) => (m === "view" ? "edit" : "view"))}
            className="btn-outline text-sm"
          >
            {mode === "view" ? "Edit" : "Done"}
          </button>
        </div>
      ) : null}

      {/* Content */}
      {mode === "edit" && canCurrentUserEdit ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="relative w-full">
            <textarea
              ref={textareaRef}
              value={editorText}
              onChange={(e) => {
                typingRef.current = true;
                const val = e.target.value;
                editorTextRef.current = val;
                setEditorText(val);
                scheduleSave();
                detectLinkTrigger();
              }}
              onKeyDown={(e) => {
                if (showLinkMenu && filteredLinkSuggestions.length) {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setLinkIndex(
                      (i) => (i + 1) % filteredLinkSuggestions.length
                    );
                    return;
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setLinkIndex(
                      (i) =>
                        (i - 1 + filteredLinkSuggestions.length) %
                        filteredLinkSuggestions.length
                    );
                    return;
                  } else if (e.key === "Enter" || e.key === "Tab") {
                    e.preventDefault();
                    insertLinkAtCursor(
                      filteredLinkSuggestions[linkIndex].title
                    );
                    return;
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    setShowLinkMenu(false);
                    return;
                  }
                }
                // Re-detect on navigation/edit keys
                requestAnimationFrame(() => detectLinkTrigger());
              }}
              onFocus={() => {
                typingRef.current = true;
              }}
              onBlur={() => {
                // Give a small delay before allowing remote updates to prevent losing final keystrokes
                setTimeout(() => {
                  typingRef.current = false;
                }, 100);
                // hide popup when leaving editor
                setShowLinkMenu(false);
              }}
              rows={24}
              className="w-full p-3 border rounded font-mono text-sm bg-transparent"
              style={{
                color: "var(--foreground)",
                borderColor: "var(--border)",
                lineHeight: "1.5",
                minHeight: "60vh",
              }}
              placeholder="Start typing markdown..."
            />
            {/* Link suggestions popup */}
            {showLinkMenu && filteredLinkSuggestions.length > 0 && (
              <div
                className="fixed z-[999] w-64 max-h-64 overflow-auto rounded border shadow-lg text-sm"
                style={{
                  background: "var(--surface)",
                  borderColor: "var(--border)",
                  left: linkPos.left,
                  top: linkPos.top,
                }}
              >
                <div
                  className="px-2 py-1 text-[10px] uppercase tracking-wide opacity-60 border-b"
                  style={{ borderColor: "var(--border)" }}
                >
                  Link to note
                </div>
                {filteredLinkSuggestions.map((s, i) => {
                  const dup =
                    filteredLinkSuggestions.filter(
                      (x) => x.title.toLowerCase() === s.title.toLowerCase()
                    ).length > 1;
                  return (
                    <button
                      key={s.id + i}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        insertLinkAtCursor(s.title);
                      }}
                      className={`w-full text-left px-2 py-1 hover:bg-[var(--accent-bg)] transition-colors ${
                        i === linkIndex ? "bg-[var(--accent-bg)]" : ""
                      }`}
                      style={{
                        color: i === linkIndex ? "var(--accent)" : undefined,
                      }}
                    >
                      <span className="truncate block flex items-center gap-1">
                        {s.title || "(untitled)"}
                        {dup && (
                          <span className="ml-1 text-[10px] text-red-500 uppercase">
                            dup
                          </span>
                        )}
                        {(() => {
                          const q = linkQuery.toLowerCase();
                          const tl = (s.title || "").toLowerCase();
                          if (tl.startsWith(q)) return null; // already a prefix match
                          if (tl.includes(q))
                            return (
                              <span className="ml-auto text-[9px] px-1 rounded bg-[var(--surface-secondary)] opacity-70">
                                contains
                              </span>
                            );
                          return null;
                        })()}
                      </span>
                    </button>
                  );
                })}
                {filteredLinkSuggestions.length === MAX_SUGGESTIONS && (
                  <div
                    className="px-2 py-1 text-[10px] opacity-60 border-t"
                    style={{ borderColor: "var(--border)" }}
                  >
                    More results truncated…
                  </div>
                )}
              </div>
            )}
          </div>
          <div
            className="w-full p-3 border rounded overflow-auto prose dark:prose-invert bg-transparent"
            style={{
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
          className="w-full p-3 border rounded overflow-auto prose dark:prose-invert mb-4 bg-transparent"
          style={{
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
          className="mt-6 p-4 border rounded panel"
          style={{
            background:
              "linear-gradient(145deg,var(--surface) 0%, var(--surface-muted) 100%)",
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
                className="w-full p-3 border rounded font-mono text-sm bg-transparent"
                style={{
                  color: "var(--foreground)",
                  borderColor: "var(--border)",
                  lineHeight: "1.5",
                }}
                placeholder="Admin-only notes (markdown supported)..."
              />
              <div
                className="w-full p-3 border rounded overflow-auto prose dark:prose-invert bg-transparent"
                style={{
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
              className="w-full p-3 border rounded overflow-auto prose dark:prose-invert bg-transparent"
              style={{
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
