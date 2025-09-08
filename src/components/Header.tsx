"use client";
import Link from "next/link";
import { useAuth, logout } from "../auth";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createNoteWithBlock } from "../notes";
import { usePermissions } from "../hooks/usePermissionsCache";

export default function Header() {
  const { user } = useAuth();
  const { canEdit, isAdmin } = usePermissions(user?.email);
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
      <div className="mx-auto max-w-6xl px-2 sm:px-4 py-3 sm:py-3 flex items-center justify-between min-h-[56px] sm:min-h-0">
        <Link
          href="/"
          className="flex items-center gap-1 sm:gap-2 font-semibold text-base sm:text-lg"
          style={{ color: "var(--foreground)" }}
        >
          <span className="text-sm sm:text-base">📝</span>
          <span className="hidden sm:inline">Party Journal</span>
          <span className="sm:hidden">PJ</span>
        </Link>
        <div className="flex items-center gap-1 sm:gap-3">
          {user && canEdit && (
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
              className="text-xs sm:text-sm px-3 sm:px-3 py-3 sm:py-1 rounded min-h-[42px] sm:min-h-0 min-w-[42px] sm:min-w-0 flex items-center justify-center"
              style={{ backgroundColor: "#2563eb", color: "#fff" }}
            >
              <span className="hidden sm:inline">
                {creating ? "Creating…" : "New note"}
              </span>
              <span className="sm:hidden">+</span>
            </button>
          )}
          {user ? (
            <>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="text-xs sm:text-sm px-3 sm:px-3 py-3 sm:py-1 rounded min-h-[42px] sm:min-h-0 min-w-[42px] sm:min-w-0 flex items-center justify-center"
                  style={{
                    backgroundColor: "transparent",
                    border: "1px solid var(--border)",
                  }}
                >
                  <span className="hidden sm:inline">Admin</span>
                  <span className="sm:hidden">⚙️</span>
                </Link>
              )}
              {user.photoURL && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.photoURL}
                  alt={user.displayName ?? "User"}
                  className="h-6 w-6 sm:h-8 sm:w-8 rounded-full border"
                  style={{ borderColor: "var(--border)" }}
                />
              )}
              <span
                className="text-xs sm:text-sm hidden sm:inline truncate max-w-24 sm:max-w-none"
                title={user.email ?? ""}
              >
                {user.displayName ?? user.email}
              </span>
              <button
                onClick={() => logout()}
                className="text-xs sm:text-sm px-3 sm:px-3 py-3 sm:py-1 rounded min-h-[42px] sm:min-h-0 min-w-[42px] sm:min-w-0 flex items-center justify-center"
                style={{
                  backgroundColor: "transparent",
                  border: "1px solid var(--border)",
                }}
              >
                <span className="hidden sm:inline">Sign out</span>
                <span className="sm:hidden">↗</span>
              </button>
            </>
          ) : (
            <Link
              href="/signin"
              className="text-xs sm:text-sm px-3 sm:px-3 py-3 sm:py-1 rounded min-h-[42px] sm:min-h-0 min-w-[42px] sm:min-w-0 flex items-center justify-center"
              style={{ backgroundColor: "#2563eb", color: "#fff" }}
            >
              <span className="hidden sm:inline">Sign in</span>
              <span className="sm:hidden">↗</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
