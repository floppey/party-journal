"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createNoteWithBlock } from "@/notes";
import { auth } from "@/firebase";
import { signInAnonymously } from "firebase/auth";

export default function DevCreateAndOpen() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const title = params.get("title") ?? "Dev Note";
      const initial = params.get("initial") ?? "";
      try {
        try {
          await signInAnonymously(auth);
        } catch (_) {
          // ignore; may already be signed in or anonymous auth disabled
        }
        const id = await createNoteWithBlock(
          {
            title,
            createdBy: "dev",
            visibility: "party",
            template: null,
            metadata: {},
            parentId: null,
            noteType: "note",
            tags: [],
            links: [],
          },
          initial
        );
        if (!cancelled) {
          const dev = params.get("dev");
          const qp = dev ? `?dev=${encodeURIComponent(dev)}` : "";
          router.replace(`/notes/${id}${qp}`);
        }
      } catch (e) {
        console.error("Dev create note failed", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params, router]);

  return (
    <div style={{ color: "var(--foreground)", padding: 24 }}>
      Creating dev note…
    </div>
  );
}
