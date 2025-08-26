"use client";
import Link from "next/link";
import { useAuth } from "../auth";
import Sidebar from "./notes/Sidebar";
import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";

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
  const [hasNotes, setHasNotes] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "notes"), (snap) => {
      setHasNotes(snap.docs.length > 0);
    });
    return () => unsub();
  }, []);

  return (
    <div
      className="flex"
      style={{
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
        height: "calc(100vh - 57px)",
      }}
    >
      <Sidebar />
      <main
        className="flex-1 p-8 overflow-auto flex flex-col items-center justify-center"
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
