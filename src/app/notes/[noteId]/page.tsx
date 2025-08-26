// Dynamic note page with Vercel support
import NoteEditorClient from "@/components/NoteEditorClient";

// Enable dynamic parameters for any noteId
export const dynamicParams = true;

// Optional: Pre-generate some common paths at build time
export async function generateStaticParams() {
  // You can return an empty array or pre-generate some paths
  // Vercel will handle any dynamic noteId at runtime
  return [
    { noteId: "new" }, // Pre-generate the "new" page
  ];
}

export default async function NotePage({
  params,
}: {
  params: Promise<{ noteId: string }>;
}) {
  const { noteId } = await params;

  return <NoteEditorClient noteId={noteId} />;
}
