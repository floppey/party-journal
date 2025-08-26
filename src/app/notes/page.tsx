// src/app/notes/page.tsx
import Link from "next/link";

export default function NotesIndexPage() {
  return (
    <div>
      <h2
        className="text-xl font-semibold mb-3"
        style={{ color: "var(--foreground)" }}
      >
        Select a note
      </h2>
      <p style={{ color: "var(--foreground)" }}>
        Use the sidebar to browse notes or{" "}
        <Link href="/" style={{ textDecoration: "underline" }}>
          create a new one
        </Link>{" "}
        from the header.
      </p>
    </div>
  );
}
