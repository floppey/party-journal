"use client";
import Link from "next/link";
import { useAuth } from "../auth";
import Sidebar from "./notes/Sidebar";
import { useState } from "react";
import { usePermissions } from "../hooks/usePermissionsCache";
import { useHasNotes } from "../hooks/useNotesCache";

function UnauthenticatedLanding() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
      }}
    >
      <div
        className="p-8 rounded shadow w-full max-w-md text-center"
        style={{
          backgroundColor: "var(--surface)",
          color: "var(--foreground)",
        }}
      >
        <h1 className="text-3xl font-bold mb-4">Party Journal</h1>
        <p className="mb-6" style={{ color: "var(--muted)" }}>
          A shared, real-time campaign journal for TTRPGs.
        </p>
        <Link
          href="/signin"
          className="inline-block py-2 px-4 rounded hover:opacity-90"
          style={{ backgroundColor: "#2563eb", color: "#fff" }}
        >
          Sign in to get started
        </Link>
      </div>
    </div>
  );
}

function AuthenticatedLanding() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const { isAllowed, loading: permissionsLoading } = usePermissions(
    user?.email
  );
  const { hasNotes, loading: notesLoading } = useHasNotes();

  // Show loading state while checking permissions
  if (permissionsLoading || notesLoading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center"
        style={{
          backgroundColor: "var(--background)",
          color: "var(--foreground)",
        }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p style={{ color: "var(--muted)" }}>Checking permissions...</p>
        </div>
      </div>
    );
  }

  // Show access denied if user is not allowed
  if (!isAllowed) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center"
        style={{
          backgroundColor: "var(--background)",
          color: "var(--foreground)",
        }}
      >
        <div
          className="p-8 rounded shadow w-full max-w-md text-center"
          style={{
            backgroundColor: "var(--surface)",
            color: "var(--foreground)",
          }}
        >
          <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
          <p className="mb-6" style={{ color: "var(--muted)" }}>
            Your email ({user?.email}) is not authorized to use this
            application.
          </p>
          <button
            onClick={() => (window.location.href = "/signin")}
            className="inline-block py-2 px-4 rounded hover:opacity-90"
            style={{ backgroundColor: "#dc2626", color: "#fff" }}
          >
            Sign out and try different account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex h-full relative"
      style={{
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
        height: "calc(100vh - 57px)",
      }}
    >
      {/* Desktop sidebar */}
      <div className="hidden lg:block w-64 h-full">
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={`
        fixed top-0 left-0 z-50 lg:hidden
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        w-64 h-screen
      `}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <main
        className="flex-1 p-8 overflow-auto flex flex-col items-center justify-center"
        style={{
          backgroundColor: "var(--background)",
          color: "var(--foreground)",
        }}
      >
        {/* Mobile menu button - bottom right */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`lg:hidden fixed bottom-6 right-6 p-3 rounded-full shadow-lg transition-all duration-300 ${
            sidebarOpen ? "z-[60]" : "z-30"
          }`}
          style={{
            backgroundColor: "#2563eb",
            color: "#fff",
          }}
        >
          {sidebarOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M3 12h18M3 6h18M3 18h18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          )}
        </button>

        <div
          className="p-8 rounded shadow w-full max-w-md text-center"
          style={{
            backgroundColor: "var(--surface)",
            color: "var(--foreground)",
          }}
        >
          <h1 className="text-3xl font-bold mb-4">Welcome to Party Journal</h1>
          <p className="mb-6" style={{ color: "var(--muted)" }}>
            {hasNotes
              ? "Your shared, real-time campaign journal for TTRPGs. Select a note from the sidebar to view or edit it, or create a new one."
              : "Your shared, real-time campaign journal for TTRPGs. Get started by creating your first note."}
          </p>
          <Link
            href="/notes/new"
            className="inline-block py-2 px-4 rounded hover:opacity-90"
            style={{ backgroundColor: "#2563eb", color: "#fff" }}
          >
            {hasNotes ? "Create new note" : "Create your first note"}
          </Link>
        </div>
      </main>
    </div>
  );
}

export default function LandingPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center"
        style={{
          backgroundColor: "var(--background)",
          color: "var(--foreground)",
        }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p style={{ color: "var(--muted)" }}>Loading...</p>
        </div>
      </div>
    );
  }

  return user ? <AuthenticatedLanding /> : <UnauthenticatedLanding />;
}
