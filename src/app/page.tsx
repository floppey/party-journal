import Link from "next/link";

export default function LandingPage() {
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
          href="/notes/new"
          className="inline-block py-2 px-4 rounded hover:opacity-90"
          style={{ backgroundColor: "#2563eb", color: "#fff" }}
        >
          Create your first note
        </Link>
      </div>
    </div>
  );
}
