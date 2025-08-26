"use client";
import Link from "next/link";
import { useAuth, logout } from "../auth";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createNoteWithBlock } from "../notes";

export default function Header() {
  const { user } = useAuth();
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  return (
    <header
      className="w-full"
      style={{
        backgroundColor: "var(--surface)",
        color: "var(--foreground)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold text-lg"
          style={{ color: "var(--foreground)" }}
        >
          <span>📝</span>
          <span>Party Journal</span>
        </Link>
        <div className="flex items-center gap-3">
          {user && (
            <button
              onClick={async () => {
                if (creating) return;
                setCreating(true);
                try {
                  const id = await createNoteWithBlock(
                    {
                      title: "Untitled",
                      createdBy: user.uid,
                      visibility: "party",
                      tags: [],
                      links: [],
                      noteType: "note",
                    },
                    ""
                  );
                  router.push(`/notes/${id}`);
                } finally {
                  setCreating(false);
                }
              }}
              disabled={creating}
              className="text-sm px-3 py-1 rounded"
              style={{ backgroundColor: "#2563eb", color: "#fff" }}
            >
              {creating ? "Creating…" : "New note"}
            </button>
          )}
          {user ? (
            <>
              {user.photoURL && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.photoURL}
                  alt={user.displayName ?? "User"}
                  className="h-8 w-8 rounded-full border"
                  style={{ borderColor: "var(--border)" }}
                />
              )}
              <span className="text-sm" title={user.email ?? ""}>
                {user.displayName ?? user.email}
              </span>
              <button
                onClick={() => logout()}
                className="text-sm px-3 py-1 rounded"
                style={{
                  backgroundColor: "transparent",
                  border: "1px solid var(--border)",
                }}
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/signin"
              className="text-sm px-3 py-1 rounded"
              style={{ backgroundColor: "#2563eb", color: "#fff" }}
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
