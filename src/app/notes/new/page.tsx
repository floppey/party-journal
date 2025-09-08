// src/app/notes/new/page.tsx
"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createNote } from "../../../notes";
import { useAuth } from "../../../auth";
import { usePermissions } from "../../../hooks/usePermissionsCache";

function NewNoteForm() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const search = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { canEdit, loading: permissionsLoading } = usePermissions(user?.email);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/signin");
    } else if (user && !permissionsLoading && !canEdit) {
      setError("You don't have permission to create notes.");
    }
  }, [authLoading, user, router, permissionsLoading, canEdit]);

  // Prefill title from query string
  useEffect(() => {
    const t = search.get("title");
    if (t) setTitle(t);
  }, [search]);

  const handleCreate = async () => {
    setLoading(true);
    setError("");
    try {
      if (!user) return;
      const noteId = await createNote({
        title,
        content,
        createdBy: user.uid,
        visibility: "party",
      });
      router.push(`/notes/${noteId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="max-w-xl mx-auto p-8 rounded shadow mt-8"
      style={{ backgroundColor: "var(--surface)", color: "var(--foreground)" }}
    >
      <h1
        className="text-2xl font-bold mb-4"
        style={{ color: "var(--foreground)" }}
      >
        Create a New Note
      </h1>
      <input
        type="text"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full px-3 py-2 border rounded mb-4"
        style={{
          backgroundColor: "var(--background)",
          color: "var(--foreground)",
          borderColor: "var(--border)",
        }}
      />
      <textarea
        placeholder="Content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full px-3 py-2 border rounded mb-4"
        style={{
          backgroundColor: "var(--background)",
          color: "var(--foreground)",
          borderColor: "var(--border)",
        }}
        rows={6}
      />
      <button
        onClick={handleCreate}
        className="py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700"
        disabled={loading || authLoading || !user || !title}
      >
        {loading ? "Creating..." : "Create Note"}
      </button>
      {error && <div className="text-red-500 mt-2">{error}</div>}
    </div>
  );
}

export default function NewNotePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NewNoteForm />
    </Suspense>
  );
}
