"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, logout } from "../auth";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createNoteWithBlock } from "../notes";
import { usePermissions } from "../hooks/usePermissionsCache";

export default function Header() {
  const { user } = useAuth();
  const pathname = usePathname() || "";
  const { canEdit, isAdmin } = usePermissions(user?.email);
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  return (
    <header className="w-full glass-header">
      <div className="mx-auto max-w-6xl px-3 sm:px-6 py-3 flex items-center justify-between gap-4 min-h-[56px]">
        <Link
          href="/"
          className={`flex items-center gap-2 font-semibold text-base sm:text-lg tracking-wide nav-link ${
            pathname === "/" ? "nav-active" : ""
          }`}
        >
          <span className="text-lg sm:text-xl select-none">🧭</span>
          <span className="hidden sm:inline drop-shadow-sm">Party Journal</span>
          <span className="sm:hidden">PJ</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
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
                  router.push(`/notes/${id}?new=1`);
                } finally {
                  setCreating(false);
                }
              }}
              disabled={creating}
              className="btn-primary text-xs sm:text-sm flex items-center justify-center whitespace-nowrap min-h-[38px]"
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
                  className={`btn-outline text-xs sm:text-sm flex items-center justify-center min-h-[38px] nav-link ${
                    pathname.startsWith("/admin") ? "nav-active" : ""
                  }`}
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
                className="btn-outline text-xs sm:text-sm min-h-[38px]"
              >
                <span className="hidden sm:inline">Sign out</span>
                <span className="sm:hidden">↗</span>
              </button>
            </>
          ) : (
            <Link
              href="/signin"
              className="btn-primary text-xs sm:text-sm flex items-center justify-center min-h-[38px]"
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
