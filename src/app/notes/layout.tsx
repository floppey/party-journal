// src/app/notes/layout.tsx
"use client";
import { ReactNode } from "react";
import Sidebar from "./Sidebar";

export default function NotesLayout({ children }: { children: ReactNode }) {
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
        className="flex-1 p-4 overflow-auto"
        style={{
          backgroundColor: "var(--background)",
          color: "var(--foreground)",
        }}
      >
        {children}
      </main>
    </div>
  );
}
