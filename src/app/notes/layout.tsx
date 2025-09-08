// src/app/notes/layout.tsx
"use client";
import { ReactNode, useState } from "react";
import Sidebar from "./Sidebar";

export default function NotesLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      <main className="flex-1 p-4 overflow-auto">
        {/* Mobile menu button - bottom right */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`lg:hidden fixed bottom-6 right-6 p-3 rounded-full shadow-lg transition-all duration-300 ${
            sidebarOpen ? "z-[60]" : "z-30"
          }`}
          style={{
            background:
              "linear-gradient(135deg,var(--accent),var(--accent-hover))",
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

        {children}
      </main>
    </div>
  );
}
